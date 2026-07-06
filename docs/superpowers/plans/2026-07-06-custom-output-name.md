# Custom Output Filename — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add custom output filename support to both CLI and web client, with a "download all" feature for the web UI.

**Architecture:** Extend the `FileJob` type with an `outputName` field. Thread this through the processor, server routes, CLI, and web client. The CLI gets a `--output-name` flag with interactive per-file prompting for multi-file batches. The web client gets an editable name field per file card and a bulk download button.

**Tech Stack:** TypeScript, Express, React (Zustand), Commander.js

---

## File Structure

| File | Change |
|------|--------|
| `src/core/types.ts` | Add `outputName?: string` to `FileJob` |
| `src/core/processor.ts` | Accept optional `outputName` in `TransformOptions`, use for output path |
| `src/cli.ts` | Add `--output-name` flag, interactive naming prompt, pass to processor |
| `src/server/routes/files.ts` | Accept `outputNames` map in process endpoint, store on FileJob, use in download |
| `src/web/api.ts` | Add `outputName` to `FileInfo`, send `outputNames` in process, add `downloadAll()` |
| `src/web/store.ts` | Add `outputNames` map + `setOutputName` action, pass to processAll |
| `src/web/components/FileCard.tsx` | Add editable output name input for pending files |
| `src/web/components/ResultPanel.tsx` | Add "Descargar todo" button |
| `src/web/components/ProcessButton.tsx` | No change needed (store handles it) |

---

### Task 1: Core types — add outputName to FileJob

**Files:**
- Modify: `src/core/types.ts`

- [ ] **Step 1: Add outputName to FileJob interface**

```typescript
// src/core/types.ts — full file content
export interface TransformOptions {
    tipoGasto?: string;
    outputName?: string;
}

export interface TransformStats {
    originalColumns: number;
    finalColumns: number;
    deletedColumns: string[];
    replacedColumns: { red: string; green: string }[];
    recalculatedRows: number;
}

export type ProgressCallback = (current: number, total: number, message: string) => void;

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

- [ ] **Step 2: Verify build**

Run: `npx tsc --noEmit`
Expected: No errors

- [ ] **Step 3: Commit**

```bash
git add src/core/types.ts
git commit -m "feat(core): add outputName field to FileJob and TransformOptions"
```

---

### Task 2: Processor — use outputName for output path

**Files:**
- Modify: `src/core/processor.ts`

- [ ] **Step 1: Update processFile to use outputName**

Replace the full file content of `src/core/processor.ts`:

```typescript
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { ExcelTransformer } from '../transformer';
import { TransformOptions, TransformStats, ProgressCallback } from './types';

