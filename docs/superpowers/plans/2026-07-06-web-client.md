# InvoiceFlow Web Client — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a `/web` command to the CLI that launches a local web client sharing the same processing engine as the CLI.

**Architecture:** Extract business logic into `src/core/`, build an Express API server in `src/server/`, and serve a React SPA in `src/web/`. The CLI, server, and web UI all consume the same `core` module.

**Tech Stack:** Express, React 19, TypeScript, Tailwind CSS 4, Vite (dev), Lucide React icons

---

## File Structure

```
src/
├── core/
│   ├── index.ts              # Re-exports core module
│   ├── transformer.ts        # Moved from src/transformer.ts (unchanged)
│   ├── processor.ts          # Multi-file processing orchestrator
│   └── types.ts              # Shared types (TransformOptions, TransformStats, etc.)
├── server/
│   ├── index.ts              # Express server entry
│   ├── routes/
│   │   └── files.ts          # POST /api/files, GET /api/files/:id, DELETE /api/files/:id
│   └── store.ts              # In-memory file session store
├── web/
│   ├── index.html            # Vite entry HTML
│   ├── main.tsx              # React root mount
│   ├── App.tsx               # Main app shell
│   ├── store.ts              # Zustand global state
│   ├── components/
│   │   ├── Header.tsx        # Top nav bar
│   │   ├── FileZone.tsx      # Drop zone + file list
│   │   ├── TipoGastoSelect.tsx  # Tipo gasto selector
│   │   ├── FileCard.tsx      # Single file card with status
│   │   ├── ProcessButton.tsx # CTA button
│   │   └── ResultPanel.tsx   # Download results
│   └── api.ts                # Fetch wrapper for backend
├── cli.ts                    # Existing CLI (add /web command)
├── index.ts                  # Existing entry (unchanged)
└── utils/                    # Existing utils (unchanged)
```

---

### Task 1: Create core module with shared types

**Files:**
- Create: `src/core/types.ts`
- Create: `src/core/index.ts`

- [ ] **Step 1: Create core types**

```typescript
// src/core/types.ts
export interface TransformOptions {
    tipoGasto?: string;
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
    status: 'pending' | 'processing' | 'done' | 'error';
    stats?: TransformStats;
    error?: string;
    outputPath?: string;
}
```

- [ ] **Step 2: Create core barrel export**

```typescript
// src/core/index.ts
export { TransformOptions, TransformStats, ProgressCallback, FileJob } from './types';
export { ExcelTransformer } from '../transformer';
```

- [ ] **Step 3: Build**

Run: `npm run build`
Expected: PASS

---

### Task 2: Create processor orchestrator

**Files:**
- Create: `src/core/processor.ts`
- Modify: `src/core/index.ts`

- [ ] **Step 1: Write processor**

```typescript
// src/core/processor.ts
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { ExcelTransformer, TransformOptions, TransformStats, ProgressCallback } from './types';
import { v4 as uuidv4 } from 'crypto';

function generateId(): string {
    return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
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

    const outName = originalName.replace(/\.(xlsx?|xls)$/i, '') + '_procesado.xlsx';
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

- [ ] **Step 2: Update core barrel**

```typescript
// src/core/index.ts
export { TransformOptions, TransformStats, ProgressCallback, FileJob } from './types';
export { ExcelTransformer } from '../transformer';
export { processFile, processFiles, ProcessResult } from './processor';
```

- [ ] **Step 3: Build**

Run: `npm run build`
Expected: PASS

---

### Task 3: Create Express server

**Files:**
- Create: `src/server/store.ts`
- Create: `src/server/routes/files.ts`
- Create: `src/server/index.ts`

- [ ] **Step 1: Install dependencies**

Run: `npm install express multer uuid && npm install -D @types/express @types/multer @types/uuid`
Expected: PASS

- [ ] **Step 2: Create session store**

```typescript
// src/server/store.ts
import { FileJob } from '../core/types';

export interface SessionStore {
    files: Map<string, FileJob>;
    tempPaths: Map<string, string>; // id -> temp file path
}

const store: SessionStore = {
    files: new Map(),
    tempPaths: new Map(),
};

export function getStore(): SessionStore {
    return store;
}

export function addFile(id: string, job: FileJob, tempPath: string): void {
    store.files.set(id, job);
    store.tempPaths.set(id, tempPath);
}

