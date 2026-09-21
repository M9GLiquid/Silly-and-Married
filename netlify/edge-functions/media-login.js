import { createSession, hasSession, loginPage, passwordMatches, privateHeaders, readSecrets, sessionCookie } from "../lib/media-auth.mjs";

export default async function mediaLogin(request) {
  const url = new URL(request.url);
  const secrets = readSecrets();
  if (!secrets) return loginPage("Wedding memories are temporarily unavailable. Please try again later.", 503);
  if (request.method === "GET" || request.method === "HEAD") {
    if (await hasSession(request, secrets)) return new Response(null, {
      status: 303, headers: { ...privateHeaders, location: "/media.html#media" }
    });
    return loginPage();
  }
  if (request.method !== "POST") return new Response("Method not allowed", {
    status: 405, headers: { ...privateHeaders, allow: "GET, HEAD, POST" }
  });
  if (request.headers.get("origin") !== url.origin) return new Response("Please use the password form on this website.", {
    status: 403, headers: privateHeaders
  });
  if (url.searchParams.get("logout") === "1") return new Response(null, {
    status: 303, headers: { ...privateHeaders, "set-cookie": sessionCookie("", 0), location: "/media-access" }
  });
  if (!request.headers.get("content-type")?.startsWith("application/x-www-form-urlencoded")) {
    return loginPage("Please enter your password using the form below.", 400);
  }
  // Read a bounded body even when Content-Length is absent or incorrect.
  const reader = request.body?.getReader();
  let body = "";
  let bytes = 0;
  const decoder = new TextDecoder();
  if (reader) {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      bytes += value.byteLength;
      if (bytes > 4096) { await reader.cancel(); return loginPage("That entry is too long. Please try again.", 413); }
      body += decoder.decode(value, { stream: true });
    }
    body += decoder.decode();
  }
  const password = new URLSearchParams(body).get("password") || "";
  if (password.length > 256 || !await passwordMatches(password, secrets)) {
    return loginPage("That password doesn't look right. Please try the one we sent you.", 401);
  }
  return new Response(null, { status: 303, headers: {
    ...privateHeaders, "set-cookie": sessionCookie(await createSession(secrets)), location: "/media.html#media"
  } });
}

export const config = {
  path: "/media-access",
  onError: "fail",
  rateLimit: { windowLimit: 20, windowSize: 60, aggregateBy: ["ip", "domain"] }
};
