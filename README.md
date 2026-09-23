# Internship Hub

A local desktop Kanban board for tracking internship opportunities and applications. The installed Windows app starts its own Spring Boot API; PostgreSQL remains a separate Windows service. The development setup can also run the API separately.

On the current Windows machine, PostgreSQL 17 is installed as the `postgresql-x64-17` service. Its durable data directory is `C:\ProgramData\InternshipHub\PostgreSQL\data`. The `internship_hub` database and user are dedicated to this app. The installed app bundles Java and the API, so opening it does not require Maven or npm.

## Open the installed app on this PC

Use the **Internship Hub** Start Menu shortcut. PostgreSQL must be running as `postgresql-x64-17`; the app starts and stops its own API. Its database credential is kept in `%LOCALAPPDATA%\InternshipHubData\secrets\db-password.secret`, outside the Squirrel install directory `%LOCALAPPDATA%\InternshipHub`. Updates replace application files without replacing the database or credential.

Version 0.1.3 includes card editing, permanent deletion, and a **Save backup** button. Use the pencil and trash controls on a card. The deletion dialog can remember "Don't ask again on this device"; the board then shows a control to turn confirmations back on. Click **Save backup**, choose a new `.dump` filename, and wait for the saved-path message. The app checks the archive before reporting success and will not overwrite an existing backup. Keep backup files somewhere private because they contain your saved application details.

To build another installer from the repository, run `npm ci` and `npm run make` in `frontend/`. This packages the React build, Spring Boot JAR, and a pinned Eclipse Temurin 21 runtime. The build requires Maven, a Java 21 or newer JDK, and internet access for the pinned runtime on first use. The installer is at `frontend/out/make/squirrel.windows/x64/InternshipHubSetup.exe`.

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
$pgBin = 'C:\Program Files\PostgreSQL\17\bin'
$secretFile = Join-Path $env:LOCALAPPDATA 'InternshipHubData\secrets\db-password.secret'
$env:PGPASSWORD = (Get-Content -Raw -LiteralPath $secretFile).Trim()
& (Join-Path $pgBin 'pg_dump.exe') -w -h localhost -U internship_hub -d internship_hub -Fc -f "$env:USERPROFILE\Documents\internship-hub.dump"
Remove-Item Env:PGPASSWORD
& (Join-Path $pgBin 'pg_restore.exe') -l "$env:USERPROFILE\Documents\internship-hub.dump"
```

To restore, first stop the backend. Restoring replaces the current database contents, so make a fresh backup first. Then run:

```powershell
$pgBin = 'C:\Program Files\PostgreSQL\17\bin'
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
