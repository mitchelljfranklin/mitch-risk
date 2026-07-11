<#
.SYNOPSIS
    Sets up the Mitch‑Risk database (runs Prisma migrations + optional seed).

.DESCRIPTION
    Requires DATABASE_URL in the environment. Runs prisma migrate deploy
    followed by prisma db seed (unless SKIP_SEED=true).

.EXAMPLE
    $env:DATABASE_URL = "postgresql://user:pass@host:5432/mitch_risk?schema=public"
    .\scripts\setup-db.ps1
#>

$ErrorActionPreference = "Stop"

if (-not $env:DATABASE_URL) {
    Write-Error "DATABASE_URL is not set."
    Write-Host "Usage: `$env:DATABASE_URL = 'postgresql://...'; .\scripts\setup-db.ps1"
    exit 1
}

Write-Host "=== Mitch-Risk database setup ==="
Write-Host ""

Write-Host "Applying migrations..."
npx prisma migrate deploy
Write-Host ""

$seedMarker = if ($env:SEED_MARKER) { $env:SEED_MARKER } else { "$env:TEMP\mitch-risk-seeded" }
$skipSeed = if ($env:SKIP_SEED) { $env:SKIP_SEED } else { "false" }

if ($skipSeed -eq "true") {
    Write-Host "Seed skipped (SKIP_SEED=true)."
}
elseif (Test-Path $seedMarker) {
    Write-Host "Seed already applied (marker file exists at $seedMarker)."
}
else {
    Write-Host "Seeding database..."
    npx prisma db seed
    New-Item -ItemType File -Path $seedMarker -Force | Out-Null
    Write-Host "Seed complete."
}

Write-Host ""
Write-Host "Database is ready. Start the app container with the same DATABASE_URL."
