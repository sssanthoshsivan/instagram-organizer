# InstaBulk — Feature Inventory

> Every feature below has been checked against the code at git HEAD `491a3ef` and against the
> published state of the repository. "Implemented" means the *idea* is in code; it does **not**
> mean it has been verified against a live Instagram page.

## Feature Matrix

| # | Feature | Area | Status | Code location | Verified? |
|---|---|---|---|---|---|
| 1 | Detect Instagram saved page | Popup + content script | Implemented | `Popup.tsx`, `content/index.tsx` (`isOnSavedPage`) | No (DOM assumptions) |
| 2 | Bulk mode enable/disable | Popup ↔ content script | Implemented | `Popup.tsx`, `content/index.tsx` (`TOGGLE_BULK_MODE`) | No (not run against IG) |
| 3 | Inject checkboxes on saved posts | Content script | Implemented | `content/index.tsx` (`scanAndInjectCheckboxes`) | No |
| 4 | Persist bulk-mode preference | Storage | Implemented | `content/index.tsx` (`chrome.storage.local.get(['bulkMode'])`) | No |
| 5 | Navigation watcher (SPA restore) | Content script | Implemented | `content/index.tsx` (`watchForNavigation`) | No |
| 6 | Floating toolbar (count + buttons) | Content script | Implemented | `content/BulkManagerUI.tsx` + `.css` | No |
| 7 | Select/deselect posts | Content script | Implemented | `content/index.tsx` (`change` listener) | No |
| 8 | Bulk "Unsave Selected" | Content script | Implemented (loop + results) | `content/index.tsx` (`startUnsave`) | **Partially** (logical flow) |
| 9 | Processing overlay + progress | Content script | Implemented | `content/index.tsx` (`showProcessingOverlay` etc.) | No |
| 10 | Mute page media during bulk | Content script | Implemented | `content/index.tsx` (`mutePageMedia`/`restorePageMedia`) | No |
| 11 | Selection clear | Content script | Implemented | `content/index.tsx` (`clearSelection`) | No |
| 12 | "Move to Collection" | Content script | **Stub** — button has no handler | `BulkManagerUI.tsx` (`handleUnsave` unused path) | No |
| 13 | "Total Saved" counter in popup | Popup | **Not implemented** — shows `...` | `Popup.tsx` (`stats-card`) | No |
| 14 | Extension install default | Background worker | Implemented | `background/index.ts` (`onInstalled`) | N/A |
| 15 | `HEARTBEAT` / liveness check | Background worker | Implemented | `background/index.ts` | N/A |
| 16 | Cross-tab / cross-reload persistence of selection | Storage | **Intended but NOT implemented** | None | No |

## Detailed Walkthrough

