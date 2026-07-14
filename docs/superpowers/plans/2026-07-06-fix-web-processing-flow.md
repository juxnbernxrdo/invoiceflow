# Fix Web Processing & Download Flow

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix the web client so each processing run is fully independent — unique output file, correct display name, correct individual and bulk downloads.

**Architecture:** The root cause is that `processFile` generates a new ID instead of using the FileJob's ID, the processor's output path collides when the same output name is reused, the ResultPanel shows `originalName` instead of `outputName`, and individual download buttons are missing. The fix ensures every FileJob has its own `outputPath` keyed by its unique ID, the `outputName` is always persisted and displayed, and downloads use the correct per-job output file.

**Tech Stack:** TypeScript, Express, React, Zustand, Lucide

---

## Root Cause Analysis

**Bug:** Processing the same file 3x with different output names produces 3 results, but "Descargar todo" downloads files based on the first run's names.

**Root causes identified:**

1. **`processor.ts` line 43:** `outputPath = path.join(outputDir, outName)` — output path is based on the output name (e.g., `COMPRAS.xlsx`), NOT on the FileJob's unique ID. If the user reuses an output name, the file overwrites the previous one.

2. **`processor.ts` line 53:** `processFile` returns a NEW `id` (via `generateId()`) instead of accepting and returning the FileJob's existing ID. The server's `updateFile(file.id, ...)` call is correct, but the returned `result.id` is discarded — this is cosmetic but confusing.

3. **`ResultPanel.tsx` line 60:** Displays `f.originalName` instead of `f.outputName`. Users see the source filename, not their chosen output name.

4. **No individual download buttons:** Each result in ResultPanel lacks a per-file download button.

5. **`FileCard.tsx`:** Shows `outputName` for non-pending files (line 46-49) but only via `outputNames[file.id]` from the frontend store, which is cleared after processing. Should use `file.outputName` from the server response.

---

## File Map

| File | Action | Purpose |
|------|--------|---------|
| `src/core/processor.ts` | Modify | Output path keyed by FileJob ID, accept job ID |
| `src/core/types.ts` | Modify | Add `createdAt` to FileJob |
| `src/server/routes/files.ts` | Modify | Pass job ID to processor, store outputName before process |
| `src/web/api.ts` | Modify | Add `downloadFile()` helper, ensure `FileInfo.outputName` always sent |
| `src/web/components/ResultPanel.tsx` | Modify | Show outputName, source file, individual download buttons |
| `src/web/components/FileCard.tsx` | Modify | Use `file.outputName` directly, add download button for done files |
| `src/web/store.ts` | No change | Already correct |

---

### Task 1: Processor — output path keyed by job ID

**Files:**
- Modify: `src/core/processor.ts`

**Problem:** Output path is `path.join(outputDir, outName)` — same output name = same file = overwrite.

**Fix:** Output path must be `path.join(outputDir, jobId + '.xlsx')` where `jobId` is the FileJob's unique ID.

Read the current file, then make these changes:

**Change 1:** Update `processFile` signature to accept `jobId`:

```typescript
export async function processFile(
    inputPath: string,
    options: TransformOptions,
    jobId?: string,
    onProgress?: ProgressCallback
): Promise<ProcessResult> {
```

**Change 2:** Replace the outputPath logic (lines 33-43):

Old:
```typescript
    const originalName = path.basename(inputPath);
    const outputDir = path.join(os.tmpdir(), 'invoiceflow');
    if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true });

    let outName: string;
    if (options.outputName) {
        outName = ensureXlsxExtension(sanitizeOutputName(options.outputName));
    } else {
        outName = originalName.replace(/\.(xlsx?|xls)$/i, '') + '_procesado.xlsx';
    }
    const outputPath = path.join(outputDir, outName);
```

New:
```typescript
    const originalName = path.basename(inputPath);
    const outputDir = path.join(os.tmpdir(), 'invoiceflow');
    if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true });

    // Output file is keyed by job ID to prevent collisions when the same
    // file is processed multiple times with different output names.
    const uniqueId = jobId || generateId();
    const outputPath = path.join(outputDir, uniqueId + '.xlsx');
```

