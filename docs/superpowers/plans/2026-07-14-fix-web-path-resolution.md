# Fix Web Path Resolution for npm Distribution

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the `/web` command locate its static assets correctly in any environment (dev, global npm install, local install) on any OS, eliminating all hardcoded development paths.

**Architecture:** Vite builds directly into `dist/web/` instead of `src/web/dist/`. The server resolves assets relative to its own `__dirname` (guaranteed to be `dist/server/`), making path resolution independent of `process.cwd()`. The build pipeline produces a self-contained `dist/` directory that ships via npm.

**Tech Stack:** TypeScript, Express, Vite, npm packaging

---

## Root Cause Analysis

The server at `src/server/index.ts:14-20` tries two paths:
1. `process.cwd()/src/web/dist` — only works when run from project root in dev
2. `__dirname/../web/dist` — resolves to `dist/web/dist` which is never created

Neither path exists in an npm-installed package because:
- Vite builds to `src/web/dist/` (not included in npm by `"files"` or `.npmignore`)
- The `"files"` field only ships `dist/**/*` (TypeScript output), missing web assets entirely
- The build script only runs `tsc`, not `vite build`

---

## File Map

| File | Action | Purpose |
|------|--------|---------|
| `vite.config.ts` | Modify | Change `outDir` to `dist/web/` |
| `src/server/index.ts` | Modify | Use `__dirname`-only path resolution, remove dev hack |
| `package.json` | Modify | Add web assets to `"files"`, fix build scripts, fix `prepublishOnly` |
| `.gitignore` | Modify | Add `src/web/dist/` (Vite source output) |
| `.npmignore` | Modify | Remove `dist/` exclusion (must ship compiled code) |
| `src/web/dist/` | Delete | Remove git-tracked Vite output (now builds to `dist/web/`) |

---

## Task 1: Reconfigure Vite to build into `dist/web/`

**Files:**
- Modify: `vite.config.ts:9-10`

- [ ] **Step 1: Change Vite `outDir` to `dist/web/`**

```typescript
// vite.config.ts
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import path from 'path';

export default defineConfig({
    plugins: [react(), tailwindcss()],
    root: path.resolve(__dirname, 'src/web'),
    build: {
        outDir: path.resolve(__dirname, 'dist', 'web'),
        emptyOutDir: true,
    },
    server: {
        proxy: {
            '/api': 'http://localhost:3000',
        },
    },
});
```

- [ ] **Step 2: Verify build works**

Run: `npm run build:web`
Expected: Vite output appears in `dist/web/index.html` and `dist/web/assets/`

---

## Task 2: Fix path resolution in server

**Files:**
- Modify: `src/server/index.ts:13-20`

- [ ] **Step 1: Replace path resolution logic**

Remove the hardcoded dev path and the `possiblePaths` array. Use `__dirname`-only resolution since the compiled server always lives at `dist/server/index.js`, so `__dirname/../web` reliably points to `dist/web/`.

