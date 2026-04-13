# Financial Monitor Improvement Plan

## Objectives
- Reduce duplication in app bootstrap and persistence flows.
- Make unified storage safer to evolve and test.
- Improve workflow reliability in tests and CI.

## Plan
- [done] Extract shared unified-storage bootstrap hook used by Investments and Expenses apps.
- [done] Add focused tests for bootstrap behavior and persistence edge cases.
- [done] Add runtime validation helpers for unified storage hydration and imports.
- [pending] Stabilize Playwright selectors and replace fixed waits with state-based waits.
- [pending] Expand CI to run at least a smoke E2E path before deploy.
- [pending] Reduce production bundle size with route-level code splitting.
- [pending] Update architecture docs to reflect the unified-storage system.

## Review
- Initial implementation slice extracted the duplicate bootstrap logic into a shared hook and removed per-app initialization effects.
- Added direct tests for migration and fresh-install bootstrap paths.
- Added unified-storage normalization and validation for hydration, legacy migration, export, import, and reset flows.
- Validation status: `npm test` and `npm run build` passed after the storage changes.
- Graphify package was installed in the workspace Python environment and the repository graph was rebuilt successfully.