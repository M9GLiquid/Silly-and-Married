import test from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { readFileSync } from "node:fs";
import { createSession, hasSession, COOKIE_NAME, SESSION_SECONDS, normalizedPath, isProtectedPath } from "../netlify/lib/media-auth.mjs";
import guard from "../netlify/edge-functions/media-guard.js";
import login from "../netlify/edge-functions/media-login.js";

const require = createRequire(import.meta.url);
const secrets = { password: "test-only-guest-password", secret: "test-only-signing-key-with-32-characters" };
globalThis.Netlify = { env: { get: (name) => ({ MEDIA_PASSWORD: secrets.password, MEDIA_SESSION_SECRET: secrets.secret })[name] } };
const request = (path, cookie, options = {}) => new Request(`https://wedding.test${path}`, {
  ...options, headers: { ...(cookie ? { cookie } : {}), ...options.headers }
});
const post = (password, options = {}) => request("/media-access", null, {
  method: "POST", body: new URLSearchParams({ password }).toString(),
  ...options, headers: { origin: "https://wedding.test", "content-type": "application/x-www-form-urlencoded", ...options.headers }
});
const session = async (values = secrets, now) => `${COOKIE_NAME}=${await createSession(values, now)}`;
const forbiddenNext = { next: () => { throw new Error("Private content must not be reached"); } };

test("public pages stay public and the login route reaches its own handler", async () => {
  for (const path of ["/", "/index.html", "/travel.html", "/story.html", "/images/main/photo.png", "/assets/css/site.css", "/images/gallery.json", "/media-access"]) {
    assert.equal(await guard(request(path), forbiddenNext), undefined, path);
  }
});

test("anonymous and forged-cookie requests cannot reach any protected resource", async () => {
  const paths = ["/media.html", "/media", "/media/", "/media.html/", "/media.html/anything", "/media/picture.jpg", "/media-thumbs/picture.webp", "/assets/data/media-list.json", "/assets/data/media-catalog.json", "/api/media-list", "/.netlify/images?url=/media-thumbs/picture.webp", "/MEDIA.HTML", "/%6dedia.html", "/%256dedia-thumbs/photo.webp", "//media-thumbs//photo.webp", "/assets%2fdata%2fmedia-list.json"];
  for (const name of ["media-list", "onedrive-media", "onedrive-upload-list", "onedrive-create-upload-session", "onedrive-save-metadata", "onedrive-verify-upload", "onedrive-health"]) {
    paths.push(`/api/${name}`, `/.netlify/functions/${name}`);
  }
  for (const path of paths) {
    assert.equal(isProtectedPath(normalizedPath(request(path).url)), true, path);
    for (const cookie of [undefined, `${COOKIE_NAME}=forged`]) {
      const response = await guard(request(path, cookie), forbiddenNext);
      assert.ok([401, 303].includes(response.status), `${path}: ${response.status}`);
      assert.equal(response.headers.get("cache-control"), "private, no-store");
    }
  }
});

test("HEAD, Range and non-GET requests cannot bypass the gate", async () => {
  for (const method of ["HEAD", "POST", "OPTIONS", "PUT"]) {
    const response = await guard(request("/media-thumbs/picture.webp", null, { method, headers: { range: "bytes=0-20" } }), forbiddenNext);
    assert.equal(response.status, 401);
  }
  assert.equal((await guard(request("/media%ZZ"), forbiddenNext)).status, 400);
});

test("successful login issues a signed secure cookie without returning the password", async () => {
  const response = await login(post(secrets.password));
  assert.equal(response.status, 303);
  assert.equal(response.headers.get("location"), "/media.html#media");
  const cookie = response.headers.get("set-cookie");
  for (const attribute of ["HttpOnly", "Secure", "SameSite=Lax", "Path=/", `Max-Age=${SESSION_SECONDS}`]) assert.ok(cookie.includes(attribute));
  assert.ok(!cookie.includes(secrets.password));
  assert.equal(await hasSession(request("/media.html", cookie), secrets), true);
});

test("wrong and empty passwords are rejected without reflecting input", async () => {
  for (const value of ["", "wrong", secrets.password.toUpperCase(), `${secrets.password} `, '<script>alert("x")</script>']) {
    const response = await login(post(value));
    assert.equal(response.status, 401);
    assert.equal(response.headers.get("set-cookie"), null);
    const html = await response.text();
    if (value) assert.ok(!html.includes(value));
    assert.doesNotMatch(html, /<script>alert/);
    assert.match(html, /data-guest-error/);
  }
});

test("password form is accessible and contains no gallery or secret", async () => {
  const response = await login(request("/media-access"));
  const html = await response.text();
  assert.equal(response.status, 200);
  assert.match(html, /label for="password"/);
  assert.match(html, /type="password"/);
  assert.match(html, /id="password-visibility"/);
  assert.match(html, /aria-controls="password"/);
  assert.match(html, /aria-pressed="false"/);
  assert.match(html, /data-show-label="Show password"/);
  assert.match(html, /data-hide-label="Hide password"/);
  assert.match(html, /<script src="\/assets\/js\/guest-error-popup\.js\?v=20260921-guest-errors" defer><\/script>/);
  assert.match(html, /<script src="\/assets\/js\/media-login\.js\?v=20260921-guest-errors" defer><\/script>/);
  assert.match(response.headers.get("content-security-policy"), /script-src 'self'/);
  assert.match(response.headers.get("content-security-policy"), /connect-src 'self'/);
  assert.doesNotMatch(html, /assets\/js\/media\.js|media-thumbs/);
  assert.ok(!html.includes(secrets.password));
  assert.ok(!html.includes(secrets.secret));
  assert.match(response.headers.get("content-security-policy"), /frame-ancestors 'none'/);
});

