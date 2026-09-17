#!/usr/bin/env node
// Does GitHub actually reflect what this repo says it has released?
//
// Docs drift from releases silently: a CHANGELOG entry is written, the tag is
// never pushed, and the "[1.0.4]: .../releases/tag/v1.0.4" link 404s for every
// reader while the repo looks complete from inside. This checks the claims
// against the remote instead of against the working tree.
//
//   node scripts/check-release-parity.mjs            # report and exit 1 on any failure
//   node scripts/check-release-parity.mjs --local    # skip checks that need network/gh
//   node scripts/check-release-parity.mjs --pre-push # only what can be fixed WITHOUT pushing
//
// --pre-push exists because /ship forbids pushing before its gate. A cleanup phase
// running pre-push must not "fix" parity by pushing; it can only fix what lives in
// the working tree (version agreement, a missing CHANGELOG section or link ref).
// Anything that needs a push — an unpushed commit, a tag not on origin, a missing
// release — is reported as DEFERRED and is the deploy phase's job, after the gate.
//
// Exit codes: 0 all parity checks pass · 1 a real mismatch · 2 could not verify.

import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";

const LOCAL_ONLY = process.argv.includes("--local");
const PRE_PUSH = process.argv.includes("--pre-push");
const failures = [];
const deferred = [];
const notes = [];

function sh(cmd, args) {
  return execFileSync(cmd, args, { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }).trim();
}
function trySh(cmd, args) {
  try {
    return { ok: true, out: sh(cmd, args) };
  } catch (e) {
    return { ok: false, out: (e.stdout ?? "") + (e.stderr ?? "") };
  }
}
const fail = (m) => failures.push(m);
// Needs a push to resolve: a real failure at deploy time, expected before the gate.
const needsPush = (m) => (PRE_PUSH ? deferred : failures).push(m);

// ─── The versions this repo claims ───────────────────────────────────────────

const manifestVersion = JSON.parse(readFileSync("manifest.json", "utf8")).version;
const packageVersion = JSON.parse(readFileSync("package.json", "utf8")).version;
if (manifestVersion !== packageVersion) {
  fail(`manifest.json is ${manifestVersion} but package.json is ${packageVersion}; they must match.`);
}

const changelog = readFileSync("CHANGELOG.md", "utf8");
const sections = [...changelog.matchAll(/^## \[(\d+\.\d+\.\d+)\]/gm)].map((m) => m[1]);
const linkRefs = [...changelog.matchAll(/^\[(\d+\.\d+\.\d+)\]:\s*(\S+)/gm)].map((m) => ({
  version: m[1],
  url: m[2],
}));

if (!sections.includes(manifestVersion)) {
  fail(`CHANGELOG.md has no "## [${manifestVersion}]" section for the current version.`);
}
for (const v of sections) {
  if (!linkRefs.some((r) => r.version === v)) {
    fail(`CHANGELOG.md has a section for ${v} but no "[${v}]:" link reference at the bottom.`);
  }
}

// ─── What git and the remote actually hold ───────────────────────────────────

const localTags = new Set(sh("git", ["tag"]).split("\n").filter(Boolean));

let remoteTags = null;
if (!LOCAL_ONLY) {
  const r = trySh("git", ["ls-remote", "--tags", "origin"]);
  if (!r.ok) {
    notes.push("could not reach origin to list tags");
  } else {
    remoteTags = new Set(
      r.out
        .split("\n")
        .map((l) => l.split("refs/tags/")[1])
        .filter((t) => t && !t.endsWith("^{}")),
    );
  }
}

for (const v of sections) {
  const tag = `v${v}`;
  if (!localTags.has(tag)) needsPush(`${v} is in the CHANGELOG but tag ${tag} does not exist yet.`);
  else if (remoteTags && !remoteTags.has(tag)) needsPush(`tag ${tag} exists locally but was never pushed to origin.`);
}

const branch = sh("git", ["rev-parse", "--abbrev-ref", "HEAD"]);
const upstream = trySh("git", ["rev-parse", "--abbrev-ref", "--symbolic-full-name", "@{u}"]);
if (upstream.ok) {
  const ahead = sh("git", ["rev-list", "--count", `${upstream.out}..HEAD`]);
  if (Number(ahead) > 0) needsPush(`${ahead} commit(s) on ${branch} are not pushed to ${upstream.out}.`);
} else {
  notes.push(`${branch} has no upstream branch`);
}

// ─── Do the releases the CHANGELOG links to actually exist? ──────────────────

if (!LOCAL_ONLY) {
  const probe = trySh("gh", ["repo", "view", "--json", "nameWithOwner"]);
  if (!probe.ok) {
    notes.push("gh CLI unavailable or not authenticated; release and asset checks skipped");
  } else {
    const list = trySh("gh", ["release", "list", "--limit", "100", "--json", "tagName"]);
    if (!list.ok) {
      notes.push("could not list releases");
    } else {
      const releases = new Set(JSON.parse(list.out).map((r) => r.tagName));
      for (const ref of linkRefs) {
        const tag = `v${ref.version}`;
        if (!releases.has(tag)) {
          needsPush(`CHANGELOG links ${ref.url} but no GitHub release ${tag} exists — that link 404s for every reader.`);
        }
      }
      // The newest release should carry the build the workflow produces.
      const current = `v${manifestVersion}`;
      if (releases.has(current)) {
        const assets = trySh("gh", ["release", "view", current, "--json", "assets"]);
        if (assets.ok) {
          const names = JSON.parse(assets.out).assets.map((a) => a.name);
          if (!names.some((n) => n.endsWith(".xpi"))) needsPush(`release ${current} has no .xpi asset (assets: ${names.join(", ") || "none"}).`);
          if (!names.some((n) => n.endsWith(".sha256"))) needsPush(`release ${current} has no .sha256 asset.`);
        }
      }
    }
  }
}

// ─── Report ──────────────────────────────────────────────────────────────────

console.log(`BEDAG release parity — version ${manifestVersion}, branch ${branch}${PRE_PUSH ? " (pre-push)" : ""}`);
console.log(`  CHANGELOG sections : ${sections.join(", ") || "none"}`);
console.log(`  local tags         : ${[...localTags].join(", ") || "none"}`);
console.log(`  remote tags        : ${remoteTags ? [...remoteTags].join(", ") || "none" : "not checked"}`);
for (const n of notes) console.log(`  NOTE: ${n}`);

if (deferred.length) {
  console.log(`
${deferred.length} item(s) DEFERRED to the deploy phase (cannot be fixed without pushing):`);
  for (const d of deferred) console.log(`  DEFER ${d}`);
}

if (failures.length) {
  console.log(`\n${failures.length} parity failure(s):`);
  for (const f of failures) console.log(`  FAIL  ${f}`);
  process.exit(1);
}
if (notes.length && !LOCAL_ONLY) {
  console.log("\nPASS with gaps — see NOTEs above; those checks did not run.");
  process.exit(2);
}
if (PRE_PUSH) {
  console.log(
    deferred.length
      ? `\nPASS (pre-push) — nothing left that can be fixed without pushing. ${deferred.length} DEFER item(s) are the deploy phase's job; this is NOT a statement that GitHub is up to date.`
      : "\nPASS (pre-push) — nothing outstanding.",
  );
} else {
  console.log("\nPASS — GitHub matches what this repo says it has released.");
}
