# Changelog

All notable changes to [BEDAG](https://github.com/giladfeldman/BEDAG) are documented here.

Format based on [Keep a Changelog](https://keepachangelog.com/).  
BedAG **1.0.0** is the first public release under the BEDAG name and repository.

Earlier development used internal version numbers (2.x); that history is summarized below.

---

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

[1.0.0]: https://github.com/giladfeldman/BEDAG/releases/tag/v1.0.0
