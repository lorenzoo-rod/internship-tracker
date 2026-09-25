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
- Use **Find** to open LinkedIn Jobs in the normal browser. Paste a posting link into Find to review the title, company, and URL in the existing save form before creating a `SAVED` card. The first version does not import LinkedIn job details automatically.
- Pasting a Greenhouse-hosted job link into Find can prefill its title and company from Greenhouse's public API. Review and edit every field before saving. Unsupported links and failed lookups still allow manual entry; the card keeps the pasted URL.
- Use **Find** to open MyGreenhouse Jobs in the normal browser as another browse source. It may require sign-in and lists roles from participating employers; a direct Greenhouse-hosted company job link can be pasted back into Find for autofill.
- Click a Kanban column to focus it and give its cards more room. The other stages become narrow tabs with card counts. Click the focused column again, press Escape, or choose **Show full board** to leave focus mode. Card links, controls, stage menus, and drag-and-drop remain available.
- Version 0.1.11 adds separate discovery, application, and status links to each card. The pencil form edits all three. Saved cards feature the application link; later stages feature the status link when available. The Chrome **Add to saved** action captures the company page URL and available title/company hints, then opens the review form. Nothing is saved until the user confirms. The extension requires a one-time manual load in Chrome.

## Later backup workflows

- Provide an in-app restore workflow and consider scheduled backups after their behavior and safeguards are planned.

## Later workflows

- Search and filter saved opportunities.
- Customize the board's columns by adding stages, editing their names and colors, and deleting stages. Preserve every card when its column changes or is removed; the exact deletion and default-stage rules need a separate decision.
- Use a global keyboard shortcut and quick-add overlay.
- Add keyboard shortcuts for common board actions. Eventually provide a Settings screen where the user can view and customize shortcuts; defaults, conflict handling, and accessibility need later design.
- Extend browser integration to more browsers and distribute the Chrome extension through the Web Store.
- Expand Find to other job boards over time. Reconsider embedding LinkedIn only if opening the normal browser feels awkward, after checking feasibility and security.
- Browse internship postings from the app and choose an "Add to list" action that fills in available details such as title, company, and posting URL for review before saving. The source of postings and how details are extracted need later planning.
- Improve Find so a supported posting source can prefill company and job title as well as its link, with the user reviewing all fields before saving. Keep manual entry available when details cannot be obtained; investigate source permissions and reliability before implementing automatic extraction.
- Investigate automatic status-link capture after applying; the status link is entered manually in the current workflow.
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
