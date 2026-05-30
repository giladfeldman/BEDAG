# Install BEDAG from a downloaded `.xpi`

BEDAG release `.xpi` files are **unsigned** (not from Mozilla Add-ons). They are meant for personal use, lab machines, and sharing with collaborators who accept developer-style installation.

## Download

1. Open [GitHub Releases](https://github.com/giladfeldman/BEDAG/releases).
2. Download `bedag-<version>.xpi` (and optionally verify with the matching `.sha256` file).

## Install in Firefox (recommended)

1. **Disable** the official **Default Google Account** add-on in `about:addons` if it is enabled (avoid double redirects).
2. Open `about:debugging#/runtime/this-firefox`.
3. Click **Load Temporary Add-on…**.
4. Select the downloaded **`bedag-<version>.xpi`** (or pick `manifest.json` if you cloned the repo instead).
5. Pin **BEDAG** on the toolbar.
6. Open [google.com](https://www.google.com) while signed in → BEDAG popup → **Refresh** under Google accounts.
7. Add or **Import** your rules.

### After a Firefox restart

Temporary add-ons are removed when Firefox exits. Repeat steps 2–4 after each restart (your saved rules in extension storage are kept).

## “Install Add-on From File” (`about:addons`)

On standard Firefox release builds, **unsigned** extensions cannot be installed permanently via **Install Add-on From File** unless your profile allows it (e.g. Firefox Developer Edition with `xpinstall.signatures.required` set to `false` in `about:config`). For most users, use **`about:debugging`** above.

## Build the `.xpi` yourself

From the repo root (Windows PowerShell):

```powershell
.\scripts\package-firefox.ps1
```

Output: `dist/bedag-<version>.xpi` and `dist/bedag-<version>.xpi.sha256`.

Optional duplicate `.zip`:

```powershell
.\scripts\package-firefox.ps1 -ZipAlso
```

## Verify download integrity (optional)

```powershell
Get-FileHash -Path .\dist\bedag-1.0.2.xpi -Algorithm SHA256
# Compare to the value in bedag-1.0.2.xpi.sha256
```

## Troubleshooting

| Problem | What to try |
|---------|-------------|
| No accounts in popup | Open a signed-in Google tab → **Refresh** |
| Wrong account on Maps | Check Maps rule beats generic Search; reload extension after updates |
| Redirect loop | Update to latest release; disable official Default Google Account |
| Extension missing after restart | Reload `.xpi` via `about:debugging` (expected for temporary install) |

See also [MIGRATION.md](./MIGRATION.md) and [TESTING.md](./TESTING.md).
