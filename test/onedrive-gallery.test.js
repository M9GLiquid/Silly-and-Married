const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const { buildUploadedCategories } = require("../netlify/functions/onedrive-upload-list");
const { isAllowedMediaItem } = require("../netlify/functions/onedrive-media");

test("maps uploaded photos and videos into their selected categories", () => {
  const categories = buildUploadedCategories({
    metadataEntries: [
      {
        driveItemId: "picture-item",
        storedFileName: "new-photo.jpg",
        categorySlug: "church",
        photographer: "Anna",
        uploadedAt: "2026-08-03T00:00:00.000Z"
      },
      {
        storedFileName: "legacy-video.mp4",
        categorySlug: "dancing",
        uploadedAt: "2026-08-02T23:00:00.000Z"
      }
    ],
    pictureItems: [
      {
        id: "picture-item",
        name: "new-photo.jpg",
        thumbnails: [{ large: { url: "https://example.test/photo-thumb.jpg" } }]
      }
    ],
    videoItems: [{ id: "video-item", name: "legacy-video.mp4" }]
  });

  const church = categories.find((category) => category.slug === "church");
  const dancing = categories.find((category) => category.slug === "dancing");
  assert.equal(church.total, 1);
  assert.equal(church.photos[0].caption, "Wedding photo by Anna");
  assert.equal(church.photos[0].thumbnailSrc, "https://example.test/photo-thumb.jpg");
  assert.equal(church.photos[0].src, "/api/onedrive-media?id=picture-item");
  assert.equal(dancing.total, 1);
  assert.equal(dancing.videos[0].src, "/api/onedrive-media?id=video-item");
});

test("only redirects media stored in wedding upload folders", () => {
  assert.equal(
    isAllowedMediaItem(
      { file: {}, parentReference: { path: "/drive/root:/Wedding%20Ceremoni%202/Pictures" } },
      "Wedding Ceremoni 2"
    ),
    true
  );
  assert.equal(
    isAllowedMediaItem(
      { file: {}, parentReference: { path: "/drive/root:/Wedding Ceremoni 2/Videos" } },
      "Wedding Ceremoni 2"
    ),
    true
  );
  assert.equal(
    isAllowedMediaItem(
      { file: {}, parentReference: { path: "/drive/root:/Private/Documents" } },
      "Wedding Ceremoni 2"
    ),
    false
  );
});

test("keeps a separate category selector on every upload row", () => {
  const root = path.join(__dirname, "..");
  const mediaClient = fs.readFileSync(path.join(root, "assets/js/media.js"), "utf8");
  const hardeningClient = fs.readFileSync(path.join(root, "assets/js/media-upload-hardening.js"), "utf8");

  assert.match(mediaClient, /Category for \$\{file\.name\}/);
  assert.doesNotMatch(mediaClient, /No media categories found in \/media folders/);
  assert.doesNotMatch(hardeningClient, /Category for all selected files/);
});
