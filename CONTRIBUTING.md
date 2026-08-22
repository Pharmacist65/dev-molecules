# Contributing to Dev Molecules

Thank you for helping improve Dev Molecules. Contributions should preserve both software quality and scientific boundaries.

## Before opening a pull request

1. Keep chemistry, evidence, scoring, and review rules outside React components.
2. Attach every publishable scientific claim to a resolvable source and explicit review status.
3. Keep educational simplifications visibly distinct from reported or reviewed routes.
4. Never infer novelty, safety, efficacy, patentability, or synthesizability from a missing record.
5. Do not commit secrets, personal paths, patient data, private structures, generated credentials, or populated environment files.
6. Add or update tests for every behavior change.

Run the complete local gate before requesting review:

```bash
npm run typecheck
npm run lint
npm run build
npm run build:pages
npm run catalog:validate
node --test tests/*.test.mjs
npx playwright test
npm run e2e:pages
npm audit --omit=dev --audit-level=high
git diff --check
```

## Scientific content changes

A scientific content pull request must state the precise source locator, what the source directly supports, what remains an educational interpretation, and who reviewed it. A direct link alone is not enough. Proposed or AI-assisted content remains fail-closed until review is recorded.

## Scope

The current catalog and exercises are seed data, not product ceilings. Prefer generic schemas and adapters over special cases for the initial molecules.
