param(
  [string]$BackupDir = (Join-Path $PSScriptRoot ".." "backups"),
  [string]$DbUser = "mitch",
  [string]$DbName = "mitch_risk",
  [string]$DbHost = "localhost",
  [int]$DbPort = 5432
)

$ErrorActionPreference = "Stop"

$timestamp = Get-Date -Format "yyyyMMdd_HHmmss"
$null = New-Item -ItemType Directory -Path $BackupDir -Force
$filename = Join-Path $BackupDir "mitch_risk_${timestamp}.sql"

$env:PGPASSWORD = "mitch"
$pgDumpArgs = @(
  "-h", $DbHost,
  "-p", $DbPort,
  "-U", $DbUser,
  "-d", $DbName,
  "--no-owner",
  "--no-acl",
  "-f", $filename
)

Write-Host "Backing up $DbName to $filename ..."
& pg_dump @pgDumpArgs

$size = (Get-Item $filename).Length
Write-Host "Done: $filename ($([math]::Round($size / 1KB, 1)) KB)"

$backups = Get-ChildItem -Path $BackupDir -Filter "mitch_risk_*.sql" | Sort-Object LastWriteTime -Descending
if ($backups.Count -gt 7) {
  $backups | Select-Object -Skip 7 | Remove-Item -Force
}
