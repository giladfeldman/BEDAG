# Install BEDAG from an `.xpi`

There are two kinds of BEDAG package, and they install very differently:

| Package | How you get it | Install | Survives a Firefox restart |
|---|---|---|---|
| **Signed** | `scripts/sign-firefox.ps1` (Mozilla signs it) | `about:addons` → **Install Add-on From File** | **Yes** |
| **Unsigned** | `scripts/package-firefox.ps1`, or GitHub Releases | `about:debugging` → **Load Temporary Add-on…** | No — reload after every restart |

Release Firefox refuses to permanently install an extension Mozilla has not signed. That is a browser rule, not a BEDAG limitation, and there is no setting on a release build that turns it off.

---

## A. Permanent install (signed)

### One-time setup

1. Create a free add-on developer account at <https://addons.mozilla.org/developers/>.
2. Generate API credentials at <https://addons.mozilla.org/developers/addon/api/key/>. You get a **JWT issuer** (looks like `user:12345:67`) and a **JWT secret**.
3. In the repo root, create `.env.local` — it is gitignored and must never be committed:

   ```
   AMO_JWT_ISSUER=user:12345:67
   AMO_JWT_SECRET=your-secret-here
   ```

### Sign and install

```powershell
npm ci
.\scripts\sign-firefox.ps1
```

The script lints against Mozilla's validation rules first, then uploads. BEDAG is signed **unlisted** (self-distributed): Mozilla signs it, but it is not published or discoverable on addons.mozilla.org. Unlisted signing is automated and usually finishes in a couple of minutes.

Then, in Firefox:

1. **Disable** the official **Default Account for Google™ products** add-on in `about:addons` — two redirect extensions will fight over the same URLs.
2. `about:addons` → gear icon → **Install Add-on From File…**
3. Select the signed `.xpi` from `dist/`.
4. Pin **BEDAG** on the toolbar.
5. Open [google.com](https://www.google.com) while signed in → BEDAG popup → **Refresh** under Google accounts.

Your rules carry over. Firefox keys extension storage by the add-on's ID (`bedag@giladfeldman.github`), which does not change between the temporary and signed builds, so anything already saved is still there. Export a backup first anyway: popup → Settings → **Import / Export** → **Export**.

---

## B. Temporary install (unsigned)

For development, or for sharing with someone who is happy to reload it each session.

1. Get `bedag-<version>.xpi` from [GitHub Releases](https://github.com/giladfeldman/BEDAG/releases), or build it:

   ```powershell
   npm ci
   .\scripts\package-firefox.ps1
   ```

2. Disable the official **Default Account for Google™ products** add-on in `about:addons`.
3. Open `about:debugging#/runtime/this-firefox` → **Load Temporary Add-on…**
4. Select the `.xpi` (or `manifest.json` if you cloned the repo).
5. Pin **BEDAG** on the toolbar, then **Refresh** accounts from the popup.

Temporary add-ons are removed when Firefox exits, so repeat steps 3–4 after every restart. Saved rules are not lost — Firefox keeps the extension's storage keyed by its add-on ID.

Optional duplicate `.zip` alongside the `.xpi`:

```powershell
.\scripts\package-firefox.ps1 -ZipAlso
```

---

## Verify a download

```powershell
Get-FileHash -Path .\dist\bedag-1.0.3.xpi -Algorithm SHA256
```

Compare the result to the value in `bedag-1.0.3.xpi.sha256`.

---

## What goes into the package

`web-ext-config.mjs` holds the list of files that ship inside the `.xpi` — runtime code, images, `LICENSE` and `NOTICE.md`. Docs, tests, build scripts and examples are excluded. Both build scripts read that one list, so they cannot disagree.

---

## Troubleshooting

| Problem | What to try |
|---------|-------------|
| Firefox refuses to install the file | The package is unsigned. Use `about:debugging`, or sign it (section A). |
| `sign-firefox.ps1` says credentials are missing | Set `AMO_JWT_ISSUER` and `AMO_JWT_SECRET`, or create `.env.local`. |
| Signing rejected | Run `npx web-ext lint` and fix every error before retrying. |
| No accounts in popup | Open a signed-in Google tab, then click **Refresh** in the popup. |
| Rules exist but nothing redirects | The official **Default Account for Google™ products** add-on is probably still enabled. Disable it in `about:addons`. |
| Wrong account on Maps | Check that the Maps rule beats the generic Search rule; reload the extension after updates. |
| Redirect loop | Update to the latest release; disable the official add-on. |
| Extension gone after restart | Expected for a temporary install. Reload via `about:debugging`, or switch to the signed build. |
| No icon on the toolbar | Fixed in 1.0.3. Older builds had no `default_icon` in the manifest. |

See also [MIGRATION.md](./MIGRATION.md) and [TESTING.md](./TESTING.md).
