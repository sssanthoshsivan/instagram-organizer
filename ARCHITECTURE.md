# InstaBulk — Architecture

## Overview

InstaBulk is a Chrome MV3 extension. Unlike a normal React SPA, it is split into three
isolated execution contexts that communicate only through the Chrome runtime message bus and
`window` CustomEvents:

1. **Content script** — injected into `https://www.instagram.com/*`
2. **Popup** — the extension action page (small window, 320px-ish)
3. **Background service worker** — a thin module worker that survives page navigations

## Manifest (MV3)

`manifest.json`:

| Field | Value | Notes |
|---|---|---|
| `manifest_version` | `3` | Required for the Web Store |
| `name` | InstaBulk: Saved Posts Manager | Store listing name |
| `version` | `1.0.0` | Source `package.json` reports `0.0.0` (mismatch) |
| `permissions` | `["storage", "activeTab", "scripting"]` | See RELEASE_CHECKLIST for why each is needed |
| `action.default_popup` | `index.html` | The popup entry point |
| `action.default_icon` | 16/48/128 | **Bug:** referenced files are JPEG, not PNG |
| `content_scripts[].matches` | `https://www.instagram.com/*` | Entire IG domain; content script runs everywhere |
| `content_scripts[].js[0]` | `src/content/index.tsx` | Bundled by CRXJS to `assets/index.tsx-loader-*.js` |
| `content_scripts[].css[0]` | `assets/index-BAGD7hmB.css` | Bundled by CRXJS to `assets/index-*.css` |
| `background.service_worker` | `src/background/index.ts` | `type: "module"` → ES module worker |
| `icons` | 16/48/128 | Used for the toolbar and store listing |

`index.html` currently hardcodes `<script type="module" src="/src/popup/main.tsx">`, which is the
**dev-time** convention of `vite create`. The CRXJS plugin is supposed to rewrite this on build,
but because the working tree's source is missing the file, the build path is currently broken.

## Execution Contexts & Communication

```
Popup (isolated world)
  │  chrome.tabs.query(active, currentWindow)  → activeTab.url
  │  chrome.tabs.sendMessage(tabId, {type:'TOGGLE_BULK_MODE', active})
  ▼
Content script (isolated world, runs inside IG page)
  │  chrome.runtime.onMessage.addListener('TOGGLE_BULK_MODE')
  │  chrome.storage.local.get(['bulkMode'])
  │  window dispatch: instabulk-status-update / instabulk-selection-changed
  ▼
InstagramSavedManager (class in src/content/index.tsx)
  ├─ active: boolean
  ├─ bulkModeEnabled: boolean
  ├─ selectedPosts: Set<string>   ← post ids the user checked
  ├─ observer: MutationObserver   ← re-injects checkboxes on DOM mutations
  ├─ processingOverlay / mutedMedia
  └─ UI: BulkManagerUI (React) root via ReactDOM.createRoot
```

## Data Model (Storage)

Only one value is persisted to `chrome.storage.local`:

```ts
{ bulkMode: boolean }   // true → restore bulk mode on the saved page, false → off
```

Everything else (selected post IDs, progress, UI state) lives in-memory per content-script
instance. This means a fresh reload or navigation to another page wipes the selection.

## Content Script — InstagramSavedManager (src/content/index.tsx)

### Lifecycle

```
constructor() → this.init()
init(): 
  1. log "Content Script Loaded"
  2. if not on /saved/ page → log & stay inactive
  3. register chrome.runtime.onMessage listener for 'TOGGLE_BULK_MODE'
  4. read chrome.storage.local['bulkMode'] → setBulkMode(result.bulkMode)
  5. start watchForNavigation() (setInterval 1s + popstate)
```

### Navigation watching (Instagram is a SPA)

Instagram reloads routes (e.g. `/reels/saved/` → `/saved/`) via client-side navigation, so the
extension can't rely on a one-time `DOMContentLoaded`. `watchForNavigation()` polls `location.href`
every 1000ms and on `popstate`.

- Navigating **away** from the saved page → `disableBulkFeatures()` (remove UI, clear selection).
- Returning **to** the saved page with `bulkModeEnabled` → `setTimeout(() => setBulkMode(true), 300)`
  to re-scan and re-inject.

### Bulk mode enable / disable

- `enableBulkFeatures()` → add `instabulk-active` class, `injectUI()`, `scanAndInjectCheckboxes()`,
  `startObserver()`.
- `disableBulkFeatures()` → remove `instabulk-active`, clear selection, remove checkboxes, stop
  observer, remove UI.

### Checkbox injection (src/content/index.tsx → scanAndInjectCheckboxes)

- Finds `<main>` on the saved page.
- Queries `a[href*="/p/"], a[href*="/reels/"], a[href*="/reel/"]` (post / reel links).
- Walks `findPostTileContainer()` up the DOM to find the "single-post ancestor" (stops when a
  parent contains **more than one** post link).
