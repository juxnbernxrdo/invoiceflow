# Architecture Decision Records — Core Module

**Date:** 2026-07-13
**Status:** Draft

---

## ADR-1: Keep ExcelJS as Primary Engine

**Status:** Accepted
**Context:** The transformer uses ExcelJS for reading/writing xlsx files.

**Decision:** Keep ExcelJS. SheetJS is only used for .xls → .xlsx conversion.

**Alternatives considered:**
- SheetJS only: Less control over styles and formatting
- OpenXML (direct zip manipulation): Too low-level, high maintenance

**Rationale:** ExcelJS provides the right balance of control and ergonomics for
the formatting requirements (fonts, alignment, autofilter, freeze panes).

## ADR-2: Semantic Rules as Constants

**Status:** Accepted
**Context:** Transformation rules (delete, rename, calculate) need to be configurable.

**Decision:** Rules are defined as a const object (SEMANTIC_RULES) at module scope.
Not externalized to config files.

**Rationale:**
- Rules are tightly coupled to the Ecuadorian invoice format
- External config adds complexity without benefit for a single format
- Constants are type-safe and IDE-autocompletable
- Future: if multiple formats are needed, refactor to strategy pattern

## ADR-3: Post-Save JSZip Cleanup

**Status:** Accepted
**Context:** ExcelJS retains orphaned fill definitions in styles.xml.

**Decision:** After saving with ExcelJS, re-open the file with JSZip and strip
unused fill entries.

**Rationale:** ExcelJS doesn't provide an API to remove orphaned style entries.
Direct XML manipulation is the only reliable approach.

## ADR-4: File-Based Processing (No Streaming)

**Status:** Accepted
**Context:** Files are read entirely into memory, processed, and written.

**Decision:** Full file processing (not streaming).

**Rationale:**
- Excel files are ZIP archives requiring random access
- ExcelJS works with full workbook in memory
- Typical file sizes (< 5MB) don't justify streaming complexity
- NFR allows 256MB memory for files up to 10MB

## ADR-5: Color Detection via HSL

**Status:** Accepted
**Context:** Columns need to be identified by highlight color.

**Decision:** Convert ARGB to HSL and classify by hue ranges with saturation/lightness
guards.

**Rationale:**
- More robust than exact hex matching (handles variations in highlight colors)
- Hue ranges are perceptually meaningful
- Saturation/lightness guards reject near-white, near-black, and desaturated colors
