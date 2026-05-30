# Attribution and lineage

BEDAG (**B**etter **E**efault **A**ccount **G**oogle) is an open-source Firefox extension forked from the [default.wtf](https://www.default.wtf/) family of projects.

## Original software

**Default Account for Google™ products** (DefaultWTF)

- Authors: Uptech Team ([romanfurman6](https://github.com/romanfurman6), AndriyBas, yarikhot, and contributors)
- License: [BSD 3-Clause](https://github.com/uptechteam/default.wtf/blob/dev/LICENSE)
- Repository: [github.com/uptechteam/default.wtf](https://github.com/uptechteam/default.wtf)
- Published extension: [Default Google Account on Mozilla Add-ons](https://addons.mozilla.org/en-US/firefox/addon/default-google-account/) (add-on ID `roman.furman@uptech.team`)

Core ideas preserved in BEDAG:

- Per-service rules mapping Google URLs to `authuser=N`
- `webRequest` blocking redirects on main-frame navigations
- Keyboard shortcuts Alt+1–9
- Account list from Google `ListAccounts`

## Intermediate fork (profiles, UI rewrite)

**diegomarzaa/default.wtf** (dev branch, PR #42 direction)

- Profiles (Default / Work / Personal), rules inheritance, settings overlay
- Import/export of `profiles[]` JSON
- Broader service catalogue and MV3-oriented structure

BEDAG’s `app.js`, `profiles.js`, `rules.js`, and profile storage model follow this rewrite.

## BEDAG (this repository)

**Maintainer:** [Gilad Feldman](https://github.com/giladfeldman)  
**Repository:** [github.com/giladfeldman/BEDAG](https://github.com/giladfeldman/BEDAG)  
**Extension ID:** `bedag@giladfeldman.github`  
**License:** BSD 3-Clause (see [LICENSE](../LICENSE))

Substantial changes in BEDAG relative to upstream are listed in [CHANGELOG.md](../CHANGELOG.md). Highlights:

| Area | Change |
|------|--------|
| Platform | Firefox MV2 first (`manifest.json`); `manifest.chrome.json` kept as reference only |
| Identity | Distinct name and gecko ID so BEDAG does not replace the official AMO add-on |
| Accounts | Fetch `ListAccounts` inside a Google tab (`credentials: include`); robust `postMessage` parser |
| Redirects | Path-based URLs (`google.com/maps`, Scholar, Sheets, …); rule specificity (Search vs Maps) |
| Reliability | Background script load fix; interceptors after storage ready; popup account fallback |
| Docs | Migration, testing, attribution, examples |

## How to cite

If you use or build on BEDAG, please credit:

1. This repository (BEDAG / Gilad Feldman)
2. [uptechteam/default.wtf](https://github.com/uptechteam/default.wtf)
3. [diegomarzaa/default.wtf](https://github.com/diegomarzaa/default.wtf) where applicable

## Contributing

Contributions are welcome under the same BSD 3-Clause license. See [CONTRIBUTING.md](../CONTRIBUTING.md).
