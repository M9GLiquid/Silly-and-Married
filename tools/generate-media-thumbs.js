#!/usr/bin/env node
const fs = require("fs");
const path = require("path");
const sharp = require("sharp");

const ROOT = path.resolve(__dirname, "..");
const MEDIA_ROOT = path.resolve(ROOT, "media");
const THUMBS_ROOT = path.resolve(ROOT, "media-thumbs");
const IMAGES_ROOT = path.resolve(ROOT, "images");
const IMAGES_THUMBS_ROOT = path.resolve(ROOT, "images-thumbs");
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

const toThumbPath = (sourcePath, sourceRoot, targetRoot) => {
  const relative = path.relative(sourceRoot, sourcePath);
  const targetRelative = relative.replace(/\.[^/.]+$/, ".webp");
  return path.join(targetRoot, targetRelative);
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
    const thumbPath = toThumbPath(sourcePath, MEDIA_ROOT, THUMBS_ROOT);
    if (!needsRebuild(sourcePath, thumbPath)) {
      skipped += 1;
      continue;
    }
    await buildThumb(sourcePath, thumbPath);
    created += 1;
  }

  console.log(`Media thumbnails: created ${created}, up-to-date ${skipped}.`);

  if (fs.existsSync(IMAGES_ROOT)) {
    const imageDirs = ["church", "venue"];
    let imgCreated = 0;
    let imgSkipped = 0;

    for (const dir of imageDirs) {
      const dirPath = path.join(IMAGES_ROOT, dir);
      if (!fs.existsSync(dirPath)) continue;
      const files = walkFiles(dirPath).filter(isImage);
      for (const sourcePath of files) {
        const thumbPath = toThumbPath(sourcePath, dirPath, path.join(IMAGES_THUMBS_ROOT, dir));
        if (!needsRebuild(sourcePath, thumbPath)) {
          imgSkipped += 1;
          continue;
        }
        await buildThumb(sourcePath, thumbPath);
        imgCreated += 1;
      }
    }

    const rootImages = fs.readdirSync(IMAGES_ROOT, { withFileTypes: true })
      .filter((e) => e.isFile() && isImage(path.join(IMAGES_ROOT, e.name)))
      .map((e) => path.join(IMAGES_ROOT, e.name));
    for (const sourcePath of rootImages) {
      const thumbPath = toThumbPath(sourcePath, IMAGES_ROOT, IMAGES_THUMBS_ROOT);
      if (!needsRebuild(sourcePath, thumbPath)) {
        imgSkipped += 1;
        continue;
      }
      await buildThumb(sourcePath, thumbPath);
      imgCreated += 1;
    }

    const eventsDir = path.join(IMAGES_ROOT, "events");
    if (fs.existsSync(eventsDir)) {
      const eventFolders = fs.readdirSync(eventsDir, { withFileTypes: true })
        .filter((e) => e.isDirectory())
        .map((e) => e.name);
      for (const folder of eventFolders) {
        const dirPath = path.join(eventsDir, folder);
        const files = walkFiles(dirPath).filter(isImage);
        for (const sourcePath of files) {
          const thumbPath = toThumbPath(sourcePath, dirPath, path.join(IMAGES_THUMBS_ROOT, "events", folder));
          if (!needsRebuild(sourcePath, thumbPath)) {
            imgSkipped += 1;
            continue;
          }
          await buildThumb(sourcePath, thumbPath);
          imgCreated += 1;
        }
      }
    }

    console.log(`Images thumbnails (church, venue, pohoda, events): created ${imgCreated}, up-to-date ${imgSkipped}.`);
  }
};

run().catch((error) => {
  console.error("Failed generating media thumbnails:", error instanceof Error ? error.message : error);
  process.exit(1);
});

