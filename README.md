# Internship Hub

A local desktop Kanban board for tracking internship opportunities and applications. The installed Windows app starts its own Spring Boot API; PostgreSQL remains a separate Windows service. The development setup can also run the API separately.

On the current Windows machine, PostgreSQL 17 is installed as the `postgresql-x64-17` service. Its durable data directory is `C:\ProgramData\InternshipHub\PostgreSQL\data`. The `internship_hub` database and user are dedicated to this app. The installed app bundles Java and the API, so opening it does not require Maven or npm.

## Open the installed app on this PC

Use the **Internship Hub** Start Menu shortcut. PostgreSQL must be running as `postgresql-x64-17`; the app starts and stops its own API. Its database credential is kept in `%LOCALAPPDATA%\InternshipHubData\secrets\db-password.secret`, outside the Squirrel install directory `%LOCALAPPDATA%\InternshipHub`. Updates replace application files without replacing the database or credential.

Version 0.1.10 includes card editing, permanent deletion, a **Save backup** button, first-run database setup, the focused board, and Find links for LinkedIn Jobs and MyGreenhouse Jobs. Use the pencil and trash controls on a card. The deletion dialog can remember "Don't ask again on this device"; the board then shows a control to turn confirmations back on. Click **Save backup**, choose a new `.dump` filename, and wait for the saved-path message. The app checks the archive before reporting success and will not overwrite an existing backup. Keep backup files somewhere private because they contain your saved application details.

To build another installer from the repository, run `npm ci` and `npm run make` in `frontend/`. This packages the React build, Spring Boot JAR, and a pinned Eclipse Temurin 21 runtime. The build requires Maven, a Java 21 or newer JDK, and internet access for the pinned runtime on first use. The installer is at `frontend/out/make/squirrel.windows/x64/InternshipHubSetup.exe`.

## Fresh Windows PC setup

Build the offline fresh-PC installer with `npm run make:fresh` from `frontend/`. It wraps the desktop installer and a pinned, signature-checked PostgreSQL 17 installer in one executable at `frontend/out/make/fresh-pc/InternshipHubFreshPCSetup.exe`. The build downloads PostgreSQL and Inno Setup on first use, so it needs internet access and about 1 GB of temporary space; the resulting installer works offline. This installer is currently unsigned, so Windows may ask you to review its publisher.

Run the fresh-PC installer normally, approve its Windows administrator prompt, and complete the PostgreSQL installer if it appears. Choose and remember the PostgreSQL administrator password. The wrapper keeps an existing PostgreSQL 17 installation and then installs the desktop app for the Windows user who started setup. On first app launch, enter that administrator password to create the dedicated app login and database. If an `internship_hub` database already exists but the app's local password file is absent, also enter its existing app-user password. Setup checks and reuses existing cards; it never resets the database or login password automatically.

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
