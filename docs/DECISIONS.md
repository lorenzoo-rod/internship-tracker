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

Fresh-PC PostgreSQL provisioning uses an administrator-approved Windows service, not a per-user bundled PostgreSQL server. Signing and update delivery can be decided when the app is shared beyond the current PC. Application-opening timelines and interview scheduling are future concepts; date sourcing, reminders, and calendar integration need planning.

Cross-device access is a future design possibility, not part of the current-PC package. A hosted service versus synchronization, user accounts, offline behavior, and privacy require a separate decision.

Customizable board columns are planned for later, after the focused-board milestone. Adding, renaming, recoloring, and deleting columns are desired; rules for editing or deleting built-in stages, choosing the default stage for new cards, and handling cards in a deleted column remain undecided.

After the focused board, prioritize streamlining Find, search, and adding opportunities before customizable columns. The first slice is prefilling company and title from a pasted Greenhouse application link using its public Job Board API. Keep the existing review-before-save and duplicate-card behavior, and allow manual entry when details are unavailable. LinkedIn and Handshake remain discovery paths; Handshake external Apply can lead to an employer application page. Do not depend on scraping either job board for this slice.

Find links to MyGreenhouse Jobs as a second browser-based browse source alongside LinkedIn Jobs. It opens Greenhouse's candidate portal; it does not import listings or sign users in. A direct Greenhouse-hosted company job URL remains the input for the existing autofill flow.

Version 0.1.11 implements three optional card links: discovery, direct application, and application status. At least one is required. The pencil form shows all three. `SAVED` previews prefer the application link; later stages prefer the status link and fall back to the application link. For a legacy card, Flyway moves its sole `postingUrl` into application for `SAVED` or status for any later stage, then drops the old column. Flyway provides a repeatable, versioned migration for existing user data; new databases run the same migrations from an empty schema. Existing databases are baselined at version 1 before the version 2 migration. Hibernate validates the resulting PostgreSQL schema instead of altering it automatically.

Version 0.1.12 changes duplicate checks: an exact application URL match blocks saving, and an exact discovery URL match blocks only when both cards have no application URL. Shared discovery links are allowed when application URLs differ, including a general job-board page used to find several roles. Comparison trims surrounding whitespace. The API returns the existing card on conflict. Shared status URLs are permitted and the API reports a match so the UI can warn. A card's own links do not count as a duplicate. Flyway version 3 replaces the global discovery URL unique index with a partial index for discovery-only cards; the application URL remains unique.

Chrome is the first browser integration. A user-invoked extension reads only the active tab's URL and available page metadata, then opens an `internship-hub://add/` desktop link. Electron accepts only this action with a bounded HTTP(S) application URL and limited text suggestions, passes it through a narrow preload event, and opens the editable review form without saving. The extension carries a referrer as a discovery link only for an individual LinkedIn job URL; generic LinkedIn pages and Handshake referrers are omitted until reliable role URL handling is planned. Chrome's external-protocol prompt and one-time manual unpacked-extension installation are part of this first release; Web Store distribution and other browsers remain later work.

For the three-link card model, the pencil control opens all details and links for review and editing. The board card features the direct application link in `SAVED`; after `SAVED`, it features the status link when one exists and falls back to the application link when it does not. Existing `SAVED` cards had application-page URLs in `postingUrl`; existing cards in `APPLIED`, `INTERVIEWING`, `OFFER`, or `CLOSED` had application-status URLs there. Version 2 migrated each existing URL according to its stage without changing the URL or inventing a missing link. The duplicate rule is recorded above. A matching status URL warns but remains allowed because employers can use one status dashboard for several applications. The browser action captures the active company application page URL, suggests title and company when available, then lets the user edit the review form before saving into `SAVED`. No card is created until the user confirms the review.

Keyboard shortcuts for common actions and eventual shortcut customization in Settings are planned for later. Default bindings, conflicts with system or browser shortcuts, and the settings workflow remain undecided.

## Tracker improvements before the fresh-PC installer

- Edit and delete are implemented in version 0.1.2, and the desktop backup button in version 0.1.3. Milestone 6 follows.
- Edit title, company, and posting URL in a prefilled form; stage changes remain in the existing board control. Editing a URL to one used by another card returns the existing-card duplicate warning.
- Gray pencil and trash controls sit at the top right of each card. Delete is permanent in the current version and normally requires a confirmation naming the card.
- The confirmation offers "Don't ask again on this device." Renderer local storage preserves that preference across app launches, and a visible board control re-enables confirmations. A full settings/configuration window is deferred for later design.
- A future Trash or Recently Deleted area may allow recovery and automatic expiration; its retention period and behavior are undecided.
- The desktop backup button opens a save dialog and uses the current PC's PostgreSQL 17 `pg_dump` and `pg_restore` tools. It saves a custom archive to a user-chosen path, verifies the archive, and does not overwrite an existing file. Database credentials remain outside the archive command line. In-app restore and scheduled backup workflows remain undecided.

## Next implementation order

- Persistent local PostgreSQL is in place so saved cards survive a full restart.
- The desktop app opens with one click on the current Windows PC, using its existing PostgreSQL service and data. Editing, deletion, and user-initiated backup are in place. The offline fresh-PC installer is built, with a full clean-Windows installation check still outstanding.
- Defer the remaining clean-Windows installer verification while the app is used on the current laptop and core tracker features are developed. The installer remains unverified on a fresh PC and should be tested before broader use or distribution.
- Start the finding workflow with a Find section that opens LinkedIn Jobs in the user's normal browser. The user can paste a posting link into the existing review-and-save form; no LinkedIn scraping or automatic import is part of this first version. Revisit embedding LinkedIn only if this workflow feels awkward and after checking feasibility and security.
- The focused board expands a selected stage while the others become narrow labeled tabs with counts. Clicking the column toggles focus; Escape or **Show full board** exits focus. Interactive card elements do not toggle focus, and Enter or Space on a keyboard-focused column offers the same action. Card movement remains available by menu or drag and drop. The packaged desktop loads a centered computer-screen startup screen with “Booting Internship Hub”; startup errors retain Retry/Quit.

