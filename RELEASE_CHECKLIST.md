# InstaBulk — Release Checklist

> Use this checklist before **any** publish, merge, or store submission. The extension targets
> the **Chrome Web Store**, not Firefox/Edge (Manifest V3 differs in the store manifests).
> Nothing below is publishable in its current state.

---

## 1. Build & Versioning

- [ ] `npm run build` completes with exit code 0.
- [ ] `tsc -b` type-checks with no errors (the `build` script runs it first).
- [ ] `eslint .` passes (or is configured to allow baseline errors).
- [ ] No `console.log` statements left in production (content/popup/background).
- [x] `manifest.json` `version` matches `package.json` `version` (both `1.0.0`).
- [ ] Version bumped per semver (1.0.0 → 1.0.x for minor patches, 1.x.0 for features).
- [ ] `dist/` is a clean build artifact (delete and rebuild before packaging).

---

## 2. Permissions Audit

Chrome Web Store reviews permissions against what the extension actually uses. Current:
`["storage", "activeTab", "scripting"]`.

- [ ] `storage` — required for `chrome.storage.local` (bulkMode state).
- [ ] `activeTab` — required for `chrome.tabs.query/sendMessage` against the active tab (popup→content).
- [ ] `scripting` — only needed if `chrome.scripting` is actually used at runtime. Current code does
       **not** call `chrome.scripting.executeScript`, so this permission may be **removable** and reduce
       review friction. Verify before submitting.
- [ ] Confirm no other permission is present in the final manifest (e.g. `cookies`, `tabs`,
       `unlimitedStorage`).
- [ ] Confirm content-script host permission is exactly `https://www.instagram.com/*` (no wildcard
       `http://*`, no `<all_urls>`).

---

## 3. Security & Privacy

- [ ] No network requests are made outside `instagram.com` (grep for `fetch`/`XMLHttpRequest`/`axios`/`socket`).
- [ ] No API keys, secrets, or hardcoded credentials anywhere in the repo (lint with `detect-secrets`
       or review manually).
- [ ] Content script does not read or exfiltrate data outside the DOM it injects into.
- [ ] No `storage` data is sent to a remote server; all state stays in Chrome storage.
- [ ] No third-party scripts are loaded (no CDN scripts in `index.html` or content script).
- [ ] `web_accessible_resources` only exposes what the content script needs (currently:
       `jsx-runtime` + `index.tsx` — verify these are still necessary).
- [ ] Manifest `action.default_icon` paths resolve to valid PNGs (debugging: `dist/manifest.json`
       and installed-extension manifest must match).
- [ ] No `eval`, `new Function`, or dangerous DOM parsing.
- [ ] Error handling on `unsaveSinglePost` is defensive (caught, logged, never throws into the UI).

---

## 4. Functionality Verification (Human Test)

The following **manual QA** steps must be passed on a live Instagram account before submission:

1. Load the extension unpacked (`chrome://extensions` → Developer mode → Load unpacked → `dist`).
2. No console errors in the extension panel or the IG page.
3. Navigate to `https://www.instagram.com/reels/saved/` (or `/saved/`).
4. Popup shows "Page Detected".
5. Enable "Bulk Edit Mode" in the popup.
6. Verify checkboxes appear on every post tile (and none on reel cards that are not in the saved grid).
7. Select 3 posts.
8. Click "Unsave Selected" → processing overlay appears, media is muted.
9. Verify each post's modal opens, "Unsave" is clicked, and the item disappears from the saved list.
10. Verify the counter updates (X completed, Y failed, Z remaining) and the overlay closes after all succeed.
11. Verify "Deselect All" clears selection.
12. Verify navigating away and back re-enables bulk mode (for an SPA).
13. Verify selecting then reloading keeps/removes selection per the persistence decision (Phase 3).

---

## 5. Store Listing Assets

Chrome Web Store requires these, but they are **not** in the repo yet:

- [x] **Icon**: valid 128×128 PNG (plus 48 and 16 variants) — already present and
      valid (PNG, 16/48/128).
- [ ] **Promo icon / screenshot(s)**: UI screenshots showing the toolbar + a selected post.
- [ ] **Store description**: use `manifest.json` `description`, plus a longer marketing description
       (this is what the user sees in the store).
- [ ] **Category**: "Productivity" (or the closest valid category).
- [ ] **Privacy policy URL**: the store requires one; if none exists, a `privacy-policy.md` page hosted
       somewhere (or a minimal policy statement that covers the extension's data handling).
- [ ] **Support email / contact**: store listing fields for feedback/crash reports.

---

## 6. Icons — Verified

Icons are valid PNGs (16×16, 48×48, 128×128). No defect to fix.

- [x] `icons/icon16.png`, `icon48.png`, `icon128.png` are valid PNGs (header check).
- [x] Referenced by `manifest.json` `action.default_icon` and `icons`.

---

## 7. Compatibility Notes for Instagram

Instagram changes its DOM frequently. These are the selectors that will break most often:

| Selector | Likely to break | Mitigation |
|---|---|---|
| `a[href*="/p/"]` / `a[href*="/reels/"]` | IG URL scheme changes | Add a test harness + a "selector version" that can be updated quickly |
| `svg[aria-label="Remove"]` / `svg[aria-label="Unsave"]` | Modal button labels change | Write factory: try Remove, then Unsave, then generic `[aria-label*="Save"]` close button |
| `[role="dialog"]` | Modal role changes | Fall back to `[role="dialog"]` then `div[role="dialog"]`, then `article[role="dialog"]` |
| `main` element | IG structural changes | Fall back to `._aa_f` / `[role="main"]`, or `window._sharedData` |
| `video, audio` | Reels might not always include `video`/`audio` on saved page | Guard with `document.querySelectorAll` returning empty safely (code already does) |

A mitigation plan (not covered by current scope) is to add a light "selector config" object that can
be versioned with the release and hot-patched.

---

## 8. Publishing Check (final)

Only after every item above is checked:

- [ ] **Do not merge to `main`** until the user approves.
- [ ] Take a **release tag**: `git tag v1.0.0`.
- [ ] Build `dist/` one final time from the tagged commit.
- [ ] Load `dist/` in Chrome and complete the manual QA in §4.
- [ ] Prepare the store ZIP: `zip -r instagram-organizer-v1.0.0.zip . -x node_modules dist .git`
- [ ] Submit to Chrome Web Store (developer account needed) via the Web Store publisher tool.
- [ ] After publish, verify the store listing opens and the extension installs via "Web Store"
       (not packed) once.

---

## Immediate Next Steps (for the team)

1. Generate store screenshots + a longer store description (write `STORE_DESCRIPTION.md`).
2. Write the privacy-policy page URL (minimal policy statement).
3. Optional: remove the unused `scripting` permission.
4. Re-run `npm run build` + `npm test` (green) before packaging.
5. Tag the release and submit to the Chrome Web Store.

## Branch Policy

- All work happens on `feature/...` branches.
- **Nothing is merged to `main` and nothing is published to the Chrome Web Store
  without the user's explicit approval.**
