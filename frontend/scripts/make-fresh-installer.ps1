$ErrorActionPreference = 'Stop'

$frontendRoot = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
$tooling = Join-Path $frontendRoot 'out\tooling'
$innoInstaller = Join-Path $tooling 'innosetup-6.7.3.exe'
$innoCompiler = Join-Path $tooling 'InnoSetup\ISCC.exe'
$postgresInstaller = Join-Path $tooling 'postgresql-17.11-4-windows-x64.exe'

function Ensure-Download([string]$destination, [string]$url, [string]$sha256) {
    if (-not (Test-Path -LiteralPath $destination)) {
        & curl.exe -L --fail --show-error --retry 3 --output $destination $url
        if ($LASTEXITCODE -ne 0) { throw "Download failed: $url" }
    }
    $actual = (Get-FileHash -LiteralPath $destination -Algorithm SHA256).Hash
    if ($actual -ne $sha256) { throw "Downloaded file failed SHA-256 verification: $destination" }
    if ((Get-AuthenticodeSignature -LiteralPath $destination).Status -ne 'Valid') {
        throw "Downloaded installer has no valid Windows signature: $destination"
    }
}

New-Item -ItemType Directory -Force -Path $tooling | Out-Null
Ensure-Download $postgresInstaller 'https://get.enterprisedb.com/postgresql/postgresql-17.11-4-windows-x64.exe' 'C9828FD3A4DAEBBEEACE19BEC2DE5F38D73C047FCE47278148B525CFBE28A5E4'
if (-not (Test-Path -LiteralPath $innoCompiler)) {
    Ensure-Download $innoInstaller 'https://github.com/jrsoftware/issrc/releases/download/is-6_7_3/innosetup-6.7.3.exe' '9C73C3BAE7ED48D44112A0F48E66742C00090BDB5BEF71D9D3C056C66E97B732'
    $installDir = Join-Path $tooling 'InnoSetup'
    $process = Start-Process -FilePath $innoInstaller -ArgumentList @('/VERYSILENT', '/SUPPRESSMSGBOXES', '/NORESTART', '/CURRENTUSER', ('/DIR=' + $installDir)) -PassThru -Wait -WindowStyle Hidden
    if ($process.ExitCode -ne 0 -or -not (Test-Path -LiteralPath $innoCompiler)) { throw 'Inno Setup compiler installation failed.' }
}

Push-Location $frontendRoot
try {
    & npm run make
    if ($LASTEXITCODE -ne 0) { throw 'Desktop package build failed.' }
    & $innoCompiler (Join-Path $frontendRoot 'installer\fresh-pc.iss')
    if ($LASTEXITCODE -ne 0) { throw 'Fresh-PC installer build failed.' }
} finally { Pop-Location }
