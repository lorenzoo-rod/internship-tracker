# Kanban board

Run `npm install`, then `npm run dev` from `frontend/`. Open the local URL printed by Vite. The dev server proxies `/api` requests to the Spring Boot service at `http://localhost:8080`, so start the backend and its PostgreSQL database separately.

Run `npm run build` to type-check and build the frontend. The board supports adding opportunities, viewing duplicate URL feedback, and moving cards between fixed stages by drag and drop or the stage menu on each card.

Run `npm test` to check the board's loading, saving, duplicate, and card movement interactions. These tests simulate API responses and do not require the backend.

Run `npm run desktop` to build the UI and open it in Electron. The Electron window loads the built files, so Vite does not need to be running. Its restricted bridge forwards only the tracker API calls to the local Spring Boot service on port 8080. Run `npm run test:desktop` to check the bridge's request restrictions. The backend and PostgreSQL still run separately.

Run `npm run make` to create the current-PC Windows installer. It bundles the API JAR and pinned Java 21 runtime with Electron. The installed app starts its own API on a free loopback port and reads the database credential from `%LOCALAPPDATA%\InternshipHubData\secrets\db-password.secret`. PostgreSQL remains a separate Windows service. The installer and release archive are under `out/make/squirrel.windows/x64/`.

Run `npm run make:fresh` to create the offline fresh-PC installer under `out/make/fresh-pc/`. It embeds the PostgreSQL 17 installer and the Squirrel app installer. Windows administrator approval is required to install PostgreSQL as a service. The first app launch asks for the PostgreSQL administrator password to create the app database; an existing database is reused only after its existing app-user password is verified. Database files, credentials, and user backups are left in place when the app is updated or uninstalled.

Cards have edit and delete controls. Editing preserves the current stage and rejects another card's posting URL. Deletion is permanent; its confirmation can be disabled on this device and re-enabled from the board. The confirmation preference is stored in browser/Electron local storage, outside PostgreSQL.

The Electron window also shows **Save backup**. It opens a save dialog, finds the installed PostgreSQL 17 tools through the Windows registry, creates a PostgreSQL custom archive, verifies it, and reports the destination. Existing files are not overwritten. This desktop action is not available from the Vite browser-only development page. Restore remains a documented command-line procedure; in-app restore and scheduled backups are later work.

Use **Find** to open LinkedIn Jobs or MyGreenhouse Jobs in the normal browser. MyGreenhouse may ask you to sign in and lists jobs from participating employers. Open a company's job page, copy its link into Find, and choose **Review for board**. For Greenhouse-hosted job links, Internship Hub looks up the title and company and prefills the editable review form. Other links, including LinkedIn links, and failed lookups use manual entry. The pasted URL stays on the card, and the same duplicate-URL warning applies.

Version 0.1.11 stores discovery, application, and status links separately. The pencil form shows all links. A Saved card opens its application page; later cards show the status page when one is available. An existing single URL is migrated into application for Saved or status for later stages. Before updating an installed app, create a checked database backup.

The Chrome extension is copied to `%LOCALAPPDATA%\InternshipHubData\chrome-extension` when the packaged app starts. Follow [the extension setup instructions](chrome-extension/README.md) to load it once in Chrome. On a company application page, click the extension and **Review in Internship Hub**. The desktop app opens an editable form and saves only after you confirm. Chrome may ask you to allow opening the desktop app.
