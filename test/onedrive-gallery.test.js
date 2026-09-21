const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const {
  buildUploadedGallery,
  handler: uploadListHandler
} = require("../netlify/functions/onedrive-upload-list");
const { isAllowedMediaItem } = require("../netlify/functions/onedrive-media");

test("combines guest and manually managed media without requiring metadata", () => {
  const categories = buildUploadedGallery({
    metadataEntries: [
      {
        driveItemId: "guest-picture",
        storedFileName: "stored-photo.jpg",
        originalFileName: "Guest Photo.jpg",
        uploadedAt: "2026-08-03T00:00:00.000Z"
      }
    ],
    guestPictureItems: [
      {
        id: "guest-picture",
        name: "stored-photo.jpg",
        file: { mimeType: "image/jpeg" },
        createdDateTime: "2026-08-02T00:00:00.000Z",
        thumbnails: [{ large: { url: "https://example.test/guest-thumb.jpg" } }]
      }
    ],
    guestVideoItems: [
      {
        id: "guest-video",
        name: "Guest Clip.mp4",
        file: { mimeType: "video/mp4" },
        createdDateTime: "2026-08-01T00:00:00.000Z"
      }
    ],
    ourPictureItems: [
      {
        id: "our-picture",
        name: "Our Portrait.JPG",
        file: { mimeType: "image/jpeg" },
        createdDateTime: "2026-08-04T00:00:00.000Z",
        thumbnails: [{ medium: { url: "https://example.test/our-thumb.jpg" } }]
      },
      {
        id: "not-media",
        name: "notes.pdf",
        file: { mimeType: "application/pdf" }
      },
      {
        id: "nested-folder",
        name: "More photos",
        folder: {}
      }
    ],
    ourVideoItems: [
      {
        id: "our-video",
        name: "First Dance.MOV",
        file: { mimeType: "video/quicktime" },
        lastModifiedDateTime: "2026-08-03T12:00:00.000Z"
      }
    ]
  });

  assert.equal(categories.length, 1);
  const gallery = categories[0];
  assert.equal(gallery.slug, "all-uploads");
  assert.equal(gallery.total, 4);
  assert.deepEqual(gallery.photos.map((item) => item.id), [
    "onedrive:our-picture",
    "onedrive:guest-picture"
  ]);
  assert.equal(gallery.photos[0].source, "ours");
  assert.equal(gallery.photos[0].caption, "Our Portrait");
  assert.equal(gallery.photos[0].thumbnailSrc, "https://example.test/our-thumb.jpg");
  assert.equal(gallery.photos[1].source, "guest");
  assert.equal(gallery.photos[1].caption, "Guest Photo");
  assert.equal(gallery.photos[1].src, "/api/onedrive-media?id=guest-picture");
  assert.equal(gallery.videos[0].source, "ours");
  assert.equal(gallery.videos[1].source, "guest");
});

