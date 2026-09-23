# Roadmap

## Milestone 0 — Project foundation

- [x] Document the product goal, intended architecture, MVP boundary, and decisions.

## Milestone 1 — Tracker API and persistence

- [x] Create the Java 21 / Spring Boot backend and configure PostgreSQL.
- [x] Persist one internship opportunity per card, its posting URL, and its current stage.
- [x] Add REST operations to save, list, and update opportunities and their stages.
- [x] Return the existing card when a saved posting URL matches another opportunity.
- [x] Test new backend behavior with an in-memory database.

The API is also covered by an integration test that starts PostgreSQL 14.22 for the test run. Normal local runs now use the persistent PostgreSQL service set up in Milestone 4.

## Milestone 2 — Kanban workflow

- [x] Create the React / TypeScript UI.
- [x] Show saved opportunities in fixed application stages and allow moving cards.
- [x] Provide manual entry and display duplicate URL warnings.
- [x] Test the board's main interactions and build the frontend.

## Milestone 3 — Local desktop integration

- [x] Add an Electron shell for the built React UI.
- [x] Connect it to the separately configured local Spring Boot service and PostgreSQL database.
- [x] Document how to run the first usable version locally.

The Electron process launched during the local integration check, and the user has since reported that the desktop UI seems fully functional.

## Milestone 4 — Persistent local PostgreSQL

- [x] Set up a dedicated PostgreSQL database and user with a data directory outside temporary or build directories.
- [x] Configure the API to use that database in normal local runs and document how to start and stop it.
- [x] Save and move cards, restart PostgreSQL, the API, and Electron, then verify the cards and stages remain.
- [x] Document a basic backup and restore procedure before using the database for important application records.

PostgreSQL 17 now runs as a Windows service. Two cards were migrated from the earlier temporary database, verified through the API after a full service and app restart, and included in a backup that was restored into a separate test database. The temporary database is no longer the app's data source.

## Milestone 5 — One-click launch on the current Windows PC

- [x] Decide how the app starts the API and whether the package includes a Java runtime.
- [x] Choose Electron Forge with Squirrel.Windows for a per-user Windows installer and Start Menu shortcut.
- [x] Create a Windows installer with a Start Menu shortcut that packages the React UI, Electron shell, Spring Boot API, and Java runtime for this PC, using its existing PostgreSQL service and database credentials.
- [x] Make opening the app start or connect to its required local components without Maven, npm, or manual terminal commands.
- [x] Verify first launch, a later launch with existing cards, a full restart, and an update that preserves data; show a clear error when a required component cannot start.

Version 0.1.1 is installed on the current PC. Electron manages a bundled API process using a pinned Java 21 runtime. The Squirrel installer created a Start Menu shortcut. An update from 0.1.0, a close-and-reopen check, and PostgreSQL service restarts preserved the two existing cards. The database and credential now live outside replaceable application files. Startup reports a missing credential through an error dialog.

## Milestone 5.1 — Edit and delete cards

- [x] Add API operations to edit title, company, and posting URL and to delete a card; preserve duplicate-URL behavior and return clear errors for missing cards.
- [x] Add gray pencil and trash controls to each card. Reuse a prefilled form for editing and show a named confirmation before permanent deletion.
- [x] Persist the "Don't ask again on this device" choice across launches and offer a visible way to turn deletion confirmations back on. Design a fuller settings window later.
- [x] Test backend behavior, board interactions, the Electron API bridge, and an installed-app update against existing data.

Version 0.1.2 is installed on the current PC. Before adding permanent deletion, a fresh `pg_dump` archive was saved and checked. The updated installed API read the two existing cards without changing them; the installed renderer showed both edit and delete controls and allowed access to its preference storage. Edit and delete behavior was tested against temporary databases and simulated UI responses.

## Milestone 5.2 — Backup button

- [ ] Let the user choose a destination and create a PostgreSQL backup from the installed app without needing a terminal.
- [ ] Show the backup's destination and result clearly; verify the archive and test restoring it into a separate database.
- [ ] Plan the restore experience and any scheduled backups separately.

The backup button comes before the fresh-PC installer. Keep using manual backups until it is built. A fuller settings window and recoverable Trash remain later work.

## Milestone 6 — Fresh Windows PC installer

- [ ] Choose how one installer sets up PostgreSQL, the app database and credentials, and any required Java runtime on a new Windows PC.
- [ ] Install the desktop app and local services without repository tools or manual database setup.
- [ ] Verify a clean install, reopening existing data, backup and restore, and an update that preserves the database.

This follows the current-PC launch so its API startup and packaging behavior can be proven before adding database provisioning.

## Product discussions after the launch workflow

- [ ] Discuss which product workflow to build next, including search and filtering and the application-materials area described in `PRODUCT.md`.
- [ ] Plan the posting-browse workflow: where postings appear, how "Add to list" obtains available title/company/URL details, and how the user reviews them before saving.

## Later milestones

- Search and filtering.
- Global shortcut, quick-add overlay, and system tray.
- Browser integration.
- Browse internship postings in or from the app and add a selected posting with available details prefilled for review.
- Automatic discovery and recommendations.
- Email-based application updates.
- Trash or Recently Deleted, including whether deleted cards expire automatically and how long recovery remains possible.
- Company application-opening timeline, including how dates are sourced and kept current.
- Interview schedule on cards in `INTERVIEWING`; decide on reminders and calendar integration later.
- Cross-device dashboard access: compare a hosted API and database with synchronization from local installs, then plan accounts, offline behavior, and data protection before implementation.
- Application materials and resume workshop: plan resume storage and reuse, an inventory of experiences/projects/courses, tailored bullet-point suggestions, and possible application-form upload assistance. Define the section name, document workflow, browser integration, and AI/privacy choices before implementation.

Desktop packaging and process orchestration for the current PC are recorded in `DECISIONS.md`. Deployment across devices needs a separate design.
