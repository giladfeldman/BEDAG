# Build an UNSIGNED BEDAG .xpi (for sharing with developers, or for local testing).
# Recipients: about:debugging -> Load Temporary Add-on -> select the .xpi
#
# For a permanently installable build, use scripts/sign-firefox.ps1 instead.
# See docs/INSTALL-XPI.md
param(
  [switch]$ZipAlso
)

$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $PSScriptRoot
Push-Location $root
try {
  $manifestPath = Join-Path $root "manifest.json"
  if (-not (Test-Path $manifestPath)) { throw "manifest.json not found at $root" }
  $version = (Get-Content $manifestPath -Raw | ConvertFrom-Json).version

  if (-not (Test-Path (Join-Path $root "node_modules/web-ext"))) {
    throw "web-ext is not installed. Run: npm ci"
  }

  # Package contents come from web-ext-config.mjs - the single source of truth.
  & npx web-ext build
  if ($LASTEXITCODE -ne 0) { throw "web-ext build failed (exit $LASTEXITCODE)" }

  $xpiPath = Join-Path $root "dist/bedag-$version-unsigned.xpi"
  if (-not (Test-Path $xpiPath)) { throw "Expected package not produced: $xpiPath" }

  if ($ZipAlso) {
    Copy-Item -Path $xpiPath -Destination (Join-Path $root "dist/bedag-$version-unsigned.zip") -Force
  }

  $bytes = (Get-Item $xpiPath).Length
  $hash = (Get-FileHash -Path $xpiPath -Algorithm SHA256).Hash.ToLowerInvariant()
  $hashPath = "$xpiPath.sha256"
  @("$hash  $(Split-Path -Leaf $xpiPath)") | Set-Content -Path $hashPath -Encoding ascii -NoNewline

  Write-Host ""
  Write-Host "BEDAG $version (unsigned)"
  Write-Host "  XPI:       $xpiPath ($([math]::Round($bytes / 1KB, 1)) KB)"
  Write-Host "  SHA256:    $hash"
  Write-Host "  Hash file: $hashPath"
  Write-Host ""
  Write-Host "Install: about:debugging -> This Firefox -> Load Temporary Add-on -> choose the .xpi"
  Write-Host "Permanent install instead: scripts/sign-firefox.ps1 (see docs/INSTALL-XPI.md)"
}
finally {
  Pop-Location
}
