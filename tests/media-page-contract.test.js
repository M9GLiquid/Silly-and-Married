const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const page = fs.readFileSync(path.join(root, "media.html"), "utf8");
const client = fs.readFileSync(path.join(root, "assets/js/media.js"), "utf8");

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
  const coreIndex = page.indexOf('src="assets/js/media-upload-core.js"');
  const mediaIndex = page.indexOf('src="assets/js/media.js"');
  assert.ok(coreIndex >= 0);
  assert.ok(mediaIndex > coreIndex);
});
