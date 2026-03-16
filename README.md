# Thomas & Annamária Wedding Website

This repository contains the wedding website for **Thomas & Annamária**.
It provides practical guest information (schedule, travel, lodging, maps,
and RSVP) and tells our story in a lightweight static site.

## Wedding Details

- Couple: **Thomas & Annamária**
- Wedding date: **Saturday, July 25, 2026**
- Location: **Trenčín region, Slovakia**

## Project Description

The site is designed to be simple to host, easy to update, and friendly on
both desktop and mobile. Content is organized across dedicated pages:

- `index.html` — main wedding overview and schedule
- `travel.html` — guest logistics, travel guidance, and local events
- `media.html` — photo and video galleries
- `story.html` — the couple's story

The goal is to give guests one clear place to find all important information:
timeline, venues, practical travel details, accommodation guidance, and RSVP.

## What Guests Can Find

- Wedding day schedule and venue details
- Travel planning from Vienna to Slovakia/Trenčín
- Local recommendations and activities (events from `assets/data/events.json`)
- Media galleries (photos and videos)
- Story page with timeline moments and photos
- RSVP flow and contact options
- Language switcher (EN, SK, SV) via Google Translate

## Tech Stack

- Static HTML/CSS/JS with **Tailwind CSS**
- Media thumbnails generated via `tools/generate-media-thumbs.js`
- Media catalog built at build time via `tools/generate-media-list.js`
- Hosted on **Netlify** (build command: `npm run build`)

## Project Notes

- This is a static website, intentionally simple to maintain.
- Content is written for readability first, with mobile and desktop support.
- Gallery data: `images/gallery.json`, `assets/data/events.json`, `assets/data/media-catalog.json`.

## How We Built It

### Design (Stitch / Google experimental project)

We used **Stitch** (Google experimental project) as an early design lab to
quickly explore multiple directions before writing final code. We created
several end-to-end prototypes and also iterated on individual pages/tabs to
test structure, visual tone, and information flow.

Stitch gave us a strong starting point for layout and page composition, but it
was never treated as a fixed final design. As the project evolved, we adjusted
and replaced parts of the original output to better match our content, wedding
story, and practical guest needs.

Final design decisions were then further refined jointly by me and my wife.

- [Stitch](https://stitch.withgoogle.com/)

### Development (Cursor)

We used **Cursor** with **Plan mode** and a split model strategy:

- **GPT-5.3 Codex High** for complex tasks and harder reasoning.
- **GPT-5.3 Codex Medium** for feature-level implementation.
- **GPT-5.3 Codex Low | Composer 1.5** for most day-to-day coding tasks.

This separation helped balance quality, speed, and cost: higher-capability
models for difficult work, lighter models for routine implementation.

- [Cursor](https://www.cursor.com/)

### Coding Approach (Vibe Coding)

Implementation followed a **vibe coding** workflow: rapid iteration, frequent
visual checks, and pragmatic improvements focused on user experience.

Coding was done by **me + AI**.

## Run Locally

From the project root:

**Option 1 — Netlify Dev** (includes API routes):

```bash
npm run dev:netlify
```

**Option 2 — Simple HTTP server:**

```bash
python -m http.server 4173
```

Then open:

- `http://127.0.0.1:4173/index.html` (or `http://localhost:8888` with Netlify)
- `http://127.0.0.1:4173/travel.html`
- `http://127.0.0.1:4173/media.html`
- `http://127.0.0.1:4173/story.html`

## Build

```bash
npm run build
```

Generates `assets/data/media-list.json` from the media folder. For thumbnail generation:

```bash
npm run media:thumbs
```

## Experimental Note

This project is explicitly an **experiment in Agentic and Vibe Coding**.
It explores how AI-assisted, agent-driven workflows can accelerate building a
real, personal website while keeping the process collaborative and practical.
