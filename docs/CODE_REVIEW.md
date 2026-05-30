# BEDAG code review (2026-05-30)

Post–v1.0.1 review focused on the same failure modes fixed during the Firefox fork: wrong rule winning, redirect loops, empty accounts, storage/ID collisions, and background lifecycle.

## Issues found and addressed in 1.0.2

| Area | Risk | Fix |
|------|------|-----|
| **Rule specificity** | Broad `google.com` Search rule hijacked Maps, Scholar, etc. | `ruleMatchScore()` + path/subdomain matchers (1.0.0+); **Flights vs Travel** split so `/travel/flights` does not match Travel (1.0.2) |
| **Redirect loops** | Extension vs Google fighting `authuser`; `webNavigation` double-apply | Per-tab ping-pong suppress (1.0.1); skip nav when URL already has account marker; **global cycle detector** now catches alternating indices (1.0.2) |
| **Account index** | ListAccounts field `[7]` ≠ authuser index | Row-order mapping only (1.0.1); invalid `accountId` rules skipped (1.0.2) |
| **Account 0** | Forcing `?authuser=0` triggers Google to strip/re-add | Prefer **removing** `authuser` and `/u/N` for account 0 (1.0.2) |
| **Auth URLs** | Redirecting sign-in/OAuth breaks login | `shouldIgnoreRedirectUrl()` for `accounts.google.com`, sign-in paths, telemetry (1.0.2) |
| **New tabs** | Middle-click from Gmail → double redirect | Skip `tabs.onCreated` redirect when **opener** is already a Google tab (1.0.2) |
| **Import** | Background kept stale profiles until restart | `import_settings` reloads state + refreshes accounts (1.0.2) |
| **Export** | No extension version in backup | `bedagVersion` + export format `2.1` (1.0.2) |
| **Background** | `utils.js` loaded twice → “Receiving end does not exist” | Manifest order only — do not re-add `importScripts` (documented) |
| **Accounts in popup** | Background fetch has no cookies | In-tab `ListAccounts` + popup fallback (1.0.0+) |
| **Extension ID** | Shared AMO ID wiped/confused storage | `bedag@giladfeldman.github` + MIGRATION.md (1.0.0) |

## Residual risks (acceptable for personal / sideload use)

1. **`<all_urls>` + blocking `webRequest`** — Required for MV2 redirects on path-based Google URLs; AMO reviewers may ask for narrower patterns. Narrowing hosts risks missing `google.co.uk` / `docs.google.com` edge cases.
2. **`management` permission** — Used only to warn when the official “Default Google Account” add-on is enabled; no remote data.
3. **ListAccounts injection** — Runs only on Google tabs the user already has open; uses page credentials (same trust model as the upstream extension).
4. **Concurrent extensions** — Running BEDAG alongside the official add-on can cause duplicate redirects; UI warns when detected.
5. **MV2** — Firefox still supports MV2 for this fork; long-term AMO may push MV3 migration (would need `declarativeNetRequest` redesign).

## Manual smoke checklist (before AMO)

See [TESTING.md](./TESTING.md). Minimum:

- Maps, Gmail, Scholar, Sheets, Drive with **two accounts** and conflicting rules
- Import `bedag-settings.json`, confirm rules + active profile without restart
- Disable official add-on; reload BEDAG after updates
- `node scripts/test-url-match.js` and `node scripts/test-list-accounts-parse.js`

## Automated tests

- `scripts/test-url-match.js` — rule scoring, flights/travel, ignore auth URLs, Maps redirect, account-0 strip
- `scripts/test-list-accounts-parse.js` — ListAccounts row parser

## Files to treat as sensitive

Do not commit personal `*-profiles.json` or exports with real emails (see `.gitignore`).
