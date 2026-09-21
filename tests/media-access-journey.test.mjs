import test from "node:test";
import assert from "node:assert/strict";
import guard from "../netlify/edge-functions/media-guard.js";
import login from "../netlify/edge-functions/media-login.js";

const values = {
  MEDIA_PASSWORD: "journey-password",
  MEDIA_SESSION_SECRET: "journey-session-secret-with-32-characters"
};
globalThis.Netlify = { env: { get: (name) => values[name] } };
const request = (path, options = {}) => new Request(`https://wedding.test${path}`, options);
const neverReachPrivateContent = { next: () => { throw new Error("private content leaked"); } };

test("guest goes from locked page to gallery and back to locked page", async () => {
  const locked = await guard(request("/media.html"), neverReachPrivateContent);
  assert.equal(locked.status, 303);
  assert.match(locked.headers.get("location"), /^\/media-access/);

  const wrong = await login(request("/media-access", {
    method: "POST",
    headers: { origin: "https://wedding.test", "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ password: "wrong" })
  }));
  assert.equal(wrong.status, 401);
  assert.match(await wrong.text(), /password doesn(?:'|’)t look right|incorrect/i);
  assert.equal(wrong.headers.get("set-cookie"), null);

  const unlocked = await login(request("/media-access", {
    method: "POST",
    headers: { origin: "https://wedding.test", "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ password: values.MEDIA_PASSWORD })
  }));
  assert.equal(unlocked.status, 303);
  const cookie = unlocked.headers.get("set-cookie");
  assert.match(cookie, /HttpOnly/);

  let galleryReached = false;
  const gallery = await guard(request("/media.html", { headers: { cookie } }), {
    next: () => {
      galleryReached = true;
      return new Response("gallery");
    }
  });
  assert.equal(galleryReached, true);
  assert.equal(await gallery.text(), "gallery");
  assert.equal(gallery.headers.get("cache-control"), "private, no-store");

  const logout = await login(request("/media-access?logout=1", {
    method: "POST",
    headers: { origin: "https://wedding.test", cookie }
  }));
  assert.equal(logout.status, 303);
  assert.match(logout.headers.get("set-cookie"), /Max-Age=0/);
});

test("protected catalog, media bytes and upload API all fail closed", async () => {
  for (const path of [
    "/assets/data/media-list.json",
    "/media-thumbs/private.webp",
    "/api/onedrive-upload-list",
    "/api/onedrive-create-upload-session"
  ]) {
    const response = await guard(request(path), neverReachPrivateContent);
    assert.ok([401, 303].includes(response.status), `${path} returned ${response.status}`);
    assert.equal(response.headers.get("cache-control"), "private, no-store");
  }
});
