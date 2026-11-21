# InstaBulk — Roadmap

> A phased plan from the current pre-production snapshot (git HEAD `491a3ef`) to a stable,
> production-ready Chrome Web Store release. **Nothing below is merged to `main` or published
> without explicit user approval.** Work happens on feature branches.

## Current State Summary

- ✅ 15 of 16 inventory features are at least *coded*.
- 🔴 4 hard blockers prevent `npm run build`: `src/` is deleted from the working tree, `icons/`
  has JPEG payloads, `node_modules` is missing.
- 🟡 Every feature that interacts with a live Instagram DOM is **unverified**.
- ⚠️ `Move to Collection` is a stub; `Total Saved` is a placeholder; selection is not persisted.

---

## Phase 0 — Project Restoration (this week)

Goal: a green `npm run build` and a clean `main`.

| Task | How | Acceptance |
|---|---|---|
| Restore deleted source | `git checkout HEAD -- src icons` (or `git restore`) | `src/content/index.tsx`, `src/popup/*`, `src/background/index.ts`, `icons/*` exist and are unchanged from HEAD |
| Install dependencies | `npm install` | `node_modules` present; `npx tsc --version` works |
| Fix icon format | Recreate `icon16/48/128.png` as real PNGs (22802-byte JPEG payloads are invalid for MV3 icons) | `file` reports PNG; manifest icon references resolve |
| Clear stale dist/ | Delete `dist/` before every build | `npm run build` output is fresh |

> Note: in a real project, icons would be generated from an SVG source; here we treat them as
> assets requiring a design hand-off.

---

## Phase 1 — Restore Core (Week 1)

Goal: a working, buildable extension that a human can open in a dev browser.

| Task | Branch | Details |
|---|---|---|
| Restore source + fix icons | `feature/restore-core` | Restore from git; regenerate icons; `npm run lint` clean; `npm run build` clean |
| Verify the build manifest | `feature/restore-core` | Confirm `dist/manifest.json` is MV3 + correct icon paths |
| Popup smoke test | `feature/popup-smoke` | Open `index.html` in a browser; confirm bulk-mode toggle toggles state in storage |

---

## Phase 2 — Verified Core (Week 2)

Goal: every feature that touches Instagram is exercised and demonstrably working.

| Task | Branch | Details |
|---|---|---|
| Restore saved-page detection logic | `feature/detect-page` | Fix `isOnSavedPage` to match `/saved/`, `/reels/saved/`, and `/u/<user>/saved/`; unit-test regexes |
| Verify checkbox injection | `feature/checkbox-injection` | E2E harness that mocks the IG DOM; assert a checkbox appears per post link |
| Verify bulk unsave loop | `feature/bulk-unsave` | Integration test: select N posts, run `startUnsave`, assert completed count, error handling, stop conditions |
| Verify processing overlay | `feature/processing-overlay` | Assert overlay appears, media muted during run, restored after |
| Selection persistence | `feature/persist-selection` | Write `selectedPosts` to `chrome.storage` on change; restore on content-script load |

---

## Phase 3 — Production Hardening (Week 3)

Goal: close the gaps that cause store rejection or crashes.

| Task | Branch | Details |
|---|---|---|
| Build the "Move to Collection" feature | `feature/move-collection` | Needs a product decision: which collection? Requires new permission or IG API? Stub → user-facing error |
| Fix "Total Saved" | `feature/total-saved` | Product decision needed on semantics; if possible, derive from storage + IG DOM; otherwise placeholder |
| CI / lint / typecheck | `feature/ci` | Add `CI=true` gate: `tsc -b && vite build && eslint .` |
| Add a test runner | `feature/testing` | Vitest for content-script logic; Playwright for the extension UI |
| De-orbit stale code | `feature/deprecate` | Remove `onInstalled`, `HEARTBEAT` dead code if unused |

---

## Phase 4 — Store Readiness (Week 4)

Goal: the extension is safe, compliant, and presentable for the Web Store.

| Task | Branch | Details |
|---|---|---|
| Store assets | `feature/store-assets` | Screenshot(s), privacy policy URL, category, one-line + long description (use `manifest.json` description + origin; the `description` field is what shows in the store) |
| Permissions audit | `feature/permissions` | Justify `activeTab`/`scripting` (used for the popup→content message). `storage` is required. No host permissions beyond IG — confirm no data exfiltration surface |
| Security & privacy review | `feature/privacy` | No network requests outside IG. No API keys. Manifest permissions are minimal. Content script only touches `document`/`window`. |
| Install & verify | `feature/verify` | Load unpacked → enable → navigate to saved page → click bulk mode → check boxes → give feedback → inspect DOM vs IG selectors |
| Update icons + favicon | `feature/icons` | Real PNG icons + SVG favicon for `index.html` |

---

## Critical Decisions for the User (before I start Phase 2)

These are product questions that materially change the roadmap. **Please answer before I proceed:**

1. **Move to Collection**: Should it post-unsave the item to a user-owned IG collection (needs
   IG private API access / additional permissions) or should it be a stub that shows a notice?
2. **Total Saved counter**: What should it display? (a) number of items in the Saved folder
   (impossible with current permissions), (b) number of items the extension has selected in the
   current session, or (c) a placeholder. Choose one.
3. **Selection persistence**: Should selecting a post survive a reload? (yes → adds `storage`
   writes; no → leave as-is)
4. **Auth permissions**: The extension has no Instagram login flow. Should it add a "Connect"
   screen that authenticates with Instagram so it can perform authenticated actions, or is it
   strictly a UI helper that drives the user to click "Unsave" themselves?
5. **Popup vs side-panel**: Chrome now supports side panels. Should the UI live in a side panel
   instead of a popup for more room?

---

## Exit Criteria for "Production-Ready"

The extension is considered production-ready only when **all** of the following are true:

- `npm run build` succeeds on CI with zero errors.
- `npm run lint` passes with no warnings treated as errors.
- The extension loads in Chrome as "Unpacked" without warnings.
- The saved-page workflow (enable → select → unsave) is verified on a **live** Instagram page
  with at least 3 posts, by a human tester.
- All `unsaveSinglePost` paths are covered by a test (or, for live DOM, a QA pass).
- Icons are valid PNGs and resolve in the manifest.
- `dist/` is committed-free (or a build artifact), and `manifest.json` version matches
  `package.json` version.
- Store listing (description, screenshot, privacy policy) is drafted and approved.
- No `console.log` spam in production builds.
