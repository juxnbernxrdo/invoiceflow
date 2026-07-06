# Branding, UX & Web Client Fixes Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix branding (InvoiceFlow everywhere, not "invo"), remove ANSI colors from CLI, enforce tipo gasto + output name prompts on every process, and set up Tailwind CSS for the web client.

**Architecture:** Changes span CLI (branding, colors, prompts), web client (Tailwind setup, consistent styling), and shared utilities (remove gradient.ts). Each task is independent and committable.

**Tech Stack:** TypeScript, commander, prompts, Tailwind CSS 4, Vite, React 19, Lucide

---

## File Map

| File | Action | Purpose |
|------|--------|---------|
| `src/cli.ts` | Modify | Branding, remove chalk, prompt flow |
| `src/utils/gradient.ts` | Delete | No longer needed |
| `src/index.ts` | No change | Entry point (references cli.ts) |
| `src/web/index.html` | Modify | Title branding |
| `src/web/App.tsx` | Modify | Import global CSS |
| `src/web/index.css` | Create | Tailwind directives + CSS variables |
| `src/web/components/Header.tsx` | Modify | Use Tailwind classes |
| `src/web/components/FileZone.tsx` | Modify | Use Tailwind classes |
| `src/web/components/TipoGastoSelect.tsx` | Modify | Use Tailwind classes |
| `src/web/components/ProcessButton.tsx` | Modify | Already has Tailwind, verify |
| `src/web/components/FileCard.tsx` | Modify | Already has Tailwind, verify |
| `src/web/components/ResultPanel.tsx` | Modify | Already has Tailwind, verify |
| `vite.config.ts` | No change | Already configured |
| `package.json` | Modify | Add tailwindcss, @tailwindcss/vite |
| `README.md` | Modify | Branding fixes |
| `contamind-design-prd.md` | No change | Reference only |

---

### Task 1: Fix CLI branding — "invo" → "InvoiceFlow"

**Files:**
- Modify: `src/cli.ts`

**Changes:**

1. Line 24: Change `"invo CLI"` → `"InvoiceFlow"`
2. Line 234: Keep `program.name('invo')` — this is the command name, correct
3. Line 489: Change `'¡Gracias por usar invo!'` → `'¡Gracias por usar InvoiceFlow!'`

```bash
cd /home/juxnbernxrdo/Descargas/invoiceflow-cli
npx tsc --noEmit
git add src/cli.ts
git commit -m "fix: branding — InvoiceFlow instead of invo in CLI messages"
```

---

### Task 2: Fix HTML title branding

**Files:**
- Modify: `src/web/index.html`

**Change:**

Line 6: `<title>invo — Web</title>` → `<title>InvoiceFlow — Web</title>`

```bash
npx vite build
git add src/web/index.html
git commit -m "fix: branding — InvoiceFlow in web title"
```

---

### Task 3: Remove all ANSI colors from CLI

**Files:**
- Modify: `src/cli.ts`
- Delete: `src/utils/gradient.ts`

**Step 1: Remove gradient import and usage from cli.ts**

Remove line 12: `import { applyGradient } from './utils/gradient';`

Remove line 231: `const bannerString = applyGradient(ASCII_ART);`

Replace all `console.log(bannerString)` (lines 243, 273) with `console.log(ASCII_ART)`

**Step 2: Remove all chalk references**

Remove line 7: `import chalk from 'chalk';`

Replace every `chalk.yellow(...)` with plain text prefixed by `⚠ `:
- Line 169: `console.log(chalk.yellow('No se seleccionaron archivos para procesar.'))` → `console.log('⚠ No se seleccionaron archivos para procesar.')`
- Line 181: `console.log(chalk.yellow(...))` → `console.log(\`⚠ ${original}: ${getSuggestionForError(error || '')}\`)`
- Line 326: `console.log(chalk.yellow(...))` → `console.log('⚠ No se encontraron archivos Excel en el directorio actual.')`
- Line 452: `console.log(chalk.yellow(...))` → `console.log('⚠ No se pudo abrir el navegador automáticamente.')`