test("reads both OneDrive upload areas and returns one combined gallery", async () => {
  const originalFetch = global.fetch;
  process.env.MEDIA_PASSWORD = "gallery-test-password";
  process.env.MEDIA_SESSION_SECRET = "gallery-test-session-secret-at-least-32-chars";
  process.env.MS_CLIENT_ID = "client";
  process.env.MS_CLIENT_SECRET = "secret";
  process.env.MS_REFRESH_TOKEN = "refresh";
  process.env.MS_TENANT_ID = "common";
  process.env.ONEDRIVE_ROOT_FOLDER = "Wedding Ceremoni 2";
  const requestedFolders = [];

  global.fetch = async (url) => {
    const urlText = String(url);
    if (urlText.includes("/oauth2/v2.0/token")) {
      return new Response(JSON.stringify({ access_token: "access", expires_in: 3600 }), {
        status: 200,
        headers: { "content-type": "application/json" }
      });
    }
    requestedFolders.push(decodeURIComponent(urlText));
    const value = urlText.includes("Guest%20Uploads/Pictures")
      ? [{
          id: "guest-photo",
          name: "guest.jpg",
          file: { mimeType: "image/jpeg" },
          createdDateTime: "2026-08-01T00:00:00.000Z"
        }]
      : urlText.includes("Our%20Uploads/Videos")
        ? [{
            id: "our-video",
            name: "ours.mp4",
            file: { mimeType: "video/mp4" },
            createdDateTime: "2026-08-02T00:00:00.000Z"
          }]
        : [];
    return new Response(JSON.stringify({ value }), {
      status: 200,
      headers: { "content-type": "application/json" }
    });
  };

  try {
    const { createSession, COOKIE_NAME } = await import("../netlify/lib/media-auth.mjs");
    const cookie = `${COOKIE_NAME}=${await createSession({
      password: process.env.MEDIA_PASSWORD,
      secret: process.env.MEDIA_SESSION_SECRET
    })}`;
    const response = await uploadListHandler({
      httpMethod: "GET",
      headers: { cookie }
    });
    const body = JSON.parse(response.body);

    assert.equal(response.statusCode, 200);
    assert.equal(body.count, 2);
    assert.equal(body.categories.length, 1);
    assert.equal(body.categories[0].photos[0].source, "guest");
    assert.equal(body.categories[0].videos[0].source, "ours");
    assert.ok(requestedFolders.some((path) => path.includes("/Guest Uploads/Pictures")));
    assert.ok(requestedFolders.some((path) => path.includes("/Guest Uploads/Videos")));
    assert.ok(requestedFolders.some((path) => path.includes("/Our Uploads/Pictures")));
    assert.ok(requestedFolders.some((path) => path.includes("/Our Uploads/Videos")));
  } finally {
    global.fetch = originalFetch;
  }
});

test("only redirects media stored in the two approved upload areas", () => {
  assert.equal(
    isAllowedMediaItem(
      { file: {}, parentReference: { path: "/drive/root:/Wedding%20Ceremoni%202/Guest%20Uploads/Pictures" } },
      "Wedding Ceremoni 2"
    ),
    true
  );
  assert.equal(
    isAllowedMediaItem(
      { file: {}, parentReference: { path: "/drive/root:/Wedding Ceremoni 2/Our Uploads/Videos" } },
      "Wedding Ceremoni 2"
    ),
    true
  );
  assert.equal(
    isAllowedMediaItem(
      { file: {}, parentReference: { path: "/drive/root:/Wedding Ceremoni 2/Pictures" } },
      "Wedding Ceremoni 2"
    ),
    false
  );
  assert.equal(
    isAllowedMediaItem(
      { file: {}, parentReference: { path: "/drive/root:/Private/Documents" } },
      "Wedding Ceremoni 2"
    ),
    false
  );
});

