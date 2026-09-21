const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const output = path.join(root, "dist");
// Publish an explicit allowlist, never the repository root or its local secrets.
fs.rmSync(output, { recursive: true, force: true });
fs.mkdirSync(output, { recursive: true });
for (const entry of ["index.html", "travel.html", "story.html", "media.html", "assets", "images", "images-thumbs", "media", "media-thumbs"]) {
  const source = path.join(root, entry);
  if (fs.existsSync(source)) fs.cpSync(source, path.join(output, entry), { recursive: true });
}
console.log("Built public site files in dist (server code and secrets excluded).");
