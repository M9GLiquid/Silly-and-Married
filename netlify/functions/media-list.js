const fs = require("fs");
const path = require("path");

const MEDIA_ROOT = path.resolve(__dirname, "../../media");
const CATALOG_PATH = path.resolve(__dirname, "../../assets/data/media-catalog.json");
const FAVORITES_FOLDER = "Favorites";
const IMAGE_EXTENSIONS = new Set([".jpg", ".jpeg", ".png", ".webp"]);
const VIDEO_EXTENSIONS = new Set([".mp4", ".webm", ".mov", ".m4v"]);
const MAX_ITEMS_PER_CATEGORY = 800;
const RESPONSE_CACHE_TTL_MS = 5 * 60 * 1000;
let cachedResponse = null;
let cachedAtMs = 0;

const slugify = (value) =>
  String(value || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "") || "category";

const toMediaUrl = (absolutePath) => {
  const relative = path.relative(MEDIA_ROOT, absolutePath);
  const normalized = relative.split(path.sep).map(encodeURIComponent).join("/");
  return `/media/${normalized}`;
};

const toThumbUrl = (absolutePath) => {
  const relative = path.relative(MEDIA_ROOT, absolutePath);
  const relativeWebp = relative.replace(/\.[^/.]+$/, ".webp");
  const normalized = relativeWebp.split(path.sep).map(encodeURIComponent).join("/");
  return `/media-thumbs/${normalized}`;
};

const toCaption = (absolutePath) => {
  const fileName = path.basename(absolutePath, path.extname(absolutePath));
  return fileName.replace(/[_-]+/g, " ").trim() || "Wedding memory";
};

const readCatalogMap = () => {
  if (!fs.existsSync(CATALOG_PATH)) {
    return { includeUnmapped: true, entries: [] };
  }

  try {
    const raw = JSON.parse(fs.readFileSync(CATALOG_PATH, "utf-8"));
    const categories = Array.isArray(raw.categories) ? raw.categories : [];
    const entries = categories
      .map((category) => ({
        folder: String(category.folder || "").trim(),
        name: String(category.name || "").trim(),
        slug: String(category.slug || "").trim()
      }))
      .filter((entry) => entry.folder.length > 0);
    return {
      includeUnmapped: raw.includeUnmapped !== false,
      entries
    };
  } catch (_error) {
    return { includeUnmapped: true, entries: [] };
  }
};

const listRootFolders = () =>
  fs
    .readdirSync(MEDIA_ROOT, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name);

const walkMedia = (dirPath) => {
  const entries = fs.readdirSync(dirPath, { withFileTypes: true });
  const files = [];
  entries.forEach((entry) => {
    const absolute = path.join(dirPath, entry.name);
    if (entry.isDirectory()) {
      files.push(...walkMedia(absolute));
      return;
    }
    if (!entry.isFile()) return;
    const extension = path.extname(entry.name).toLowerCase();
    const type = IMAGE_EXTENSIONS.has(extension) ? "photo" : VIDEO_EXTENSIONS.has(extension) ? "video" : "";
    if (!type) return;
    files.push({
      absolutePath: absolute,
      type,
      stat: fs.statSync(absolute)
    });
  });
  return files;
};

const listFavoritePhotoNames = () => {
  const favoritesPath = path.join(MEDIA_ROOT, FAVORITES_FOLDER);
  if (!fs.existsSync(favoritesPath)) return new Set();
  const entries = walkMedia(favoritesPath).filter((entry) => entry.type === "photo");
  return new Set(entries.map((entry) => path.basename(entry.absolutePath).toLowerCase()));
};

const mapMediaItem = (entry, favoritePhotoNames) => ({
  id: path.relative(MEDIA_ROOT, entry.absolutePath).split(path.sep).join("/"),
  type: entry.type,
  caption: toCaption(entry.absolutePath),
  src: toMediaUrl(entry.absolutePath),
  thumbnailSrc: entry.type === "photo" ? toThumbUrl(entry.absolutePath) : "",
  isFavorite:
    entry.type === "photo" && favoritePhotoNames.has(path.basename(entry.absolutePath).toLowerCase())
});

exports.handler = async () => {
  try {
    const now = Date.now();
    if (cachedResponse && now - cachedAtMs < RESPONSE_CACHE_TTL_MS) {
      return cachedResponse;
    }

    if (!fs.existsSync(MEDIA_ROOT)) {
      const emptyResponse = {
        statusCode: 200,
        headers: { "content-type": "application/json; charset=utf-8" },
        body: JSON.stringify({ source: "media-folders", categories: [], count: 0 })
      };
      cachedResponse = emptyResponse;
      cachedAtMs = now;
      return emptyResponse;
    }

    const { includeUnmapped, entries } = readCatalogMap();
    const rootFolders = listRootFolders();
    const folderLookup = new Map(rootFolders.map((folder) => [folder.toLowerCase(), folder]));
    const ordered = [];

    entries.forEach((entry) => {
      const matchedFolder = folderLookup.get(entry.folder.toLowerCase());
      if (!matchedFolder) return;
      ordered.push({
        folder: matchedFolder,
        name: entry.name || matchedFolder,
        slug: entry.slug || slugify(entry.name || matchedFolder)
      });
    });

    if (includeUnmapped) {
      rootFolders.forEach((folder) => {
        if (ordered.some((entry) => entry.folder.toLowerCase() === folder.toLowerCase())) return;
        ordered.push({
          folder,
          name: folder,
          slug: slugify(folder)
        });
      });
    }

    const favoritePhotoNames = listFavoritePhotoNames();
    const categories = ordered.map((config) => {
      const folderPath = path.join(MEDIA_ROOT, config.folder);
      const entriesInFolder = walkMedia(folderPath)
        .sort((left, right) => right.stat.mtimeMs - left.stat.mtimeMs)
        .slice(0, MAX_ITEMS_PER_CATEGORY);
      const photos = entriesInFolder
        .filter((entry) => entry.type === "photo")
        .map((entry) => mapMediaItem(entry, favoritePhotoNames));
      const videos = entriesInFolder
        .filter((entry) => entry.type === "video")
        .map((entry) => mapMediaItem(entry, favoritePhotoNames));
      return {
        name: config.name,
        slug: config.slug,
        folder: config.folder,
        photos,
        videos,
        total: photos.length + videos.length
      };
    });

    const count = categories.reduce((sum, category) => sum + category.total, 0);

    const response = {
      statusCode: 200,
      headers: {
        "content-type": "application/json; charset=utf-8",
        "cache-control": "public, max-age=300, s-maxage=300"
      },
      body: JSON.stringify({
        source: "media-folders",
        count,
        categories
      })
    };
    cachedResponse = response;
    cachedAtMs = now;
    return response;
  } catch (error) {
    return {
      statusCode: 500,
      headers: { "content-type": "application/json; charset=utf-8" },
      body: JSON.stringify({
        error: "Failed to build media list",
        details: error instanceof Error ? error.message : "Unknown error"
      })
    };
  }
};