function generateId(): string {
    return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

function sanitizeOutputName(name: string): string {
    // Strip path separators, truncate to 200 chars
    const base = name.replace(/[/\\]/g, '');
    return base.length > 200 ? base.slice(0, 200) : base;
}

function ensureXlsxExtension(name: string): string {
    return name.endsWith('.xlsx') ? name : name + '.xlsx';
}

export interface ProcessResult {
    id: string;
    originalName: string;
    outputPath: string;
    stats: TransformStats;
}

export async function processFile(
    inputPath: string,
    options: TransformOptions,
    onProgress?: ProgressCallback
): Promise<ProcessResult> {
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

    const transformer = new ExcelTransformer(
        () => {},
        onProgress
    );

    const stats = await transformer.transform(inputPath, outputPath, options);

    return {
        id: generateId(),
        originalName,
        outputPath,
        stats,
    };
}

export async function processFiles(
    inputPaths: string[],
    options: TransformOptions,
    onFileProgress?: (index: number, total: number, progress: ProgressCallback) => void
): Promise<ProcessResult[]> {
    const results: ProcessResult[] = [];
    for (let i = 0; i < inputPaths.length; i++) {
        const result = await processFile(inputPaths[i], options, (cur, total, msg) => {
            if (onFileProgress) {
                onFileProgress(i, inputPaths.length, (c, t, m) => {});
            }
        });
        results.push(result);
    }
    return results;
}
```

- [ ] **Step 2: Verify build**

Run: `npx tsc --noEmit`
Expected: No errors

- [ ] **Step 3: Commit**

```bash
git add src/core/processor.ts
git commit -m "feat(processor): use outputName option for output path generation"
```

---

### Task 3: CLI — add --output-name flag and interactive naming

**Files:**
- Modify: `src/cli.ts`

- [ ] **Step 1: Add --output-name option to commander**

In `src/cli.ts`, find the `program` definition (line ~220) and add the new option. Replace the block:

```typescript
    program
        .name('invo')
        .description('Transformar archivos Excel mediante instrucciones predefinidas.')
        .version('1.0.3')
        .option('--tipo-gasto <value>', 'Tipo de gasto para la columna TIPO GASTO (default: EMPRESARIAL)')
        .option('--output-name <name>', 'Nombre personalizado para el archivo de salida')
        .argument('[files...]', 'Archivos Excel a transformar')
        .action(async (files: string[], options: { tipoGasto?: string; outputName?: string }) => {
```

- [ ] **Step 2: Update getUniqueOutputPath to accept customName**

Replace the `getUniqueOutputPath` function (lines 84-100):

```typescript
export function getUniqueOutputPath(inputDir: string, index: number, customName?: string): string {
    let baseName: string;
    if (customName) {
        const sanitized = customName.replace(/[/\\]/g, '');
        baseName = sanitized.endsWith('.xlsx') ? sanitized : sanitized + '.xlsx';
    } else {
        baseName = 'FACTURAS ELECTRÓNICAS.xlsx';
    }

    if (index === 0) {
        const attempt = path.join(inputDir, baseName);
        if (!fs.existsSync(attempt)) {
            return attempt;
        }
    }
    const withoutExt = baseName.replace(/\.xlsx$/i, '');
    let i = index === 0 ? 1 : index;
    while (true) {
        const attempt = path.join(inputDir, `${withoutExt} (${i}).xlsx`);
        if (!fs.existsSync(attempt)) {
            return attempt;
        }
        i++;
    }
}
```

- [ ] **Step 3: Update processFiles signature and body**

Replace the `processFiles` function (lines 136-213):

```typescript
async function processFiles(
    filePaths: string[],
    tipoGasto?: string,
    outputNames?: Map<number, string>
): Promise<boolean> {
    const resolvedFiles: { original: string; resolved: string; isValid: boolean; error?: string }[] = [];
    
    for (const rawPath of filePaths) {
        let cleanPath = rawPath.startsWith('@') ? rawPath.slice(1) : rawPath;
        if (!cleanPath) continue;

        if (cleanPath.startsWith('~')) {
            cleanPath = path.join(os.homedir(), cleanPath.slice(1));
        }

        const validation = validateFilePath(cleanPath);
        resolvedFiles.push({
            original: rawPath,
            resolved: validation.resolvedPath || cleanPath,
            isValid: validation.isValid,
            error: validation.error
        });
    }

    if (resolvedFiles.length === 0) {
        console.log(chalk.yellow('No se seleccionaron archivos para procesar.'));
        return false;
    }

    const progressBar = createProgressBar();
    const processedSuccessfully: string[] = [];
    const skippedFiles: { path: string; reason: string }[] = [];

    for (let idx = 0; idx < resolvedFiles.length; idx++) {
        const { original, resolved, isValid, error } = resolvedFiles[idx];

        if (!isValid) {
            console.log(chalk.yellow(`  ⚠ ${original}: ${getSuggestionForError(error || '')}`));
            skippedFiles.push({ path: original, reason: error || 'Archivo inválido' });
            continue;
        }

        const inputDir = path.dirname(resolved);
        const customName = outputNames?.get(idx);
        const outPath = getUniqueOutputPath(inputDir, idx, customName);

        progressBar.start(100, 0, { filename: path.basename(original) });

        const transformer = new ExcelTransformer(
            () => {},
            (current, total) => {
                progressBar.update(Math.round((current / total) * 100));
            }
        );

        try {
            await transformer.transform(resolved, outPath, { tipoGasto });
            progressBar.update(100);
            progressBar.stop();
            console.log(chalk.green(`  ✔ ${path.basename(original)} → ${path.basename(outPath)}`));
            processedSuccessfully.push(original);
        } catch (err: any) {
            progressBar.stop();
            console.log(chalk.red(`  ✘ ${original}: ${getSuggestionForError(err.message)}`));
            if (fs.existsSync(outPath)) {
                try { fs.unlinkSync(outPath); } catch {}
            }
            skippedFiles.push({ path: original, reason: err.message });
        }
    }

    if (resolvedFiles.length > 1) {
        console.log('');
        if (processedSuccessfully.length > 0) {
            console.log(chalk.green(`  ${processedSuccessfully.length} archivo(s) procesado(s)`));
        }
        if (skippedFiles.length > 0) {
            console.log(chalk.red(`  ${skippedFiles.length} archivo(s) omitido(s)`));
        }
    }

    return processedSuccessfully.length > 0;
}
```

- [ ] **Step 4: Update the CLI action to handle --output-name**

Replace the action callback (lines 226-453). The key changes are: (a) destructure `outputName` from options, (b) when multiple files + outputName is set, prompt for each name interactively, (c) pass `outputNames` map to `processFiles`. Replace the entire `.action(async (files: string[], options: { tipoGasto?: string }) => {` block:

```typescript
        .action(async (files: string[], options: { tipoGasto?: string; outputName?: string }) => {
            if (files && files.length > 0) {
                // Command line mode (Banner only once)
                console.log(bannerString);

                let outputNames: Map<number, string> | undefined;

                // If --output-name provided with multiple files, prompt for each name
                if (options.outputName && files.length > 1) {
                    console.log(chalk.cyan('\n  Archivos a procesar:'));
                    files.forEach((f, i) => console.log(chalk.white(`    ${i + 1}. ${path.basename(f)}`)));
                    console.log('');

                    outputNames = new Map();
                    for (let i = 0; i < files.length; i++) {
                        const response = await prompts({
                            type: 'text',
                            name: 'name',
                            message: `Nombre de salida para ${path.basename(files[i])}:`,
                            initial: options.outputName,
                        });
                        if (response.name && response.name.trim()) {
                            outputNames.set(i, response.name.trim());
                        }
                    }
                } else if (options.outputName && files.length === 1) {
                    outputNames = new Map();
                    outputNames.set(0, options.outputName);
                }

                await processFiles(files, options.tipoGasto, outputNames);
            } else {
                // Interactive Mode (Banner only once)
                console.log(bannerString);
                console.log(QUICK_HELP);

                const rl = readline.createInterface({
                    input: process.stdin,
                    output: process.stdout,
                    prompt: '> '
                });

                rl.prompt();

                // Listen to keypresses to detect '@' immediately
                readline.emitKeypressEvents(process.stdin);
                if (process.stdin.isTTY) {
                    process.stdin.setRawMode(true);
                }

                let selectorOpen = false;
                let selectorAbort: (() => void) | null = null;
                let prevLine = '';
                let tipoGastoValue: string | undefined = options.tipoGasto;

                const ensureStdinFlowing = () => {
                    if (process.stdin.isTTY && process.stdin.readable) {
                        process.stdin.resume();
                    }
                };

                const restoreStdinForKeypress = () => {
                    ensureStdinFlowing();
                    readline.emitKeypressEvents(process.stdin);
                    if (process.stdin.isTTY) {
                        process.stdin.setRawMode(true);
                    }
                };

                const closeFileSelector = () => {
                    selectorOpen = false;
                    if (selectorAbort) {
                        selectorAbort();
                        selectorAbort = null;
                    }
                };

                const openFileSelector = async () => {
                    selectorOpen = true;
                    rl.pause();

                    try {
                        process.stdout.write('\b \b');

                        const excelFiles = getExcelFiles();
                        if (excelFiles.length === 0) {
                            console.log(chalk.yellow('\n  No se encontraron archivos Excel en el directorio actual.'));
                            return;
                        }

                        console.log(chalk.cyan('\n  Archivos Excel disponibles:'));

                        const choices = [
                            { title: 'Todos los archivos Excel', value: 'ALL_EXCEL_FILES' },
                            ...excelFiles.map(f => ({
                                title: f.name,
                                description: `${f.relativePath} | ${f.size}`,
                                value: `@${f.relativePath}`
                            }))
                        ];

                        let cancelled = false;
                        const response = await new Promise<any>((resolve) => {
                            selectorAbort = () => {
                                cancelled = true;
                                resolve({ selected: [] });
                            };
                            prompts({
                                type: 'autocompleteMultiselect',
                                name: 'selected',
                                message: 'Selecciona archivos',
                                choices: choices,
                                hint: 'Espacio para seleccionar, Enter para confirmar'
                            }).then(resolve).catch(() => resolve({ selected: [] }));
                        });

                        if (!cancelled && response && response.selected && response.selected.length > 0) {
                            let pathsToInsert = [];
                            if (response.selected.includes('ALL_EXCEL_FILES')) {
                                pathsToInsert = excelFiles.map(f => `@${f.relativePath}`);
                            } else {
                                pathsToInsert = response.selected;
                            }

                            // Prompt for tipo gasto if not provided via CLI flag
                            if (!tipoGastoValue) {
                                const tipoResponse = await prompts({
                                    type: 'select',
                                    name: 'tipo',
                                    message: 'Tipo de gasto',
                                    choices: [
                                        { title: 'EMPRESARIAL', value: 'EMPRESARIAL' },
                                        { title: 'PERSONAL', value: 'PERSONAL' },
                                    ],
                                    initial: 0,
                                });
                                if (tipoResponse.tipo) {
                                    tipoGastoValue = tipoResponse.tipo;
                                }
                            }

                            const formattedPaths = pathsToInsert.join(' ') + ' ';
                            rl.write(formattedPaths);
                        }
                    } catch {
                    } finally {
                        selectorAbort = null;
                        rl.resume();
                        restoreStdinForKeypress();
                        rl.prompt();
                        selectorOpen = false;
                    }
                };

                // Single listener: handles both open (@ typed) and close (@ removed).
                // When backspace/delete fires, readline has already updated the line
                // BEFORE the keypress event, so prevLine vs line correctly detects
                // whether '@' was removed.
                process.stdin.on('keypress', async (str, key) => {
                    if (!key) { prevLine = (rl as any).line || ''; return; }

                    const line = (rl as any).line || '';

                    // Detect @ removal: prevLine had @, current line does not
                    if (selectorOpen && (key.name === 'backspace' || key.name === 'delete')) {
                        if (prevLine.includes('@') && !line.includes('@')) {
                            prevLine = line;
                            closeFileSelector();
                            return;
                        }
                    }

                    prevLine = line;

                    // Detect @ addition: only when selector is not already open
                    if (!selectorOpen && (str === '@' || key.name === '@')) {
                        await openFileSelector();
                    }
                });

                rl.on('line', async (line) => {
                    const cleanLine = line.trim();
                    if (!cleanLine) {
                        rl.prompt();
                        return;
                    }

                    // Global commands to exit safely
                    if (
                        cleanLine === '/quit' || 
                        cleanLine === 'exit' || 
                        cleanLine === 'quit' || 
                        cleanLine === '/exit'
                    ) {
                        rl.close();
                        return;
                    }

                    // Start web server
                    if (cleanLine === '/web') {
                        rl.pause();
                        const { startServer } = require('./server/index');
                        const port = 3000;
                        const url = `http://localhost:${port}`;
                        console.log(chalk.cyan(`\n  Iniciando InvoiceFlow web en ${url}...`));
                        await startServer(port);

                        const openCmd = process.platform === 'darwin' ? 'open'
                            : process.platform === 'win32' ? 'start'
                            : 'xdg-open';
                        exec(`${openCmd} ${url}`, (err) => {
                            if (err) {
                                console.log(chalk.yellow(`\n  No se pudo abrir el navegador automáticamente.`));
                                console.log(chalk.white(`  Abre manualmente: ${chalk.cyan(url)}\n`));
                            }
                        });
                        return;
                    }

                    // Parse inputs (split by spaces, considering path strings)
                    const tokens = cleanLine.split(/\s+/).filter(Boolean);

                    // If processing files and no tipo gasto was selected yet, prompt for it
                    const hasExcelFiles = tokens.some(t => t.endsWith('.xlsx') || t.endsWith('.xls'));
                    if (hasExcelFiles && !tipoGastoValue) {
                        rl.pause();
                        const tipoResponse = await prompts({
                            type: 'select',
                            name: 'tipo',
                            message: 'Tipo de gasto',
                            choices: [
                                { title: 'EMPRESARIAL', value: 'EMPRESARIAL' },
                                { title: 'PERSONAL', value: 'PERSONAL' },
                            ],
                            initial: 0,
                        });
                        if (tipoResponse.tipo) {
                            tipoGastoValue = tipoResponse.tipo;
                        }
                        rl.resume();
                        restoreStdinForKeypress();
                    }

                    rl.pause();
                    await processFiles(tokens, tipoGastoValue);
                    rl.resume();
                    restoreStdinForKeypress();
                    rl.prompt();
                }).on('close', () => {
                    console.log(chalk.green('\n¡Gracias por usar invo! ¡Hasta luego!\n'));
                    process.exit(0);
                });
            }
        });
```

- [ ] **Step 5: Verify build**

Run: `npx tsc --noEmit`
Expected: No errors

- [ ] **Step 6: Commit**

```bash
git add src/cli.ts
git commit -m "feat(cli): add --output-name flag with interactive per-file naming"
```

---

### Task 4: Server routes — accept outputNames in process, use in download

**Files:**
- Modify: `src/server/routes/files.ts`

- [ ] **Step 1: Update process endpoint to accept and store outputNames**

Replace the `POST /process` handler (lines 77-107):

```typescript
router.post('/process', async (req: Request, res: Response) => {
    try {
        const { tipoGasto, outputNames } = req.body as {
            tipoGasto?: string;
            outputNames?: Record<string, string>;
        };
        const files = getAllFiles().filter(f => f.status === 'pending');
        const results = [];

        for (const file of files) {
            const tempPath = getStore().tempPaths.get(file.id);
            if (!tempPath) continue;

            updateFile(file.id, { status: 'processing' });

            // Store custom output name if provided
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

        res.json({ results });
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
});
```

- [ ] **Step 2: Update download endpoint to use outputName**

Replace the `GET /:id/download` handler (lines 109-124):

```typescript
router.get('/:id/download', (req: Request, res: Response) => {
    const id = req.params.id as string;
    const file = getFile(id);
    if (!file || file.status !== 'done' || !file.outputPath) {
        res.status(404).json({ error: 'Archivo no disponible' });
        return;
    }

    if (!fs.existsSync(file.outputPath)) {
        res.status(404).json({ error: 'Archivo no encontrado en disco' });
        return;
    }

    let downloadName: string;
    if (file.outputName) {
        downloadName = file.outputName.endsWith('.xlsx')
            ? file.outputName
            : file.outputName + '.xlsx';
    } else {
        downloadName = file.originalName.replace(/\.(xlsx?|xls)$/i, '') + '_procesado.xlsx';
    }
    res.download(file.outputPath, downloadName);
});
```

- [ ] **Step 3: Verify build**

Run: `npx tsc --noEmit`
Expected: No errors

- [ ] **Step 4: Commit**

```bash
git add src/server/routes/files.ts
git commit -m "feat(server): accept outputNames in process, use in download disposition"
```

---

### Task 5: Web API — add outputName to FileInfo, send in process, add downloadAll

**Files:**
- Modify: `src/web/api.ts`

- [ ] **Step 1: Add outputName to FileInfo interface**

Replace the `FileInfo` interface (lines 3-14):

```typescript
export interface FileInfo {
    id: string;
    originalName: string;
    outputName?: string;
    status: 'pending' | 'processing' | 'done' | 'error';
    stats?: {
        originalColumns: number;
        finalColumns: number;
        deletedColumns: string[];
        recalculatedRows: number;
    };
    error?: string;
}
```

- [ ] **Step 2: Update processFiles to accept and send outputNames**

Replace the `processFiles` function (lines 36-44):

```typescript
export async function processFiles(
    tipoGasto: string,
    outputNames?: Record<string, string>
): Promise<any> {
    const res = await fetch(`${BASE}/files/process`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tipoGasto, outputNames }),
    });
    if (!res.ok) throw new Error((await res.json()).error);
    return res.json();
}
```

- [ ] **Step 3: Add downloadAll helper**

Append after the `downloadUrl` function (after line 48):

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

- [ ] **Step 4: Verify build**

Run: `npx tsc --noEmit` (in the web context: `cd src/web && npx tsc --noEmit --jsx react-jsx --esModuleInterop --moduleResolution node --target ES2020 --module ES2020`)
Alternatively: `npx vite build` from project root (vite.config.ts points to src/web)

Run: `npx vite build`
Expected: Build succeeds

- [ ] **Step 5: Commit**

```bash
git add src/web/api.ts
git commit -m "feat(web-api): add outputName to FileInfo, send in process, add downloadAll"
```

---

### Task 6: Web store — add outputNames state and setOutputName action

**Files:**
- Modify: `src/web/store.ts`

- [ ] **Step 1: Add outputNames to store**

Replace the full file content of `src/web/store.ts`:

```typescript
import { create } from 'zustand';
import { FileInfo, uploadFiles, listFiles, removeFile as apiRemove, processFiles as apiProcess } from './api';

interface AppStore {
    files: FileInfo[];
    tipoGasto: string;
    isProcessing: boolean;
    isUploading: boolean;
    outputNames: Record<string, string>;
    setTipoGasto: (v: string) => void;
    setOutputName: (id: string, name: string) => void;
    addFiles: (files: File[]) => Promise<void>;
    removeFile: (id: string) => Promise<void>;
    processAll: () => Promise<void>;
    refreshFiles: () => Promise<void>;
}

export const useStore = create<AppStore>((set, get) => ({
    files: [],
    tipoGasto: 'EMPRESARIAL',
    isProcessing: false,
    isUploading: false,
    outputNames: {},

    setTipoGasto: (v) => set({ tipoGasto: v }),

    setOutputName: (id, name) => set((state) => ({
        outputNames: { ...state.outputNames, [id]: name },
    })),

    addFiles: async (files) => {
        set({ isUploading: true });
        try {
            await uploadFiles(files, get().tipoGasto);
            const updated = await listFiles();
            set({ files: updated });
        } finally {
            set({ isUploading: false });
        }
    },

    removeFile: async (id) => {
        await apiRemove(id);
        const updated = await listFiles();
        set((state) => {
            const { [id]: _, ...rest } = state.outputNames;
            return { files: updated, outputNames: rest };
        });
    },

    processAll: async () => {
        set({ isProcessing: true });
        try {
            await apiProcess(get().tipoGasto, get().outputNames);
            const updated = await listFiles();
            set({ files: updated, outputNames: {} });
        } finally {
            set({ isProcessing: false });
        }
    },

    refreshFiles: async () => {
        const files = await listFiles();
        set({ files });
    },
}));
```

- [ ] **Step 2: Verify build**

Run: `npx vite build`
Expected: Build succeeds

- [ ] **Step 3: Commit**

```bash
git add src/web/store.ts
git commit -m "feat(web-store): add outputNames state and setOutputName action"
```

---

### Task 7: FileCard — add editable output name input

**Files:**
- Modify: `src/web/components/FileCard.tsx`

- [ ] **Step 1: Add output name input to FileCard**

Replace the full file content of `src/web/components/FileCard.tsx`:

```tsx
import { useState, useRef, useEffect } from 'react';
import { FileInfo, downloadUrl } from '../api';
import { useStore } from '../store';
import { Download, X, Loader2, CheckCircle2, AlertCircle, Clock, Pencil } from 'lucide-react';

const statusConfig: Record<string, {
    bg: string;
    text: string;
    label: string;
    icon: typeof Download;
}> = {
    pending: { bg: '#e8f0fc', text: '#0071e3', label: 'Pendiente', icon: Clock },
    processing: { bg: '#fff8ec', text: '#ff9f0a', label: 'Procesando', icon: Loader2 },
    done: { bg: '#e6f9ed', text: '#1a7a3a', label: 'Listo', icon: CheckCircle2 },
    error: { bg: '#fff0f0', text: '#ff3b30', label: 'Error', icon: AlertCircle },
};

const DEFAULT_OUTPUT_NAME = 'FACTURAS ELECTRÓNICAS';

export function FileCard({ file }: { file: FileInfo }) {
    const removeFile = useStore(s => s.removeFile);
    const setOutputName = useStore(s => s.setOutputName);
    const outputNames = useStore(s => s.outputNames);
    const s = statusConfig[file.status] || statusConfig.pending;
    const StatusIcon = s.icon;

    const currentOutputName = outputNames[file.id] ?? '';
    const isPending = file.status === 'pending';

    const [isEditing, setIsEditing] = useState(false);
    const [editValue, setEditValue] = useState(currentOutputName || DEFAULT_OUTPUT_NAME);
    const inputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (isEditing && inputRef.current) {
            inputRef.current.focus();
            inputRef.current.select();
        }
    }, [isEditing]);

    const commitEdit = () => {
        const trimmed = editValue.trim();
        if (trimmed && trimmed !== DEFAULT_OUTPUT_NAME) {
            setOutputName(file.id, trimmed);
        } else {
            setOutputName(file.id, '');
        }
        setIsEditing(false);
    };

    const displayName = currentOutputName || DEFAULT_OUTPUT_NAME;

    return (
        <div
            style={{
                background: '#ffffff',
                border: '1px solid #ebebf0',
                borderRadius: 18,
                padding: '14px 18px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                boxShadow: '0 1px 4px rgba(0,0,0,0.05)',
                transition: 'all 0.15s ease',
            }}
            onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-2px)';
                e.currentTarget.style.boxShadow = '0 4px 20px rgba(0,0,0,0.07)';
            }}
            onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = '0 1px 4px rgba(0,0,0,0.05)';
            }}
        >
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, flex: 1, minWidth: 0 }}>
                <span style={{
                    fontSize: '0.86rem',
                    color: '#6e6e73',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                    lineHeight: 1.5,
                    flexShrink: 0,
                }}>
                    {file.originalName}
                </span>

                {isPending && isEditing ? (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 0, flex: 1, minWidth: 0 }}>
                        <input
                            ref={inputRef}
                            type="text"
                            value={editValue}
                            onChange={(e) => setEditValue(e.target.value)}
                            onBlur={commitEdit}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter') commitEdit();
                                if (e.key === 'Escape') { setEditValue(currentOutputName || DEFAULT_OUTPUT_NAME); setIsEditing(false); }
                            }}
                            style={{
                                fontSize: '0.97rem',
                                color: '#1d1d1f',
                                border: '1px solid #0071e3',
                                borderRadius: 8,
                                padding: '4px 8px',
                                outline: 'none',
                                fontFamily: "'Geist', -apple-system, sans-serif",
                                flex: 1,
                                minWidth: 0,
                            }}
                        />
                        <span style={{
                            fontSize: '0.86rem',
                            color: '#aeaeb2',
                            marginLeft: -1,
                            border: '1px solid #0071e3',
                            borderLeft: 'none',
                            borderRadius: '0 8px 8px 0',
                            padding: '4px 8px',
                            background: '#f5f5f7',
                        }}>.xlsx</span>
                    </div>
                ) : isPending ? (
                    <button
                        onClick={() => setIsEditing(true)}
                        style={{
                            fontSize: '0.97rem',
                            color: '#1d1d1f',
                            background: 'none',
                            border: '1px solid transparent',
                            borderRadius: 8,
                            padding: '4px 8px',
                            cursor: 'pointer',
                            fontFamily: "'Geist', -apple-system, sans-serif",
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 6,
                            transition: 'all 0.15s ease',
                            flex: 1,
                            minWidth: 0,
                            textAlign: 'left',
                        }}
                        onMouseEnter={(e) => {
                            e.currentTarget.style.borderColor = '#e0e0e5';
                            e.currentTarget.style.background = '#f5f5f7';
                        }}
                        onMouseLeave={(e) => {
                            e.currentTarget.style.borderColor = 'transparent';
                            e.currentTarget.style.background = 'none';
                        }}
                        title="Clic para editar nombre de salida"
                    >
                        {displayName}.xlsx
                        <Pencil size={12} color="#aeaeb2" strokeWidth={2} />
                    </button>
                ) : (
                    <span style={{
                        fontSize: '0.97rem',
                        color: '#1d1d1f',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                        lineHeight: 1.5,
                    }}>
                        {displayName}.xlsx
                    </span>
                )}

                <span style={{
                    fontSize: '0.72rem',
                    fontWeight: 600,
                    padding: '4px 12px',
                    borderRadius: 20,
                    background: s.bg,
                    color: s.text,
                    whiteSpace: 'nowrap',
                    letterSpacing: '0.03em',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 4,
                    flexShrink: 0,
                }}>
                    <StatusIcon size={12} strokeWidth={2} />
                    {s.label}
                </span>
            </div>
            <div style={{ display: 'flex', gap: 6, marginLeft: 12, flexShrink: 0 }}>
                {file.status === 'done' && (
                    <a
                        href={downloadUrl(file.id)}
                        download
                        style={{
                            fontSize: '0.79rem',
                            color: '#0071e3',
                            textDecoration: 'none',
                            fontWeight: 500,
                            padding: '6px 14px',
                            borderRadius: 20,
                            background: '#e8f0fc',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 4,
                            transition: 'all 0.15s ease',
                        }}
                        onMouseEnter={(e) => {
                            e.currentTarget.style.background = '#d6e8fa';
                        }}
                        onMouseLeave={(e) => {
                            e.currentTarget.style.background = '#e8f0fc';
                        }}
                    >
                        <Download size={14} strokeWidth={2} />
                        Descargar
                    </a>
                )}
                <button
                    onClick={() => removeFile(file.id)}
                    style={{
                        background: 'none',
                        border: 'none',
                        cursor: 'pointer',
                        color: '#aeaeb2',
                        padding: '6px',
                        borderRadius: 8,
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        transition: 'all 0.15s ease',
                    }}
                    onMouseEnter={(e) => {
                        e.currentTarget.style.background = '#f5f5f7';
                        e.currentTarget.style.color = '#ff3b30';
                    }}
                    onMouseLeave={(e) => {
                        e.currentTarget.style.background = 'none';
                        e.currentTarget.style.color = '#aeaeb2';
                    }}
                    title="Eliminar"
                >
                    <X size={16} strokeWidth={2} />
                </button>
            </div>
        </div>
    );
}
```

- [ ] **Step 2: Verify build**

Run: `npx vite build`
Expected: Build succeeds

- [ ] **Step 3: Commit**

```bash
git add src/web/components/FileCard.tsx
git commit -m "feat(web-ui): add editable output name input to FileCard for pending files"
```

---

### Task 8: ResultPanel — add "Descargar todo" button

**Files:**
- Modify: `src/web/components/ResultPanel.tsx`

- [ ] **Step 1: Add downloadAll button to ResultPanel**

Replace the full file content of `src/web/components/ResultPanel.tsx`:

```tsx
import { useStore } from '../store';
import { downloadAll } from '../api';
import { CheckCircle2, Download } from 'lucide-react';
import { useState } from 'react';

