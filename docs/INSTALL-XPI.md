# Install BEDAG from an `.xpi`

There are two kinds of BEDAG package, and they install very differently:

| Package | How you get it | Install | Survives a Firefox restart |
|---|---|---|---|
| **Signed** — `bedag-<version>-signed.xpi` | `scripts/sign-firefox.ps1` (Mozilla signs it) | `about:addons` → **Install Add-on From File** | **Yes** |
| **Unsigned** — `bedag-<version>-unsigned.xpi` | `scripts/package-firefox.ps1`, or GitHub Releases | `about:debugging` → **Load Temporary Add-on…** | No — reload after every restart |

The `-signed` / `-unsigned` suffixes are deliberate: the two must never share a filename, or one
gets shipped in place of the other. Whatever a file is called, the ground truth is whether the
archive contains `META-INF/mozilla.rsa`.

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

You get the file Mozilla returns — its name varies, sometimes an internal id, sometimes the same
name the build uses — plus a copy named `bedag-<version>-signed.xpi`. They are identical; the
signature lives inside the archive, so renaming does not invalidate it. Use the `-signed` copy.

**A version can only be signed once.** Mozilla rejects a resubmission of a version it has already signed, so a botched release needs a version bump rather than a retry.

### Export your rules FIRST — removing an add-on deletes its storage

**Do this before step 1, not after.** Firefox keys extension storage by add-on ID, so the ID being
identical across builds is necessary for your rules to survive — but it is not sufficient.
**Uninstalling an add-on deletes the storage under that ID**, and switching from a temporary add-on
to an installed one means removing the temporary one first. The fresh install then starts from an
empty Default profile.

Measured 2026-09-17 on a real upgrade: the temporary add-on held three rules; after removing it and
installing the signed build, the storage row existed with the same ID, `activeProfileId` intact and
accounts re-detected, but `rules` was `[]`. The official add-on, removed in the same pass, had its
row disappear from Firefox's storage database entirely.

So: popup → Settings → **Import / Export** → **Export**, and keep `bedag-settings.json` somewhere
outside the repo. Import it again after installing. This takes ten seconds and is the only thing
standing between you and retyping every rule.

Then, in Firefox:

1. **Export your rules** (see the warning above) if you have any.
2. **Disable** the official **Default Account for Google™ products** add-on in `about:addons` — two redirect extensions will fight over the same URLs. Disabling is enough; removing it deletes its stored rules.
3. `about:addons` → gear icon → **Install Add-on From File…**
4. Select the signed `.xpi` from `dist/`.
5. Pin **BEDAG** on the toolbar.
6. Open [google.com](https://www.google.com) while signed in → BEDAG popup → **Refresh** under Google accounts.
7. **Import** the file you exported in step 1: Settings → **Import / Export**. From the toolbar popup the buttons say **Open in a tab** — that is deliberate. Firefox destroys an extension popup the moment a file dialog opens ([bug 1658694](https://bugzilla.mozilla.org/show_bug.cgi?id=1658694)), so import and export only work on a full page.

---

## B. Temporary install (unsigned)

For development, or for sharing with someone who is happy to reload it each session.

1. Get `bedag-<version>-unsigned.xpi` from [GitHub Releases](https://github.com/giladfeldman/BEDAG/releases), or build it:

   ```powershell
   npm ci
   .\scripts\package-firefox.ps1
   ```

2. Disable the official **Default Account for Google™ products** add-on in `about:addons`.
3. Open `about:debugging#/runtime/this-firefox` → **Load Temporary Add-on…**
4. Select the `.xpi` (or `manifest.json` if you cloned the repo).
5. Pin **BEDAG** on the toolbar, then **Refresh** accounts from the popup.

Temporary add-ons are removed when Firefox exits, so repeat steps 3–4 after every restart. Rules
survive that cycle: a temporary add-on being *reloaded* keeps its storage. What does **not** survive
is *removing* the add-on from `about:debugging` — that deletes the storage under its ID. Export
before you remove anything.

Optional duplicate `.zip` alongside the `.xpi`:

```powershell
.\scripts\package-firefox.ps1 -ZipAlso
```

---

## Verify a download

```powershell
Get-FileHash -Path .\dist\bedag-<version>-unsigned.xpi -Algorithm SHA256
```

Compare the result to the value in `bedag-<version>-unsigned.xpi.sha256`.

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
| Rules empty after installing a new build | Removing the previous add-on deleted its storage. Import your exported `bedag-settings.json`. Export before removing, next time. |
| Import does nothing, no error | Before 1.0.5 the Import button opened a file picker from the popup, which Firefox dismisses, so the handler never ran. Update to 1.0.5+, where both buttons open a tab. |
| No icon on the toolbar | Fixed in 1.0.3. Older builds had no `default_icon` in the manifest. |

See also [MIGRATION.md](./MIGRATION.md) and [TESTING.md](./TESTING.md).
