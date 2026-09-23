# Development Instructions

Before changing product scope or architecture, read:

- `docs/PRODUCT.md`
- `docs/ARCHITECTURE.md`
- `docs/ROADMAP.md`
- `docs/DECISIONS.md`

## Principles

- Prefer simple implementations over premature abstraction.
- Do not introduce a new framework without explaining why.
- Keep changes within the requested scope; do not modify unrelated code.
- Put backend business logic in services, not controllers.
- Add or update tests for new backend behavior and run the relevant tests before considering implementation complete.
- Discuss consequential choices with the user before committing to them, then record the decisions in `docs/DECISIONS.md`.
- Keep the project docs accurate as the planned architecture becomes implemented code.

## Before implementing

1. Read the relevant project docs and inspect the existing code. The backend has an API; the frontend has a React Kanban board and an Electron shell.
2. Describe the intended changes and state any assumptions.
3. Resolve consequential choices with the user; use the documented MVP boundary for routine choices.
4. Implement only the requested scope.

## After implementing

Report the files changed, important implementation decisions, tests run, remaining issues, and a suggested next task. For documentation-only changes, review the documents and diff; application tests are not needed.