test("keeps the guest upload flow simple with an explicit submit", () => {
  const root = path.join(__dirname, "..");
  const mediaClient = fs.readFileSync(path.join(root, "assets/js/media.js"), "utf8");
  const uploadCore = fs.readFileSync(path.join(root, "assets/js/media-upload-core.js"), "utf8");
  const hardeningClient = fs.readFileSync(path.join(root, "assets/js/media-upload-hardening.js"), "utf8");
  const mediaPage = fs.readFileSync(path.join(root, "media.html"), "utf8");
  const siteCss = fs.readFileSync(path.join(root, "assets/css/site.css"), "utf8");
  const uploadFunction = fs.readFileSync(
    path.join(root, "netlify/functions/onedrive-create-upload-session.js"),
    "utf8"
  );
  const galleryFunction = fs.readFileSync(
    path.join(root, "netlify/functions/onedrive-upload-list.js"),
    "utf8"
  );

  assert.match(mediaClient, /const queueSelectedUploadFiles/);
  assert.match(mediaClient, /const UPLOAD_FILE_CONCURRENCY = 3/);
  assert.match(mediaClient, /uploadCore\.runBoundedQueue/);
  assert.match(uploadCore, /Promise\.all\(Array\.from\(\{ length: Math\.min\(limit, queue\.length\) \}/);
  assert.match(mediaClient, /data-upload-index/);
  assert.match(mediaClient, /removeButton\.className = "media-upload-file-remove"/);
  assert.match(mediaClient, /candidateIndex !== index/);
  assert.match(mediaClient, /remove: "Ta bort"/);
  assert.match(mediaClient, /remove: "Odstrániť"/);
  assert.match(mediaClient, /all: "Alla"/);
  assert.match(mediaClient, /photos: "Foton"/);
  assert.match(mediaClient, /videos: "Videor"/);
  assert.match(mediaClient, /all: "Všetko"/);
  assert.match(mediaClient, /upload: "Nahrať"/);
  assert.match(mediaClient, /const applyMediaUiCopy/);
  assert.match(mediaClient, /category\.isUpload \? getMediaUiCopy\(\)\.upload/);
  assert.match(mediaClient, /mediaLogoutForm\.addEventListener\("submit"/);
  assert.match(mediaClient, /window\.location\.assign\("\/media-access"\)/);
  assert.doesNotMatch(mediaClient, /startAutomaticUpload/);
  assert.match(mediaClient, /uploadForm\.addEventListener\("submit"/);
  assert.doesNotMatch(mediaClient, /DEFAULT_UPLOAD_CATEGORY/);
  assert.doesNotMatch(mediaClient, /categoryName/);
  assert.doesNotMatch(uploadFunction, /category_required|categorySlug|categoryName/);
  assert.doesNotMatch(galleryFunction, /CATEGORY_CONFIG|categorySlug|categoryName/);
  assert.match(uploadFunction, /GUEST_UPLOADS_FOLDER/);
  assert.match(galleryFunction, /OUR_UPLOADS_FOLDER/);
  assert.match(mediaClient, /WEDDING_2026_GALLERY_SLUG = "all-uploads"/);
  assert.match(mediaClient, /let activeMediaType = "mix"/);
  assert.match(mediaClient, /type === "photos" \|\| type === "videos" \? type : "mix"/);
  assert.match(mediaClient, /const getMixedMediaItems/);
  assert.match(mediaClient, /entry\.kind === "video" \? createVideoCard/);
  assert.match(mediaClient, /categories\.filter\(\(category\) => category\.isUpload\)/);
  assert.match(siteCss, /is-category-free \.media-category-select-mobile/);
  assert.match(siteCss, /\.media-type-tabs-global\[hidden\]/);
  assert.doesNotMatch(mediaClient, /Category for \$\{file\.name\}/);
  assert.doesNotMatch(mediaClient, /No media categories found in \/media folders/);
  assert.doesNotMatch(hardeningClient, /Category for all selected files/);
  assert.match(mediaPage, /tap the upload button/i);
  assert.match(mediaPage, /id="media-upload-submit"[^>]*type="submit"[^>]*disabled/);
  assert.match(mediaPage, /id="media-logout-form"[^>]*method="post"/);
  assert.match(mediaPage, /Upload selected files/i);
  assert.match(mediaPage, /data-media-type-tab="mix"/);
  assert.match(mediaPage, /data-media-type-tab="mix"[\s\S]*?All/);
  assert.match(mediaPage, /data-media-type-label/);
  assert.match(mediaPage, /id="media-mix-grid"/);
  assert.ok(
    mediaPage.indexOf('data-media-type-tab="mix"') < mediaPage.indexOf('data-media-type-tab="photos"'),
    "All should be the first media filter"
  );
  assert.doesNotMatch(mediaPage, /media-upload-photographer-modal/);
  assert.doesNotMatch(mediaPage, /Select category for each file/);
});

test("allows large files while keeping the limit configurable", () => {
  const root = path.join(__dirname, "..");
  const uploadFunction = fs.readFileSync(
    path.join(root, "netlify/functions/onedrive-create-upload-session.js"),
    "utf8"
  );

  assert.match(uploadFunction, /const DEFAULT_MAX_UPLOAD_MB = 8192/);
  assert.match(uploadFunction, /process\.env\.MAX_UPLOAD_MB \|\| DEFAULT_MAX_UPLOAD_MB/);
});
