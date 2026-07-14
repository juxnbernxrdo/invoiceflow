# Domain Model — Core Module

**Date:** 2026-07-13
**Status:** Draft

---

## Entities

### TransformOptions (Value Object)
- `tipoGasto?: string` — Expense type (EMPRESARIAL | PERSONAL)
- `outputName?: string` — Custom output filename

### TransformStats (Value Object)
- `originalColumns: number` — Column count in input
- `finalColumns: number` — Column count in output
- `deletedColumns: string[]` — Names of deleted columns
- `replacedColumns: { red: string; green: string }[]` — Renamed columns
- `recalculatedRows: number` — Rows where BASE CERO was calculated

### FileJob (Entity)
- `id: string` — Unique identifier (timestamp-based)
- `originalName: string` — Original filename
- `outputName?: string` — Custom output name
- `status: 'pending' | 'processing' | 'done' | 'error'`
- `stats?: TransformStats`
- `error?: string`
- `outputPath?: string`
- `createdAt: number` — Timestamp

### ColumnInfo (Internal)
- `index: number` — 1-based column position
- `headerTechnical: string | null` — Header from row 1
- `headerHuman: string | null` — Header from row 2
- `colorFamily: ColorFamily` — Detected color

### TransformRules (Constant)
- `deleteHeaders: string[]` — 14 technical names to delete
- `sumHeaders: string[]` — 4 columns summed for BASE CERO
- `targetHeader: string` — Column replaced by sum (irbpnr)
- `targetHumanNames: string[]` — Human names for target
- `replacements: { fromHeader, toHeader }[]` — 10 rename rules
- `fixedColumns: { header, value, position, refHeader }[]` — Inserted columns

### ColorFamily (Enum)
- `'yellow' | 'blue' | 'red' | 'green' | 'purple' | 'none'`

## Relationships

```
TransformOptions ──used by──▶ ExcelTransformer.transform()
ExcelTransformer ──uses──▶ SEMANTIC_RULES (TransformRules)
ExcelTransformer ──reads──▶ ColumnInfo[] (from worksheet)
ExcelTransformer ──produces──▶ TransformStats
ExcelTransformer ──writes──▶ .xlsx output file
Processor ──creates──▶ FileJob
Processor ──delegates to──▶ ExcelTransformer
```

## Invariants

1. SEMANTIC_RULES.deleteHeaders always contains exactly 14 entries
2. SEMANTIC_RULES.sumHeaders always contains exactly 4 entries
3. SEMANTIC_RULES.replacements always contains exactly 10 entries
4. Output column count = input - deleted + inserted + calculated - target
5. FileJob.status transitions: pending → processing → done | error