```typescript
import express from 'express';
import path from 'path';
import filesRouter from './routes/files';
import { Request, Response } from 'express';
import fs from 'fs';

export function createServer(port: number = 3000): express.Express {
    const app = express();

    app.use(express.json());
    app.use('/api/files', filesRouter);

    const webDist = path.resolve(__dirname, '..', 'web');
    if (!fs.existsSync(webDist)) {
        throw new Error(`Web assets not found at ${webDist}. Run "npm run build:web" first.`);
    }
    app.use(express.static(webDist));

    app.get('/{*splat}', (_req: Request, res: Response) => {
        res.sendFile(path.join(webDist, 'index.html'));
    });

    return app;
}

export function startServer(port: number = 3000): Promise<void> {
    return new Promise<void>((resolve) => {
        const app = createServer(port);
        app.listen(port, () => {
            console.log(`\n  InvoiceFlow web iniciado en http://localhost:${port}\n`);
            resolve();
        });
    });
}
```

Key changes:
- Removed `process.cwd()` reference (line 16)
- Removed `possiblePaths` array and fallback logic (lines 14-20)
- `__dirname` in compiled code (`dist/server/index.js`) always resolves to `dist/server/`
- `path.resolve(__dirname, '..', 'web')` → `dist/web/` (where Vite now builds)
- Added existence check with clear error message
- Changed `webDist` from `dist/web/dist` to `dist/web` (Vite `outDir` is now `dist/web/` directly)

- [ ] **Step 2: Verify TypeScript compiles**

Run: `npm run build`
Expected: Clean compilation, no errors

---

## Task 3: Update build scripts and package.json

**Files:**
- Modify: `package.json:14-26`

- [ ] **Step 1: Update scripts to include web build in the full pipeline**

```json
{
  "scripts": {
    "build": "tsc && chmod +x dist/index.js",
    "build:web": "npx vite build",
    "build:all": "npm run build && npm run build:web",
    "dev:web": "npx vite",
    "start:web": "node dist/server/index.js",
    "prepublishOnly": "npm run build:all",
    "start": "ts-node src/index.ts",
    "test": "vitest run",
    "test:watch": "vitest",
    "clean": "rm -rf dist",
    "rebuild": "npm run clean && npm run build:all",
    "postinstall": "chmod +x dist/index.js || true"
  }
}
```

Key changes:
- `prepublishOnly` now runs `build:all` (includes both `tsc` and `vite build`)
- `clean` simplified to `rm -rf dist` (no longer needs `src/web/dist`)

- [ ] **Step 2: Verify full build pipeline works**

Run: `npm run clean && npm run build:all`
Expected: `dist/` contains both TypeScript output (`dist/server/`, `dist/cli/`, etc.) and web assets (`dist/web/index.html`, `dist/web/assets/`)

---

## Task 4: Update package.json `"files"` field

**Files:**
- Modify: `package.json:9-13`

- [ ] **Step 1: Ensure `dist/web/` is included in the npm package**

The current `"files": ["dist/**/*"]` already covers `dist/web/**/*` since it uses a glob. No change needed to `"files"` itself — the glob pattern `dist/**/*` will automatically include `dist/web/` once it exists.

Verify by checking what `npm pack` includes:

Run: `npm run build:all && npm pack --dry-run 2>&1 | grep "web"`
Expected: Lines showing `dist/web/index.html` and `dist/web/assets/*` in the package contents

---

## Task 5: Update `.gitignore` and `.npmignore`

**Files:**
- Modify: `.gitignore`
- Modify: `.npmignore`

- [ ] **Step 1: Add `src/web/dist/` to `.gitignore`**

The Vite source output at `src/web/dist/` should not be tracked in git (it's build output). Since Vite now builds to `dist/web/` (which is already gitignored via `dist/`), add an explicit ignore for the old location:

```
node_modules/
dist/
src/web/dist/
*.log
.env
```

- [ ] **Step 2: Fix `.npmignore` to ship `dist/`**

The current `.npmignore` excludes `dist/` which prevents shipping the compiled code. Remove the `dist/` exclusion since `"files"` in package.json controls what's included:

Remove these lines from `.npmignore`:
```
# Build output (will be rebuilt on install)
dist/
```

The `"files"` field in `package.json` already limits what's included to `dist/**/*`, `README.md`, and `LICENSE`. The `.npmignore` should not override that by excluding `dist/`.

- [ ] **Step 3: Remove old `src/web/dist/` from git tracking**

Run: `git rm -r --cached src/web/dist/ 2>/dev/null; echo "done"`

---

## Task 6: Remove stale `dist/cli.js` (cleanup)

**Files:**
- Delete: `dist/cli.js` (after rebuild)

- [ ] **Step 1: Clean rebuild removes stale file**

Run: `npm run clean && npm run build:all`
Expected: `dist/cli.js` no longer exists (it was a stale artifact from an old build)

---

## Task 7: End-to-end verification

- [ ] **Step 1: Full clean build**

Run: `npm run clean && npm run build:all`
Expected: No errors

- [ ] **Step 2: Verify web assets in dist**

Run: `ls -la dist/web/ && ls -la dist/web/assets/`
Expected: `index.html`, `assets/index-*.css`, `assets/index-*.js`

- [ ] **Step 3: Verify npm package contents**

Run: `npm pack --dry-run`
Expected: Package includes `dist/server/index.js`, `dist/web/index.html`, `dist/web/assets/*`, `README.md`, `LICENSE`

- [ ] **Step 4: Test server starts and serves web client**

Run: `node dist/server/index.js` (in a separate terminal, visit http://localhost:3000)
Expected: Web UI loads, no ENOENT errors

- [ ] **Step 5: Test from different working directory**

Run: `cd /tmp && node /home/juxnbernxrdo/Documentos/invoiceflow-cli/dist/server/index.js`
Expected: Web UI still loads correctly (proves independence from `process.cwd()`)

- [ ] **Step 6: Run existing tests**

Run: `npm test`
Expected: All existing tests pass

---

## Self-Review Checklist

1. **Spec coverage:** ✅ All requirements addressed — dev install, global npm, local install, Windows/Linux/macOS, no hardcoded paths
2. **Placeholder scan:** ✅ No TBD/TODO placeholders — all steps have exact code and commands
3. **Type consistency:** ✅ `webDist` variable name consistent, `path.resolve(__dirname, '..', 'web')` matches `vite.config.ts` `outDir: path.resolve(__dirname, 'dist', 'web')`
4. **Edge cases:** ✅ Error thrown if web assets missing (clear message), `__dirname` works identically on all OS
