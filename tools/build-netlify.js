#!/usr/bin/env node

const fs = require("fs");
const path = require("path");

const projectRoot = path.resolve(__dirname, "..");
const publishRoot = path.join(projectRoot, "dist");
const mediaListPath = path.join(projectRoot, "assets", "data", "media-list.json");
const publishMediaListPath = path.join(publishRoot, "assets", "data", "media-list.json");

const skippedDirectories = new Set([
  ".git",
  ".github",
  ".netlify",
  "dist",
  "media",
  "netlify",
  "node_modules",
  "screenshots",
  "screenshot",
  "tools"
]);

const skippedFiles = new Set([
  ".env",
  ".gitignore",
  "netlify.toml",
  "package-lock.json",
  "package.json",
  "tasks.md"
]);

const copyDirectory = (source, destination) => {
  fs.mkdirSync(destination, { recursive: true });
  fs.readdirSync(source, { withFileTypes: true }).forEach((entry) => {
    if (entry.isDirectory() && skippedDirectories.has(entry.name)) return;
    if (entry.isFile() && skippedFiles.has(entry.name)) return;

    const sourcePath = path.join(source, entry.name);
    const destinationPath = path.join(destination, entry.name);

    if (entry.isDirectory()) {
      copyDirectory(sourcePath, destinationPath);
      return;
    }
    if (entry.isFile()) {
      fs.mkdirSync(path.dirname(destinationPath), { recursive: true });
      fs.copyFileSync(sourcePath, destinationPath);
    }
  });
};

const rewriteMediaListForLeanDeploy = () => {
  if (!fs.existsSync(publishMediaListPath)) return;
  const data = JSON.parse(fs.readFileSync(publishMediaListPath, "utf-8"));
  const categories = Array.isArray(data.categories) ? data.categories : [];

  categories.forEach((category) => {
    const photos = Array.isArray(category.photos) ? category.photos : [];
    category.photos = photos
      .filter((photo) => photo.thumbnailSrc)
      .map((photo) => ({
        ...photo,
        src: photo.thumbnailSrc
      }));
    category.videos = [];
    category.total = category.photos.length;
  });

  data.count = categories.reduce((total, category) => total + category.total, 0);
  data.source = "lean-netlify-media";
  fs.writeFileSync(publishMediaListPath, JSON.stringify(data), "utf-8");
};

fs.rmSync(publishRoot, { recursive: true, force: true });
require("./generate-media-list");
copyDirectory(projectRoot, publishRoot);
rewriteMediaListForLeanDeploy();

if (!fs.existsSync(path.join(publishRoot, "index.html"))) {
  throw new Error("Netlify publish output is missing index.html");
}

console.log("netlify-build: created lean publish output in dist");
