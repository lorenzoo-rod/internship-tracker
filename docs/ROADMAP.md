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

- [x] Let the user choose a destination and create a PostgreSQL backup from the installed app without needing a terminal.
- [x] Show the backup's destination and result clearly; verify the archive and test restoring it into a separate database.
- [x] Keep the in-app restore experience and any scheduled backups as separate future work.

Version 0.1.3 was installed on the current PC. The backup code created and checked an archive of the live database, then that archive was restored into a separate temporary PostgreSQL 17 server with the same three-card count. The temporary server was stopped and removed. The installed renderer showed the backup button and its Electron bridge, and the normal shortcut reopened with the existing cards. Backups still need to be initiated by the user; a fuller settings window, in-app restore, scheduled backups, and recoverable Trash remain later work.

## Milestone 6 — Fresh Windows PC installer

- [x] Choose an administrator-approved PostgreSQL Windows service, app database setup on first launch, and one offline installer that includes PostgreSQL and the bundled Java runtime.
- [x] Build the installer and first-run database setup so the desktop app and local services can be installed without repository tools or manual database commands.
- [ ] Verify the full installer on a genuinely fresh Windows PC, including first launch, reopen/persistence, backup and restore, update, and uninstall data retention.

Version 0.1.4 was installed as an update on the current PC through the offline wrapper. An isolated PostgreSQL server test verified fresh app-role/database provisioning, API card creation, reuse after restart, backup, and restore. A live database backup using registry-discovered PostgreSQL tools restored three cards into an isolated server. The current-PC app uninstall and reinstall left its three cards, credential, PostgreSQL service, and existing backup intact. A genuinely fresh Windows PC or VM is still needed to verify the PostgreSQL service installation path end to end.

The clean-Windows verification is deferred while development focuses on features for the current laptop. A Windows 11 VM attempt reached 11% of OS installation but progressed too slowly to reach the app installer; no fresh-PC app install has been verified. Resume this check before relying on or distributing the fresh-PC setup package.

## Finding workflow — in progress

- [x] Add a Find entry that opens LinkedIn Jobs in the normal browser.
- [x] Let the user paste a LinkedIn posting link into the existing review-and-save form without scraping LinkedIn.
- [ ] Choose the first posting source and scope, then display current internship postings in the app.
- [ ] Let the user open a posting and choose **Add to list**. Prefill title, company, and posting URL for review before saving a card in `SAVED`.
- [ ] Autofill company and job title from supported posting sources when available, while keeping every field reviewable and manual entry available. Decide source-specific extraction and permissions first; LinkedIn link paste currently fills only the URL.
- [x] Reuse the existing duplicate-URL response in the pasted-link flow to show an already saved card instead of creating a duplicate.
- [ ] Test source failures, posting display, prefilling, and saving without changing existing cards.

Version 0.1.6 adds Find and the manual link review flow on the current laptop. LinkedIn Jobs is the first navigation source; the user searches for software and tech internships there. Other job boards and any in-app listing feeds require separate source choices. Broader discovery and recommendations remain later work.

