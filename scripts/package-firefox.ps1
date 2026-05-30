# Build an unsigned zip of BEDAG for local backup (not signed for AMO).
$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $PSScriptRoot
$outDir = Join-Path $root "dist"
New-Item -ItemType Directory -Force -Path $outDir | Out-Null
$zipPath = Join-Path $outDir "bedag-firefox.zip"
if (Test-Path $zipPath) { Remove-Item $zipPath -Force }

$include = @(
  "manifest.json",
  "popup.html",
  "styles.css",
  "utils.js",
  "service-worker.js",
  "app.js",
  "rules.js",
  "profiles.js",
  "images",
  "docs",
  "examples",
  "LICENSE",
  "NOTICE.md",
  "README.md",
  "CHANGELOG.md"
)

$staging = Join-Path $env:TEMP "bedag-firefox-staging"
if (Test-Path $staging) { Remove-Item $staging -Recurse -Force }
New-Item -ItemType Directory -Force -Path $staging | Out-Null

foreach ($item in $include) {
  $src = Join-Path $root $item
  if (-not (Test-Path $src)) {
    Write-Warning "Skipping missing: $item"
    continue
  }
  Copy-Item -Path $src -Destination (Join-Path $staging $item) -Recurse -Force
}

Compress-Archive -Path (Join-Path $staging "*") -DestinationPath $zipPath -Force
Remove-Item $staging -Recurse -Force
Write-Host "Created $zipPath"
Write-Host "Load manifest.json via about:debugging (Load Temporary Add-on)."
