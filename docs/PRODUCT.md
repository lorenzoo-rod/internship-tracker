# Internship Hub

## Goal

Help one user keep track of internship opportunities and applications on their own computer. Each saved opportunity is one card on a Kanban board.

The longer-term goal is to support more of the internship application process, from finding an opportunity and preparing application materials through tracking the outcome.

## MVP workflow

1. Manually save an internship opportunity, including its posting URL.
2. View saved opportunities as cards in fixed application stages.
3. Move a card between stages as the application progresses.
4. See the existing card when a posting URL matches one already saved; the duplicate is not added.

The first usable version runs locally with a separately configured Spring Boot service and PostgreSQL database. It does not require an installer.

## Current tracker workflow

- Edit a card's title, company, and posting URL through a prefilled form. The stage remains editable through the board's existing control. A URL already used by another card is rejected with the existing-card warning.
- Gray pencil and trash controls sit at the top right of each card, with accessible labels. Deleting a card removes it permanently after a confirmation that names the card.
- "Don't ask again on this device" in the deletion confirmation persists across launches. A board control turns confirmations back on. A broader settings window can be designed later.
- In the desktop app, choose a destination with **Save backup** to create a checked PostgreSQL archive of the current cards. The app reports the saved path or an error and leaves existing backup files untouched.

## Later backup workflows

- Provide an in-app restore workflow and consider scheduled backups after their behavior and safeguards are planned.

## Later workflows

- Search and filter saved opportunities.
- Use a global keyboard shortcut and quick-add overlay.
- Save postings through browser integration.
- Browse internship postings from the app and choose an "Add to list" action that fills in available details such as title, company, and posting URL for review before saving. The source of postings and how details are extracted need later planning.
- Discover internship postings automatically.
- Recommend relevant internships.
- Detect application updates from email.
- Show an approximate timeline of when well-known companies typically open internship applications, with sources and dates checked before the user relies on them.
- Let users record scheduled interview dates and times for cards in `INTERVIEWING`, with a later decision on reminders and calendar integration.
- Explore a hosted version or synchronization so a user can open the same dashboard across devices. Account access, synchronization, offline behavior, and handling of personal data need a separate design before this is built.
- Explore a Trash or Recently Deleted area, potentially with automatic expiration, after the initial permanent-delete workflow is in use.

## Potential future area: application materials

Explore a dedicated section, with a name to be decided, for the material used across applications:

- Save one or more resumes in the app for reuse when an application asks for an upload.
- Keep a structured inventory of experiences, projects, courses, and other resume-worthy work, with descriptions of what the user did.
- Help turn that inventory into resume bullet points and tailor selected experiences or a resume to an opportunity.
- Explore ChatGPT-assisted suggestions and a resume workshop where the user can review and revise proposed changes.
- Explore ways to make a saved resume available during an application form, potentially through later browser integration.

This is a future concept, not part of the tracker MVP. The section name, workflow, storage and versioning of documents, form integration, AI provider, and handling of personal information need separate planning before implementation.
