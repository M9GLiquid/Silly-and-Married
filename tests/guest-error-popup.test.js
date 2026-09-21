const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const popup = fs.readFileSync(path.join(root, "assets/js/guest-error-popup.js"), "utf8");
const login = fs.readFileSync(path.join(root, "assets/js/media-login.js"), "utf8");
const media = fs.readFileSync(path.join(root, "assets/js/media.js"), "utf8");
const hardening = fs.readFileSync(path.join(root, "assets/js/media-upload-hardening.js"), "utf8");

test("guest error popup is modal, focusable, dismissible, and translated", () => {
  assert.match(popup, /role", "alertdialog"/);
  assert.match(popup, /aria-modal", "true"/);
  assert.match(popup, /current\.closeButton\.focus\(\)/);
  assert.match(popup, /event\.key === "Escape"/);
  assert.match(popup, /event\.target === backdrop/);
  assert.match(popup, /Niečo sa nepodarilo/);
  assert.match(popup, /Något gick fel/);
  assert.match(popup, /textContent = normalizedMessage/);
});

test("password control switches between hidden and visible text", () => {
  assert.match(login, /passwordInput\.type === "password"/);
  assert.match(login, /passwordInput\.type = reveal \? "text" : "password"/);
  assert.match(login, /aria-pressed", String\(reveal\)/);
  assert.match(login, /Hide password/);
});

test("every guest media error path opens the shared popup", () => {
  assert.match(login, /weddingGuestError\?\.show\(message\)/);
  assert.equal((media.match(/weddingGuestError\?\.show\(message\)/g) || []).length, 2);
  assert.match(hardening, /weddingGuestError\?\.show\(message\)/);
});
