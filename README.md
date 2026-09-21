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

Copies the public site into `dist/` using an explicit allowlist. Local environment
files, tools, tests, Git files, and server code are never published. The checked-in
media list is preserved because the original `media/` folder is optional. To
regenerate the list when the original media folder is available, run
`npm run media:list`. For thumbnail generation:

```bash
npm run media:thumbs
```

## Private media access

Netlify Edge Functions protect the entire media page, local media and thumbnails,
media catalogs, and OneDrive APIs (including their direct function URLs).
Each serverless function also validates the session independently. The other
website pages remain public. Guests enter one shared password at `/media-access`;
an HttpOnly, Secure cookie remembers access for seven days. **Lock gallery** clears
that browser's cookie. Changing either secret below invalidates existing sessions.

Before deployment, set these in **Netlify → Project configuration → Environment
variables**, with **Functions** scope, for every deployed context/site:

- `MEDIA_PASSWORD`: the agreed guest password, supplied privately.
- `MEDIA_SESSION_SECRET`: a random secret with at least 32 characters. Generate
  one with `node -e "console.log(require('node:crypto').randomBytes(32).toString('hex'))"`.

Never put the real values in Git, HTML, JavaScript, `netlify.toml`, screenshots,
or CI output. For local development use the ignored `.env` file and Netlify Dev;
an ordinary static HTTP server does **not** enforce the gate. Missing secrets
block access rather than exposing media. The login route is configured for 20
requests per IP/domain per minute; confirm Netlify accepts the rate-limit rule in
the deployment log. Authentication responses and protected content use no-store.

Deploy with the repository's `netlify.toml` (publish directory `dist/`) and verify
signed-out page, JSON, image, and direct function requests are blocked. Then verify
login, gallery, uploads, and logout in the deployed site. Repeat for any separate
development site. Older immutable Netlify deployment URLs are not retroactively
protected and should be removed or restricted separately if they expose media.

The website gate cannot make photos already committed to a public GitHub
repository private, or recall copies previously downloaded by guests. Use a
private repository/private storage for those files as well. OneDrive's temporary
download and thumbnail links can be shared until they expire.

The deployment checks use a GitHub Actions secret named `MEDIA_PASSWORD` to log
in, never a checked-in password. Set it privately before running authenticated
deployment checks. See [Netlify environment variable documentation](https://docs.netlify.com/build/edge-functions/environment-variables/).

Guest uploads use resumable 5 MiB OneDrive chunks and process up to three files
at once. This bounded queue supports hundreds of selected photos and videos
without starting every upload simultaneously on a guest's device. The default
per-file limit is 8 GiB; set `MAX_UPLOAD_MB` in Netlify to override it for every
deploy context.

## Experimental Note

This project is explicitly an **experiment in Agentic and Vibe Coding**.
It explores how AI-assisted, agent-driven workflows can accelerate building a
real, personal website while keeping the process collaborative and practical.