Replace every `console.log(chalk.green(...))` with plain text prefixed by `✔ `:
- Line 203: `console.log(chalk.green(...))` → `console.log(\`✔ ${path.basename(original)} → ${path.basename(outPath)}\`)`
- Line 218: `console.log(chalk.green(...))` → `console.log(\`✔ ${processedSuccessfully.length} archivo(s) procesado(s)\`)`
- Line 489: `console.log(chalk.green(...))` → `console.log('¡Gracias por usar InvoiceFlow! ¡Hasta luego!\n')`

Replace every `console.log(chalk.red(...))` with plain text prefixed by `✘ `:
- Line 207: `console.log(chalk.red(...))` → `console.log(\`✘ ${original}: ${getSuggestionForError(err.message)}\`)`
- Line 221: `console.log(chalk.red(...))` → `console.log(\`✘ ${skippedFiles.length} archivo(s) omitido(s)\`)`

Replace every `console.log(chalk.cyan(...))` with plain text:
- Line 249: `console.log(chalk.cyan('\n  Archivos a procesar:'))` → `console.log('\n  Archivos a procesar:')`
- Line 250: `console.log(chalk.white(...))` → `console.log(\`    ${i + 1}. ${path.basename(f)}\`)`
- Line 330: `console.log(chalk.cyan(...))` → `console.log('\n  Archivos Excel disponibles:')`
- Line 444: `console.log(chalk.cyan(...))` → `console.log(\`\n  Iniciando InvoiceFlow web en ${url}...\`)`

Replace `console.log(chalk.white(...))`:
- Line 453: `console.log(chalk.white(...))` → `console.log(\`  Abre manualmente: ${url}\n\`)`

**Step 3: Remove gradient.ts**

```bash
rm src/utils/gradient.ts
```

**Step 4: Remove chalk from package.json dependencies**

Remove `"chalk": "^4.1.2"` from `dependencies`.

**Step 5: Verify**

```bash
npx tsc --noEmit
git add -A
git commit -m "feat(cli): remove all ANSI colors — plain text output only"
```

---

### Task 4: Enforce tipo gasto prompt on every file processing

**Files:**
- Modify: `src/cli.ts`

**Problem:** Currently tipo gasto is only prompted when:
- `@` selector is used and `--tipo-gasto` not provided (line 365)
- Files typed manually and `--tipo-gasto` not provided (line 464)

But `tipoGastoValue` persists across multiple `rl.on('line')` cycles. The spec says: **always prompt, never reuse**.

**Changes:**

1. Remove `let tipoGastoValue: string | undefined = options.tipoGasto;` (line 293)

2. Create a helper function `promptTipoGasto` that always asks:

```typescript
async function promptTipoGasto(): Promise<string> {
    const response = await prompts({
        type: 'select',
        name: 'tipo',
        message: 'Tipo de gasto',
        choices: [
            { title: 'EMPRESARIAL', value: 'EMPRESARIAL' },
            { title: 'PERSONAL', value: 'PERSONAL' },
        ],
        initial: 0,
    });
    return response.tipo || 'EMPRESARIAL';
}
```

3. In `openFileSelector` (line 364-379): Remove the conditional `if (!tipoGastoValue)` — always call `promptTipoGasto()`. Store result in a local variable, don't persist it.

4. In `rl.on('line')` handler (line 462-481): Remove the conditional `if (hasExcelFiles && !tipoGastoValue)` — always prompt when files are detected. Use the result directly, don't persist.

5. In `processFiles` call (line 484): Pass the freshly prompted tipoGasto value.

6. For the CLI argument mode (line 240-270): When `--tipo-gasto` is NOT provided, always prompt before processing. When it IS provided, use it directly.