**Change 3:** Update the return statement to use the FileJob's ID:

Old:
```typescript
    return {
        id: generateId(),
        originalName,
        outputPath,
        stats,
    };
```

New:
```typescript
    return {
        id: uniqueId,
        originalName,
        outputPath,
        stats,
    };
```

**Verify:**
```bash
cd /home/juxnbernxrdo/Descargas/invoiceflow-cli
npx tsc --noEmit
```

**Commit:**
```bash
git add src/core/processor.ts
git commit -m "fix(processor): output path keyed by job ID — prevent overwrite on reprocess"
```

---

### Task 2: Server — pass job ID to processor, ensure outputName stored

**Files:**
- Modify: `src/server/routes/files.ts`

**Problem:** Server calls `processFile(tempPath, { tipoGasto, outputName: customName })` without passing the FileJob's ID. The processor generates its own ID, which doesn't match the FileJob.

**Fix:** Pass `file.id` as the second argument to `processFile`. Also ensure `outputName` is stored on the FileJob BEFORE calling processFile (currently it's done correctly but let's verify the order).

Read the current file, then update the process endpoint handler:

Old (lines 86-111):
```typescript
        for (const file of files) {
            const tempPath = getStore().tempPaths.get(file.id);
            if (!tempPath) continue;

            updateFile(file.id, { status: 'processing' });

            const customName = outputNames?.[file.id];
            if (customName) {
                updateFile(file.id, { outputName: customName });
            }

            try {
                const result = await processFile(tempPath, {
                    tipoGasto,
                    outputName: customName,
                });
                updateFile(file.id, {
                    status: 'done',
                    stats: result.stats,
                    outputPath: result.outputPath,
                });
                results.push({ id: file.id, status: 'done', stats: result.stats });
            } catch (err: any) {
                updateFile(file.id, { status: 'error', error: err.message });
                results.push({ id: file.id, status: 'error', error: err.message });
            }
        }
```

New:
```typescript
        for (const file of files) {
            const tempPath = getStore().tempPaths.get(file.id);
            if (!tempPath) continue;

            // Resolve output name: use custom name from client, or fall back to stored value
            const customName = outputNames?.[file.id] || file.outputName;

            // Persist outputName on the FileJob BEFORE processing
            updateFile(file.id, {
                status: 'processing',
                outputName: customName,
            });

            try {
                // Pass file.id so processor writes to a unique path (file.id.xlsx)
                const result = await processFile(tempPath, {
                    tipoGasto,
                    outputName: customName,
                }, file.id);
                updateFile(file.id, {
                    status: 'done',
                    stats: result.stats,
                    outputPath: result.outputPath,
                });
                results.push({ id: file.id, status: 'done', stats: result.stats });
            } catch (err: any) {
                updateFile(file.id, { status: 'error', error: err.message });
                results.push({ id: file.id, status: 'error', error: err.message });
            }
        }
```

**Verify:**
```bash
npx tsc --noEmit
```

**Commit:**
```bash
git add src/server/routes/files.ts
git commit -m "fix(server): pass job ID to processor, ensure outputName persisted before process"
```

---

### Task 3: Add createdAt to FileJob

**Files:**
- Modify: `src/core/types.ts`
- Modify: `src/server/routes/files.ts`

**Problem:** No timestamp on FileJobs. The spec requires showing processing time.

**Change 1 — types.ts:** Add `createdAt` to `FileJob`:

Old:
```typescript
export interface FileJob {
    id: string;
    originalName: string;
    outputName?: string;
    status: 'pending' | 'processing' | 'done' | 'error';
    stats?: TransformStats;
    error?: string;
    outputPath?: string;
}
```

New:
```typescript
export interface FileJob {
    id: string;
    originalName: string;
    outputName?: string;
    status: 'pending' | 'processing' | 'done' | 'error';
    stats?: TransformStats;
    error?: string;
    outputPath?: string;
    createdAt: number;
}
```

**Change 2 — files.ts (upload endpoint):** Add `createdAt` when creating FileJob. Find the `addFile` call in the POST `/` handler:

Old:
```typescript
            addFile(id, {
                id,
                originalName: file.originalname,
                status: 'pending',
            }, newPath);
```