- For the first `instabulk-checkbox-container` already inside that container, skip (idempotent).
- Creates an `<input type="checkbox" class="instabulk-checkbox" data-post-id="...">` and appends a
  `.instabulk-checkbox-container` (position: absolute, top-right) to the tile.
- Clicking the checkbox toggles `this.selectedPosts` and fires `instabulk-selection-changed`.
- `stopPropagation` on the container so the checkbox area doesn't trigger IG's post popup.

### Bulk unsave flow (src/content/index.tsx → startUnsave)

1. `showProcessingOverlay()` — hides page media (`video, audio` muted/volume 0) and shows an
   overlay card (spinner + counter).
2. For each `postId` in `selectedPosts`:
   - stop condition: `!this.active || !this.isOnSavedPage()` → break.
   - `unsaveSinglePost(postId)`:
     - `postLink = document.querySelector(a[href*="${postId}"])` → if none, false.
     - `scrollIntoView` + 500ms wait + `click`.
     - `waitForModal()` → wait for `[role="dialog"]` (up to 30 attempts, 100ms each).
     - `removeButton = svg[aria-label="Remove"] / svg[aria-label="Unsave"]` closest to
       `button, [role="button"]`; if none → `closeModal()` → false.
     - `simulateClick(removeButton)` (mousedown/up/click).
     - `waitForUnsaveCompletion(modal, removeButton)` → poll up to 30×150ms for the modal to close
       or the button to detach/change/disappear.
     - `closeModal()` → click `[aria-label*=Close]` or Dispatch Escape.
   - On success: `completed++`, remove the checkbox from the DOM, update progress.
   - On failure: `failed++`.
   - Broadcast progress via `instabulk-status-update`.
3. After the loop, `hideProcessingOverlay()` → restore all muted media.
4. Broadcast `('done', 100)`.

**Important:** `startUnsave` is *not* fully synchronous from the event handler. The content script
dispatches `instabulk-action-unsave` and relies on the loop above to mutate `selectedPosts`
(indeed `unsaveSinglePost` removes the checkbox from DOM on success). The loop also pauses 2–4s
between posts, which is to let Instagram's dialogs settle.

### UI (BulkManagerUI.tsx)

The floating toolbar (`instabulk-toolbar`, bottom-center, `z-index: 2147483647`):
- Shows a rounded gradient badge with the count of selected posts.
- In `processing` → a progress bar + `%`.
- In `done` → a green checkmark + "Completed!".
- In `idle` → three buttons: **Deselect All**, **Unsave Selected**, **Move to Collection**.
  The third is a stub — `onClick` is not bound to any logic.

## Popup (src/popup/Popup.tsx)

Single functional component. On mount:
- `chrome.tabs.query({active, currentWindow})` → if the tab url is `instagram.com` AND contains
  `/saved/` → show "Page Detected", else "Unsupported Page".
- `chrome.storage.local.get(['bulkMode'])` → show bulk mode state.
- `toggleBulkMode()` → flip state, persist to storage, then `chrome.tabs.sendMessage(...)`.

The popup also has a "Go to Saved Posts" button that opens `https://instagram.com/reels/saved/`
in a **new tab** (`window.open`), which is a blunt way to reach the saved page.

## Background Service Worker (src/background/index.ts)

- `onInstalled` → log + `storage.local.set({ bulkMode: false })`.
- `onMessage` → `HEARTBEAT` → send `({status:'alive'})`. Nothing else listens for it currently.

## CSS Architecture

Two CSS sources:
1. `src/index.css` — design tokens (`--primary-gradient`, `--bg-dark`, `--glass-bg`, etc.) plus
   global reset + `.glass-card` + button primitives. Imported **only** by the popup (`main.tsx`
   imports `../index.css`), so the content-script toolbar uses its own inline-ish CSS classes.
2. `src/content/BulkManagerUI.css` — the toolbar + checkbox styles + the processing-overlay
   styles. The CSS variable `--primary-gradient` is only defined in `src/index.css`, so the
   toolbar's `.instabulk-checkbox:checked` uses the fallback `var(--primary-gradient,
   linear-gradient(...))` and is not actually styled by that variable anywhere — the button
   classes (`.toolbar-btn.primary` etc.) use hard-coded hex (`#dc2743`).

## Assumptions About Instagram's DOM

These are the selectors the content script relies on. They are **not guaranteed** and were
validated by code reading only, not by running against a live page:

- Saved posts are inside `<main>` (the "saved posts" page layout).
- Each post/reel link matches `a[href*="/p/"], a[href*="/reels/"], a[href*="/reel/"]`.
- The post's container is the nearest ancestor holding exactly one such link.
- Clicking a post link opens a `[role="dialog"]` modal with an `svg[aria-label="Remove"]` or
  `[aria-label="Unsave"]` button inside it.
- The modal has a `[aria-label*="Close"]` close button (or Escape closes it).
- `video, audio` elements exist on the saved page and should be muted during bulk unsave.
- Instagram serves a `video` element for reels and an `article`/grid for post cards.

Because Instagram changes its DOM without notice, every one of these is a maintenance point.