**Key behavioral change:** Every time the user processes files, the tipo gasto selector appears. The `--tipo-gasto` flag bypasses the prompt only for that invocation.

```bash
npx tsc --noEmit
git add src/cli.ts
git commit -m "feat(cli): always prompt tipo gasto — never reuse previous value"
```

---

### Task 5: Always prompt for output name — remove auto-generation

**Files:**
- Modify: `src/cli.ts`

**Problem:** When `--output-name` is not provided, the system auto-generates `FACTURAS ELECTRÓNICAS.xlsx` with `(1)`, `(2)` suffixes. The spec says: **always prompt the user for the output name**.

**Changes:**

1. Remove the `--output-name` CLI option (line 238)

2. Remove the `getUniqueOutputPath` function entirely (lines 84-108) — no longer needed since user always provides the name

3. In the CLI argument action (lines 240-270): After prompting for tipo gasto (Task 4), always prompt for output name:

```typescript
// After tipo gasto prompt
const nameResponse = await prompts({
    type: 'text',
    name: 'name',
    message: 'Nombre del archivo de salida:',
    initial: 'FACTURAS ELECTRÓNICAS',
    validate: (value: string) => {
        const cleaned = value.replace(/\.xlsx$/i, '').trim();
        if (!cleaned) return 'El nombre no puede estar vacío';
        if (/[\/\\]/.test(cleaned)) return 'El nombre no puede contener / o \\';
        return true;
    },
});
const outputName = (nameResponse.name || 'FACTURAS ELECTRÓNICAS').trim();
// Ensure .xlsx extension
const finalName = outputName.endsWith('.xlsx') ? outputName : outputName + '.xlsx';
const outPath = path.join(inputDir, finalName);
```

4. In `processFiles`: Accept `outputName: string` parameter instead of `outputNames: Map<number, string>`. For single file, use directly. For multiple files, prompt for each.

5. For the interactive mode: After file selection and tipo gasto, also prompt for output name.

6. Remove the auto-incrementing `(1)`, `(2)` logic entirely.

```bash
npx tsc --noEmit
git add src/cli.ts
git commit -m "feat(cli): always prompt output name — no more auto-generated filenames"
```

---

### Task 6: Fix interactive mode — prompt tipo gasto + output name

**Files:**
- Modify: `src/cli.ts`

This task ensures the interactive mode (`invo` with no arguments) also follows the new flow:

1. When files are selected via `@` or typed manually
2. Always prompt tipo gasto (Task 4 handles this)
3. Always prompt output name (Task 5 handles this)
4. Then process

The interactive `rl.on('line')` handler should:
- Detect if the line contains Excel files
- If yes: prompt tipo gasto → prompt output name → process
- If no: treat as command (/web, /quit, etc.)

```bash
npx tsc --noEmit
git add src/cli.ts
git commit -m "feat(cli): interactive mode prompts tipo gasto + output name"
```

---

### Task 7: Install and configure Tailwind CSS 4

**Files:**
- Modify: `package.json`
- Create: `src/web/index.css`
- Modify: `src/web/App.tsx`
- Modify: `vite.config.ts`

**Step 1: Install dependencies**

```bash
cd /home/juxnbernxrdo/Descargas/invoiceflow-cli
npm install tailwindcss @tailwindcss/vite
```

**Step 2: Configure Vite plugin**

Modify `vite.config.ts`:

```typescript
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import path from 'path';

export default defineConfig({
    plugins: [react(), tailwindcss()],
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

**Step 3: Create global CSS file**

Create `src/web/index.css`:

```css
@import "tailwindcss";