New:
```typescript
            addFile(id, {
                id,
                originalName: file.originalname,
                status: 'pending',
                createdAt: Date.now(),
            }, newPath);
```

**Verify:**
```bash
npx tsc --noEmit
```

**Commit:**
```bash
git add src/core/types.ts src/server/routes/files.ts
git commit -m "feat: add createdAt timestamp to FileJob"
```

---

### Task 4: Web API — add downloadFile helper, ensure outputName in FileInfo

**Files:**
- Modify: `src/web/api.ts`

**Change 1:** Add a `downloadFile` helper for individual downloads:

Append after the `downloadUrl` function:

```typescript
export async function downloadFile(file: FileInfo): Promise<void> {
    const a = document.createElement('a');
    a.href = downloadUrl(file.id);
    if (file.outputName) {
        a.download = file.outputName.endsWith('.xlsx') ? file.outputName : file.outputName + '.xlsx';
    }
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
}
```

**Change 2:** Update `downloadAll` to use `downloadFile`:

Old:
```typescript
export async function downloadAll(files: FileInfo[]): Promise<void> {
    const doneFiles = files.filter(f => f.status === 'done');
    for (let i = 0; i < doneFiles.length; i++) {
        const f = doneFiles[i];
        const a = document.createElement('a');
        a.href = downloadUrl(f.id);
        if (f.outputName) {
            a.download = f.outputName.endsWith('.xlsx') ? f.outputName : f.outputName + '.xlsx';
        }
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        if (i < doneFiles.length - 1) {
            await new Promise(r => setTimeout(r, 300));
        }
    }
}
```

New:
```typescript
export async function downloadAll(files: FileInfo[]): Promise<void> {
    const doneFiles = files.filter(f => f.status === 'done');
    for (let i = 0; i < doneFiles.length; i++) {
        await downloadFile(doneFiles[i]);
        if (i < doneFiles.length - 1) {
            await new Promise(r => setTimeout(r, 300));
        }
    }
}
```

**Verify:**
```bash
npx vite build
```

**Commit:**
```bash
git add src/web/api.ts
git commit -m "feat(web-api): add downloadFile helper, refactor downloadAll"
```

---

### Task 5: ResultPanel — show outputName, source file, individual downloads

**Files:**
- Modify: `src/web/components/ResultPanel.tsx`

**Problem:** Shows `f.originalName` (source file) instead of `f.outputName` (chosen name). No individual download buttons.

**Replace the entire file content:**

