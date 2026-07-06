# Custom Output Filename — Design Spec

**Date:** 2026-07-06
**Status:** Draft
**Scope:** CLI + Web client

---

## Problem

Currently, output filenames are hardcoded:
- **CLI:** Always `FACTURAS ELECTRÓNICAS.xlsx` (with incremental suffix on conflict)
- **Web:** Always `{originalName}_procesado.xlsx`

Users cannot choose their own output filenames. This limits flexibility when organizing processed files.

## Goal

Allow users to define custom output filenames in both the CLI and web client, while preserving the current naming scheme as the default.

---

## Design

### 1. Core Types (`src/core/types.ts`)

Add `outputName` to `FileJob`:

```typescript
export interface FileJob {
    id: string;
    originalName: string;
    outputName?: string;  // NEW: custom output filename (e.g., "reporte-enero.xlsx")
    status: 'pending' | 'processing' | 'done' | 'error';
    stats?: TransformStats;
    error?: string;
    outputPath?: string;
}
```

### 2. CLI Changes (`src/cli.ts`)

#### New option

```
--output-name <name>  Nombre personalizado para el archivo de salida
```

#### Behavior

| Scenario | Behavior |
|----------|----------|
| Single file + `--output-name "mi-reporte"` | Output: `{inputDir}/mi-reporte.xlsx` |
| Single file, no flag | Current behavior: `FACTURAS ELECTRÓNICAS.xlsx` |
| Multiple files + `--output-name` | **Interactive prompt**: ask user for each file's output name individually |
| Multiple files, no flag | Current behavior: `FACTURAS ELECTRÓNICAS.xlsx`, `(1).xlsx`, `(2).xlsx` |

#### Interactive multi-file naming flow

When `--output-name` is provided with multiple files:

```
Archivos a procesar:
  1. enerowork.xlsx
  2. febrerowork.xlsx
  3. marzowork.xlsx

Nombre de salida para enerowork.xlsx: reporte-enero
Nombre de salida para febrerowork.xlsx: reporte-febrero
Nombre de salida para marzowork.xlsx: reporte-marzo
```

- `.xlsx` extension is auto-appended if not provided
- Empty input falls back to default naming for that file
- Pressing Ctrl+C cancels the entire batch

#### Implementation detail

`processFiles()` signature changes to accept an optional `outputNames` map:

```typescript
async function processFiles(
    filePaths: string[],
    tipoGasto?: string,
    outputNames?: Map<number, string>  // index -> custom name
): Promise<boolean>
```

`getUniqueOutputPath` is modified to accept an optional custom name:

```typescript
function getUniqueOutputPath(inputDir: string, index: number, customName?: string): string
```

When `customName` is provided, it replaces the base name. The incrementing suffix logic still applies to avoid overwrites.

### 3. Web Client Changes

#### 3a. FileCard (`src/web/components/FileCard.tsx`)

Add an editable text input for the output name, visible when `status === 'pending'`:

- Default value: `FACTURAS ELECTRÓNICAS` (without extension)
- Input is a plain text field styled consistently with the design system
- `.xlsx` extension is shown as a non-editable suffix label next to the input
- On blur or Enter, the value is saved to the store
- Empty input reverts to the default

The input replaces the filename display in the card's left section when editing, and sits between the filename and the status badge.

#### 3b. Store (`src/web/store.ts`)

Add action:

```typescript
setOutputName: (id: string, name: string) => void;
```

This updates the local `FileInfo` entry's `outputName` field. The value is sent to the server during processing.

Add to state:

```typescript
interface AppStore {
    // ... existing
    outputNames: Record<string, string>;  // fileId -> custom output name
    setOutputName: (id: string, name: string) => void;
}
```

#### 3c. API (`src/web/api.ts`)

Modify `processFiles` to send output names:

```typescript
export async function processFiles(
    tipoGasto: string,
    outputNames?: Record<string, string>
): Promise<any> {
    // POST /api/files/process with { tipoGasto, outputNames }
}
```

Add bulk download helper:

```typescript
export async function downloadAll(files: FileInfo[]): Promise<void> {
    const doneFiles = files.filter(f => f.status === 'done');
    for (let i = 0; i < doneFiles.length; i++) {
        const f = doneFiles[i];
        const a = document.createElement('a');
        a.href = downloadUrl(f.id);
        a.download = f.outputName
            ? (f.outputName.endsWith('.xlsx') ? f.outputName : f.outputName + '.xlsx')
            : undefined;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        // Small delay between downloads to avoid browser blocking
        if (i < doneFiles.length - 1) {
            await new Promise(r => setTimeout(r, 300));
        }
    }
}
```

#### 3d. ProcessButton / ResultPanel

Add a "Descargar todo" button in `ResultPanel.tsx` that appears when there are completed files. Calls `downloadAll()` from the API.

### 4. Server Changes

#### 4a. Process endpoint (`POST /api/files/process`)

Accept `outputNames` in request body:

```json
{
    "tipoGasto": "EMPRESARIAL",
    "outputNames": {
        "abc123": "reporte-enero",
        "def456": "reporte-febrero"
    }
}
```

For each file being processed, if an output name is provided, use it as the base for the temp output filename (with `.xlsx` extension). Store the custom name in the `FileJob` so the download endpoint can use it.

#### 4b. Download endpoint (`GET /api/files/:id/download`)

Use `file.outputName` for `Content-Disposition` if set, otherwise fall back to current `{originalName}_procesado.xlsx`.

```typescript
const downloadName = file.outputName
    ? (file.outputName.endsWith('.xlsx') ? file.outputName : file.outputName + '.xlsx')
    : file.originalName.replace(/\.(xlsx?|xls)$/i, '') + '_procesado.xlsx';
res.download(file.outputPath, downloadName);
```

#### 4c. Processor (`src/core/processor.ts`)

Add optional `outputName` to `ProcessResult` and `processFile` options. When provided, use it for the output path instead of the auto-generated name.

---

## Files to modify

| File | Change |
|------|--------|
| `src/core/types.ts` | Add `outputName?: string` to `FileJob` |
| `src/core/processor.ts` | Accept `outputName` option, use for output path |
| `src/cli.ts` | Add `--output-name` flag, interactive naming for multi-file |
| `src/server/routes/files.ts` | Accept `outputNames` in process, use in download |
| `src/web/api.ts` | Send `outputNames` in process, add `downloadAll()` |
| `src/web/store.ts` | Add `outputNames` state + `setOutputName` action |
| `src/web/components/FileCard.tsx` | Add editable output name input for pending files |
| `src/web/components/ResultPanel.tsx` | Add "Descargar todo" button |
| `src/web/components/ProcessButton.tsx` | Pass outputNames to processAll |

## Default naming behavior (preserved)

When no custom name is provided:

- **CLI:** `FACTURAS ELECTRÓNICAS.xlsx` → `(1).xlsx` → `(2).xlsx` ...
- **Web:** `{originalName}_procesado.xlsx`

## Edge cases

- Custom name without `.xlsx` extension → auto-append `.xlsx`
- Empty custom name → fall back to default
- Name collision with existing file → increment suffix `(1)`, `(2)` ...
- Custom name with path separators (`/`, `\`) → strip to basename only
- Very long names → truncate to 200 chars (filesystem safety)
