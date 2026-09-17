# BEDAG — Better Default Account Google

[![License: BSD-3-Clause](https://img.shields.io/badge/License-BSD%203--Clause-blue.svg)](LICENSE)

**BEDAG** is a Firefox extension that opens Google services (Gmail, Maps, Drive, Meet, Calendar, Scholar, Sheets, YouTube, and dozens more) with the Google account **you** choose — via per-service rules, named profiles, and one-click account switching.

Repository: [github.com/giladfeldman/BEDAG](https://github.com/giladfeldman/BEDAG)

> BEDAG is a community fork. It is **not** the official [Default Google Account](https://addons.mozilla.org/en-US/firefox/addon/default-google-account/) add-on on Mozilla Add-ons. You can install both, but **enable only one** at a time (both redirect Google URLs).

## Why BEDAG exists

If you use multiple Google accounts, the wrong inbox or Maps profile opens by default. BEDAG adds `?authuser=N` (or equivalent) **before** the page loads, using rules you control.

BEDAG builds on [default.wtf](https://www.default.wtf/) / [uptechteam/default.wtf](https://github.com/uptechteam/default.wtf) and [diegomarzaa/default.wtf](https://github.com/diegomarzaa/default.wtf), with Firefox-specific fixes (Maps redirects, account detection, profiles, import/export). See [docs/ATTRIBUTION.md](docs/ATTRIBUTION.md) and [NOTICE.md](NOTICE.md).

## Features

| Feature | Description |
|---------|-------------|
| **Per-service rules** | e.g. Gmail → work account, Maps → personal |
| **Profiles** | Separate rule sets (Default, Work, …) with inheritance |
| **Quick switch** | Switch the active tab’s account from the toolbar popup |
| **Account refresh** | Detects signed-in accounts from Google (Refresh in popup) |
| **Import / export** | JSON backup; supports legacy v1.14 `{ rules, defaultAccount }` |
| **55+ services** | Updated URLs (`google.com/maps`, Looker Studio, AI Studio, …) |
| **Shortcuts** | Alt+1–9 (configure under `about:addons` → Manage → Shortcuts) |

## Install (Firefox)

BEDAG is not published on addons.mozilla.org. Pick one:

### Option A — Signed build (installs permanently)

Release Firefox only installs extensions Mozilla has signed. Sign your own build with a free
add-on developer account — the add-on stays unlisted and is never published:

```powershell
npm ci
.\scripts\sign-firefox.ps1
```

Then `about:addons` → gear icon → **Install Add-on From File…** → pick the signed `.xpi` from
`dist/`. It survives restarts. Credentials and full steps:
[docs/INSTALL-XPI.md](docs/INSTALL-XPI.md).

### Option B — Unsigned `.xpi` (reload after every restart)

1. Get **`bedag-<version>-unsigned.xpi`** from [GitHub Releases](https://github.com/giladfeldman/BEDAG/releases).
2. Open `about:debugging#/runtime/this-firefox` → **Load Temporary Add-on…** → select the `.xpi`.
3. Follow steps 4–7 below.

Full steps and troubleshooting: [docs/INSTALL-XPI.md](docs/INSTALL-XPI.md).

### Option C — Clone and load source

1. Clone this repo:
   ```bash
   git clone https://github.com/giladfeldman/BEDAG.git
   cd BEDAG
   ```
2. Open `about:debugging#/runtime/this-firefox`.
3. Click **Load Temporary Add-on…** and select **`manifest.json`** in the repo root.
4. Pin **BEDAG** on the toolbar.
5. **Disable** the official **Default Google Account** add-on in `about:addons` if present (avoid double redirects).
6. Open [google.com](https://www.google.com) while signed in → open BEDAG popup → **Refresh** under Google accounts.
7. Add rules (**Edit** or **Import JSON**) — see [docs/MIGRATION.md](docs/MIGRATION.md) if moving from the official add-on.

After a Firefox restart, load the temporary add-on again (`about:debugging` or reload the same `.xpi`). Your rules persist in extension storage once saved or imported.

### Build `.xpi` locally

```powershell
.\scripts\package-firefox.ps1
```

Output: `dist/bedag-<version>-unsigned.xpi` (+ `.sha256` checksum). Same temporary-install flow as Option B.

## Quick start

1. **Refresh** accounts (with a Google tab open and signed in).
2. **Settings → Rules** — add rules (service → account).
3. Open a service in a **new tab** (e.g. `https://www.google.com/maps`) — URL should get `?authuser=N` for the rule’s account.
4. **Settings → Import / Export → Export** — keep a JSON backup.

## Migrate from the official add-on

The official extension cannot export settings, and it uses a **different extension ID**, so BEDAG cannot read its storage automatically.

Follow [docs/MIGRATION.md](docs/MIGRATION.md): note your rules, import JSON, or use the one-time storage copy steps.

## Extension ID

| Extension | Firefox ID |
|-----------|------------|
| **BEDAG** (this project) | `bedag@giladfeldman.github` |
| Official AMO add-on | `roman.furman@uptech.team` |

If you previously used a private beta build with another ID, export rules from that build (or note them manually), then import into BEDAG after loading this manifest.

## Project layout

| Path | Purpose |
|------|---------|
| `manifest.json` | Firefox MV2 manifest (load this) |
| `manifest.chrome.json` | Chrome MV3 reference — not used on Firefox |
| `utils.js` | URL matching, services catalogue, storage, account parsing |
| `service-worker.js` | Background redirects, messages, account fetch |
| `app.js` | Popup shell, quick switch, settings |
| `rules.js` / `profiles.js` | Rules and profile editors |
| `popup.html` / `styles.css` | UI |
| `images/` | Icons and service logos |
| `docs/` | Migration, testing, attribution |
| `examples/` | Sample legacy import JSON |
| `scripts/` | Package script and dev tests |

## Development

- Manual checklist: [docs/TESTING.md](docs/TESTING.md)
- Release history: [CHANGELOG.md](CHANGELOG.md)
- Contributor notes: [CONTRIBUTING.md](CONTRIBUTING.md)

Reload after code changes: `about:debugging` → **Reload** (prefer **Reload** over **Remove** so storage is kept).

## License

BSD 3-Clause — see [LICENSE](LICENSE). You must retain copyright notices from upstream projects ([NOTICE.md](NOTICE.md)).

## Disclaimer

BEDAG is provided as-is. Not affiliated with Google, Mozilla, or Uptech/default.wtf maintainers. Use at your own risk; review permissions (`storage`, `tabs`, `webRequest`, `<all_urls>`) before installing.