```tsx
import { CheckCircle2, Download, Zap, FileText } from 'lucide-react';
import { FileInfo, downloadFile, downloadAll } from '../api';
import { useState } from 'react';

interface ResultPanelProps {
    files: FileInfo[];
}

export function ResultPanel({ files }: ResultPanelProps) {
    const [downloadingAll, setDownloadingAll] = useState(false);
    const [downloadingId, setDownloadingId] = useState<string | null>(null);
    const doneFiles = files.filter(f => f.status === 'done');
    const errorFiles = files.filter(f => f.status === 'error');

    if (files.length === 0) return null;

    const handleDownloadAll = async () => {
        setDownloadingAll(true);
        try {
            await downloadAll(files);
        } finally {
            setDownloadingAll(false);
        }
    };

    const handleDownloadOne = async (file: FileInfo) => {
        setDownloadingId(file.id);
        try {
            await downloadFile(file);
        } finally {
            setDownloadingId(null);
        }
    };

    const getDisplayName = (f: FileInfo) => {
        if (f.outputName) {
            return f.outputName.endsWith('.xlsx') ? f.outputName : f.outputName + '.xlsx';
        }
        return f.originalName.replace(/\.(xlsx?|xls)$/i, '') + '_procesado.xlsx';
    };

    return (
        <div className="p-4 rounded-2xl border border-border-light bg-surface fade-in">
            <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                    <CheckCircle2 size={18} className="text-success" />
                    <span className="text-sm font-medium text-text">
                        Resultados
                    </span>
                </div>

                {doneFiles.length > 0 && (
                    <button
                        onClick={handleDownloadAll}
                        disabled={downloadingAll}
                        className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium bg-accent text-white hover:bg-accent-hover transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {downloadingAll ? (
                            <>
                                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                Descargando...
                            </>
                        ) : (
                            <>
                                <Download size={14} />
                                Descargar todo
                            </>
                        )}
                    </button>
                )}
            </div>

            <div className="space-y-2">
                {doneFiles.map(f => (
                    <div key={f.id} className="flex items-start gap-3 rounded-xl border border-border-light bg-surface-dim px-4 py-3">
                        <CheckCircle2 size={14} className="text-success mt-0.5 flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-text truncate">
                                {getDisplayName(f)}
                            </p>
                            <div className="flex items-center gap-1 mt-0.5">
                                <FileText size={10} className="text-text-faint" />
                                <p className="text-xs text-text-faint truncate">
                                    {f.originalName}
                                </p>
                            </div>
                            {f.stats && (
                                <p className="text-xs text-text-muted mt-1">
                                    {f.stats.finalColumns} columnas · {f.stats.recalculatedRows} filas
                                </p>
                            )}
                        </div>
                        <button
                            onClick={() => handleDownloadOne(f)}
                            disabled={downloadingId === f.id}
                            className="flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border border-border text-text-secondary hover:bg-surface-dim transition-colors disabled:opacity-50"
                        >
                            {downloadingId === f.id ? (
                                <div className="w-3 h-3 border-2 border-text-muted/30 border-t-text-muted rounded-full animate-spin" />
                            ) : (
                                <Download size={12} />
                            )}
                            Descargar
                        </button>
                    </div>
                ))}
                {errorFiles.map(f => (
                    <div key={f.id} className="flex items-center gap-2 text-sm text-danger px-4 py-2">
                        <Zap size={12} />
                        <span className="truncate">{f.originalName}</span>
                        <span className="text-xs ml-auto">{f.error}</span>
                    </div>
                ))}
            </div>
        </div>
    );
}
```

**Verify:**
```bash
npx vite build
```

**Commit:**
```bash
git add src/web/components/ResultPanel.tsx
git commit -m "feat(web): ResultPanel — show outputName, source file, individual download buttons"
```

---

### Task 6: FileCard — use file.outputName directly, add download button

**Files:**
- Modify: `src/web/components/FileCard.tsx`

**Problem:** Shows `outputNames[file.id]` from the cleared frontend store instead of `file.outputName` from the server. Missing download button for done files.

**Replace the entire file content:**

