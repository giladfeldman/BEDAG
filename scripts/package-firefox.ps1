# Build an unsigned BEDAG .xpi for sharing (not AMO-signed).
# Recipients: about:debugging → Load Temporary Add-on → select the .xpi
# See docs/INSTALL-XPI.md
param(
  [string]$Version = "",
  [switch]$ZipAlso
)

$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $PSScriptRoot
$manifestPath = Join-Path $root "manifest.json"
if (-not (Test-Path $manifestPath)) {
  throw "manifest.json not found at $root"
}

$manifest = Get-Content $manifestPath -Raw | ConvertFrom-Json
if (-not $Version) {
  $Version = $manifest.version
}

$outDir = Join-Path $root "dist"
New-Item -ItemType Directory -Force -Path $outDir | Out-Null
$xpiPath = Join-Path $outDir "bedag-$Version.xpi"
$zipPath = Join-Path $outDir "bedag-$Version.zip"

# Runtime + required legal files only (lean install package)
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
  "LICENSE",
  "NOTICE.md"
)

$staging = Join-Path $env:TEMP "bedag-xpi-staging-$Version"
if (Test-Path $staging) { Remove-Item $staging -Recurse -Force }
New-Item -ItemType Directory -Force -Path $staging | Out-Null

foreach ($item in $include) {
  $src = Join-Path $root $item
  if (-not (Test-Path $src)) {
    throw "Required file missing for package: $item"
  }
  Copy-Item -Path $src -Destination (Join-Path $staging $item) -Recurse -Force
}

if (Test-Path $xpiPath) { Remove-Item $xpiPath -Force }
if (Test-Path $zipPath) { Remove-Item $zipPath -Force }

Add-Type -AssemblyName System.IO.Compression.FileSystem
[System.IO.Compression.ZipFile]::CreateFromDirectory($staging, $xpiPath)
Remove-Item $staging -Recurse -Force

if ($ZipAlso) {
  Copy-Item -Path $xpiPath -Destination $zipPath -Force
}

$bytes = (Get-Item $xpiPath).Length
$hash = (Get-FileHash -Path $xpiPath -Algorithm SHA256).Hash.ToLowerInvariant()
$hashPath = "$xpiPath.sha256"
@("$hash  $(Split-Path -Leaf $xpiPath)") | Set-Content -Path $hashPath -Encoding ascii -NoNewline

Write-Host "BEDAG $Version"
Write-Host "  XPI:  $xpiPath ($([math]::Round($bytes / 1KB, 1)) KB)"
Write-Host "  SHA256: $hash"
Write-Host "  Hash file: $hashPath"
Write-Host ""
Write-Host "Install: about:debugging -> This Firefox -> Load Temporary Add-on -> choose the .xpi"
Write-Host "Details: docs/INSTALL-XPI.md"