### 1. Detect Instagram saved page (checkbox #1)
- `Popup.tsx` → `chrome.tabs.query({active:true,currentWindow:true})`, then checks `url.includes('instagram.com') && url.includes('/saved/')`.
- Content script → `isOnSavedPage()` regex: `/\/saved(\/|$)/` tested against `window.location.pathname.toLowerCase()`.
- **Verdict:** works for `/saved/` but breaks on `/reels/saved/` (the pop-up's "Go to Saved Posts" target). Also breaks when a username prefix appears, e.g. `/u/USERNAME/saved/`.

### 2. Bulk mode enable/disable (checkbox #2)
- `ToggleBulkMode` in the popup sets storage `bulkMode` and sends a message to the active tab.
- The content script listens to `TOGGLE_BULK_MODE` and calls `setBulkMode(active)`.
- `setBulkMode` refuses to enable on a non-saved page, shows a toast, and writes `bulkMode: false` back to storage.
- **Verdict:** logically sound; still unverified.

### 3. Inject checkboxes (checkbox #3)
- Scans `main` for `a[href*="/p/"] | a[href*="/reels/"] | a[href*="/reel/"]`.
- `findPostTileContainer` climbs parents to find the nearest ancestor that contains a **single**
  post link; uses it as the anchor for the checkbox.
- Idempotency: if a container already has `.instabulk-checkbox-container`, skip it.
- **Verdict:** selector `a[href*="/p/"]` is the classic IG post URL; reels are found by `/reels/` and
  `/reel/`; both needed because IG alternates between the two URL patterns. Unverified.

### 4. Persist bulk-mode preference (checkbox #4)
- On load, content script reads `bulkMode` from storage and (if truthy) calls `setBulkMode(true)`.
- On enabling from the popup, `chrome.storage.local.set({bulkMode:true})`.
- **Verdict:** works; survives extension reloads. It does **not** survive a full browser restart
  only because Chrome service-worker lifecycle, which is fine — it IS persisted.

### 5. Navigation watcher (checkbox #5)
- `setInterval(checkUrlChange,1000)` + `popstate` listener.
- Detects URL changes, disables bulk when leaving, and re-enables after 300ms when returning.
- **Verdict:** the 1s polling interval is acceptable for a throwaway but is a legacy pattern;
  `pushState`/`popstate` would be more precise.

### 6. Floating toolbar (checkbox #6)
- `injectUI()` renders `BulkManagerUI` into `#instabulk-toolbar-root` (React root). Re-renders are
  idempotent (root exists → return).
- Toolbar: bottom-center, `z-index:2147483647`, appears bottom:-100px then slides to bottom:24px.
- **Verdict:** visually finished; currently only rendered when bulk mode is turned on.

### 7–11. Selection / clear / progress (checkboxes #7–11)
- Checkbox `change` event adds/removes from `selectedPosts` (a `Set<string>` keyed by the raw
  `href`, which includes the domain — e.g. `https://www.instagram.com/p/123/`).
- `clearSelection()` unchecks every live checkbox DOM node, clears the Set, and fires `selection-changed`.
- The toolbar reads selection count from the content script (via `instabulk-selection-changed`).
- **Verdict:** works in-memory; does not survive reload (no storage persistence).

### 12. "Move to Collection" (checkbox #12) — **STUB**
- The button exists in the JSX with no `onClick` bound. `BulkManagerUI.tsx` exports `handleUnsave`
  which dispatches `instabulk-action-unsave`; but no matching listener or backend implementation
  exists.
- **Verdict:** intentionally planned, not implemented. It is the #1 candidate for the next
  development phase.

### 13. "Total Saved" counter (checkbox #13) — **NOT IMPLEMENTED**
- The popup stats card hardcodes `<span className="value">...</span>`.
- No API surface exists that queries the saved-posts count; IG's API is not exposed to this
  extension's permissions.
- **Verdict:** needs a product decision (what should this count? number of entities the user is
  subscribed to? items in the Saved folder?). No reliable way to derive it with current
  permissions.

### 14–15. Background worker (checkboxes #14–15)
- `onInstalled` seeds `bulkMode:false`.
- `HEARTBEAT` returns `{status:'alive'}` — a no-op if nothing else ever sends HEARTBEAT.
- **Verdict:** negligible surface; fine to leave until a background-driven feature (e.g. queued
  unsaves) is added.

### 16. Persistence of selection across reload (checkbox #16) **NOT IMPLEMENTED**
- The intention is clear from the architecture (in-memory `Set`), but nothing writes
  `selectedPosts` to `chrome.storage`.
- **Verdict:** not blocking for a v1 but should be planned; the toolbar count resets on reload.

## Outlook: what is "done" vs "works"

- **Done as code:** UI shell, toolbar rendering, storage preference persistence, checkbox
  injection plumbing, the bulk-unsave loop, the processing overlay, the media mute.
- **Blocked / unverified:** every item that touches a live Instagram DOM (checkbox #3, #6, #8–11).
  These *could* be complete in the browser but have not been exercised.
- **Missing by design:** Move to Collection, Total Saved counter, selection persistence across
  reload.

## Testability Matrix

| Feature | Unit-testable? | E2E (real Instagram) testable? | Current tooling |
|---|---|---|---|
| Storage preference | Yes | No | None |
| Navigation watcher | Yes (mock URL) | No | None |
| Checkbox injection | Yes (headless DOM) | No | None |
| Bulk unsave | No (needs real IG) | Possible (manual QA) | None |
| Popup state | Partially (mock chrome) | No | None |
| Move to Collection | Yes (event) | No | None |

**Conclusion:** the repo has no test framework installed. Any complete roadmap should include
adding a test runner (Vitest or Playwright) and an integration harness that mocks IG DOM so
checkbox injection and bulk-save loop can be unit/integration tested without a live account.
