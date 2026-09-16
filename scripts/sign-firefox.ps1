# Build a MOZILLA-SIGNED BEDAG .xpi that installs permanently on release Firefox.
#
# Signing is "unlisted" (self-distribution): the add-on is signed by Mozilla but
# is NOT published on addons.mozilla.org and is not publicly discoverable.
#
# Credentials come from the environment and must never be committed. Get them at
#   https://addons.mozilla.org/developers/addon/api/key/
# then, in the same PowerShell session:
#   $env:AMO_JWT_ISSUER = "user:12345:67"
#   $env:AMO_JWT_SECRET = "..."
#
# .env.local (gitignored) is read automatically if present, as KEY=VALUE lines.
#
# See docs/INSTALL-XPI.md
param(
  [switch]$SkipLint
)

$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $PSScriptRoot
Push-Location $root
try {
  $envFile = Join-Path $root ".env.local"
  if (Test-Path $envFile) {
    Get-Content $envFile | ForEach-Object {
      if ($_ -match '^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*?)\s*$' -and -not $_.StartsWith("#")) {
        Set-Item -Path "Env:\$($Matches[1])" -Value $Matches[2].Trim('"').Trim("'")
      }
    }
    Write-Host "Loaded credentials from .env.local"
  }

  if (-not $env:AMO_JWT_ISSUER -or -not $env:AMO_JWT_SECRET) {
    throw "AMO_JWT_ISSUER and AMO_JWT_SECRET must be set (env vars or .env.local). See the header of this script."
  }

  if (-not (Test-Path (Join-Path $root "node_modules/web-ext"))) {
    throw "web-ext is not installed. Run: npm ci"
  }

  $version = (Get-Content (Join-Path $root "manifest.json") -Raw | ConvertFrom-Json).version

  if (-not $SkipLint) {
    Write-Host "Linting against AMO validation rules..."
    & npx web-ext lint
    if ($LASTEXITCODE -ne 0) { throw "web-ext lint failed (exit $LASTEXITCODE). Fix the findings before signing." }
  }

  Write-Host "Submitting BEDAG $version to Mozilla for unlisted signing..."
  & npx web-ext sign --channel=unlisted --api-key="$env:AMO_JWT_ISSUER" --api-secret="$env:AMO_JWT_SECRET"
  if ($LASTEXITCODE -ne 0) { throw "web-ext sign failed (exit $LASTEXITCODE)" }

  # web-ext names the signed file after AMO's internal id, e.g. 4718580d...-1.0.3.xpi.
  # Identify it by its Mozilla signature rather than by its name, which is opaque.
  Add-Type -AssemblyName System.IO.Compression.FileSystem
  $signed = Get-ChildItem -Path (Join-Path $root "dist") -Filter "*.xpi" |
            Sort-Object LastWriteTime -Descending |
            Where-Object {
              $zip = [System.IO.Compression.ZipFile]::OpenRead($_.FullName)
              try { $zip.Entries.FullName -contains "META-INF/mozilla.rsa" } finally { $zip.Dispose() }
            } |
            Select-Object -First 1
  if (-not $signed) { throw "No signed .xpi found in dist/ - web-ext reported success but produced nothing signed." }

  # Keep a recognisable copy alongside it. The signature lives inside the archive,
  # so renaming does not invalidate it.
  $friendly = Join-Path $root "dist/bedag-$version-signed.xpi"
  Copy-Item -Path $signed.FullName -Destination $friendly -Force

  Write-Host ""
  Write-Host "BEDAG $version (signed by Mozilla)"
  Write-Host "  XPI:      $friendly"
  Write-Host "  As built: $($signed.FullName)"
  Write-Host ""
  Write-Host "Install permanently: about:addons -> gear icon -> Install Add-on From File -> choose the .xpi"
}
finally {
  Pop-Location
}
