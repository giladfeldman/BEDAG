# BEDAG — per-project lessons (R1 sink)

Every bug fixed in this project gets a one-line entry here, written by the
cleanup/qa/review/deploy skills as part of the spine-gate R1 contract.

Format: `<YYYY-MM-DD> · <skill> · <one-line description of bug + fix>`

---

2026-09-16 · v1.0.3 (12749a6) · `homepage_url` under `browser_specific_settings.gecko` is not a valid property — Firefox warned on every load; moved to top-level manifest.json.
2026-09-16 · v1.0.3 (12749a6) · `browser_action` had no `default_icon` — the toolbar button rendered blank and BEDAG could not be picked out among pinned icons; added `default_icon`.
2026-09-16 · v1.0.3 (12749a6) · AMO requires new submissions to declare data collection — added `data_collection_permissions: {"required": ["none"]}`.
2026-09-16 · v1.0.3 (12749a6) · `deleteIcon()` in rules.js used innerHTML, tripping AMO's UNSAFE_VAR_ASSIGNMENT warning — switched to cloning a `<template>`; validation is now 0 errors/0 warnings/0 notices.
2026-09-16 · v1.0.3 (12749a6) · popup.html hard-coded version string `1.0.1` had drifted from manifest.json (`1.0.2`) — replaced with `chrome.runtime.getManifest().version`.
2026-09-16 · v1.0.3 (12749a6) · Two hand-maintained build-include lists could drift from each other — added `web-ext-config.mjs` as the single `PACKAGED` source of truth for both build scripts.
2026-09-16 · v1.0.3 (12749a6) · Release Firefox refuses to permanently install an unsigned extension (reload-after-every-restart) — added `scripts/sign-firefox.ps1` for Mozilla unlisted signing via env/`.env.local` credentials.
2026-09-16 · v1.0.3 (12749a6) · Local `.git` directory was corrupted, blocking commits — replaced with a fresh clone.
2026-09-16 · bedag-cleanup · `web-ext sign` writes `.amo-upload-uuid` (upload id + xpi hash) to the repo root; it was neither gitignored nor tracked, risking an accidental commit — added to `.gitignore`.
2026-09-16 · v1.0.4 · The icon was inherited from the upstream fork (three stacked diamonds in Google's four colours) and was hard to tell apart from the official add-on in the toolbar — replaced with a two-tone indigo/amber badge carrying a white B; `images/logo.svg` redrawn to match and verified against the PNG by rasterising both.
2026-09-17 · v1.0.4 · Removing an add-on DELETES its extension storage, so swapping a temporary install for a signed one loses every rule even though the add-on ID is unchanged. Confirmed in Firefox's storage-sync-v2.sqlite: BEDAG's row came back with the same ID and activeProfileId but rules=[], and the official add-on removed in the same pass lost its row entirely. An unchanged ID is necessary for storage to be reused, not sufficient — the install docs and bedag-deploy now say export first, import after, rather than claiming rules carry over.
2026-09-17 · v1.0.5 · Import and export never worked from the toolbar popup on Firefox: the browser dismisses an extension popup as soon as a file picker or download prompt opens (bugzilla 1658694, 1384190), destroying the page before input[type=file] can fire its change event — so Import silently did nothing, with no error. Inherited from the upstream Chrome extension, where popups survive a file dialog. Both buttons now open popup.html?view=tab, Mozilla's documented workaround, and the tab lands on Import / Export.
2026-09-17 · v1.0.5 · web-ext returned the signed 1.0.5 under the SAME filename as the unsigned build, so either could have been shipped in place of the other. Build output is now bedag-<version>-unsigned.xpi and the signed copy bedag-<version>-signed.xpi; sign-firefox.ps1 identifies the signed file by META-INF/mozilla.rsa rather than by name, because the name AMO returns is not stable.
2026-09-17 · v1.0.6 (b8e90ff) · popup.html doubles as a full page via `?view=tab` (1.0.5), but styles.css sized the document as a 480x600 popup with `overflow:hidden` on both html and body, pinning scrollHeight at 720 while the import tab's content was 1063px — everything below the fold was unreachable with no way to scroll. Fixed by opting the tab layout into an explicit `as-tab` class (overflow auto, no height cap, 680px centred) instead of inheriting popup sizing. Found by /bedag-review reading styles.css, outside the diff under review.
2026-09-17 · release · Pushing four tags in one `git push` produced ZERO workflow runs: GitHub creates no events when more than three tags arrive at once, so no release was built and nothing errored on either side. Deleting the remote tags and pushing them one at a time produced four runs. bedag-deploy now pushes one tag per push.
2026-09-17 · release · A bare `gh` command resolved to the UPSTREAM fork (diegomarzaa/default.wtf), not giladfeldman/BEDAG, because this repo has an `upstream` remote. check-release-parity.mjs was therefore asking whether the upstream repo had our releases, and reported v1.0.2 as missing a release it has had since May. Every gh call now passes --repo, derived from the origin URL, and the report prints which repo it checked.

