import test from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { createSession, COOKIE_NAME } from "../netlify/lib/media-auth.mjs";

const require = createRequire(import.meta.url);
const password = "test-only-password";
const secret = "test-only-session-secret-with-32-characters";
process.env.MEDIA_PASSWORD = password;
process.env.MEDIA_SESSION_SECRET = secret;
process.env.MAX_UPLOAD_MB = "8192";

const cookie = `${COOKIE_NAME}=${await createSession({ password, secret })}`;
const { handler } = require("../netlify/functions/onedrive-create-upload-session.js");
const request = (body) => ({
  httpMethod: "POST",
  headers: { cookie, "x-nf-request-id": "upload-error-journey" },
  body: JSON.stringify({
    photographer: "",
    categorySlug: "others",
    categoryName: "Others",
    ...body
  })
});

test("server explains a 9 GB rejection without contacting OneDrive", async () => {
  const originalFetch = global.fetch;
  let networkCalls = 0;
  global.fetch = async () => {
    networkCalls += 1;
    throw new Error("OneDrive must not be contacted for rejected files");
  };
  try {
    const response = await handler(request({
      fileName: "full-wedding-film.mp4",
      mimeType: "video/mp4",
      size: 9 * 1024 * 1024 * 1024
    }));
    const body = JSON.parse(response.body);

    assert.equal(response.statusCode, 400);
    assert.equal(body.code, "file_too_large");
    assert.equal(body.fileName, "full-wedding-film.mp4");
    assert.equal(body.attemptedBytes, 9 * 1024 * 1024 * 1024);
    assert.equal(body.maxBytes, 8 * 1024 * 1024 * 1024);
    assert.match(body.error, /full-wedding-film\.mp4/);
    assert.match(body.error, /9\.0 GB/);
    assert.match(body.error, /maximum file size is 8\.0 GB/i);
    assert.match(body.error, /choose a smaller file/i);
    assert.equal(body.requestId, "upload-error-journey");
    assert.equal(networkCalls, 0);
  } finally {
    global.fetch = originalFetch;
  }
});

test("server names empty and unsupported files in its response", async () => {
  const emptyResponse = await handler(request({
    fileName: "empty-photo.jpg",
    mimeType: "image/jpeg",
    size: 0
  }));
  const emptyBody = JSON.parse(emptyResponse.body);
  assert.equal(emptyBody.code, "empty_file");
  assert.match(emptyBody.error, /empty-photo\.jpg/);
  assert.match(emptyBody.error, /0 B/);

  const unsupportedResponse = await handler(request({
    fileName: "guest-list.pdf",
    mimeType: "application/pdf",
    size: 4096
  }));
  const unsupportedBody = JSON.parse(unsupportedResponse.body);
  assert.equal(unsupportedBody.code, "unsupported_file_type");
  assert.match(unsupportedBody.error, /guest-list\.pdf/);
  assert.match(unsupportedBody.error, /photo or video/i);
});

test("direct upload API access still requires the gallery session", async () => {
  const response = await handler({ ...request({ fileName: "photo.jpg", mimeType: "image/jpeg", size: 1000 }), headers: {} });
  assert.equal(response.statusCode, 401);
  assert.match(JSON.parse(response.body).error, /unlock/i);
});
