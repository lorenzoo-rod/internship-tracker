# Tracker API

The backend uses Java 21, Maven, Spring Boot, and PostgreSQL. It stores one opportunity per Kanban card.

## Run locally

Create a PostgreSQL database named `internship_hub` and a user that can create and update its tables. Set these environment variables as needed:

| Variable | Default |
| --- | --- |
| `DB_URL` | `jdbc:postgresql://localhost:5432/internship_hub` |
| `DB_USER` | `internship_hub` |
| `DB_PASSWORD` | empty |

From `backend/`, run `powershell -NoProfile -ExecutionPolicy Bypass -File .\start-local.ps1` after setting `JAVA_HOME` to a Java 21 or newer JDK. The script reads `%LOCALAPPDATA%\InternshipHubData\secrets\db-password.secret` on the configured Windows machine, or uses `DB_PASSWORD` if it is already set. Hibernate creates or updates the local schema. PostgreSQL runs as a separate Windows service. See the root README for startup, backup, and restore steps.

Run tests with `mvn test`. They use an in-memory H2 database and a test-only embedded PostgreSQL instance, so a separately installed PostgreSQL service is not required for tests.

## API

- `GET /api/opportunities`: list cards.
- `GET /api/opportunities/{id}`: get one card.
- `POST /api/opportunities`: create a card with `title`, `company`, and `postingUrl`. The stage starts as `SAVED`.
- `PATCH /api/opportunities/{id}/stage`: move a card with `{"stage":"APPLIED"}`. Valid stages are `SAVED`, `APPLIED`, `INTERVIEWING`, `OFFER`, and `CLOSED`.
- `PATCH /api/opportunities/{id}`: edit title, company, and posting URL without changing the stage.
- `DELETE /api/opportunities/{id}`: permanently delete a card and return `204 No Content`.

`POST` returns `201 Created` and the new card. When the posting URL matches an existing card after trimming surrounding whitespace, it returns `409 Conflict` with `{"code":"DUPLICATE_POSTING_URL","existing":{...}}`; no second card is saved. Missing cards return `404 Not Found`.

Editing uses the same URL duplicate rule, excluding the card being edited. Deletion has no recovery endpoint; make a database backup before deleting important cards.
