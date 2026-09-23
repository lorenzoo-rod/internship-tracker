$ErrorActionPreference = 'Stop'

$passwordFile = Join-Path $env:LOCALAPPDATA 'InternshipHubData\secrets\db-password.secret'
if (-not $env:DB_PASSWORD) {
    if (-not (Test-Path -LiteralPath $passwordFile)) {
        throw "Database password file not found: $passwordFile. See the root README for PostgreSQL setup."
    }
    $env:DB_PASSWORD = (Get-Content -Raw -LiteralPath $passwordFile).Trim()
}

if (-not $env:DB_URL) {
    $env:DB_URL = 'jdbc:postgresql://localhost:5432/internship_hub'
}
if (-not $env:DB_USER) {
    $env:DB_USER = 'internship_hub'
}

Push-Location $PSScriptRoot
try {
    & mvn spring-boot:run
    if ($LASTEXITCODE -ne 0) {
        throw "Maven exited with code $LASTEXITCODE. Check that JAVA_HOME points to Java 21 or newer."
    }
} finally {
    Pop-Location
}
