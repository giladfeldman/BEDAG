# BEDAG — Better Default Account Google

Copyright (c) 2026 [Gilad Feldman](https://github.com/giladfeldman) and BEDAG contributors.

Licensed under the [BSD 3-Clause License](LICENSE).

## Upstream projects (attribution required)

BEDAG is a derivative work. We thank the original authors:

| Project | Copyright | Repository |
|---------|-----------|------------|
| **DefaultWTF / default.wtf** | Copyright (c) 2021 **Uptech** | [uptechteam/default.wtf](https://github.com/uptechteam/default.wtf) |
| **Profiles / MV3 rewrite** | Copyright (c) 2026 **diegomarzaa** | [diegomarzaa/default.wtf](https://github.com/diegomarzaa/default.wtf) |

Original product site: [default.wtf](https://www.default.wtf/)

## What BEDAG adds

Firefox-focused maintenance and features on top of that lineage, including:

- Profiles with inheritance, import/export, and legacy v1.14 JSON support
- Reliable Google account detection via in-tab `ListAccounts` (session cookies)
- Maps and other `google.com/*` path redirects, rule specificity fixes, updated service URLs
- Separate extension ID from the official Mozilla add-on (can install alongside; only one should be enabled)
- Scrollable popup UI, conflict warnings, and migration documentation

See [CHANGELOG.md](CHANGELOG.md) and [docs/ATTRIBUTION.md](docs/ATTRIBUTION.md) for detail.

## Trademarks

BEDAG is not affiliated with, endorsed by, or maintained by Uptech, Sommo, Mozilla, or Google.

Google™ and related product names are trademarks of Google LLC.
