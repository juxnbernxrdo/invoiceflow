# Task Breakdown — Core Module Refactoring

**Date:** 2026-07-13
**Status:** Draft

---

## Phase M0: Preparation

| ID | Task | Est. | Depends |
|----|------|------|---------|
| M0.1 | Create specs/ directory structure | 0.5h | — |
| M0.2 | Write core module spec (this document) | 2h | — |
| M0.3 | Configure vitest in package.json | 0.5h | — |
| M0.4 | Write transformer tests (happy paths) | 2h | M0.3 |
| M0.5 | Write processor tests | 1h | M0.3 |
| M0.6 | Verify all tests pass + npm run build | 0.5h | M0.4, M0.5 |

## Phase M1: Unify Types

| ID | Task | Est. | Depends |
|----|------|------|---------|
| M1.1 | Merge TransformOptions into core/types.ts | 0.5h | M0.6 |
| M1.2 | Merge TransformStats into core/types.ts | 0.5h | M1.1 |
| M1.3 | Merge ProgressCallback into core/types.ts | 0.25h | M1.2 |
| M1.4 | Create utils/id.ts with generateId() | 0.25h | — |
| M1.5 | Update all imports across codebase | 1h | M1.3, M1.4 |
| M1.6 | Verify build + tests pass | 0.5h | M1.5 |

## Phase M2: Refactor Transformer

| ID | Task | Est. | Depends |
|----|------|------|---------|
| M2.1 | Extract SEMANTIC_RULES to semantic-rules.ts | 0.5h | M1.6 |
| M2.2 | Extract ColumnDetector | 1.5h | M2.1 |
| M2.3 | Extract ColumnTransformer | 2h | M2.2 |
| M2.4 | Extract ExcelFormatter | 2h | M2.3 |
| M2.5 | Extract StyleCleaner | 1h | M2.4 |
| M2.6 | Rewrite Transformer as orchestrator | 2h | M2.5 |
| M2.7 | Verify all tests pass | 0.5h | M2.6 |

**Total estimated:** ~17 hours across all phases