```tsx
import { Pencil, FileText, CheckCircle2, AlertCircle, Loader2, X, Download } from 'lucide-react';
import { FileInfo, downloadFile } from '../api';
import { useStore } from '../store';
import { useState } from 'react';

interface FileCardProps {
    file: FileInfo;
    index: number;
}

const statusIcons = {
    pending: <FileText size={16} className="text-accent" />,
    processing: <Loader2 size={16} className="text-warning animate-spin" />,
    done: <CheckCircle2 size={16} className="text-success" />,
    error: <AlertCircle size={16} className="text-danger" />,
};

export function FileCard({ file, index }: FileCardProps) {
    const { outputNames, setOutputName, removeFile } = useStore();
    const [downloading, setDownloading] = useState(false);
    const isPending = file.status === 'pending';
    const isDone = file.status === 'done';

    // For pending files, use the local outputNames store (user is still editing).
    // For processed files, use the server-stored outputName (authoritative).
    const displayName = isPending
        ? (outputNames[file.id] || '')
        : (file.outputName || '');

    const handleDownload = async () => {
        setDownloading(true);
        try {
            await downloadFile(file);
        } finally {
            setDownloading(false);
        }
    };

    return (
        <div
            className="flex items-center gap-3 rounded-2xl border border-border-light bg-surface px-4 py-3 transition-all duration-200 hover:shadow-[0_2px_16px_rgba(0,0,0,0.15)] group relative"
            style={{ animationDelay: `${index * 40}ms` }}
        >
            <div className="flex-shrink-0">{statusIcons[file.status]}</div>

            <div className="flex-1 min-w-0">
                <p className="text-sm text-text truncate">{file.originalName}</p>

                {isPending && (
                    <div className="flex items-center gap-2 mt-1">
                        <Pencil size={12} className="text-text-muted" />
                        <input
                            type="text"
                            placeholder="Nombre de salida"
                            value={displayName}
                            onChange={(e) => setOutputName(file.id, e.target.value)}
                            className="flex-1 bg-transparent border-b border-border-light text-sm text-text placeholder:text-text-muted outline-none focus:border-accent transition-colors py-0.5"
                        />
                        <span className="text-xs text-text-muted">.xlsx</span>
                    </div>
                )}

                {!isPending && displayName && (
                    <p className="text-xs text-text-muted mt-1">
                        Salida: {displayName}{displayName.endsWith('.xlsx') ? '' : '.xlsx'}
                    </p>
                )}

                {isDone && file.stats && (
                    <p className="text-xs text-text-muted mt-1">
                        {file.stats.originalColumns} → {file.stats.finalColumns} columnas · {file.stats.recalculatedRows} filas
                    </p>
                )}

                {file.error && (
                    <p className="text-xs text-danger mt-1">{file.error}</p>
                )}
            </div>

            {isDone && (
                <button
                    onClick={handleDownload}
                    disabled={downloading}
                    className="flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border border-border text-text-secondary hover:bg-surface-dim transition-colors disabled:opacity-50 opacity-0 group-hover:opacity-100"
                >
                    {downloading ? (
                        <div className="w-3 h-3 border-2 border-text-muted/30 border-t-text-muted rounded-full animate-spin" />
                    ) : (
                        <Download size={12} />
                    )}
                </button>
            )}

            {isPending && (
                <button
                    onClick={() => removeFile(file.id)}
                    className="flex-shrink-0 p-1 rounded-lg text-text-muted hover:text-danger opacity-0 group-hover:opacity-100 transition-all"
                >
                    <X size={14} />
                </button>
            )}
        </div>
    );
}
```

**Verify:**
```bash
npx vite build
```

**Commit:**
```bash
git add src/web/components/FileCard.tsx
git commit -m "feat(web): FileCard — use server outputName, add download button for done files"
```

---

### Task 7: Full build and flow verification

Run all verification steps:

```bash
cd /home/juxnbernxrdo/Descargas/invoiceflow-cli

# TypeScript compilation
npx tsc --noEmit

# Web client build
npx vite build

# Full CLI build
npm run build

# Verify no chalk/gradient references remain
grep -r "chalk\|gradient" src/ --include="*.ts" --include="*.tsx" 2>/dev/null || echo "Clean"

# Verify processor uses job ID
grep -n "jobId\|uniqueId" src/core/processor.ts

# Verify server passes file.id
grep -n "file.id" src/server/routes/files.ts

# Verify ResultPanel shows outputName
grep -n "outputName\|getDisplayName" src/web/components/ResultPanel.tsx

# Verify FileCard uses file.outputName
grep -n "file.outputName" src/web/components/FileCard.tsx

# Verify downloadFile exists
grep -n "downloadFile" src/web/api.ts
```

**Expected:** All commands pass. No errors. All key patterns found.

**Commit (only if issues found):**
```bash
git add -A
git commit -m "fix: resolve remaining issues from flow verification"
```

---

## Self-Review Checklist

1. **Spec §1 (State management):** Each FileJob has unique ID, output path keyed by ID ✅ Task 1, 2
2. **Spec §2 (Output name preserved):** Stored on FileJob, used in download, displayed in UI ✅ Task 2, 5, 6
3. **Spec §3 (Resultados UI):** Shows outputName + source file + stats ✅ Task 5
4. **Spec §4 (Individual download):** Per-file download button on each result ✅ Task 5, 6
5. **Spec §5 (Descargar todo):** Downloads all done files with correct names ✅ Task 4, 5
6. **Spec §6 (Multiple runs):** Output path keyed by job ID prevents overwrites ✅ Task 1
7. **Spec §7 (Data model):** FileJob has id, originalName, outputName, createdAt, outputPath, stats ✅ Task 3
8. **Spec §8 (Validations):** Full build passes ✅ Task 7
9. **No regressions:** tsc + vite build pass ✅ Task 7
