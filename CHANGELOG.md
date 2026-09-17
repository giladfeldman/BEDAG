# Changelog

All notable changes to [BEDAG](https://github.com/giladfeldman/BEDAG) are documented here.

Format based on [Keep a Changelog](https://keepachangelog.com/).  
BEDAG **1.0.0** is the first public release under the BEDAG name and repository.

Earlier development used internal version numbers (2.x); that history is summarized below.

---

## [Unreleased]

## [1.0.5] — 2026-09-17

### Fixed

- **Import and export never worked from the popup on Firefox.** Firefox dismisses an extension
  popup the moment a file picker or download prompt opens
  ([bug 1658694](https://bugzilla.mozilla.org/show_bug.cgi?id=1658694),
  [bug 1384190](https://bugzilla.mozilla.org/show_bug.cgi?id=1384190)), which destroys the page
  before `input[type=file]` can fire its `change` event — so **Import** appeared to do nothing at
  all, with no error. Inherited from the upstream Chrome extension, where popups survive a file
  dialog. Both buttons now open BEDAG in a tab (`popup.html?view=tab`), which is Mozilla's
  documented workaround, and the tab lands directly on Import / Export.

### Changed

- [docs/INSTALL-XPI.md](docs/INSTALL-XPI.md) now says to **export before removing an add-on and
  import after installing**. It previously claimed rules carry over because the add-on ID does not
  change. An unchanged ID is necessary for storage to be reused but not sufficient: uninstalling
  an add-on deletes the storage held under that ID.

## [1.0.4] — 2026-09-16

### Changed

- **New icon.** The old mark — three stacked diamonds in Google's four colours — was inherited
  from the upstream fork and was hard to tell apart from the official add-on's icon in a crowded
  toolbar. Replaced with a two-tone indigo/amber badge carrying a white **B**: a different
  silhouette and a different palette, so the two are distinguishable at 16 px. `images/logo.svg`
  was redrawn to match, and the 1024 px master is kept in `assets/` (not packaged).

## [1.0.3] — 2026-09-16

### Added

- **Permanent install.** `scripts/sign-firefox.ps1` submits the build to Mozilla for unlisted
  signing, producing an `.xpi` that installs via `about:addons` and survives a Firefox restart.
  Release Firefox refuses to permanently install unsigned extensions, so this was previously
  impossible — see [docs/INSTALL-XPI.md](docs/INSTALL-XPI.md).
- **Toolbar icon.** `browser_action` now declares `default_icon`; without it the toolbar button
  rendered blank and BEDAG was impossible to find among pinned extensions.
- `data_collection_permissions: { required: ["none"] }` — BEDAG collects no data, and
  addons.mozilla.org requires new submissions to say so explicitly.
- Build tooling: `package.json` + `web-ext`, with `web-ext-config.mjs` as the single source of
  truth for what ships inside the package. `npm run lint` validates against AMO's rules.
- Shareable unsigned Firefox package: `scripts/package-firefox.ps1` → `dist/bedag-<version>.xpi`
- [docs/INSTALL-XPI.md](docs/INSTALL-XPI.md) — install steps for recipients
- GitHub Actions workflow lints, tests, and uploads the `.xpi` on version tags

### Fixed

- **Manifest load warning.** `homepage_url` was nested inside `browser_specific_settings.gecko`,
  where it is not a valid property; Firefox reported “an unexpected property was found in the
  WebExtension manifest” on every load. It now sits at the top level.
- **Version shown in the popup** was hard-coded to `1.0.1` and had drifted from the manifest. It
  now reads from `chrome.runtime.getManifest()`.
- The delete-rule icon is cloned from a `<template>` instead of assigned through `innerHTML`,
  clearing AMO's `UNSAFE_VAR_ASSIGNMENT` warning. Validation is now clean: 0 errors, 0 warnings.
- Typos: “Eefault” in docs/MIGRATION.md, “BedAG” in this file.

## [1.0.2] — 2026-05-30

### Fixed

- **Flights vs Travel** — `/travel/flights` no longer matches the Travel rule; scoring prefers Flights on flight URLs
- **Account 0** — Removes `authuser` / `/u/N` instead of setting `authuser=0` (reduces Google ping-pong)
- **Auth/sign-in URLs** — No redirects on `accounts.google.com`, sign-in paths, or similar
- **Import** — Background reloads profiles and refreshes accounts immediately after import
- **Redirect cycles** — Detects alternating `authuser` indices, not only identical URLs
- **New tabs** — Skips redirect when opened from an existing Google tab (avoids double redirect)
- **Rules** — Ignores rules with non-numeric `accountId` during matching
- **Docs subpaths** — Higher match score for Docs/Sheets/Slides/Forms on `docs.google.com`
- **service-worker.js** — Restored corrupted first-line comment

### Added

- `docs/CODE_REVIEW.md` — Review notes and residual risks
- `SECURITY.md` — Permissions and reporting
- Export payload: `bedagVersion`, format version `2.1`
- Expanded `scripts/test-url-match.js` assertions

## [1.0.1] — 2026-05-30

### Fixed

- **Maps authuser loop** (`?authuser=1` ↔ `?authuser=0`) — per-tab ping-pong detection stops fighting Google when it rejects an account index; `webNavigation` no longer re-redirects URLs that already have `authuser`
- **Account index** — `authuser=N` now follows ListAccounts **row order** only (field `[7]` was not always the authuser index and could force the wrong account)
- Treat URLs with no `authuser` param as already on account 0 when the rule targets 0 (Google often omits `authuser=0`)

## [1.0.0] — 2026-05-30

### Added

- Public release as **BEDAG** (Better Default Account Google)
- Repository: [github.com/giladfeldman/BEDAG](https://github.com/giladfeldman/BEDAG)
- Documentation: README, CONTRIBUTING, ATTRIBUTION, MIGRATION, TESTING
- Extension ID: `bedag@giladfeldman.github` (separate from official AMO add-on)

### Changed

- Display name and branding: **BEDAG** throughout popup and manifest
- Export filename default: `bedag-settings.json`

### Includes (from pre-1.0.0 development)

- Profiles, rules inheritance, import/export (diegomarzaa/default.wtf lineage)
- Firefox MV2 `webRequest` blocking redirects; Maps / path-based Google URLs
- Google account list via in-tab `ListAccounts` + `postMessage` parser
- Rule specificity fix (Search `google.com` vs `/maps`, `/scholar`, …)
- Background load fix (no duplicate `utils.js`); popup account-fetch fallback
- Scrollable popup; 55+ services with updated catalogue URLs
- Conflict detection when official Default Google Account add-on is enabled

---

## Pre-BEDAG development history (summary)

<details>
<summary>Technical notes from the Firefox fork (versions 2.1.0 – 2.3.2)</summary>

### 2.3.2
- Fix background crash (`utils.js` loaded twice)
- Popup fallback for account fetch

### 2.3.1
- ListAccounts via Google tab + credentials
- postMessage parser; account index by row order
- Always show accounts in popup; Refresh button

### 2.3.0
- Unique extension ID (no longer shared with official AMO)
- docs/MIGRATION.md

### 2.2.1
- Maps redirect / Search rule specificity
- Rule dedupe by `serviceName`; legacy URL normalization

### 2.2.0
- webRequest blocking; persistent background
- Updated service URLs (Maps, Finance, Looker Studio, …)

### 2.1.0
- Firefox packaging; scroll fixes; Scholar/Sheets
- Legacy v1.14 JSON import; profile migration helpers

### Upstream (diegomarzaa / uptechteam)
- Original default.wtf redirect model, service catalogue, Alt+1–9 shortcuts
- See [docs/ATTRIBUTION.md](docs/ATTRIBUTION.md)

</details>

[1.0.5]: https://github.com/giladfeldman/BEDAG/releases/tag/v1.0.5
[1.0.4]: https://github.com/giladfeldman/BEDAG/releases/tag/v1.0.4
[1.0.3]: https://github.com/giladfeldman/BEDAG/releases/tag/v1.0.3
[1.0.2]: https://github.com/giladfeldman/BEDAG/releases/tag/v1.0.2
[1.0.1]: https://github.com/giladfeldman/BEDAG/releases/tag/v1.0.1
[1.0.0]: https://github.com/giladfeldman/BEDAG/releases/tag/v1.0.0