Plan a second way to add postings from supported company career sites in the user's normal browser, using the same review-and-save flow. The user can start from LinkedIn or Handshake, follow Apply Externally to the company's application page, and use an explicit browser **Add to saved** action there. Keep LinkedIn and Handshake capture user-driven rather than relying on scraping those job boards. [Handshake documents the external-apply handoff](https://support.joinhandshake.com/hc/en-us/articles/360043604173-Jobs-Apply-Externally); its [terms restrict bulk scraping](https://joinhandshake.com/legal/tos/). Keep separate discovery, direct application, and optional status links on a card: **Apply** opens the direct application page; after submitting, the user can mark the card `APPLIED` and record a status link if the employer provides one. Browser handoff and any automatic status-link capture need further design before implementation.

## Focused board and desktop startup screen — complete

- [x] Click a Kanban column to toggle focus. Expand the selected column within the board and reduce the others to labeled tabs with stage counts; switching tabs changes focus, and Escape or **Show full board** returns to the full board.
- [x] Verify switching focus, keyboard access, card movement, and layouts with both empty and crowded stages.
- [x] Replace Electron's plain "Starting Internship Hub…" placeholder with a centered computer-screen icon and “Booting Internship Hub” across its screen.
- [x] Use a restrained startup animation while the packaged API becomes ready, then show the board. Keep startup errors and retry available, and respect reduced-motion settings.
- [x] Verify the screen during normal launch, a slow API launch, and startup failure. This is a desktop presentation change; it does not alter the board's separate data-loading state.

Version 0.1.8 is installed on the current PC. The frontend build, nine board tests, and seventeen Electron tests pass. Electron Forge packaged the app with the startup HTML/CSS. Board tests cover column-click focus, Escape, keyboard activation, dialog behavior, stage-menu movement, and dropping on a collapsed tab. Hidden Electron captures confirmed the startup screen and a focused board with fifteen cards in one stage. Startup orchestration tests cover normal readiness, a slow API, and failure followed by Retry. The installed app reopened with the PostgreSQL database still holding five cards, and the user confirmed the updated focus interaction works. A verified backup was saved before the preceding update.

## Next priority — Find, search, and add

- [x] Choose the first slice: prefill the review form's company and title when the user pastes a supported posting link.
- [x] Choose Greenhouse-hosted application links as the first autofill source. Its [public Job Board API](https://docs.greenhouse.io/job-board.html) supplies published job details without authentication. LinkedIn links keep manual entry because [LinkedIn restricts scraping and automated browser tools](https://www.linkedin.com/help/linkedin/answer/a1341387).
- [x] Support Greenhouse-hosted job links on `boards.greenhouse.io` and `job-boards.greenhouse.io`; map the public Job Board API's title and company name while preserving the URL the user pasted.
- [x] For a supported link, fetch available details, prefill the existing review form, and let the user correct every field before saving. Keep manual entry when a link is unsupported or lookup fails, and preserve duplicate-card feedback.
- [x] Test successful prefilling, unsupported links, lookup failures, editing before save, and duplicate URLs without changing existing cards.

Version 0.1.9 adds the Greenhouse preview endpoint and Find review flow. The preview request calls only the fixed Greenhouse Job Board API for recognized hosted job URLs; unsupported or unavailable details leave the review form open for manual entry. The pasted URL remains the card's single posting URL. Backend, board, desktop bridge, and frontend build checks passed. The current-PC installer was built and installed over 0.1.8 after a verified database backup. The installed API reopened with six existing cards and returned title and company from a live public Greenhouse job. The browser **Add to saved** workflow and three-link card model remain later work.

Version 0.1.10 adds a MyGreenhouse Jobs link to the Find browse panel. It opens Greenhouse's candidate portal in the normal browser; the user may need to sign in, and only participating employers' roles appear. This navigation does not import MyGreenhouse listings into Internship Hub. The user can open a company's Greenhouse-hosted job page and paste that direct link into the existing review flow. The current-PC installer was built and installed; the installed API reopened with six existing cards, and the installed UI bundle matched the tested build.

Version 0.1.11 implements a user-invoked Chrome **Add to saved** action using temporary [`activeTab` access](https://developer.chrome.com/docs/extensions/develop/concepts/activeTab) and a validated desktop link. It also adds the three-link card model and versioned database migration. Search and filtering of saved cards and searchable in-app listings remain later steps in this priority area. Customizable columns and the broader application-materials area follow.

For the 0.1.11 update, the migration was tested against a restored copy of existing data after a fresh checked backup. The installed Chrome handoff, review form, and existing-card preservation have been confirmed; the backend and UI tests cover duplicate behavior.

## Later milestones

Version 0.1.11 combines the three-link card migration with Chrome **Add to saved** and is installed on the current PC. A verified backup was restored into an isolated PostgreSQL 17 server; the migration preserved all seven existing links. The installed API reopened with seven cards and no legacy `postingUrl` field, and the app copied the Chrome extension to a stable folder. The user loaded the extension and confirmed that a company application page opens the editable desktop review form, autofills available details, and saves to `SAVED` after confirmation. Chrome Web Store distribution remains later work.

- Customizable board columns: design persistent stage identities and ordering, then let the user add, rename, recolor, and delete columns. Decide how new cards get a default stage and what happens to cards in a deleted column before implementation. Migrate existing cards safely and test the API, focused board, and backup/restore with custom stages.
- Search and filtering.
- Global shortcut, quick-add overlay, and system tray.
- Keyboard shortcuts for common board actions, then a Settings screen for viewing and customizing them. Plan defaults, shortcut conflicts, and accessible alternatives before implementation.
- Broader browser integration and Chrome Web Store distribution.
- Browser workflow follow-up: investigate a visible Save to Hub action on supported application pages, the repeated browser access/open-app prompt, and an optional batch review inbox so several browser captures can be approved or discarded in one desktop session. Decide site permissions, draft storage, and browser-to-app transport before implementation.
- Browse internship postings in or from the app and add a selected posting with available details prefilled for review.
- Automatic discovery and recommendations.
- Email-based application updates.
- Trash or Recently Deleted, including whether deleted cards expire automatically and how long recovery remains possible.
- Company application-opening timeline, including how dates are sourced and kept current.
- Interview schedule on cards in `INTERVIEWING`; decide on reminders and calendar integration later.
- Cross-device dashboard access: compare a hosted API and database with synchronization from local installs, then plan accounts, offline behavior, and data protection before implementation.
- Application materials and resume workshop: plan resume storage and reuse, an inventory of experiences/projects/courses, tailored bullet-point suggestions, and possible application-form upload assistance. Define the section name, document workflow, browser integration, and AI/privacy choices before implementation.

Desktop packaging and process orchestration for the current PC are recorded in `DECISIONS.md`. Deployment across devices needs a separate design.
