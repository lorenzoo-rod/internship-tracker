# Decisions

## Product and MVP

- Internship Hub is a local tracker for one user.
- Each saved internship opportunity is one Kanban card. A separate posting and application model is outside the MVP.
- The user saves opportunities manually and moves cards through fixed application stages.
- Saving a matching posting URL is blocked and returns the existing card. Matching is exact after trimming surrounding whitespace; URLs are otherwise unchanged.
- The first usable version uses a local development setup with separately configured backend and database services, rather than an installer.

## Technology

- Desktop shell: Electron.
- Renderer: React and TypeScript.
- Backend: Java 21, Spring Boot, and Spring Data JPA.
- Database: PostgreSQL.
- The renderer communicates with the backend through REST. Backend services own business rules; controllers handle HTTP, and the database is accessed through the backend.

## Deferred decisions

Fresh-PC PostgreSQL provisioning remains open. Signing and update delivery can be decided when the app is shared beyond the current PC. Application-opening timelines and interview scheduling are future concepts; date sourcing, reminders, and calendar integration need planning.

Cross-device access is a future design possibility, not part of the current-PC package. A hosted service versus synchronization, user accounts, offline behavior, and privacy require a separate decision.

## Tracker improvements before the fresh-PC installer

- Edit and delete are implemented in version 0.1.2, and the desktop backup button in version 0.1.3. Milestone 6 follows.
- Edit title, company, and posting URL in a prefilled form; stage changes remain in the existing board control. Editing a URL to one used by another card returns the existing-card duplicate warning.
- Gray pencil and trash controls sit at the top right of each card. Delete is permanent in the current version and normally requires a confirmation naming the card.
- The confirmation offers "Don't ask again on this device." Renderer local storage preserves that preference across app launches, and a visible board control re-enables confirmations. A full settings/configuration window is deferred for later design.
- A future Trash or Recently Deleted area may allow recovery and automatic expiration; its retention period and behavior are undecided.
- The desktop backup button opens a save dialog and uses the current PC's PostgreSQL 17 `pg_dump` and `pg_restore` tools. It saves a custom archive to a user-chosen path, verifies the archive, and does not overwrite an existing file. Database credentials remain outside the archive command line. In-app restore and scheduled backup workflows remain undecided.

## Next implementation order

- Persistent local PostgreSQL is in place so saved cards survive a full restart.
- The desktop app now opens with one click on the current Windows PC, using its existing PostgreSQL service and data. Editing, deletion, and user-initiated backup are in place. A fresh-PC installer that also provisions PostgreSQL follows later.

## Current-PC package plan

- Target the current Windows PC first. The package uses the existing PostgreSQL service, `internship_hub` database, and current user's local credentials; it does not install another PostgreSQL instance or move the database.
- Electron starts the packaged Spring Boot API when the app opens and stops the API process when the app exits. The API is not a separate always-running Windows service.
- Include a Java runtime with the app so opening it does not depend on a separately installed JDK or Maven.
- Use Electron Forge with Squirrel.Windows to create a per-user Windows installer and Start Menu shortcut. Forge is Electron's recommended packaging tool; Squirrel provides this Windows installer format without requiring administrator rights for the app install. The existing PostgreSQL service was installed separately.

## Persistent local database

- On the current Windows machine, PostgreSQL 17 is installed system-wide as service `postgresql-x64-17`, with data in `C:\ProgramData\InternshipHub\PostgreSQL\data`.
- The app uses its own `internship_hub` database and login. Generated passwords are stored in the current user's `%LOCALAPPDATA%\InternshipHubData\secrets` directory, outside the repository and Squirrel's `%LOCALAPPDATA%\InternshipHub` install directory. The backend's `start-local.ps1` reads the app password unless `DB_PASSWORD` is provided.
- The two cards in the former temporary database were migrated. A restart of PostgreSQL, the API, and Electron preserved them and their stages. A `pg_dump` archive was restored into a separate test database to check recovery.

## Tracker API implementation

- Fixed stages: `SAVED`, `APPLIED`, `INTERVIEWING`, `OFFER`, `CLOSED`. New cards start in `SAVED`.
- Each card persists an ID, title, company, posting URL, and stage in one `opportunities` table. The posting URL is unique.
- REST endpoints: `GET /api/opportunities`, `GET /api/opportunities/{id}`, `POST /api/opportunities`, `PATCH /api/opportunities/{id}`, `PATCH /api/opportunities/{id}/stage`, and `DELETE /api/opportunities/{id}`.
- A duplicate `POST` returns HTTP 409 with `code: DUPLICATE_POSTING_URL` and the `existing` card. A successful `POST` returns HTTP 201.
- An edit returns the updated card without changing its stage, or HTTP 409 with the existing card if its new URL belongs to another card. Delete returns HTTP 204; missing cards return HTTP 404.
- The backend uses Spring Boot 3.4.1 and Maven. Hibernate updates the schema for the local development setup; a migration strategy is deferred until it is needed.

## Kanban UI implementation

- The frontend uses React, TypeScript, and Vite. Vite proxies `/api` to the local Spring Boot service during development.
- Cards can move between the fixed stages by drag and drop or a stage menu. The menu provides a non-drag interaction for the same workflow.
- The form shows the existing card returned by the API when saving a duplicate URL.
- A test-only embedded PostgreSQL dependency verifies the API against PostgreSQL without installing a local database service for tests. Runtime setup still uses a separately configured PostgreSQL service.

## Local desktop integration

- Electron loads the built React files directly. Vite is only needed for browser-based frontend development.
- A context-isolated, sandboxed renderer uses a narrow preload bridge. The Electron main process forwards only the tracker API's approved `GET`, `POST`, and `PATCH` paths to the local Spring Boot service on port 8080.
- Development mode connects to Spring Boot on port 8080. The installed Electron app starts and stops its own bundled API on a free loopback port; PostgreSQL remains a separate Windows service.
