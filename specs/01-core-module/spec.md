# Core Module — Specification

**Date:** 2026-07-13
**Status:** Draft
**Version:** 1.0.3 (current behavior, to be preserved)

---

## Purpose

The Core Module is InvoiceFlow's transformation engine. It reads Ecuadorian electronic
invoice Excel files (26 columns), applies semantic rules, and produces clean output
files (12 columns) ready for accounting analysis.

## Scope

This spec covers the **current behavior** of the core, documenting it as the
invariant baseline. Future refactoring must preserve all behaviors described here.

## Components

### 1. ExcelTransformer (`src/transformer.ts`)

**Responsibility:** Transform a single Excel file.

**Public interface:**
```typescript
class ExcelTransformer {
  constructor(onProgress: (msg: string) => void, onProgressUpdate?: ProgressCallback);
  transform(inputPath: string, outputPath: string, options?: TransformOptions): Promise<TransformStats>;
}
```

**Behavior:**
- Reads .xlsx directly via ExcelJS
- Converts .xls to .xlsx via SheetJS before processing
- Applies SEMANTIC_RULES (delete, rename, insert, calculate)
- Strips highlight colors (yellow, blue, purple, red, green) via HSL classification
- Translates Excel formulas to new column positions
- Formats output: Arial headers, autofilter, freeze pane, dynamic column widths
- Cleans residual styles via JSZip post-processing

### 2. SEMANTIC_RULES (in transformer.ts)

**Constants defining the transformation:**

| Rule | Count | Description |
|------|-------|-------------|
| deleteHeaders | 15 | Columns removed from output |
| sumHeaders | 4 | Columns summed to calculate BASE CERO |
| targetHeader | 1 | Column replaced by calculated sum (irbpnr → BASE CERO) |
| replacements | 10 | Technical header → human-readable header |
| fixedColumns | 1 | Columns inserted with fixed value (TIPO GASTO) |

### 3. Processor (`src/core/processor.ts`)

**Responsibility:** Orchestrate file processing, manage output paths, generate IDs.

**Public interface:**
```typescript
function processFile(inputPath: string, options: TransformOptions, jobId?: string, onProgress?: ProgressCallback): Promise<ProcessResult>;
function processFiles(inputPaths: string[], options: TransformOptions, onFileProgress?: (index: number, total: number, progress: ProgressCallback) => void): Promise<ProcessResult[]>;
```

**Behavior:**
- Generates unique output path keyed by jobId (prevents overwrite on reprocess)
- Creates temp directory `os.tmpdir()/invoiceflow/` if needed
- Delegates to ExcelTransformer for actual transformation

### 4. Types (`src/core/types.ts`)

```typescript
interface TransformOptions { tipoGasto?: string; outputName?: string; }
interface TransformStats { originalColumns: number; finalColumns: number; deletedColumns: string[]; replacedColumns: { red: string; green: string }[]; recalculatedRows: number; }
type ProgressCallback = (current: number, total: number, message: string) => void;
interface FileJob { id: string; originalName: string; outputName?: string; status: 'pending' | 'processing' | 'done' | 'error'; stats?: TransformStats; error?: string; outputPath?: string; createdAt: number; }
```

## Transformation Pipeline (8 steps)

```
Step 1: Read       → ExcelJS reads file; .xls converted via SheetJS
Step 2: Detect     → Identify columns by technical header (row 1) and color (HSL)
Step 3: Delete     → Remove 15 columns (yellow + deleteHeaders match)
Step 4: Rename     → Replace 10 technical headers with human-readable names
Step 5: Insert     → Add TIPO GASTO column after DESCRIPCIÓN
Step 6: Calculate  → Sum base0 + valice + exento + noobjiva → BASE CERO
Step 7: Format     → Bold headers, autofilter, freeze pane, dynamic widths
Step 8: Clean      → Remove residual styles and conditional formatting via JSZip
```

## Invariants

1. Output always has exactly 12 columns
2. Column order is deterministic and documented
3. BASE CERO = sum of base0 + valice + exento + noobjiva (never hardcoded)
4. TIPO GASTO is always after DESCRIPCIÓN
5. Output headers are always the human-readable versions
6. Highlight colors are always stripped from output
7. Formulas are translated to new column positions
8. .xls files are converted to .xlsx transparently
9. Empty trailing rows are removed
10. Conditional formatting and merged cells are removed
