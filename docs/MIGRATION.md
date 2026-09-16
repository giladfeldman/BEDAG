# Migrating to BEDAG

BEDAG (**B**etter **D**efault **A**ccount **G**oogle) is a **separate** Firefox extension from the official [Default Google Account](https://addons.mozilla.org/en-US/firefox/addon/default-google-account/) add-on.

| | Official AMO add-on | BEDAG |
|---|---------------------|--------|
| **Name** | Default Google Account | BEDAG |
| **Extension ID** | `roman.furman@uptech.team` | `bedag@giladfeldman.github` |
| **Storage** | Its own | Its own (not shared) |

Firefox can list both; **enable only one** for redirects.

## Before you switch

1. Open the **official** add-on popup and note every rule (service → email), or take a screenshot.
2. Optional: build a JSON file (see below).
3. In `about:addons`, **disable** the official **Default Google Account** add-on.
4. Install BEDAG ([README](../README.md) — load `manifest.json` from this repo).
5. Open [google.com](https://www.google.com) while signed in → BEDAG popup → **Refresh** (Google accounts).
6. **Settings → Import / Export → Import**, or re-add rules under **Rules**.
7. **Export** a backup from BEDAG for next time.

## Legacy v1.14 JSON (manual)

The official add-on cannot export. Create a file such as `my-rules.json`:

```json
{
  "defaultAccount": 0,
  "rules": [
    {
      "serviceName": "Mail",
      "serviceTitle": "Gmail",
      "serviceUrl": "mail.google.com",
      "serviceImg": "./images/logos/mail.png",
      "accountEmail": "you@example.com",
      "accountId": 0
    },
    {
      "serviceName": "Maps",
      "serviceTitle": "Maps",
      "serviceUrl": "google.com/maps",
      "serviceImg": "./images/logos/maps.png",
      "accountEmail": "other@example.com",
      "accountId": 1
    }
  ]
}
```

`accountId` is Google’s account index (0 = first account). After import, open the popup and **Refresh** accounts so emails rebind to the correct index.

## BEDAG v2 export

If you already use BEDAG, exported files look like:

```json
{
  "version": "2.0",
  "profiles": [ … ],
  "activeProfileId": "default"
}
```

Import via **Settings → Import / Export**.

## Advanced: copy storage from the official add-on (one-time)

Only while the **official** extension is still installed:

1. `about:debugging` → **This Firefox** → **Default Google Account** (official) → **Inspect**.
2. In the background debugger console:
   ```javascript
   browser.storage.sync.get(null).then(console.log);
   ```
3. Copy `rules` and `defaultAccount` into the legacy JSON shape above.
4. Disable the official add-on, enable BEDAG, **Import**.

Extensions cannot read each other’s storage programmatically.

## Profiles

The official v1.14 add-on had **no named profiles** — one rule list only. BEDAG’s **Default** profile holds imported rules. Add Work / Personal under **Settings → Profiles** if needed.