## Current-PC package plan

- Target the current Windows PC first. The package uses the existing PostgreSQL service, `internship_hub` database, and current user's local credentials; it does not install another PostgreSQL instance or move the database.
- Electron starts the packaged Spring Boot API when the app opens and stops the API process when the app exits. The API is not a separate always-running Windows service.
- Include a Java runtime with the app so opening it does not depend on a separately installed JDK or Maven.
- Use Electron Forge with Squirrel.Windows to create a per-user Windows installer and Start Menu shortcut. Forge is Electron's recommended packaging tool; Squirrel provides this Windows installer format without requiring administrator rights for the app install. The existing PostgreSQL service was installed separately.

## Fresh-PC installer and data lifecycle

- Milestone 6 provisions PostgreSQL as an administrator-approved Windows service, then creates the dedicated `internship_hub` database and login when absent. It must detect and preserve an existing `internship_hub` database and its cards.
- The fresh-PC distribution includes PostgreSQL in one installer so setup can work offline; installing its Windows service asks for administrator approval. The installed app and PostgreSQL remain separate components.
- Use an Inno Setup wrapper for the offline package. It runs the PostgreSQL 17 installer only when the service installation is absent, then starts the existing Squirrel desktop installer as the original user. The wrapper does not register a separate app uninstaller. The first desktop launch creates the app login and database after the user enters the PostgreSQL administrator password; if the database exists, the user must provide its existing app-user password before setup can reuse it.
- App updates and uninstall do not delete the PostgreSQL database, credential, or user-created backup archives. Removing local data is a separate, explicit action.
- Use the installed service's PostgreSQL backup and restore tools without assuming a single fixed installation path when possible. Verify clean install, reopen and persistence, backup and restore, update, and uninstall behavior against isolated test data before relying on the new setup.
- PostgreSQL installation metadata in the Windows registry locates its command-line tools. The app database remains on loopback port 5432 in this local release. The PostgreSQL installer is pinned and signature-checked during release builds.
- Keep the renderer behind the existing narrow API bridge and the backend behind its database connection configuration, so a later hosted backend and PostgreSQL service can be planned without redesigning the Kanban UI. Cross-device accounts and synchronization remain separate work.

## Persistent local database

- On the current Windows machine, PostgreSQL 17 is installed system-wide as service `postgresql-x64-17`, with data in `C:\ProgramData\InternshipHub\PostgreSQL\data`.
- The app uses its own `internship_hub` database and login. Generated passwords are stored in the current user's `%LOCALAPPDATA%\InternshipHubData\secrets` directory, outside the repository and Squirrel's `%LOCALAPPDATA%\InternshipHub` install directory. The backend's `start-local.ps1` reads the app password unless `DB_PASSWORD` is provided.
- The two cards in the former temporary database were migrated. A restart of PostgreSQL, the API, and Electron preserved them and their stages. A `pg_dump` archive was restored into a separate test database to check recovery.

## Tracker API implementation

- Fixed stages: `SAVED`, `APPLIED`, `INTERVIEWING`, `OFFER`, `CLOSED`. New cards start in `SAVED`.
- Each card persists an ID, title, company, stage, and up to three links in one `opportunities` table. The application URL has a unique index; a partial index and the service check discovery-only duplicates.
- REST endpoints: `GET /api/opportunities`, `GET /api/opportunities/{id}`, `POST /api/opportunities`, `PATCH /api/opportunities/{id}`, `PATCH /api/opportunities/{id}/stage`, and `DELETE /api/opportunities/{id}`.
- A duplicate `POST` returns HTTP 409 with `code: DUPLICATE_POSTING_URL` and the `existing` card. A successful `POST` returns HTTP 201. A shared status URL is allowed and returns `statusUrlMatchId` as a warning hint.
- An edit returns the updated card without changing its stage, or HTTP 409 with the existing card under the duplicate rule above. Delete returns HTTP 204; missing cards return HTTP 404.
- The backend uses Spring Boot 3.4.1 and Maven. Flyway handles PostgreSQL schema creation and migration; Hibernate validates the schema.

## Kanban UI implementation

- The frontend uses React, TypeScript, and Vite. Vite proxies `/api` to the local Spring Boot service during development.
- Cards can move between the fixed stages by drag and drop or a stage menu. The menu provides a non-drag interaction for the same workflow.
- The form shows the existing card returned by the API when saving a duplicate URL.
- A test-only embedded PostgreSQL dependency verifies the API against PostgreSQL without installing a local database service for tests. Runtime setup still uses a separately configured PostgreSQL service.

## Local desktop integration

- Electron loads the built React files directly. Vite is only needed for browser-based frontend development.
- A context-isolated, sandboxed renderer uses a narrow preload bridge. The Electron main process forwards only the tracker API's approved `GET`, `POST`, and `PATCH` paths to the local Spring Boot service on port 8080.
- Development mode connects to Spring Boot on port 8080. The installed Electron app starts and stops its own bundled API on a free loopback port; PostgreSQL remains a separate Windows service.
