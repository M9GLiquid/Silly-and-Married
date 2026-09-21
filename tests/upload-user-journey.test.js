const test = require("node:test");
const assert = require("node:assert/strict");

const upload = require("../assets/js/media-upload-core.js");

const gib = 1024 * 1024 * 1024;
const file = (name, size, type, lastModified = 1) => ({ name, size, type, lastModified });

test("guest can select a mixed photo/video batch and duplicates appear once", () => {
  const photo = file("ceremony.heic", 4 * 1024 * 1024, "", 10);
  const video = file("first-dance.mp4", 700 * 1024 * 1024, "video/mp4", 20);
  const selected = upload.dedupeFiles([photo, video, photo]);

  assert.deepEqual(selected.map((item) => item.name), ["ceremony.heic", "first-dance.mp4"]);
  assert.equal(upload.validateUploadFile(photo).kind, "picture");
  assert.equal(upload.validateUploadFile(video).kind, "video");
});

test("9 GB video is rejected with attempted and maximum sizes available to the UI", () => {
  const tooLarge = file("full-wedding-film.mp4", 9 * gib, "video/mp4");
  const result = upload.validateUploadFile(tooLarge);

  assert.equal(result.ok, false);
  assert.equal(result.code, "file_too_large");
  assert.equal(upload.formatFileSize(result.size), "9.0 GB");
  assert.equal(upload.formatFileSize(result.maxBytes), "8.0 GB");
});

test("the 8 GB boundary is accepted and one extra byte is rejected", () => {
  assert.equal(upload.validateUploadFile(file("at-limit.mp4", 8 * gib, "video/mp4")).ok, true);
  assert.equal(upload.validateUploadFile(file("over-limit.mp4", 8 * gib + 1, "video/mp4")).code, "file_too_large");
});

test("empty and unsupported files are rejected before upload starts", () => {
  assert.equal(upload.validateUploadFile(file("empty.jpg", 0, "image/jpeg")).code, "empty_file");
  assert.equal(upload.validateUploadFile(file("guest-list.pdf", 2000, "application/pdf")).code, "unsupported_file_type");
  assert.equal(upload.validateUploadFile(file("camera.MOV", 2000, "")).kind, "video");
});

test("hundreds of files use three workers and one failure does not stop later files", async () => {
  const items = Array.from({ length: 240 }, (_value, index) => index);
  let active = 0;
  let peak = 0;
  const visited = [];

  const results = await upload.runBoundedQueue(items, 3, async (item) => {
    active += 1;
    peak = Math.max(peak, active);
    await new Promise((resolve) => setImmediate(resolve));
    visited.push(item);
    active -= 1;
    if (item === 17) throw new Error("simulated network interruption");
    return item * 2;
  });

  assert.equal(peak, 3);
  assert.equal(visited.length, 240);
  assert.equal(results[17].status, "rejected");
  assert.equal(results[239].status, "fulfilled");
  assert.equal(results[239].value, 478);
});

test("queue stays bounded when fewer than three files are selected", async () => {
  let active = 0;
  let peak = 0;
  const results = await upload.runBoundedQueue(["photo", "video"], 3, async (item) => {
    active += 1;
    peak = Math.max(peak, active);
    await new Promise((resolve) => setImmediate(resolve));
    active -= 1;
    return item;
  });

  assert.equal(peak, 2);
  assert.deepEqual(results.map((result) => result.value), ["photo", "video"]);
});
