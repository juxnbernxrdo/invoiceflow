# Product Requirements — InvoiceFlow Platform

**Date:** 2026-07-13
**Status:** Draft

---

## PR-1: Core Module Preservation

**As a** user who depends on InvoiceFlow for daily invoice processing,
**I want** the transformation engine to continue working identically,
**So that** my workflow is not disrupted.

**Priority:** Critical
**Acceptance:** All existing transformation behaviors are preserved. Output files are
byte-compatible with v1.0.3 output.

## PR-2: Modular Architecture

**As a** developer extending InvoiceFlow,
**I want** to add new capabilities as independent modules,
**So that** I can evolve features without risking the core.

**Priority:** High
**Acceptance:** New modules can be added without modifying `src/core/` files.

## PR-3: Backward-Compatible CLI

**As a** CLI user,
**I want** `invo` to behave exactly as before,
**So that** my scripts and workflows continue to work.

**Priority:** Critical
**Acceptance:** All CLI commands, flags, interactive mode, and `/web` command work
identically to v1.0.3.

## PR-4: Backward-Compatible Web Client

**As a** web user,
**I want** the upload/process/download flow to work identically,
**So that** I don't have to relearn the interface.

**Priority:** High
**Acceptance:** All web UI behaviors preserved. API endpoints maintain compatibility.

## PR-5: Test Coverage

**As a** developer maintaining InvoiceFlow,
**I want** automated tests covering the core transformation,
**So that** refactoring doesn't introduce silent regressions.

**Priority:** High
**Acceptance:** Core transformer has behavioral tests covering: .xlsx input, .xls input,
column deletion, column renaming, BASE CERO calculation, TIPO GASTO insertion,
output formatting, style cleanup.
