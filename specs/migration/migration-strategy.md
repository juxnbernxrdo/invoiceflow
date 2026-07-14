# Migration Strategy — InvoiceFlow Modularization

**Date:** 2026-07-13
**Status:** Draft

---

## Strategy: Incremental Extraction

Each migration phase is a standalone, committable unit that leaves the system
fully functional.

### Principles

1. **Tests first** — Write behavioral tests before any structural change
2. **Extract, don't rewrite** — Move code to new files without changing logic
3. **One concern per commit** — Each commit does exactly one thing
4. **Build + test after every change** — Never proceed if build breaks
5. **Preserve git history** — Use `git mv` where possible to track file moves

### Phase Order

```
M0 (tests) → M1 (types) → M2 (transformer) → M3 (cli) → M4 (server) → M5 (deps) → M6 (docs)
```

### Rollback Procedure

At any point:
1. `git stash` or `git revert` to last known-good state
2. Run `npm run build && npm run build:web`
3. Manual smoke test: process one .xlsx file via CLI and web
4. If pass, continue. If fail, investigate before proceeding.

### Verification Checklist (per phase)

- [ ] `npm run build` passes
- [ ] `npm run build:web` passes
- [ ] `npm test` passes (after M0)
- [ ] `invo file.xlsx` produces correct output
- [ ] Web upload → process → download works
- [ ] Output file opens correctly in Excel/LibreOffice

## Detailed Migration Phases

### Phase M0: Preparation (no code changes)

| Task | Description | Risk |
|------|-------------|------|
| M0.1 | Create specs/ directory structure | None |
| M0.2 | Write core module spec documents | None |
| M0.3 | Configure vitest in package.json | Low |
| M0.4 | Write transformer behavioral tests | Low |
| M0.5 | Write processor tests | Low |
| M0.6 | Verify all tests pass + npm run build | — |

### Phase M1: Unify Types

| Task | Description | Risk |
|------|-------------|------|
| M1.1 | Consolidate TransformOptions in core/types.ts | Low |
| M1.2 | Consolidate TransformStats in core/types.ts | Low |
| M1.3 | Consolidate ProgressCallback in core/types.ts | Low |
| M1.4 | Create utils/id.ts with generateId() | Low |
| M1.5 | Update all imports across codebase | Low |
| M1.6 | Verify build + tests pass | — |

### Phase M2: Refactor Transformer (internal)

| Task | Description | Risk |
|------|-------------|------|
| M2.1 | Extract SEMANTIC_RULES to semantic-rules.ts | Low |
| M2.2 | Extract ColumnDetector | Medium |
| M2.3 | Extract ColumnTransformer | Medium |
| M2.4 | Extract ExcelFormatter | Medium |
| M2.5 | Extract StyleCleaner | Low |
| M2.6 | Rewrite Transformer as orchestrator | Medium |
| M2.7 | Verify all tests pass | — |

### Phase M3: Refactor CLI

| Task | Description | Risk |
|------|-------------|------|
| M3.1 | Extract commander.ts (command definitions) | Low |
| M3.2 | Extract interactive.ts (interactive mode, keypress) | Medium |
| M3.3 | Extract prompts.ts (tipo gasto, output name) | Low |
| M3.4 | Extract progress.ts (progress bar) | Low |
| M3.5 | cli.ts becomes lightweight orchestrator | Low |
| M3.6 | Verify CLI works identically | — |

### Phase M4: Refactor Server

| Task | Description | Risk |
|------|-------------|------|
| M4.1 | Make store pluggable (SessionStore interface) | Low |
| M4.2 | Move generateId() to utils/id.ts | Low |
| M4.3 | Fix hardcoded web dist path | Low |
| M4.4 | Replace dynamic require() with static import | Low |
| M4.5 | Verify API works identically | — |

### Phase M5: Reorganize package.json

| Task | Description | Risk |
|------|-------------|------|
| M5.1 | Move react, zustand, lucide, tailwind to devDependencies | Low |
| M5.2 | Keep only runtime dependencies in dependencies | Low |
| M5.3 | Verify npm install -g still works | — |

### Phase M6: Documentation

| Task | Description | Risk |
|------|-------------|------|
| M6.1 | Update README.md with new structure | None |
| M6.2 | Fix nonexistent gradient.ts reference | None |
| M6.3 | Create contribution guide for new modules | None |
| M6.4 | Git tags for each completed phase | None |
