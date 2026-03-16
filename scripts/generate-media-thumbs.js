#!/usr/bin/env node
const fs = require("fs");
const path = require("path");
const sharp = require("sharp");

const ROOT = path.resolve(__dirname, "..");
const MEDIA_ROOT = path.resolve(ROOT, "media");
const THUMBS_ROOT = path.resolve(ROOT, "media-thumbs");
const IMAGE_EXTENSIONS = new Set([".jpg", ".jpeg", ".png", ".webp"]);
const THUMB_WIDTH = 720;
const THUMB_QUALITY = 76;

const ensureDir = (dirPath) => {
  fs.mkdirSync(dirPath, { recursive: true });
};

const walkFiles = (dirPath) => {
  const entries = fs.readdirSync(dirPath, { withFileTypes: true });
  const files = [];
  entries.forEach((entry) => {
    const absolute = path.join(dirPath, entry.name);
    if (entry.isDirectory()) {
      files.push(...walkFiles(absolute));
      return;
    }
    if (!entry.isFile()) return;
    files.push(absolute);
  });
  return files;
};

const isImage = (filePath) => IMAGE_EXTENSIONS.has(path.extname(filePath).toLowerCase());

const toThumbPath = (sourcePath) => {
  const relative = path.relative(MEDIA_ROOT, sourcePath);
  const targetRelative = relative.replace(/\.[^/.]+$/, ".webp");
  return path.join(THUMBS_ROOT, targetRelative);
};

const needsRebuild = (sourcePath, thumbPath) => {
  if (!fs.existsSync(thumbPath)) return true;
  const sourceStat = fs.statSync(sourcePath);
  const thumbStat = fs.statSync(thumbPath);
  return sourceStat.mtimeMs > thumbStat.mtimeMs;
};

const buildThumb = async (sourcePath, thumbPath) => {
  ensureDir(path.dirname(thumbPath));
  await sharp(sourcePath)
    .rotate()
    .resize({ width: THUMB_WIDTH, withoutEnlargement: true })
    .webp({ quality: THUMB_QUALITY })
    .toFile(thumbPath);
};

const run = async () => {
  if (!fs.existsSync(MEDIA_ROOT)) {
    console.log("No media folder found, nothing to thumbnail.");
    return;
  }

  const allFiles = walkFiles(MEDIA_ROOT);
  const imageFiles = allFiles.filter(isImage);
  let created = 0;
  let skipped = 0;

  for (const sourcePath of imageFiles) {
    const thumbPath = toThumbPath(sourcePath);
    if (!needsRebuild(sourcePath, thumbPath)) {
      skipped += 1;
      continue;
    }
    await buildThumb(sourcePath, thumbPath);
    created += 1;
  }

  console.log(`Thumbnails done. Created/updated: ${created}, up-to-date: ${skipped}.`);
};

run().catch((error) => {
  console.error("Failed generating media thumbnails:", error instanceof Error ? error.message : error);
  process.exit(1);
});