export function getFile(id: string): FileJob | undefined {
    return store.files.get(id);
}

export function getAllFiles(): FileJob[] {
    return Array.from(store.files.values());
}

export function removeFile(id: string): boolean {
    const tempPath = store.tempPaths.get(id);
    if (tempPath) {
        try { require('fs').unlinkSync(tempPath); } catch {}
        store.tempPaths.delete(id);
    }
    return store.files.delete(id);
}

export function updateFile(id: string, updates: Partial<FileJob>): void {
    const existing = store.files.get(id);
    if (existing) {
        store.files.set(id, { ...existing, ...updates });
    }
}
```

- [ ] **Step 3: Create files route**

```typescript
// src/server/routes/files.ts
import { Router, Request, Response } from 'express';
import multer from 'multer';
import * as path from 'path';
import * as fs from 'fs';
import * as os from 'os';
import { addFile, getFile, getAllFiles, removeFile, updateFile } from '../store';
import { processFile, ProcessResult } from '../../core/processor';

const router = Router();
const upload = multer({
    dest: path.join(os.tmpdir(), 'invoiceflow-uploads'),
    limits: { fileSize: 50 * 1024 * 1024 }, // 50MB
    fileFilter: (_req, file, cb) => {
        const ext = path.extname(file.originalname).toLowerCase();
        if (ext === '.xlsx' || ext === '.xls') {
            cb(null, true);
        } else {
            cb(new Error('Solo se permiten archivos .xlsx o .xls'));
        }
    }
});

