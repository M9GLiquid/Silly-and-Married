const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const page = fs.readFileSync(path.join(root, "media.html"), "utf8");
const client = fs.readFileSync(path.join(root, "assets/js/media.js"), "utf8");
const translationClient = fs.readFileSync(path.join(root, "assets/js/auto-translate.js"), "utf8");

test("guest reviews a removable queue before explicit upload", () => {
  assert.match(page, /id="media-upload-input"[^>]*multiple/);
  assert.match(page, /id="media-upload-submit"[^>]*type="submit"[^>]*disabled/);
  assert.match(client, /media-upload-file-remove/);
  assert.match(client, /candidateIndex !== index/);
  assert.doesNotMatch(client, /startAutomaticUpload/);
});

test("error feedback is visible, announced, and includes individual failure reasons", () => {
  assert.match(page, /id="media-upload-validation"[^>]*role="status"[^>]*aria-live="polite"[^>]*aria-atomic="true"/);
  assert.match(client, /uploadValidation\.setAttribute\("role", isError \? "alert" : "status"\)/);
  assert.match(client, /entry\.error \? `\$\{copy\.failed\}: \$\{entry\.error\}`/);
  assert.match(client, /fileTooLarge: \(name, attempted, maximum\)/);
  assert.match(client, /maximum file size is \$\{maximum\}/i);
  assert.match(client, /readableUploadError/);
  assert.match(client, /failedEntries\.slice\(0, 3\)/);
});

test("upload validation loads before the gallery client", () => {
  const popupIndex = page.indexOf('src="assets/js/guest-error-popup.js?v=20260921-guest-errors"');
  const coreIndex = page.indexOf('src="assets/js/media-upload-core.js?v=20260921-guest-errors"');
  const mediaIndex = page.indexOf('src="assets/js/media.js?v=20260921-guest-errors"');
  assert.ok(popupIndex >= 0);
  assert.ok(coreIndex >= 0);
  assert.ok(coreIndex > popupIndex);
  assert.ok(mediaIndex > coreIndex);
});

test("media upload scripts use one cache-busting release version", () => {
  const version = "20260921-guest-errors";
  assert.match(page, new RegExp(`guest-error-popup\\.js\\?v=${version}`));
  assert.match(page, new RegExp(`auto-translate\\.js\\?v=${version}`));
  assert.match(page, new RegExp(`media-upload-core\\.js\\?v=${version}`));
  assert.match(page, new RegExp(`media\\.js\\?v=${version}`));
  assert.match(translationClient, new RegExp(`media-upload-hardening\\.js\\?v=${version}`));
});