@theme {
    --color-surface: #ffffff;
    --color-surface-dim: #f5f5f7;
    --color-border: #e0e0e5;
    --color-border-light: #ebebf0;
    --color-text: #1d1d1f;
    --color-text-secondary: #424245;
    --color-text-muted: #6e6e73;
    --color-text-faint: #aeaeb2;
    --color-accent: #0071e3;
    --color-accent-hover: #0077ed;
    --color-accent-soft: #e8f0fc;
    --color-success: #30d158;
    --color-danger: #ff3b30;
    --color-warning: #ff9f0a;
    --font-sans: 'Geist', -apple-system, sans-serif;
    --font-serif: 'Instrument Serif', Georgia, serif;
}
```

**Step 4: Import CSS in App.tsx**

Add at top of `src/web/App.tsx`:

```typescript
import './index.css';
```

**Step 5: Verify**

```bash
npx vite build
git add -A
git commit -m "feat(web): install and configure Tailwind CSS 4"
```

---

### Task 8: Convert Header to Tailwind classes

**Files:**
- Modify: `src/web/components/Header.tsx`

Replace the full content:

```tsx
import { FileSpreadsheet } from 'lucide-react';

export function Header() {
    return (
        <header className="sticky top-0 z-50 border-b border-border-light bg-white/72 backdrop-blur-xl backdrop-saturate-[180%] px-6 py-3.5">
            <div className="mx-auto flex max-w-[720px] items-center gap-2.5">
                <FileSpreadsheet size={20} className="text-accent" strokeWidth={1.8} />
                <span className="font-serif text-[1.35rem] leading-none text-text">InvoiceFlow</span>
                <span className="ml-0.5 text-[0.65rem] font-medium uppercase tracking-wider text-text-faint">Web</span>
            </div>
        </header>
    );
}
```

```bash
npx vite build
git add src/web/components/Header.tsx
git commit -m "refactor(web): Header — Tailwind classes"
```

---

### Task 9: Convert FileZone to Tailwind classes

**Files:**
- Modify: `src/web/components/FileZone.tsx`

Replace the full content:

```tsx
import { useRef, useState, DragEvent } from 'react';
import { Upload } from 'lucide-react';
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
        <div className="mb-8">
            <label className="mb-2 block text-[0.72rem] font-semibold uppercase tracking-[0.10em] text-text-muted">
                Archivos
            </label>
            <div
                onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={handleDrop}
                onClick={() => inputRef.current?.click()}
                className={`cursor-pointer rounded-[18px] border-2 border-dashed px-6 py-11 text-center transition-all ${
                    isDragging
                        ? 'border-accent bg-accent-soft'
                        : 'border-border bg-white hover:border-text-faint'
                }`}
            >
                <input
                    ref={inputRef}
                    type="file"
                    multiple
                    accept=".xlsx,.xls"
                    className="hidden"
                    onChange={(e) => {
                        const selected = Array.from(e.target.files || []);
                        if (selected.length > 0) addFiles(selected);
                        e.target.value = '';
                    }}
                />
                <Upload
                    size={24}
                    className={`mx-auto mb-3 transition-colors ${isDragging ? 'text-accent' : 'text-text-faint'}`}
                    strokeWidth={1.5}
                />
                <p className="m-0 text-[0.97rem] leading-relaxed text-text-secondary">
                    {isUploading ? 'Subiendo archivos...' : 'Arrastra archivos Excel o haz clic para seleccionar'}
                </p>
                <p className="mt-1.5 m-0 text-[0.79rem] leading-relaxed text-text-faint">
                    .xlsx o .xls — hasta 50MB
                </p>
            </div>

            {files.length > 0 && (
                <div className="mt-3 flex flex-col gap-2">
                    {files.map((f, i) => <FileCard key={f.id} file={f} index={i} />)}
                </div>
            )}
        </div>
    );
}
```

```bash
npx vite build
git add src/web/components/FileZone.tsx
git commit -m "refactor(web): FileZone — Tailwind classes"
```

---

### Task 10: Convert TipoGastoSelect to Tailwind classes

**Files:**
- Modify: `src/web/components/TipoGastoSelect.tsx`

Replace the full content:

```tsx
import { useStore } from '../store';

