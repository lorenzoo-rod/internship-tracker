$ErrorActionPreference = 'Stop'

$frontendRoot = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
$repoRoot = (Resolve-Path (Join-Path $frontendRoot '..')).Path
$buildRoot = Join-Path $repoRoot 'backend\target\desktop-package'
$runtimeDir = Join-Path $buildRoot 'runtime'
$extractDir = Join-Path $buildRoot 'runtime-extracted'
$archive = Join-Path $buildRoot 'temurin-jre21.zip'
$lock = Get-Content -Raw -LiteralPath (Join-Path $PSScriptRoot 'runtime-lock.json') | ConvertFrom-Json

function Assert-BuildPath([string]$candidate) {
    $full = [System.IO.Path]::GetFullPath($candidate)
    $root = [System.IO.Path]::GetFullPath($buildRoot).TrimEnd('\')
    if (-not $full.StartsWith($root + '\', [System.StringComparison]::OrdinalIgnoreCase)) {
        throw "Refusing to modify a path outside the package build directory: $full"
    }
}

function Invoke-Checked([scriptblock]$step) {
    & $step
    if ($LASTEXITCODE -ne 0) { throw "Package build step failed with exit code $LASTEXITCODE" }
}

New-Item -ItemType Directory -Force -Path $buildRoot | Out-Null
Assert-BuildPath $runtimeDir
Assert-BuildPath $extractDir
Assert-BuildPath $archive

if (-not (Test-Path -LiteralPath $archive)) {
    Write-Output "Downloading Eclipse Temurin $($lock.version) JRE..."
    Invoke-WebRequest -Uri $lock.url -OutFile $archive
}
$hash = (Get-FileHash -LiteralPath $archive -Algorithm SHA256).Hash.ToLowerInvariant()
if ($hash -ne $lock.sha256) { throw 'The downloaded Java runtime does not match its pinned SHA-256 checksum.' }

$marker = Join-Path $runtimeDir '.runtime-sha256'
if (-not (Test-Path -LiteralPath (Join-Path $runtimeDir 'bin\java.exe')) -or
    -not (Test-Path -LiteralPath $marker) -or
    (Get-Content -Raw -LiteralPath $marker).Trim() -ne $lock.sha256) {
    if (Test-Path -LiteralPath $runtimeDir) { Remove-Item -LiteralPath $runtimeDir -Recurse -Force }
    if (Test-Path -LiteralPath $extractDir) { Remove-Item -LiteralPath $extractDir -Recurse -Force }
    Expand-Archive -LiteralPath $archive -DestinationPath $extractDir
    $unpacked = Get-ChildItem -LiteralPath $extractDir -Directory |
        Where-Object { Test-Path -LiteralPath (Join-Path $_.FullName 'bin\java.exe') } |
        Select-Object -First 1
    if (-not $unpacked) { throw 'The Java archive did not contain a Windows runtime.' }
    Assert-BuildPath $unpacked.FullName
    Move-Item -LiteralPath $unpacked.FullName -Destination $runtimeDir
    Set-Content -LiteralPath $marker -Value $lock.sha256 -Encoding Ascii
    Remove-Item -LiteralPath $extractDir -Recurse -Force
}

$buildJavaHome = if ($env:DESKTOP_BUILD_JAVA_HOME) { $env:DESKTOP_BUILD_JAVA_HOME } else { 'C:\Program Files\Java\jdk-23' }
if (-not (Test-Path -LiteralPath (Join-Path $buildJavaHome 'bin\javac.exe'))) {
    throw "A Java 21 or newer JDK is needed to build the API. Set DESKTOP_BUILD_JAVA_HOME; checked $buildJavaHome"
}
$env:JAVA_HOME = $buildJavaHome

Push-Location $repoRoot
try {
    Invoke-Checked { & mvn -B -f backend/pom.xml -DskipTests package }
} finally { Pop-Location }
$jar = Join-Path $repoRoot 'backend\target\backend-0.0.1-SNAPSHOT.jar'
if (-not (Test-Path -LiteralPath $jar)) { throw "Packaged API JAR not found: $jar" }
Copy-Item -LiteralPath $jar -Destination (Join-Path $buildRoot 'backend.jar') -Force

Push-Location $frontendRoot
try {
    Invoke-Checked { & npm run build }
    Invoke-Checked { & (Join-Path $frontendRoot 'node_modules\.bin\electron-forge.cmd') make --platform=win32 --arch=x64 }
} finally { Pop-Location }