// POST /api/files — upload files
router.post('/', upload.array('files', 20), async (req: Request, res: Response) => {
    try {
        const files = req.files as Express.Multer.File[];
        const tipoGasto = (req.body.tipoGasto as string) || 'EMPRESARIAL';

        if (!files || files.length === 0) {
            res.status(400).json({ error: 'No se enviaron archivos' });
            return;
        }

        const results = [];
        for (const file of files) {
            const id = Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
            addFile(id, {
                id,
                originalName: file.originalname,
                status: 'pending',
            }, file.path);
            results.push({ id, originalName: file.originalname });
        }

        res.json({ files: results, tipoGasto });
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
});

// GET /api/files — list all files
router.get('/', (_req: Request, res: Response) => {
    res.json({ files: getAllFiles() });
});

// GET /api/files/:id — get single file
router.get('/:id', (req: Request, res: Response) => {
    const file = getFile(req.params.id);
    if (!file) { res.status(404).json({ error: 'No encontrado' }); return; }
    res.json(file);
});

// DELETE /api/files/:id — remove file
router.delete('/:id', (req: Request, res: Response) => {
    const removed = removeFile(req.params.id);
    if (!removed) { res.status(404).json({ error: 'No encontrado' }); return; }
    res.json({ ok: true });
});

// POST /api/files/process — process all pending files
router.post('/process', async (req: Request, res: Response) => {
    try {
        const { tipoGasto } = req.body;
        const files = getAllFiles().filter(f => f.status === 'pending');
        const results = [];

        for (const file of files) {
            const tempPath = require('../store').getStore().tempPaths.get(file.id);
            if (!tempPath) continue;

            updateFile(file.id, { status: 'processing' });

            try {
                const result = await processFile(tempPath, { tipoGasto });
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

// GET /api/files/:id/download — download processed file
router.get('/:id/download', (req: Request, res: Response) => {
    const file = getFile(req.params.id);
    if (!file || file.status !== 'done' || !file.outputPath) {
        res.status(404).json({ error: 'Archivo no disponible' });
        return;
    }

    if (!fs.existsSync(file.outputPath)) {
        res.status(404).json({ error: 'Archivo no encontrado en disco' });
        return;
    }

    const downloadName = file.originalName.replace(/\.(xlsx?|xls)$/i, '') + '_procesado.xlsx';
    res.download(file.outputPath, downloadName);
});

export default router;
```

- [ ] **Step 4: Create server entry**

```typescript
// src/server/index.ts
import express from 'express';
import path from 'path';
import filesRouter from './routes/files';

export function createServer(port: number = 3000): express.Express {
    const app = express();

    app.use(express.json());

    // API routes
    app.use('/api/files', filesRouter);

    // Serve static web client (production build)
    const webDist = path.join(__dirname, '../../web/dist');
    app.use(express.static(webDist));

    // SPA fallback
    app.get('*', (_req, res) => {
        res.sendFile(path.join(webDist, 'index.html'));
    });

    return app;
}

export function startServer(port: number = 3000): Promise<void> {
    return new Promise((resolve) => {
        const app = createServer(port);
        app.listen(port, () => {
            console.log(`\n  InvoiceFlow Web iniciado en http://localhost:${port}\n`);
            resolve();
        });
    });
}
```

- [ ] **Step 5: Build**

Run: `npm run build`
Expected: PASS

---

### Task 4: Add `/web` command to CLI

**Files:**
- Modify: `src/cli.ts`

- [ ] **Step 1: Add /web command handler**

In `cli.ts`, inside the `rl.on('line', ...)` handler, before the `processFiles` call, add a check for `/web`:

```typescript
// Inside rl.on('line', ...) handler, after the quit check:
if (cleanLine === '/web') {
    const { startServer } = require('./server/index');
    const port = 3000;
    console.log(chalk.cyan(`\n  Iniciando InvoiceFlow Web en http://localhost:${port}...`));
    await startServer(port);
    return;
}
```

- [ ] **Step 2: Update QUICK_HELP**

```typescript
const QUICK_HELP = `
Escribe @ para seleccionar archivos Excel

  @            Buscar archivos
  @ruta        Abrir archivo específico
  /web         Iniciar cliente web
  /quit        Salir
`;
```

- [ ] **Step 3: Build**

Run: `npm run build`
Expected: PASS

---

### Task 5: Create web client with Vite + React

**Files:**
- Create: `src/web/index.html`
- Create: `src/web/main.tsx`
- Create: `src/web/App.tsx`
- Create: `src/web/api.ts`
- Create: `src/web/store.ts`
- Create: `vite.config.ts`

- [ ] **Step 1: Install web dependencies**

Run: `npm install react react-dom zustand && npm install -D vite @vitejs/plugin-react @types/react @types/react-dom`
Expected: PASS

- [ ] **Step 2: Create Vite config**

```typescript
// vite.config.ts
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
    plugins: [react()],
    root: path.resolve(__dirname, 'src/web'),
    build: {
        outDir: path.resolve(__dirname, 'src/web/dist'),
        emptyOutDir: true,
    },
    server: {
        proxy: {
            '/api': 'http://localhost:3000',
        },
    },
});
```

- [ ] **Step 3: Create index.html**

```html
<!-- src/web/index.html -->
<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>InvoiceFlow Web</title>
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link href="https://fonts.googleapis.com/css2?family=Geist:wght@400;500;600&family=Instrument+Serif&display=swap" rel="stylesheet">
</head>
<body>
    <div id="root"></div>
    <script type="module" src="./main.tsx"></script>
</body>
</html>
```

- [ ] **Step 4: Create main.tsx**

```tsx
// src/web/main.tsx
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

ReactDOM.createRoot(document.getElementById('root')!).render(
    <React.StrictMode>
        <App />
    </React.StrictMode>
);
```

- [ ] **Step 5: Create API client**

```typescript
// src/web/api.ts
const BASE = '/api';

export interface FileInfo {
    id: string;
    originalName: string;
    status: 'pending' | 'processing' | 'done' | 'error';
    stats?: {
        originalColumns: number;
        finalColumns: number;
        deletedColumns: string[];
        recalculatedRows: number;
    };
    error?: string;
}

export async function uploadFiles(files: File[], tipoGasto: string): Promise<{ files: { id: string; originalName: string }[] }> {
    const formData = new FormData();
    files.forEach(f => formData.append('files', f));
    formData.append('tipoGasto', tipoGasto);

    const res = await fetch(`${BASE}/files`, { method: 'POST', body: formData });
    if (!res.ok) throw new Error((await res.json()).error);
    return res.json();
}

export async function listFiles(): Promise<FileInfo[]> {
    const res = await fetch(`${BASE}/files`);
    const data = await res.json();
    return data.files;
}

export async function removeFile(id: string): Promise<void> {
    await fetch(`${BASE}/files/${id}`, { method: 'DELETE' });
}

export async function processFiles(tipoGasto: string): Promise<any> {
    const res = await fetch(`${BASE}/files/process`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tipoGasto }),
    });
    if (!res.ok) throw new Error((await res.json()).error);
    return res.json();
}

export function downloadUrl(id: string): string {
    return `${BASE}/files/${id}/download`;
}
```

- [ ] **Step 6: Create Zustand store**

```typescript
// src/web/store.ts
import { create } from 'zustand';
import { FileInfo, uploadFiles, listFiles, removeFile as apiRemove, processFiles as apiProcess } from './api';

interface AppStore {
    files: FileInfo[];
    tipoGasto: string;
    isProcessing: boolean;
    isUploading: boolean;
    setTipoGasto: (v: string) => void;
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

    setTipoGasto: (v) => set({ tipoGasto: v }),

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
        set({ files: updated });
    },

    processAll: async () => {
        set({ isProcessing: true });
        try {
            await apiProcess(get().tipoGasto);
            const updated = await listFiles();
            set({ files: updated });
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

- [ ] **Step 7: Create App.tsx**

```tsx
// src/web/App.tsx
import { Header } from './components/Header';
import { FileZone } from './components/FileZone';
import { TipoGastoSelect } from './components/TipoGastoSelect';
import { ProcessButton } from './components/ProcessButton';
import { ResultPanel } from './components/ResultPanel';
import { useStore } from './store';
import { useEffect } from 'react';

export default function App() {
    const refreshFiles = useStore(s => s.refreshFiles);

    useEffect(() => { refreshFiles(); }, []);

    return (
        <div style={{
            fontFamily: 'Geist, -apple-system, sans-serif',
            background: '#f5f5f7',
            minHeight: '100vh',
            color: '#1d1d1f',
        }}>
            <Header />
            <main style={{ maxWidth: 720, margin: '0 auto', padding: '48px 24px' }}>
                <TipoGastoSelect />
                <FileZone />
                <ProcessButton />
                <ResultPanel />
            </main>
        </div>
    );
}
```

- [ ] **Step 8: Build web client**

Run: `npx vite build`
Expected: PASS — output in `src/web/dist/`

---

### Task 6: Create web UI components

**Files:**
- Create: `src/web/components/Header.tsx`
- Create: `src/web/components/TipoGastoSelect.tsx`
- Create: `src/web/components/FileZone.tsx`
- Create: `src/web/components/FileCard.tsx`
- Create: `src/web/components/ProcessButton.tsx`
- Create: `src/web/components/ResultPanel.tsx`

- [ ] **Step 1: Header**

```tsx
// src/web/components/Header.tsx
export function Header() {
    return (
        <header style={{
            background: 'rgba(255,255,255,0.72)',
            backdropFilter: 'blur(20px) saturate(180%)',
            borderBottom: '1px solid #ebebf0',
            padding: '16px 24px',
            position: 'sticky',
            top: 0,
            zIndex: 50,
        }}>
            <div style={{ maxWidth: 720, margin: '0 auto', display: 'flex', alignItems: 'center', gap: 12 }}>
                <span style={{ fontFamily: 'Instrument Serif, Georgia, serif', fontSize: '1.4rem' }}>InvoiceFlow</span>
                <span style={{ fontSize: '0.72rem', color: '#6e6e73', letterSpacing: '0.1em', fontWeight: 600, textTransform: 'uppercase' }}>Web</span>
            </div>
        </header>
    );
}
```

- [ ] **Step 2: TipoGastoSelect**

```tsx
// src/web/components/TipoGastoSelect.tsx
import { useStore } from '../store';

export function TipoGastoSelect() {
    const tipoGasto = useStore(s => s.tipoGasto);
    const setTipoGasto = useStore(s => s.setTipoGasto);

    return (
        <div style={{ marginBottom: 32 }}>
            <label style={{ fontSize: '0.72rem', fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#6e6e73', display: 'block', marginBottom: 8 }}>
                Tipo de gasto
            </label>
            <div style={{ display: 'flex', gap: 8 }}>
                {['EMPRESARIAL', 'PERSONAL'].map(opt => (
                    <button
                        key={opt}
                        onClick={() => setTipoGasto(opt)}
                        style={{
                            padding: '10px 24px',
                            borderRadius: 24,
                            border: 'none',
                            cursor: 'pointer',
                            fontSize: '0.9rem',
                            fontWeight: 500,
                            transition: 'all 0.15s ease',
                            background: tipoGasto === opt ? '#1d1d1f' : 'transparent',
                            color: tipoGasto === opt ? '#fff' : '#424245',
                        }}
                    >
                        {opt}
                    </button>
                ))}
            </div>
        </div>
    );
}
```

- [ ] **Step 3: FileZone**

```tsx
// src/web/components/FileZone.tsx
import { useRef, useState, DragEvent } from 'react';
import { useStore } from '../store';
import { FileCard } from './FileCard';

export function FileZone() {
    const files = useStore(s => s.files);
    const addFiles = useStore(s => s.addFiles);
    const isUploading = useStore(s => s.isUploading);
    const [isDragging, setIsDragging] = useState(false);
    const inputRef = useRef<HTMLInputElement>(null);

    const handleDrop = (e: DragEvent) => {
        e.preventDefault();
        setIsDragging(false);
        const dropped = Array.from(e.dataTransfer.files).filter(f =>
            f.name.endsWith('.xlsx') || f.name.endsWith('.xls')
        );
        if (dropped.length > 0) addFiles(dropped);
    };

    return (
        <div style={{ marginBottom: 32 }}>
            <div
                onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={handleDrop}
                onClick={() => inputRef.current?.click()}
                style={{
                    border: `2px dashed ${isDragging ? '#0071e3' : '#e0e0e5'}`,
                    borderRadius: 18,
                    padding: '48px 24px',
                    textAlign: 'center',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                    background: isDragging ? '#e8f0fc' : '#fff',
                }}
            >
                <input
                    ref={inputRef}
                    type="file"
                    multiple
                    accept=".xlsx,.xls"
                    style={{ display: 'none' }}
                    onChange={(e) => {
                        const selected = Array.from(e.target.files || []);
                        if (selected.length > 0) addFiles(selected);
                        e.target.value = '';
                    }}
                />
                <p style={{ fontSize: '0.97rem', color: '#424245', margin: 0 }}>
                    {isUploading ? 'Subiendo archivos...' : 'Arrastra archivos Excel o haz clic para seleccionar'}
                </p>
                <p style={{ fontSize: '0.79rem', color: '#aeaeb2', margin: '8px 0 0' }}>
                    .xlsx o .xls — hasta 50MB
                </p>
            </div>

            {files.length > 0 && (
                <div style={{ marginTop: 16, display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {files.map(f => <FileCard key={f.id} file={f} />)}
                </div>
            )}
        </div>
    );
}
```

- [ ] **Step 4: FileCard**

```tsx
// src/web/components/FileCard.tsx
import { FileInfo, downloadUrl } from '../api';
import { useStore } from '../store';

const statusColors: Record<string, { bg: string; text: string; label: string }> = {
    pending: { bg: '#e8f0fc', text: '#0071e3', label: 'Pendiente' },
    processing: { bg: '#fff8ec', text: '#ff9f0a', label: 'Procesando' },
    done: { bg: '#e6f9ed', text: '#1a7a3a', label: 'Listo' },
    error: { bg: '#fff0f0', text: '#ff3b30', label: 'Error' },
};

export function FileCard({ file }: { file: FileInfo }) {
    const removeFile = useStore(s => s.removeFile);
    const s = statusColors[file.status] || statusColors.pending;

    return (
        <div style={{
            background: '#fff',
            border: '1px solid #ebebf0',
            borderRadius: 10,
            padding: '12px 16px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            transition: 'all 0.15s ease',
        }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, flex: 1, minWidth: 0 }}>
                <span style={{ fontSize: '0.97rem', color: '#1d1d1f', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {file.originalName}
                </span>
                <span style={{
                    fontSize: '0.72rem',
                    fontWeight: 600,
                    padding: '4px 12px',
                    borderRadius: 20,
                    background: s.bg,
                    color: s.text,
                    whiteSpace: 'nowrap',
                }}>
                    {s.label}
                </span>
            </div>
            <div style={{ display: 'flex', gap: 8, marginLeft: 12 }}>
                {file.status === 'done' && (
                    <a
                        href={downloadUrl(file.id)}
                        download
                        style={{
                            fontSize: '0.79rem',
                            color: '#0071e3',
                            textDecoration: 'none',
                            fontWeight: 500,
                            padding: '4px 12px',
                            borderRadius: 20,
                            background: '#e8f0fc',
                        }}
                    >
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
                        fontSize: '1.1rem',
                        padding: '4px 8px',
                    }}
                >
                    ×
                </button>
            </div>
        </div>
    );
}
```

- [ ] **Step 5: ProcessButton**

```tsx
// src/web/components/ProcessButton.tsx
import { useStore } from '../store';

export function ProcessButton() {
    const files = useStore(s => s.files);
    const isProcessing = useStore(s => s.isProcessing);
    const processAll = useStore(s => s.processAll);

    const pending = files.filter(f => f.status === 'pending');
    if (pending.length === 0) return null;

    return (
        <button
            onClick={processAll}
            disabled={isProcessing}
            style={{
                width: '100%',
                padding: '14px 28px',
                borderRadius: 24,
                border: 'none',
                background: isProcessing ? '#aeaeb2' : '#0071e3',
                color: '#fff',
                fontSize: '0.97rem',
                fontWeight: 500,
                cursor: isProcessing ? 'default' : 'pointer',
                transition: 'all 0.15s ease',
                boxShadow: isProcessing ? 'none' : '0 4px 20px rgba(0,113,227,0.25)',
                marginBottom: 32,
            }}
        >
            {isProcessing ? 'Procesando...' : `Procesar ${pending.length} archivo(s)`}
        </button>
    );
}
```

- [ ] **Step 6: ResultPanel**

```tsx
// src/web/components/ResultPanel.tsx
import { useStore } from '../store';

export function ResultPanel() {
    const files = useStore(s => s.files);
    const done = files.filter(f => f.status === 'done');
    if (done.length === 0) return null;

    return (
        <div style={{
            background: '#fff',
            border: '1px solid #ebebf0',
            borderRadius: 18,
            padding: '24px 28px',
        }}>
            <h3 style={{ fontSize: '0.93rem', fontWeight: 600, margin: '0 0 16px', color: '#1d1d1f' }}>
                Resultados
            </h3>
            {done.map(f => (
                <div key={f.id} style={{
                    padding: '12px 0',
                    borderBottom: '1px solid #ebebf0',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                }}>
                    <span style={{ fontSize: '0.86rem', color: '#424245' }}>{f.originalName}</span>
                    {f.stats && (
                        <span style={{ fontSize: '0.79rem', color: '#6e6e73' }}>
                            {f.stats.finalColumns} columnas · {f.stats.recalculatedRows} filas
                        </span>
                    )}
                </div>
            ))}
        </div>
    );
}
```

- [ ] **Step 7: Build web client**

Run: `npx vite build`
Expected: PASS

---

### Task 7: Update build scripts

**Files:**
- Modify: `package.json`

- [ ] **Step 1: Add build scripts**

```json
{
  "scripts": {
    "build": "tsc && chmod +x dist/index.js",
    "build:web": "npx vite build",
    "build:all": "npm run build && npm run build:web",
    "dev:web": "npx vite",
    "start:web": "node dist/server/index.js"
  }
}
```

- [ ] **Step 2: Full build**

Run: `npm run build:all`
Expected: PASS

---

### Task 8: Integration test

- [ ] **Step 1: Start server**

Run: `node dist/server/index.js`
Expected: `InvoiceFlow Web iniciado en http://localhost:3000`

- [ ] **Step 2: Test API upload**

```bash
curl -s -X POST http://localhost:3000/api/files \
  -F "files=@facturas_electronicas_1003559844001_01012026_30062026.xls" \
  -F "tipoGasto=EMPRESARIAL"
```
Expected: `{"files":[{"id":"...","originalName":"..."}],"tipoGasto":"EMPRESARIAL"}`

- [ ] **Step 3: Test API process**

```bash
curl -s -X POST http://localhost:3000/api/files/process \
  -H "Content-Type: application/json" \
  -d '{"tipoGasto":"EMPRESARIAL"}'
```
Expected: `{"results":[{"id":"...","status":"done","stats":{...}}]}`

- [ ] **Step 4: Test web UI**

Open `http://localhost:3000` in browser — UI loads, drag/drop works, processing works, download works.

- [ ] **Step 5: Test CLI /web**

Run: `invoiceflow` → type `/web` → browser opens at `http://localhost:3000`

- [ ] **Step 6: Kill server**

Run: `Ctrl+C`
