# Technical Design — Core Module

**Date:** 2026-07-13
**Status:** Draft

---

## Current Structure

```
src/
├── transformer.ts     (761 lines — monolith)
├── core/
│   ├── types.ts       (25 lines)
│   ├── processor.ts   (63 lines)
│   └── index.ts       (3 lines)
└── utils/
    ├── colors.ts      (86 lines)
    ├── formulas.ts    (46 lines)
    └── paths.ts       (46 lines)
```

## Target Structure (after M2 refactoring)

```
src/core/
├── types.ts                    # Unified types (from both current files)
├── transformer.ts              # Orchestrator (composition)
├── processor.ts                # File processing orchestration
├── column-detector.ts          # Column reading + color detection
├── column-transformer.ts       # Delete, rename, insert logic
├── excel-formatter.ts          # Output formatting (headers, widths, alignment)
├── style-cleaner.ts            # JSZip post-processing
├── semantic-rules.ts           # SEMANTIC_RULES constant
└── index.ts                    # Public API
```

## Component Responsibilities

### ColumnDetector
- Reads column headers from rows 1 and 2
- Detects color families via HSL classification
- Returns `ColumnInfo[]`

### ColumnTransformer
- Receives `ColumnInfo[]` and `SEMANTIC_RULES`
- Determines which columns to delete (by name + color)
- Builds output column order (kept + fixed + calculated)
- Builds column index map for formula translation

### ExcelFormatter
- Applies header formatting (Arial, bold, centered)
- Applies data formatting (alignment, number format, date format)
- Calculates dynamic column widths
- Calculates row heights from content wrapping
- Sets autofilter and freeze pane

### StyleCleaner
- Opens saved .xlsx with JSZip
- Identifies active fill definitions
- Strips orphaned fills
- Remaps fillId references

### Transformer (orchestrator)
- Composes the above components
- Manages the 8-step pipeline
- Reports progress via callbacks
