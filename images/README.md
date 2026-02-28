# Wedding photos

Edit `gallery.json` to control all site images.

## Main photo (home polaroid)

```json
"main": {
  "src": "images/venue/venue3.png",
  "alt": "Romantic view of zelenýdeň wedding venue in Bošáca."
}
```

## Church & Venue galleries

- `src` — base directory (e.g. `images/church/`)
- `photos` — array of `{ "name": "filename.jpg", "caption": "..." }`

## Event cards (Travel page)

Each event (pohoda, castle, trencin2026, beckov, thingsToDo) has:

- `src` — base directory for local images, or `""` when using URLs
- `photos` — array; each photo has one source and a caption. Mix and match:
  - **URL**: `{ "src": "https://...", "caption": "..." }`
  - **Local**: `{ "name": "photo.jpg", "caption": "..." }` (uses base `src` + name)