export function ResultPanel() {
    const files = useStore(s => s.files);
    const done = files.filter(f => f.status === 'done');
    const [isDownloading, setIsDownloading] = useState(false);

    if (done.length === 0) return null;

    const handleDownloadAll = async () => {
        setIsDownloading(true);
        try {
            await downloadAll(files);
        } finally {
            setIsDownloading(false);
        }
    };

    return (
        <div style={{
            background: '#ffffff',
            border: '1px solid #ebebf0',
            borderRadius: 18,
            padding: '26px 28px',
            boxShadow: '0 1px 4px rgba(0,0,0,0.05)',
        }}>
            <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: 16,
            }}>
                <h3 style={{
                    fontSize: '0.93rem',
                    fontWeight: 600,
                    margin: 0,
                    color: '#1d1d1f',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                }}>
                    <CheckCircle2 size={18} color="#30d158" strokeWidth={2} />
                    Resultados
                </h3>
                {done.length > 1 && (
                    <button
                        onClick={handleDownloadAll}
                        disabled={isDownloading}
                        style={{
                            fontSize: '0.79rem',
                            color: '#0071e3',
                            textDecoration: 'none',
                            fontWeight: 500,
                            padding: '6px 14px',
                            borderRadius: 20,
                            background: '#e8f0fc',
                            border: 'none',
                            cursor: isDownloading ? 'default' : 'pointer',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 4,
                            transition: 'all 0.15s ease',
                            fontFamily: "'Geist', -apple-system, sans-serif",
                            opacity: isDownloading ? 0.6 : 1,
                        }}
                        onMouseEnter={(e) => {
                            if (!isDownloading) e.currentTarget.style.background = '#d6e8fa';
                        }}
                        onMouseLeave={(e) => {
                            e.currentTarget.style.background = '#e8f0fc';
                        }}
                    >
                        <Download size={14} strokeWidth={2} />
                        {isDownloading ? 'Descargando...' : 'Descargar todo'}
                    </button>
                )}
            </div>
            {done.map(f => (
                <div key={f.id} style={{
                    padding: '12px 0',
                    borderBottom: '1px solid #ebebf0',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                }}>
                    <span style={{
                        fontSize: '0.86rem',
                        color: '#424245',
                        lineHeight: 1.5,
                    }}>{f.originalName}</span>
                    {f.stats && (
                        <span style={{
                            fontSize: '0.79rem',
                            color: '#6e6e73',
                            whiteSpace: 'nowrap',
                            marginLeft: 16,
                        }}>
                            {f.stats.finalColumns} columnas · {f.stats.recalculatedRows} filas
                        </span>
                    )}
                </div>
            ))}
        </div>
    );
}
```

- [ ] **Step 2: Verify build**

Run: `npx vite build`
Expected: Build succeeds

- [ ] **Step 3: Commit**

```bash
git add src/web/components/ResultPanel.tsx
git commit -m "feat(web-ui): add download all button to ResultPanel for batch downloads"
```

---

### Task 9: Integration test — verify full flow

- [ ] **Step 1: Build everything**

Run: `npm run build`
Expected: No errors

- [ ] **Step 2: Start web server**

Run: `npm run start:web`
Expected: Server starts on http://localhost:3000

- [ ] **Step 3: Test web upload + custom name + process + download**

1. Open http://localhost:3000
2. Drag an .xlsx file into the upload zone
3. Click the output name field on the file card, change it to "mi-reporte"
4. Click "Procesar 1 archivo(s)"
5. Verify the download link shows "mi-reporte.xlsx" as the filename
6. Click "Descargar" and verify the downloaded file is named "mi-reporte.xlsx"

- [ ] **Step 4: Test CLI with --output-name (single file)**

Run: `node dist/index.js path/to/test.xlsx --output-name "reporte-custom"`
Expected: Output file is named `reporte-custom.xlsx` in the same directory as the input

- [ ] **Step 5: Test CLI with --output-name (multiple files)**

Run: `node dist/index.js file1.xlsx file2.xlsx --output-name "reporte"`
Expected: Interactive prompt asks for each file's output name

- [ ] **Step 6: Test default naming still works**

Run: `node dist/index.js path/to/test.xlsx` (no --output-name)
Expected: Output is `FACTURAS ELECTRÓNICAS.xlsx` (or incremented)

- [ ] **Step 7: Stop server and clean up**

Press Ctrl+C in the server terminal.
