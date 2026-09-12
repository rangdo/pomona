# Pomona — fruit tree journal

A private, offline-first photo journal for fruit trees. Photograph your trees
through the year, tag what you see (parts, conditions, treatments, harvests),
and build a story per plant you can later analyse to learn what makes them
thrive.

**All data stays on the phone.** No accounts, no servers, no tracking. The
hosted website is only a delivery mechanism for the app.

## Features (Phase 1)

- **Plants** — add each tree with name, variety, species, planted date,
  location and a photo
- **Garden map** — split the garden into named beds on a schematic board
  (1 square ≈ 25 cm); drag beds into place, drop plants into them, tap a
  plant to open its journal. Existing data is untouched (schema upgrades are
  additive)
- **Observations** — take a photo (or pick from gallery), tag the plant part
  (blossom, fruit, leaf…), condition (healthy, pest damage…), treatments
  (pruned, fertilized…), plus fruit count, harvest weight and notes
- **Auto-captured metadata** — date/time from the camera EXIF, GPS if the
  camera tags it
- **Timeline** — month-grouped history per plant, newest first
- **Edit anything** — every observation can be corrected afterwards (date,
  time, plant, photo, tags, harvest numbers, notes)
- **Offline & installable** — PWA: install from the browser, works with no
  signal, data persisted via IndexedDB

## Stack

Vite + React + TypeScript · Tailwind CSS · Dexie (IndexedDB) · exifr ·
vite-plugin-pwa. No backend.

## Publish it (one-time, ~5 minutes)

1. Create a **public** GitHub repo named `pomona` (empty, no README).
2. From this folder:

   ```bash
   git add -A
   git commit -m "Pomona Phase 1"
   git remote add origin https://github.com/<your-username>/pomona.git
   git push -u origin main
   ```

3. On GitHub: repo → **Settings → Pages → Source: GitHub Actions**.
   (The included workflow deploys automatically on every push to `main`.)

The app will be at `https://<your-username>.github.io/pomona/`.

## Install on your phone (her phone)

1. Open the URL in Chrome (needs internet once).
2. Menu → **Add to home screen** → install. An "Install" banner also appears
   inside the app.
3. From then on it launches full-screen from the home screen and works
   completely offline. Data lives in the phone's browser storage.

## Daily use tips

- **New observation** takes you to the capture flow: pick the plant, take a
  photo, tap tags, save. "Save & add another" for rapid logging.
- Photos are compressed (long edge 1600 px) and also stored as small
  thumbnails, so years of photos still fit comfortably in phone storage.
- The app requests persistent storage from the browser to protect data from
  automatic cleanup.

## Data safety

Everything is stored locally in the browser (IndexedDB). Currently the only
backup is Phase 2's export feature; until then, avoid clearing Chrome's site
data for this app. Deleting the app from the home screen does **not** delete
the data, but "clear browsing data" will.

## Roadmap

- **Phase 2** — insights (flowering/fruiting dates per year, treatment vs
  yield), CSV/JSON+photos export, custom tag editor
- **Phase 3** — weather auto-lookup, reminders, optional backup sync

## Development

```bash
npm install
npm run dev        # local dev server
npm run build      # typecheck + production build
npm run preview    # serve the production build
npm test           # unit tests (vitest + fake-indexeddb)
npm run test:e2e   # browser tests (Playwright, builds first)
npm run check      # both suites — run before pushing
npm run icons      # regenerate PWA icons into public/
```

Requires Node 22+ (via nvm: `nvm install --lts`). Browser tests additionally
need `npx playwright install chromium` once.
