# Contributing to BEDAG

Thank you for helping improve BEDAG.

## Before you start

- Read [docs/ATTRIBUTION.md](docs/ATTRIBUTION.md) — upstream is [uptechteam/default.wtf](https://github.com/uptechteam/default.wtf) and [diegomarzaa/default.wtf](https://github.com/diegomarzaa/default.wtf) (BSD 3-Clause).
- Keep [NOTICE.md](NOTICE.md) and license headers intact when copying substantial upstream code.

## Development setup

1. Clone the repo and load `manifest.json` via `about:debugging` (see [README.md](README.md)).
2. Use **Reload** on the debugging page after edits (not **Remove**, to keep local storage).
3. Run through [docs/TESTING.md](docs/TESTING.md) before opening a PR.

Optional:

```powershell
node scripts/test-url-match.js
node scripts/test-list-accounts-parse.js
```

## Pull requests

- One logical change per PR when possible.
- Describe **what** and **why**; note Firefox version tested.
- Update [CHANGELOG.md](CHANGELOG.md) under `[Unreleased]` for user-visible changes.
- Do not commit personal rule exports (`*-profiles.json`, `gilad-*.json`) — see [.gitignore](.gitignore).

## Code style

- Match existing plain JS (no bundler).
- Prefer small, focused diffs; avoid unrelated refactors.
- URL matching and redirect logic live in `utils.js` — keep behavior testable via `scripts/test-*.js` where feasible.

## Questions

Open a [GitHub issue](https://github.com/giladfeldman/BEDAG/issues) for bugs or feature ideas.
