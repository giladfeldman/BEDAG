# Security policy

## Supported versions

| Version | Supported |
|---------|-----------|
| 1.0.x   | Yes       |

## Reporting

Open a [GitHub issue](https://github.com/giladfeldman/BEDAG/issues) (no public exploit details until fixed if you prefer private disclosure — say so in the issue and we can switch to email).

## Permissions (Firefox)

| Permission | Why |
|------------|-----|
| `storage` | Profiles, rules, settings (sync storage API wrapper) |
| `tabs` | Read/update Google tabs for redirects and account refresh |
| `webNavigation` | Optional enforce on cached URLs without `authuser` |
| `webRequest` + `webRequestBlocking` | MV2 redirect to correct `authuser` on main_frame |
| `management` | Detect official “Default Google Account” add-on conflict only |
| `<all_urls>` | Match Google properties and custom URL patterns across TLDs |

BEDAG does not send your rules or emails to any server. All data stays in browser storage on your machine.

## Threat model notes

- **Malicious import JSON** — Import only via explicit file picker; malformed JSON is rejected. Do not import untrusted files.
- **Content script injection** — Account list uses one-shot `executeScript` on `google.com` with a fixed parser; not exposed to arbitrary pages.
- **Supply chain** — Install from [releases](https://github.com/giladfeldman/BEDAG/releases) or build from source; verify `bedag@giladfeldman.github` in `about:debugging`.