test("signed-in responses stay private and preserve partial media responses", async () => {
  const cookie = await session();
  for (const path of ["/media.html", "/assets/data/media-list.json", "/media-thumbs/photo.webp", "/api/onedrive-media?id=photo"]) {
    let reached = false;
    const response = await guard(request(path, cookie), { next: async () => {
      reached = true;
      return new Response("private bytes", { status: 206, headers: { "cache-control": "public, max-age=300", "content-range": "bytes 0-12/30" } });
    } });
    assert.equal(reached, true);
    assert.equal(response.status, 206);
    assert.equal(await response.text(), "private bytes");
    assert.equal(response.headers.get("content-range"), "bytes 0-12/30");
    assert.equal(response.headers.get("cache-control"), "private, no-store");
    assert.equal(response.headers.get("netlify-cdn-cache-control"), "no-store");
    assert.match(response.headers.get("vary"), /Cookie/);
  }
});

test("sessions reject tampering, expiry, future dates and either rotated secret", async () => {
  const cookie = await session();
  const tampered = cookie.slice(0, -1) + (cookie.endsWith("a") ? "b" : "a");
  const variants = [tampered, await session(secrets, Date.now() - (SESSION_SECONDS + 10) * 1000), await session(secrets, Date.now() + 10000), await session({ ...secrets, password: "old-password" }), await session({ ...secrets, secret: "previous-signing-secret-over-32-characters" })];
  for (const value of variants) assert.equal(await hasSession(request("/media.html", value), secrets), false);
});

test("missing configuration fails closed while public pages work", async () => {
  const original = Netlify.env.get;
  Netlify.env.get = () => undefined;
  try {
    assert.equal((await guard(request("/media.html"), forbiddenNext)).status, 503);
    assert.equal((await login(post(secrets.password))).status, 503);
    assert.equal(await guard(request("/index.html"), forbiddenNext), undefined);
  } finally { Netlify.env.get = original; }
});

test("cross-site posts, invalid content types and oversized bodies are rejected", async () => {
  assert.equal((await login(post(secrets.password, { headers: { origin: "https://other.test" } }))).status, 403);
  assert.equal((await login(post(secrets.password, { headers: { "content-type": "application/json" } }))).status, 400);
  assert.equal((await login(post("x".repeat(5000)))).status, 413);
  assert.equal((await login(request("/media-access", null, { method: "DELETE" }))).status, 405);
});

test("logout expires the browser cookie and redirects to the password form", async () => {
  const response = await login(request("/media-access?logout=1", await session(), { method: "POST", headers: { origin: "https://wedding.test" } }));
  assert.equal(response.status, 303);
  assert.equal(response.headers.get("location"), "/media-access");
  assert.match(response.headers.get("set-cookie"), /Max-Age=0/);
  assert.equal((await login(request("/media-access", await session()))).status, 303);
});

test("every serverless media endpoint independently rejects missing and forged sessions", async () => {
  process.env.MEDIA_PASSWORD = secrets.password;
  process.env.MEDIA_SESSION_SECRET = secrets.secret;
  for (const name of ["media-list", "onedrive-media", "onedrive-upload-list", "onedrive-create-upload-session", "onedrive-save-metadata", "onedrive-verify-upload", "onedrive-health"]) {
    const { handler } = require(`../netlify/functions/${name}.js`);
    for (const cookie of ["", `${COOKIE_NAME}=forged`]) {
      const response = await handler({ httpMethod: "GET", headers: { cookie } });
      assert.equal(response.statusCode, 401, name);
      assert.equal(response.headers["cache-control"], "private, no-store");
    }
  }
});

test("serverless wrapper admits signed sessions and overwrites public caching", async () => {
  const { withMediaSession } = require("../netlify/lib/require-media-session.cjs");
  const wrapped = withMediaSession(async () => ({ statusCode: 200, headers: { "cache-control": "public" }, body: "private" }));
  assert.equal((await wrapped({ headers: { cookie: await session() } })).statusCode, 200);
  delete process.env.MEDIA_PASSWORD;
  assert.equal((await wrapped({ headers: { cookie: await session() } })).statusCode, 503);
});

test("every checked-in gallery URL is covered by the gate", () => {
  const catalog = JSON.parse(readFileSync(new URL("../assets/data/media-list.json", import.meta.url)));
  for (const category of catalog.categories) {
    for (const item of [...category.photos, ...category.videos]) {
      for (const url of [item.src, item.thumbnailSrc].filter(Boolean)) assert.equal(isProtectedPath(normalizedPath(`https://wedding.test${url}`)), true, url);
    }
  }
});
