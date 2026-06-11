const http = require("http");

const CLIENT_ID = process.env.MS_CLIENT_ID;
const CLIENT_SECRET = process.env.MS_CLIENT_SECRET;
const TENANT_ID = process.env.MS_TENANT_ID || "common";
const PORT = Number(process.env.ONEDRIVE_AUTH_PORT || 8888);
const REDIRECT_URI = `http://localhost:${PORT}/auth/callback`;
const SCOPES = ["offline_access", "User.Read", "Files.ReadWrite"];

if (!CLIENT_ID || !CLIENT_SECRET) {
  console.error("Missing MS_CLIENT_ID or MS_CLIENT_SECRET in this terminal session.");
  console.error("Set them first, then run: npm run auth:onedrive");
  process.exit(1);
}

const tokenEndpoint = `https://login.microsoftonline.com/${TENANT_ID}/oauth2/v2.0/token`;
const authUrl = new URL(`https://login.microsoftonline.com/${TENANT_ID}/oauth2/v2.0/authorize`);
authUrl.searchParams.set("client_id", CLIENT_ID);
authUrl.searchParams.set("response_type", "code");
authUrl.searchParams.set("redirect_uri", REDIRECT_URI);
authUrl.searchParams.set("response_mode", "query");
authUrl.searchParams.set("scope", SCOPES.join(" "));
authUrl.searchParams.set("prompt", "consent");

const sendHtml = (res, statusCode, body) => {
  res.writeHead(statusCode, { "content-type": "text/html; charset=utf-8" });
  res.end(body);
};

const exchangeCode = async (code) => {
  const form = new URLSearchParams();
  form.set("client_id", CLIENT_ID);
  form.set("client_secret", CLIENT_SECRET);
  form.set("grant_type", "authorization_code");
  form.set("code", code);
  form.set("redirect_uri", REDIRECT_URI);
  form.set("scope", SCOPES.join(" "));

  const response = await fetch(tokenEndpoint, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: form.toString()
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(JSON.stringify(data, null, 2));
  }
  return data;
};

const server = http.createServer(async (req, res) => {
  const requestUrl = new URL(req.url, REDIRECT_URI);
  if (requestUrl.pathname !== "/auth/callback") {
    sendHtml(res, 404, "<h1>Not found</h1>");
    return;
  }

  const error = requestUrl.searchParams.get("error");
  if (error) {
    const description = requestUrl.searchParams.get("error_description") || "";
    sendHtml(res, 400, `<h1>Authorization failed</h1><pre>${error}\n${description}</pre>`);
    console.error("Authorization failed:", error, description);
    server.close();
    return;
  }

  const code = requestUrl.searchParams.get("code");
  if (!code) {
    sendHtml(res, 400, "<h1>Missing authorization code</h1>");
    server.close();
    return;
  }

  try {
    const tokenData = await exchangeCode(code);
    sendHtml(res, 200, "<h1>OneDrive authorization complete</h1><p>You can close this tab and return to the terminal.</p>");
    console.log("");
    console.log("Copy this refresh token into Netlify as MS_REFRESH_TOKEN:");
    console.log("");
    console.log(tokenData.refresh_token);
    console.log("");
    console.log("Do not commit or share this value.");
  } catch (exchangeError) {
    sendHtml(res, 500, "<h1>Token exchange failed</h1><p>Check the terminal output.</p>");
    console.error("Token exchange failed:");
    console.error(exchangeError.message);
  } finally {
    server.close();
  }
});

server.listen(PORT, () => {
  console.log(`Listening for Microsoft callback at ${REDIRECT_URI}`);
  console.log("");
  console.log("Open this URL in your browser:");
  console.log("");
  console.log(authUrl.toString());
  console.log("");
});
