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
