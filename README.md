# Internship Hub

A local desktop Kanban board for tracking internship opportunities and applications. The installed Windows app starts its own Spring Boot API; PostgreSQL remains a separate Windows service.

**Installation status:** Version 0.1.12 is installed and tested on the development laptop. This repository does not contain a prebuilt installer or a verified public download. A Windows x64 installer can be built from source using the steps below, but its full setup path has not been tested on a clean Windows PC. See [the open verification task](docs/ROADMAP.md#milestone-6--fresh-windows-pc-installer) before relying on it for a new installation.

## Open the installed app on this PC

Use the **Internship Hub** Start Menu shortcut. On the development laptop, PostgreSQL 17 runs as the `postgresql-x64-17` service and stores data in `C:\ProgramData\InternshipHub\PostgreSQL\data`. The app starts and stops its own API. Its database credential is kept in `%LOCALAPPDATA%\InternshipHubData\secrets\db-password.secret`, outside the Squirrel install directory `%LOCALAPPDATA%\InternshipHub`. Updates replace application files without replacing the database or credential. Opening the installed app does not require Maven or npm.

Version 0.1.12 includes card editing, permanent deletion, a **Save backup** button, first-run database setup, the focused board, Find links for LinkedIn Jobs and MyGreenhouse Jobs, three separate card links, and a Chrome **Add to saved** extension. Multiple roles can share a discovery link when their application links differ. Use the pencil and trash controls on a card. The deletion dialog can remember "Don't ask again on this device"; the board then shows a control to turn confirmations back on. Click **Save backup**, choose a new `.dump` filename, and wait for the saved-path message. The app checks the archive before reporting success and will not overwrite an existing backup. Keep backup files somewhere private because they contain your saved application details.

To enable the optional browser action, load the extension from `%LOCALAPPDATA%\InternshipHubData\chrome-extension` in `chrome://extensions` using **Developer mode → Load unpacked**. See [Chrome extension setup](frontend/chrome-extension/README.md). Click the extension on a company application page, then review the suggested details in Internship Hub before saving. Reload the unpacked extension in Chrome after an app update.

To build another installer for this laptop, run `npm ci` and `npm run make` in `frontend/`. This packages the React build, Spring Boot JAR, and a pinned Eclipse Temurin 21 runtime. The build requires Node.js 22.12 or newer, Maven, a Java 21 or newer JDK, and internet access for the pinned runtime on first use. If the JDK is not at the build script's default `C:\Program Files\Java\jdk-23`, set `DESKTOP_BUILD_JAVA_HOME` to its directory first. The result is `frontend/out/make/squirrel.windows/x64/InternshipHubSetup.exe`. This Squirrel installer uses an already installed PostgreSQL service and an existing app database credential; use the fresh-PC build below when those are absent.

## Build and try the fresh Windows PC installer

This path is **experimental until the clean-Windows test is complete**. No prebuilt fresh-PC installer is published in this repository. To build one on a Windows x64 development machine:

1. Install Git, Node.js 22.12 or newer, Maven, and a Java 21 or newer JDK. Set `JAVA_HOME` to that JDK directory and confirm `mvn -version` reports it. The build also needs internet access and about 1 GB of temporary space to download its pinned Java runtime, PostgreSQL 17 installer, and Inno Setup.
2. Clone this repository and run the following commands in PowerShell. The build script uses `DESKTOP_BUILD_JAVA_HOME` to locate your JDK.

   ```powershell
   git clone https://github.com/lorenzoo-rod/internship-tracker.git
   cd internship-tracker/frontend
   $env:DESKTOP_BUILD_JAVA_HOME = $env:JAVA_HOME
   npm ci
   npm run make:fresh
   ```

3. Copy `frontend/out/make/fresh-pc/InternshipHubFreshPCSetup.exe` to the target Windows PC. This unsigned installer bundles the desktop app and PostgreSQL setup; Windows may ask you to review its publisher. The resulting file can run offline.
4. Run the installer, approve its administrator prompt, and complete the PostgreSQL setup wizard if it appears. Choose and remember the PostgreSQL administrator password. The wrapper leaves an existing PostgreSQL 17 installation in place and installs the desktop app for the Windows user who started setup.
5. Open **Internship Hub** from the Start Menu. On first launch, enter the PostgreSQL administrator password so the app can create its dedicated database and login. If an `internship_hub` database already exists but the app's local password file is absent, provide its existing app-user password too. Setup checks and reuses existing cards; it does not reset the database or login password automatically.

App updates and uninstall leave the PostgreSQL service, database, credential file, and backup archives in place. Removing local data is a separate, explicit manual action. The app currently expects its local PostgreSQL service on loopback port 5432.

## Run locally

Prerequisites: Java 21 or newer, Maven, Node.js 22.12 or newer, and PostgreSQL. Check that `mvn -version` reports Java 21 or newer; the backend compiles for Java 21. A Windows development run was verified with JDK 23 and PostgreSQL 14.22.

1. Ensure PostgreSQL is running. On this Windows machine, check `Get-Service postgresql-x64-17` in PowerShell. To start or stop that service manually, use `Start-Service postgresql-x64-17` or `Stop-Service postgresql-x64-17` in an administrator PowerShell window. On a new machine, install PostgreSQL, then create a user and database for the tracker. For example, as a PostgreSQL administrator:

   ```sql
   CREATE USER internship_hub WITH PASSWORD 'choose-a-password';
   CREATE DATABASE internship_hub OWNER internship_hub;
   ```

2. In a terminal in `backend/`, set `JAVA_HOME` to a Java 21 or newer JDK. On this Windows machine, the app password is stored in `%LOCALAPPDATA%\InternshipHubData\secrets\db-password.secret`; run `powershell -NoProfile -ExecutionPolicy Bypass -File .\start-local.ps1`. The script reads that file and starts Maven with the default `DB_URL=jdbc:postgresql://localhost:5432/internship_hub` and `DB_USER=internship_hub`. On another machine, set `DB_PASSWORD` in the environment instead of creating that file; the script accepts `DB_URL` and `DB_USER` overrides too. Keep passwords out of the repository.

   ```powershell
   $env:JAVA_HOME = 'C:\Program Files\Java\jdk-23'
   powershell -NoProfile -ExecutionPolicy Bypass -File .\start-local.ps1
   ```
3. In another terminal in `frontend/`, run `npm ci` and then `npm run desktop`. This builds the React UI and opens it in Electron. The first launch may download the Electron runtime. The backend must remain running.

For browser-only frontend development, run `npm run dev` in `frontend/` instead. Vite proxies `/api` to the backend on port 8080. The Electron app loads built files and calls that same local API through a restricted bridge.

## Back up and restore the local database

The following PowerShell commands are an alternative to the desktop backup button and use the current Windows installation. Backups contain posting URLs and should be stored somewhere private, outside the repository. The `pg_dump` custom archive can be checked with `pg_restore -l`. The version 0.1.3 backup was restored into a separate temporary PostgreSQL server during verification.

```powershell
$pgInstall = Get-ItemProperty 'HKLM:\SOFTWARE\PostgreSQL\Installations\postgresql-x64-17'
$pgBin = Join-Path $pgInstall.'Base Directory' 'bin'
$secretFile = Join-Path $env:LOCALAPPDATA 'InternshipHubData\secrets\db-password.secret'
$env:PGPASSWORD = (Get-Content -Raw -LiteralPath $secretFile).Trim()
& (Join-Path $pgBin 'pg_dump.exe') -w -h localhost -U internship_hub -d internship_hub -Fc -f "$env:USERPROFILE\Documents\internship-hub.dump"
Remove-Item Env:PGPASSWORD
& (Join-Path $pgBin 'pg_restore.exe') -l "$env:USERPROFILE\Documents\internship-hub.dump"
```

To restore, first stop the backend. Restoring replaces the current database contents, so make a fresh backup first. Then run:

```powershell
$pgInstall = Get-ItemProperty 'HKLM:\SOFTWARE\PostgreSQL\Installations\postgresql-x64-17'
$pgBin = Join-Path $pgInstall.'Base Directory' 'bin'
$secretFile = Join-Path $env:LOCALAPPDATA 'InternshipHubData\secrets\db-password.secret'
$env:PGPASSWORD = (Get-Content -Raw -LiteralPath $secretFile).Trim()
& (Join-Path $pgBin 'pg_restore.exe') -w --exit-on-error --clean --if-exists --no-owner --no-privileges -h localhost -U internship_hub -d internship_hub "$env:USERPROFILE\Documents\internship-hub.dump"
Remove-Item Env:PGPASSWORD
```

Restart the backend and confirm the board shows the expected cards and stages. The PostgreSQL data directory is managed by the service; do not copy it while the service is running as a substitute for a database backup.

## Check the code

- Backend: `cd backend`, then `mvn test`. The tests start a temporary PostgreSQL instance; an installed PostgreSQL service is not needed for tests.
- Frontend: `cd frontend`, then `npm test`, `npm run test:desktop`, and `npm run build`.

See `docs/PRODUCT.md`, `docs/ARCHITECTURE.md`, `docs/ROADMAP.md`, and `docs/DECISIONS.md` for scope and project decisions.
