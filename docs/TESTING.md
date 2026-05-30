# Manual testing checklist (Firefox)

Load **`manifest.json`** via `about:debugging`. Confirm **BEDAG** appears in `about:addons` (`bedag@giladfeldman.github`). Disable the official **Default Google Account** add-on while testing redirects.

## Popup UI

- [ ] Open popup: profile chips render; **Refresh** loads Google accounts (google.com tab open, signed in)
- [ ] With **10+ rules**: main view scrolls
- [ ] **Settings → Rules**: list scrolls; add and delete a rule
- [ ] **Settings → Import / Export**: export JSON; re-import
- [ ] Import `examples/legacy-v114-import.example.json` — rules under Default profile
- [ ] Footer shortcuts point to `about:addons` (not Chrome URLs)

## Redirects (multi-account session required)

- [ ] New tab → `https://mail.google.com` — correct `authuser` for Mail rule
- [ ] New tab → `https://www.google.com/maps` — correct account (not default #0 when rule says #1)
- [ ] Scholar, Calendar, Drive — match rules
- [ ] **Alt+2** (or configured shortcut) switches active Google tab account

## Profiles

- [ ] Create a second profile; override one service; inherited rules show tag
- [ ] Switch active profile; redirect prompt behaves per **Behaviour** setting

## Conflicts

- [ ] With official add-on **enabled**: BEDAG shows disable-official banner
- [ ] Only BEDAG enabled: redirects work; no duplicate extension fight

## Regression

- [ ] **Reload** in `about:debugging` (not Remove) — rules and accounts persist
- [ ] After Reload, popup still reaches background (no “Receiving end does not exist”)
