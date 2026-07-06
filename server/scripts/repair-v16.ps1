# Repair failed Flyway V16 migration
# Usage (from server/): .\scripts\repair-v16.ps1

$ErrorActionPreference = "Stop"
Set-Location $PSScriptRoot\..

Write-Host "Flyway repair..."
./mvnw -q flyway:repair
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

Write-Host "Flyway migrate..."
./mvnw -q flyway:migrate
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

Write-Host "Done. Run ./mvnw spring-boot:run"
