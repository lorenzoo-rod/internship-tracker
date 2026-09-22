# Development Instructions

Read these files before making architectural changes:

- docs/PRODUCT.md
- docs/ARCHITECTURE.md
- docs/ROADMAP.md
- docs/DECISIONS.md

## Principles

- Prefer simple implementations over premature abstraction
- Do not introduce new frameworks without explaining why
- Do not modify unrelated code while completing a task
- Backend business logic belonds in services, not controllers
- Add or update tests for new backend behavior
- Run relevant tests before considering a task complete
- For consequential choices, stop at decision points to have a discussion with me

## Before implementing

1. Inspect the relevant existing code
2. Describe the changes you intend to make
3. Identify and assumptions
4. Implement only the requested scope

## After implementing

Report:

- Files changed
- Important implementation decisions
- Tests run
- Remaining issues
- Suggested next task