const encoder = new TextEncoder();
export const COOKIE_NAME = "__Host-wedding_media";
export const SESSION_SECONDS = 7 * 24 * 60 * 60;

export const privateHeaders = {
  "cache-control": "private, no-store",
  "cdn-cache-control": "no-store",
  "netlify-cdn-cache-control": "no-store",
  "x-robots-tag": "noindex, nofollow, noarchive",
  "referrer-policy": "no-referrer",
  "x-content-type-options": "nosniff"
};

export function readSecrets() {
  const password = Netlify.env.get("MEDIA_PASSWORD");
  const secret = Netlify.env.get("MEDIA_SESSION_SECRET");
  return password && secret?.length >= 32 ? { password, secret } : null;
}

async function signingKey({ password, secret }) {
  // Binding the key to both values also revokes cookies when the password changes.
  return crypto.subtle.importKey("raw", encoder.encode(JSON.stringify([secret, password])),
    { name: "HMAC", hash: "SHA-256" }, false, ["sign", "verify"]);
}

const toHex = (buffer) => Array.from(new Uint8Array(buffer), (byte) => byte.toString(16).padStart(2, "0")).join("");
const fromHex = (value) => Uint8Array.from(value.match(/../g), (byte) => parseInt(byte, 16));

export async function passwordMatches(candidate, secrets) {
  const key = await signingKey(secrets);
  const signature = await crypto.subtle.sign("HMAC", key, encoder.encode(candidate));
  return crypto.subtle.verify("HMAC", key, signature, encoder.encode(secrets.password));
}

export async function createSession(secrets, now = Date.now()) {
  const expires = Math.floor(now / 1000) + SESSION_SECONDS;
  const nonce = toHex(crypto.getRandomValues(new Uint8Array(16)));
  const payload = `v1.${expires}.${nonce}`;
  const signature = await crypto.subtle.sign("HMAC", await signingKey(secrets), encoder.encode(payload));
  return `${payload}.${toHex(signature)}`;
}

export async function hasSession(request, secrets, now = Date.now()) {
  const cookie = (request.headers.get("cookie") || "").split(";")
    .map((part) => part.trim()).find((part) => part.startsWith(`${COOKIE_NAME}=`));
  const token = cookie?.slice(COOKIE_NAME.length + 1) || "";
  const match = /^v1\.(\d{10})\.([a-f0-9]{32})\.([a-f0-9]{64})$/.exec(token);
  if (!match) return false;
  const seconds = Math.floor(now / 1000);
  if (Number(match[1]) <= seconds || Number(match[1]) > seconds + SESSION_SECONDS) return false;
  return crypto.subtle.verify("HMAC", await signingKey(secrets), fromHex(match[3]),
    encoder.encode(token.slice(0, token.lastIndexOf("."))));
}

export function sessionCookie(token, maxAge = SESSION_SECONDS) {
  return `${COOKIE_NAME}=${token}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${maxAge}`;
}

export function normalizedPath(url) {
  let path = new URL(url).pathname;
  for (let index = 0; index < 4 && path.includes("%"); index += 1) path = decodeURIComponent(path);
  if (path.includes("%") || path.includes("\\") || /[\x00-\x1f]/.test(path)) throw new Error("Invalid path");
  return new URL(path.replace(/\/{2,}/g, "/"), "https://local.invalid").pathname.toLowerCase();
}

export const isMediaPage = (path) => /^\/media(?:\.html)?\/?$/.test(path);

export function isProtectedPath(path) {
  return isMediaPage(path) || /^\/(?:media(?:\.html)?|media-thumbs)(?:\/|$)/.test(path) ||
    /^\/assets\/data\/media-[^/]+\.json\/?$/.test(path) ||
    /^\/(?:api|\.netlify\/functions)\/(?:media-list|onedrive-[^/]+)(?:\/|$)/.test(path) ||
    /^\/\.netlify\/images(?:\/|$)/.test(path) || path.startsWith("/media-access");
}

export function loginPage(message = "", status = 200) {
  // Messages are fixed server strings, never interpolated guest input.
  const html = `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex,nofollow"><title>Wedding Memories · Thomas &amp; Annamária</title>
<link rel="icon" href="/images/hearts.png" type="image/png">
<style>
*{box-sizing:border-box}body{margin:0;min-height:100svh;display:grid;place-items:center;padding:28px 18px;background:#fde4ea;color:#2b2b2b;font-family:Georgia,serif;background-image:radial-gradient(ellipse at top left,#d7adcd80,transparent 60%),radial-gradient(ellipse at bottom right,#c2cbec90,transparent 60%)}
main{width:100%;max-width:460px;padding:46px 34px;background:#fffaf6;border:1px solid #7d764833;box-shadow:0 12px 40px #813d6e12;text-align:center;position:relative}main:before{content:"";position:absolute;top:-12px;left:calc(50% - 45px);width:90px;height:26px;background:#c2cbecb3;transform:rotate(-4deg)}
.heart{font-size:30px;color:#813d6e}.couple{font-size:13px;letter-spacing:.06em;color:#7d7648;margin:18px 0}h1{font-size:36px;font-weight:400;line-height:1.15;margin:14px 0}p{font-size:16px;line-height:1.65;color:#615950}form{text-align:left;margin-top:28px}label{display:block;font-size:15px;margin-bottom:9px}input,button{width:100%;border-radius:4px;font:inherit;font-size:16px;min-height:48px}input{padding:12px;border:1px solid #7d764866;background:white;color:#2b2b2b}button{margin-top:14px;padding:12px;border:1px solid #813d6e;background:#813d6e;color:white;cursor:pointer}button:hover{background:#6c315c}input:focus-visible,button:focus-visible,a:focus-visible{outline:3px solid #813d6e;outline-offset:3px}.message{color:#813d6e;font-size:15px;margin-bottom:0}.back{display:inline-block;margin-top:28px;color:#615950;font-size:14px;text-underline-offset:4px}.note{font-size:13px;margin:15px 0 0}@media(max-width:380px){main{padding:36px 22px}h1{font-size:32px}}
</style></head><body><main><span class="heart" aria-hidden="true">♡</span>
<p class="couple">Thomas &amp; Annamária</p><h1>Wedding Memories</h1>
<p>A little space for everyone who celebrated with us. Enter the password we sent you to see and share our photos and videos.</p>
${message ? `<p class="message" role="alert" id="password-message">${message}</p>` : ""}
<form method="post" action="/media-access"><label for="password">Wedding password</label>
<input id="password" name="password" type="password" autocomplete="current-password" required maxlength="256"${message ? ' aria-describedby="password-message"' : ""}>
<button type="submit">Open our memories</button></form><p class="note">Please keep the password among our wedding guests.</p>
<a class="back" href="/index.html">Back to our wedding website</a></main></body></html>`;
  return new Response(html, { status, headers: { ...privateHeaders,
    "content-type": "text/html; charset=utf-8",
    "content-security-policy": "default-src 'none'; style-src 'unsafe-inline'; img-src 'self'; form-action 'self'; frame-ancestors 'none'; base-uri 'none'"
  } });
}
