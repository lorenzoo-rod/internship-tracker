# Kanban board

Run `npm install`, then `npm run dev` from `frontend/`. Open the local URL printed by Vite. The dev server proxies `/api` requests to the Spring Boot service at `http://localhost:8080`, so start the backend and its PostgreSQL database separately.

Run `npm run build` to type-check and build the frontend. The board supports adding opportunities, viewing duplicate URL feedback, and moving cards between fixed stages by drag and drop or the stage menu on each card.

Run `npm test` to check the board's loading, saving, duplicate, and card movement interactions. These tests simulate API responses and do not require the backend.

Run `npm run desktop` to build the UI and open it in Electron. The Electron window loads the built files, so Vite does not need to be running. Its restricted bridge forwards only the tracker API calls to the local Spring Boot service on port 8080. Run `npm run test:desktop` to check the bridge's request restrictions. The backend and PostgreSQL still run separately.

Run `npm run make` to create the current-PC Windows installer. It bundles the API JAR and pinned Java 21 runtime with Electron. The installed app starts its own API on a free loopback port and reads the database credential from `%LOCALAPPDATA%\InternshipHubData\secrets\db-password.secret`. PostgreSQL remains a separate Windows service. The installer and release archive are under `out/make/squirrel.windows/x64/`.

Cards have edit and delete controls. Editing preserves the current stage and rejects another card's posting URL. Deletion is permanent; its confirmation can be disabled on this device and re-enabled from the board. The confirmation preference is stored in browser/Electron local storage, outside PostgreSQL.

The Electron window also shows **Save backup**. It opens a save dialog, creates a PostgreSQL custom archive using the installed PostgreSQL 17 tools, verifies the archive, and reports the destination. Existing files are not overwritten. This desktop action is not available from the Vite browser-only development page. In-app restore and scheduled backups are later work.