export function TipoGastoSelect() {
    const tipoGasto = useStore(s => s.tipoGasto);
    const setTipoGasto = useStore(s => s.setTipoGasto);

    return (
        <div className="mb-8">
            <label className="mb-2 block text-[0.72rem] font-semibold uppercase tracking-[0.10em] text-text-muted">
                Tipo de gasto
            </label>
            <div className="flex gap-2">
                {(['EMPRESARIAL', 'PERSONAL'] as const).map(opt => {
                    const active = tipoGasto === opt;
                    return (
                        <button
                            key={opt}
                            onClick={() => setTipoGasto(opt)}
                            className={`rounded-3xl border-none px-6 py-2.5 text-[0.9rem] font-medium transition-all ${
                                active
                                    ? 'bg-text text-white'
                                    : 'bg-transparent text-text-secondary hover:bg-surface-dim'
                            }`}
                        >
                            {opt}
                        </button>
                    );
                })}
            </div>
        </div>
    );
}
```

```bash
npx vite build
git add src/web/components/TipoGastoSelect.tsx
git commit -m "refactor(web): TipoGastoSelect — Tailwind classes"
```

---

### Task 11: Verify ProcessButton, FileCard, ResultPanel Tailwind

**Files:**
- Read: `src/web/components/ProcessButton.tsx`
- Read: `src/web/components/FileCard.tsx`
- Read: `src/web/components/ResultPanel.tsx`

These components already use Tailwind className. Verify:
- All CSS variable references like `var(--accent)` are replaced with Tailwind tokens like `text-accent`
- No inline `style={{}}` remains
- All colors use the theme tokens

If any inline styles or CSS variable references exist, convert them. Otherwise, this task is a no-op.

```bash
npx vite build
git add -A
git commit -m "refactor(web): verify all components use Tailwind consistently"
```

---

### Task 12: Update README branding

**Files:**
- Modify: `README.md`

Replace all occurrences of "invo" (as product name) with "InvoiceFlow":
- Line 1: `# invo` → `# InvoiceFlow`
- Line 3: `**invo** es una herramienta` → `**InvoiceFlow** es una herramienta`
- Line 180: `invo [opciones] [archivos...]` → `invo [opciones] [archivos...]` (command stays invo)
- Line 209: `invo` (command) → stays `invo`
- Line 214: `banner de invo` → `banner de InvoiceFlow`
- Line 234: `invo incluye` → `InvoiceFlow incluye`
- Line 238-239: `invo` (command references) → stay `invo`
- Line 267: Remove or update the auto-generated filename reference

Also remove `--output-name` from docs if present, and document the new prompt-based flow.

```bash
git add README.md
git commit -m "docs: branding — InvoiceFlow throughout README"
```

---

### Task 13: Full build verification

```bash
cd /home/juxnbernxrdo/Descargas/invoiceflow-cli
npx tsc --noEmit
npx vite build
```

Both must pass. Fix any issues found.

---

## Self-Review Checklist

1. **Spec §1 (Branding):** All "invo" product references → "InvoiceFlow"? ✅ Tasks 1, 2, 12
2. **Spec §2 (ASCII Art):** Banner aligned, no colors, no ANSI? ✅ Task 3 removes gradient
3. **Spec §3 (No colors):** chalk removed, gradient.ts deleted? ✅ Task 3
4. **Spec §4 (Tipo gasto always):** Prompted every time? ✅ Task 4
5. **Spec §5 (Output name always):** Prompted every time, no auto-generate? ✅ Task 5
6. **Spec §6 (UX audit):** Consistent flow for all methods? ✅ Task 6
7. **Spec §7 (Web deps):** Tailwind installed and configured? ✅ Task 7
8. **Spec §8 (Frontend audit):** All components use Tailwind? ✅ Tasks 8-11
9. **Spec §9 (Validations):** Build passes? ✅ Task 13
