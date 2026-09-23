# Architecture

## Current repository state

The `backend/` directory contains a Spring Boot REST API, a JPA opportunity model, PostgreSQL configuration, and integration tests. The API has been verified with both an in-memory database and PostgreSQL. The `frontend/` directory contains a React/TypeScript Kanban board and an Electron shell that loads the built UI. A system-wide PostgreSQL 17 Windows service stores app data in `C:\ProgramData\InternshipHub\PostgreSQL\data`. Electron Forge builds a Squirrel.Windows installer that bundles the UI, API JAR, and Java 21 runtime.

## Local design

```text
Electron desktop shell
  └─ React + TypeScript renderer
       └─ restricted IPC bridge → Electron main process
                                   └─ REST requests → Java 21 / Spring Boot API
                                                        └─ Spring Data JPA → PostgreSQL
```

Electron hosts the desktop window and loads the built React files. React and TypeScript render the Kanban board and handle user interaction. A context-isolated preload bridge exposes only tracker API requests; the Electron main process forwards approved methods and paths to the local Spring Boot REST API. The renderer has no direct database access.

During frontend development, Vite proxies `/api` requests to the locally running Spring Boot service on port 8080. The board offers manual entry, duplicate feedback, and card movement by drag and drop or a stage menu.

The backend owns application rules, including stage changes, duplicate URL checks during create and edit, and card deletion. Controllers handle HTTP requests and responses; services hold business logic; persistence stays behind the API. The opportunity table stores each card's title, company, posting URL, and stage. The posting URL has a unique constraint. Deletion is permanent in the current version.

The board stores the device-only deletion-confirmation preference in renderer local storage. The preference changes only the confirmation step; it does not bypass the backend API. A visible board control restores confirmations. The Electron API bridge permits only the tracker endpoints needed for listing, creating, editing, moving, and deleting cards.

The desktop backup button uses a separate, narrow Electron IPC call. Electron opens a save dialog and uses the PostgreSQL 17 `pg_dump` and `pg_restore` tools already installed on this PC. It reads the app database credential from the same local secret file used to launch the API, passes the password through the backup child process environment, and writes a custom archive to a temporary file beside the chosen destination. It lists the archive with `pg_restore` before moving it to the final filename. Existing destination files are never overwritten. Backups are user-chosen files outside the installer; they are not stored in the repository or served by the API.

For development, PostgreSQL runs as a Windows service and Spring Boot starts separately from Electron. The backend's `start-local.ps1` reads the local database password from `%LOCALAPPDATA%\InternshipHubData\secrets\db-password.secret`. Credentials and database files stay outside the repository and the installer directory. See the root `README.md` for startup and backup steps.

## Current-PC package

The first package is for the current Windows PC. Electron starts the packaged Spring Boot JAR with a bundled Java runtime on a free loopback port, waits for a readiness signal from that child process, and stops it when the app exits. It connects to the existing PostgreSQL Windows service and reuses the local database and credentials. The package does not contain or replace the PostgreSQL data directory. Electron Forge and Squirrel.Windows produce a per-user Windows installer and Start Menu shortcut. A fresh-PC installer and cross-device deployment remain future work.
