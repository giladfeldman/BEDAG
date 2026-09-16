// Single source of truth for what ships inside the .xpi.
//
// web-ext works from an EXCLUDE list, but package contents are easier to reason
// about as an INCLUDE list, so this file derives one from the other: everything
// at the repo root that is not named in PACKAGED is ignored. Both
// scripts/package-firefox.ps1 and scripts/sign-firefox.ps1 go through web-ext,
// so this list is the only place package contents are defined.

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

/** Runtime files, plus the licence files this BSD-3-Clause fork must carry. */
const PACKAGED = [
  "manifest.json",
  "popup.html",
  "styles.css",
  "utils.js",
  "service-worker.js",
  "app.js",
  "rules.js",
  "profiles.js",
  "images",
  "LICENSE",
  "NOTICE.md",
];

const root = path.dirname(fileURLToPath(import.meta.url));

// Fail loudly rather than shipping a package quietly missing a file.
for (const entry of PACKAGED) {
  if (!fs.existsSync(path.join(root, entry))) {
    throw new Error(`web-ext-config: required package entry is missing: ${entry}`);
  }
}

// A directory needs both forms: the bare name and a recursive glob. web-ext's
// matcher does not treat "docs/**" as covering "docs/README.md" on its own.
const ignoreFiles = fs
  .readdirSync(root)
  .filter((entry) => !PACKAGED.includes(entry))
  .flatMap((entry) =>
    fs.statSync(path.join(root, entry)).isDirectory() ? [entry, `${entry}/**/*`] : [entry],
  );

export default {
  sourceDir: root,
  artifactsDir: path.join(root, "dist"),
  ignoreFiles,
  build: {
    overwriteDest: true,
    filename: "bedag-{version}.xpi",
  },
};
