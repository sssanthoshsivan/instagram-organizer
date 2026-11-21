# InstaBulk — Project Overview

## What This Project Is

**InstaBulk: Saved Posts Manager** is a Chrome (Manifest V3) browser extension that lets users
bulk-save/unsave Instagram posts. It injects a floating toolbar into the Instagram "Saved"
page, lets the user checkbox individual saved posts, and then either "Unsave Selected" posts in
bulk or (in a not-yet-implemented state) "Move to Collection".

- **Name:** InstaBulk (display), `InstaBulk: Saved Posts Manager` (store name)
- **Version:** 1.0.0 (manifest), `0.0.0` (source package)
- **Repo root:** `C:\Users\sssan\Desktop\Code\instagram-organizer`
- **Git HEAD:** `491a3ef` — "Improve bulk unsave processing flow"
- **Git history:** 2 commits (`65bbdc1` initial → `491a3ef` bulk-flow improvements)

## Tech Stack

| Layer | Choice |
|---|---|
| Manifest | Chrome Manifest V3 |
| UI framework | React 19 + React DOM 19 |
| Language | TypeScript ~5.9.3 |
| Bundler | Vite 8.0.1 |
| Extension build | `@crxjs/vite-plugin` ^2.4.0 |
| Linting | ESLint 9 + typescript-eslint |
| Icons | `icons/icon{16,48,128}.png` (currently invalid: see RELEASE_CHECKLIST) |
| Storage | `chrome.storage.local` (single `bulkMode` key) |

## Repository Layout

```
instagram-organizer/
├── manifest.json              # MV3 manifest (entry point for the extension)
├── package.json               # node build devDependencies
├── vite.config.ts             # Vite + @crxjs/vite-plugin config
├── index.html                 # popup page (loads src/popup/main.tsx)
├── eslint.config.js
├── tsconfig*..json            # 3 TS configs (app, node, workspace)
├── README.md                  # Vite template boilerplate (not project-specific)
├── dist/                      # stale production build output (do not trust)
├── src/
│   ├── content/               # content script (Instagram page injection)
│   │   ├── index.tsx          # InstagramSavedManager (the core logic)
│   │   ├── BulkManagerUI.tsx  # floating toolbar (React)
│   │   └── BulkManagerUI.css
│   ├── popup/                 # extension popup
│   │   ├── main.tsx
│   │   ├── Popup.tsx
│   │   └── Popup.css
│   ├── background/            # service worker (minimal)
│   │   └── index.ts
│   ├── index.css              # CSS variables (dark theme)
│   ├── vite-env.d.ts            # <reference types="vite/client" /> + chrome
│   └── assets/                # hero.png, react.svg, vite.svg
├── icons/
│   ├── icon16.png, icon48.png, icon128.png  # contents = JPEG headers, see notes
└── node_modules/              # NOT installed (use `npm install`)
```

## How the Pieces Fit

1. User clicks the extension toolbar icon → **popup** (`index.html` → `src/popup/main.tsx`).
2. Popup asks Chrome "what tab is active?" and sends a `TOGGLE_BULK_MODE` message.
3. **Content script** (`src/content/index.tsx`) runs on every `instagram.com` page, listens for
   that message, and (when `bulkMode` is true) scans the saved-posts page to inject checkboxes
   and a floating toolbar on top of the page.
4. When "Unsave Selected" is clicked, the content script iterates the selected post IDs, opens
   each post's unsave modal, clicks "Remove/Unsave", and reports progress via
   `window` CustomEvents (`instabulk-status-update`, `instabulk-selection-changed`).
5. The **background service worker** is only used for `onInstalled` initialization + a
   dead `HEARTBEAT` message handler — it is not on the critical path for any feature.

## How to Run / Build

```bash
cd C:\Users\sssan\Desktop\Code\instagram-organizer
npm install            # node_modules is missing — this is required first
npm run dev            # Vite dev server (HMR)
npm run build          # tsc -b && vite build   →  dist/
npm run preview        # local preview of dist
```

> **Blockers before any of the above works:** `node_modules` is absent (cannot `npm run build`),
> `src/` and `icons/` are deleted in the working tree (recovering from git is needed),
> and the three `icon*.png` files are JPEG payloads, not PNG — Chrome will reject them.

## Key Constraints & Honesty Notes

- **This is pre-production / in flux.** The codebase is a working-but-incomplete demo. It is
  not release-ready and must not be shared or published as-is.
- **"Move to Collection" does not exist yet.** The toolbar has a third button with that label
  and an empty `onClick`, so nothing happens. It is counted as *planned*, not implemented.
- **Popup "Total Saved" is a placeholder** (`...`). No API for counting total saved posts has
  been implemented.
- **No test suite exists.** No `jest`, `vitest`, or test files are present anywhere.
- **Instagram UI compatibility is unverified against a live site.** The DOM selectors used to
  find posts and modal "Unsave" buttons are guesses based on Instagram's DOM at a point in time
  and will drift.
