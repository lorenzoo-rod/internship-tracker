# Architecture

## Current repository state

The `backend/` directory contains a Spring Boot REST API, a JPA opportunity model, PostgreSQL configuration, and integration tests. The API has been verified with both an in-memory database and PostgreSQL. The `frontend/` directory contains a React/TypeScript Kanban board and an Electron shell that loads the built UI. A system-wide PostgreSQL 17 Windows service stores app data in `C:\ProgramData\InternshipHub\PostgreSQL\data` on this PC. Electron Forge builds a Squirrel.Windows installer that bundles the UI, API JAR, and Java 21 runtime; an Inno Setup wrapper combines it with a PostgreSQL installer for fresh PCs.

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

Board focus is renderer state. Clicking a column's background or heading toggles its focus; Enter and Space work when the column itself has keyboard focus, and Escape returns to the full board when no dialog is open. Interactive card elements keep their own behavior. The focused stage expands and the others become labeled tabs with counts. The API and database stage model are unchanged, and cards can still move via the stage menu or by dropping on a tab.

The Find view links to LinkedIn Jobs and MyGreenhouse Jobs in the user's normal browser through Electron's existing external-link handling. Pasting a supported Greenhouse-hosted company job URL calls `/api/posting-preview`; the backend extracts the board token and job ID and requests title and company from Greenhouse's public Job Board API. Only the recognized Greenhouse hosts and a fixed API destination are used. The result opens the same editable review-and-save form used by the board; unsupported links and lookup failures allow manual entry. LinkedIn and MyGreenhouse content is not fetched or scraped. The pasted URL remains unchanged in the existing opportunity API and database schema.

The backend owns application rules, including stage changes, duplicate URL checks during create and edit, and card deletion. Controllers handle HTTP requests and responses; services hold business logic; persistence stays behind the API. The opportunity table stores each card's title, company, stage, and separate discovery, application, and status URLs. Unique indexes cover discovery and application URLs; a shared status URL is allowed with a warning. Deletion is permanent in the current version.

Flyway migrations create the PostgreSQL schema and migrate the former single `postingUrl` according to each card's stage. Existing databases are baselined at version 1; the version 2 migration backfills the new fields and removes the old column. Hibernate validates the schema. The renderer continues to access card data through the API.

The Chrome extension uses temporary active-tab access after a user click. It passes the current application URL and available page metadata through a registered `internship-hub://add/` desktop link. Electron validates the action, limits the payload, and sends an editable draft through the preload bridge. The desktop app never saves a browser draft automatically. The extension is copied to a stable local folder for one-time manual loading in Chrome.

Stages are currently a Java enum in the API and a fixed list with display colors in React. Editable columns will need persistent stage definitions with stable identities separate from their names, an explicit order and color, and an opportunity reference to a stage. The API should continue to own stage and card rules so the renderer does not need direct database access. Existing cards will need a migration when this future feature is implemented.

The board stores the device-only deletion-confirmation preference in renderer local storage. The preference changes only the confirmation step; it does not bypass the backend API. A visible board control restores confirmations. The Electron API bridge permits only the tracker endpoints needed for listing, creating, editing, moving, and deleting cards.

The desktop backup button uses a separate, narrow Electron IPC call. Electron opens a save dialog and locates the PostgreSQL 17 `pg_dump` and `pg_restore` tools through the Windows installation registry. It reads the app database credential from the same local secret file used to launch the API, passes the password through the backup child process environment, and writes a custom archive to a temporary file beside the chosen destination. It lists the archive with `pg_restore` before moving it to the final filename. Existing destination files are never overwritten. Backups are user-chosen files outside the installer; they are not stored in the repository or served by the API.

For development, PostgreSQL runs as a Windows service and Spring Boot starts separately from Electron. The backend's `start-local.ps1` reads the local database password from `%LOCALAPPDATA%\InternshipHubData\secrets\db-password.secret`. Credentials and database files stay outside the repository and the installer directory. See the root `README.md` for startup and backup steps.

## Current-PC package

The current-PC package starts the packaged Spring Boot JAR with a bundled Java runtime on a free loopback port, waits for a readiness signal from that child process, and stops it when the app exits. It connects to the existing PostgreSQL Windows service and reuses the local database and credentials. The package does not contain or replace the PostgreSQL data directory. Electron Forge and Squirrel.Windows produce a per-user Windows installer and Start Menu shortcut. Cross-device deployment remains future work.

During API startup, the packaged window loads a local HTML/CSS screen with a computer icon and “Booting Internship Hub.” The screen uses a restrained animation that stops when reduced motion is requested. The existing Retry/Quit error dialog remains available if startup fails; the React board has its own separate data-loading state.

## Fresh-PC setup package

An Inno Setup wrapper holds the PostgreSQL 17 installer and the Squirrel desktop installer in one offline executable. It requests administrator approval for the PostgreSQL Windows service. When PostgreSQL is already installed, it leaves the service in place. It runs the Squirrel installer as the original Windows user so the per-user app and credentials belong to that user. The wrapper has no uninstall action that removes PostgreSQL or app data.

On first launch without a local credential, Electron shows a setup screen. The user enters the PostgreSQL administrator password. Electron uses the installed `psql` tool to check whether the app database and login exist. It creates missing resources and generates the app password; an existing database requires its existing app-user password and is not reset or replaced. The credential and database stay outside the Squirrel install directory. The renderer continues to use the narrow Electron API bridge, and the backend continues to use a configurable JDBC connection, preserving the boundary for a later hosted backend design.
