# Web Server Lifecycle & Management - Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement a professional WebServerManager that handles server lifecycle, prevents multiple instances, manages ports, and ensures proper cleanup.

**Architecture:** Create a singleton WebServerManager class that wraps Express server lifecycle with health checks, port validation, and graceful shutdown. Update CLI handlers to use this manager.

**Tech Stack:** Node.js, Express 5, TypeScript, net module for port detection

---

## Task 1: Create WebServerManager Class

**Files:**
- Create: `src/server/web-server-manager.ts`
- Modify: `src/server/index.ts`

- [ ] **Step 1: Create the WebServerManager class**

```typescript
// src/server/web-server-manager.ts
import express from 'express';
import http from 'http';
import net from 'net';
import path from 'path';
import fs from 'fs';
import { Request, Response } from 'express';
import filesRouter from './routes/files';

export interface ServerStatus {
    isRunning: boolean;
    port: number;
    url: string;
    pid: number | null;
    uptime: number | null;
}

export class WebServerManager {
    private static instance: WebServerManager | null = null;
    private server: http.Server | null = null;
    private app: express.Express | null = null;
    private port: number = 3000;
    private startTime: number | null = null;

    private constructor() {}

    public static getInstance(): WebServerManager {
        if (!WebServerManager.instance) {
            WebServerManager.instance = new WebServerManager();
        }
        return WebServerManager.instance;
    }

    public async start(port: number = 3000): Promise<void> {
        if (this.server && this.server.listening) {
            console.log(`\n✓ InvoiceFlow Web ya está ejecutándose.\n`);
            console.log(`URL:\nhttp://localhost:${this.port}\n`);
            return;
        }

        const isPortAvailable = await this.checkPort(port);
        if (!isPortAvailable) {
            const isOwn = await this.isOwnPort(port);
            if (isOwn) {
                console.log(`\n✓ InvoiceFlow Web ya está ejecutándose.\n`);
                console.log(`URL:\nhttp://localhost:${port}\n`);
                return;
            }
            console.log(`\n⚠ El puerto ${port} ya está ocupado.`);
            console.log(`No se inició una nueva instancia de InvoiceFlow Web.\n`);
            return;
        }

        this.port = port;
        this.app = this.createApp();
        
        return new Promise<void>((resolve, reject) => {
            this.server = this.app!.listen(port, () => {
                this.startTime = Date.now();
                console.log(`\n✓ InvoiceFlow Web iniciado correctamente.\n`);
                console.log(`URL:\nhttp://localhost:${port}\n`);
                resolve();
            });

            this.server.on('error', (err: NodeJS.ErrnoException) => {
                if (err.code === 'EADDRINUSE') {
                    console.log(`\n⚠ El puerto ${port} ya está ocupado.`);
                    console.log(`No se inició una nueva instancia de InvoiceFlow Web.\n`);
                } else {
                    console.error(`\n✗ Error al iniciar el servidor:`, err.message);
                }
                reject(err);
            });
        });
    }

    public async stop(): Promise<void> {
        if (!this.server) {
            return;
        }

        return new Promise<void>((resolve) => {
            this.server!.close(() => {
                this.server = null;
                this.app = null;
                this.startTime = null;
                console.log('✓ Servidor web detenido correctamente.');
                resolve();
            });

            // Force close after 5 seconds
            setTimeout(() => {
                if (this.server) {
                    this.server.closeAllConnections();
                    this.server = null;
                    this.app = null;
                    this.startTime = null;
                    console.log('✓ Servidor web forzado a cerrar.');
                    resolve();
                }
            }, 5000);
        });
    }

    public async restart(): Promise<void> {
        await this.stop();
        await this.start(this.port);
    }

    public isRunning(): boolean {
        return this.server !== null && this.server.listening;
    }

    public getStatus(): ServerStatus {
        return {
            isRunning: this.isRunning(),
            port: this.port,
            url: `http://localhost:${this.port}`,
            pid: process.pid,
            uptime: this.startTime ? Date.now() - this.startTime : null
        };
    }

    public async checkHealth(): Promise<boolean> {
        if (!this.isRunning()) {
            return false;
        }

        return new Promise((resolve) => {
            const req = http.get(`http://localhost:${this.port}/`, (res) => {
                resolve(res.statusCode === 200);
            });

            req.on('error', () => resolve(false));
            req.setTimeout(3000, () => {
                req.destroy();
                resolve(false);
            });
        });
    }

    public validateAssets(): boolean {
        const webDist = this.getWebDistPath();
        if (!fs.existsSync(webDist)) {
            return false;
        }

        const indexPath = path.join(webDist, 'index.html');
        if (!fs.existsSync(indexPath)) {
            return false;
        }

        return true;
    }

    public getUrl(): string {
        return `http://localhost:${this.port}`;
    }

    private createApp(): express.Express {
        const app = express();
        app.use(express.json());
        app.use('/api/files', filesRouter);

        const webDist = this.getWebDistPath();
        if (!fs.existsSync(webDist)) {
            throw new Error(`Web assets not found at ${webDist}. Run "npm run build:web" first.`);
        }
        app.use(express.static(webDist));

        app.get('/{*splat}', (_req: Request, res: Response) => {
            res.sendFile(path.join(webDist, 'index.html'));
        });

        return app;
    }

    private getWebDistPath(): string {
        return path.resolve(__dirname, '..', 'web');
    }

    private async checkPort(port: number): Promise<boolean> {
        return new Promise((resolve) => {
            const server = net.createServer();
            
            server.once('error', () => resolve(false));
            server.once('listening', () => {
                server.close(() => resolve(true));
            });
            
            server.listen(port);
        });
    }

    private async isOwnPort(port: number): Promise<boolean> {
        if (!this.isRunning()) {
            return false;
        }
        return this.port === port;
    }
}

export const webServerManager = WebServerManager.getInstance();
```

- [ ] **Step 2: Update src/server/index.ts to use WebServerManager**

```typescript
// src/server/index.ts
import { webServerManager } from './web-server-manager';

export function createServer(port: number = 3000): express.Express {
    return webServerManager['createApp']();
}

export async function startServer(port: number = 3000): Promise<void> {
    return webServerManager.start(port);
}

export async function stopServer(): Promise<void> {
    return webServerManager.stop();
}

export function isServerRunning(): boolean {
    return webServerManager.isRunning();
}

export function getServerStatus() {
    return webServerManager.getStatus();
}
```

- [ ] **Step 3: Run TypeScript compilation check**

Run: `npx tsc --noEmit`
Expected: No errors

- [ ] **Step 4: Commit**

```bash
git add src/server/web-server-manager.ts src/server/index.ts
git commit -m "feat: add WebServerManager singleton for server lifecycle"
```

---

## Task 2: Add Graceful Shutdown and Signal Handling

**Files:**
- Create: `src/server/graceful-shutdown.ts`
- Modify: `src/cli/index.ts`

- [ ] **Step 1: Create graceful shutdown handler**

```typescript
// src/server/graceful-shutdown.ts
import { webServerManager } from './web-server-manager';

let isShuttingDown = false;

export function setupGracefulShutdown(): void {
    const shutdown = async (signal: string) => {
        if (isShuttingDown) {
            return;
        }
        isShuttingDown = true;

        console.log(`\n${signal} received. Shutting down gracefully...`);

        try {
            if (webServerManager.isRunning()) {
                await webServerManager.stop();
            }
        } catch (err) {
            console.error('Error during shutdown:', err);
        }

        process.exit(0);
    };

    process.on('SIGINT', () => shutdown('SIGINT'));
    process.on('SIGTERM', () => shutdown('SIGTERM'));

    process.on('uncaughtException', (err) => {
        console.error('Uncaught Exception:', err);
        shutdown('uncaughtException');
    });

    process.on('unhandledRejection', (reason) => {
        console.error('Unhandled Rejection:', reason);
        shutdown('unhandledRejection');
    });
}
```

- [ ] **Step 2: Update CLI entry point to setup shutdown handlers**

```typescript
// src/cli/index.ts - Add at top of run() function
import { setupGracefulShutdown } from '../server/graceful-shutdown';

export async function run() {
    setupGracefulShutdown();
    
    const program = new Command();
    // ... rest of existing code
}
```

- [ ] **Step 3: Run TypeScript compilation check**

Run: `npx tsc --noEmit`
Expected: No errors

- [ ] **Step 4: Commit**

```bash
git add src/server/graceful-shutdown.ts src/cli/index.ts
git commit -m "feat: add graceful shutdown with SIGINT/SIGTERM handling"
```

---

## Task 3: Update /web Command Handler

**Files:**
- Modify: `src/cli/registry.ts`
- Modify: `src/cli/index.ts`

- [ ] **Step 1: Update registry.ts handler**

```typescript
// src/cli/registry.ts - Update /web command handler
import { webServerManager } from '../server/web-server-manager';

CommandRegistry.register({
    id: 'web',
    name: '/web',
    description: 'Inicia el cliente web e interactivo en el navegador.',
    category: 'Interfaz',
    aliases: ['web'],
    keywords: ['server', 'browser', 'gui'],
    handler: async (args, rl, keypressHandler) => {
        rl.pause();
        
        const port = 3000;
        
        if (webServerManager.isRunning()) {
            console.log(`\n✓ InvoiceFlow Web ya está ejecutándose.\n`);
            console.log(`URL:\nhttp://localhost:${port}\n`);
        } else {
            await webServerManager.start(port);
        }

        const openCmd = process.platform === 'darwin' ? 'open'
            : process.platform === 'win32' ? 'start'
            : 'xdg-open';
        exec(`${openCmd} http://localhost:${port}`, (err) => {
            if (err) {
                console.log('⚠ No se pudo abrir el navegador automáticamente.');
                console.log(`  Abre manualmente: http://localhost:${port}\n`);
            }
        });
    }
});
```

- [ ] **Step 2: Update cli/index.ts handler**

```typescript
// src/cli/index.ts - Update /web command handler
if (firstArg === '/web') {
    const { webServerManager } = await import('../server/web-server-manager');
    const port = 3000;
    
    if (webServerManager.isRunning()) {
        console.log(`\n✓ InvoiceFlow Web ya está ejecutándose.\n`);
        console.log(`URL:\nhttp://localhost:${port}\n`);
    } else {
        await webServerManager.start(port);
    }
    return;
}
```

- [ ] **Step 3: Run TypeScript compilation check**

Run: `npx tsc --noEmit`
Expected: No errors

- [ ] **Step 4: Commit**

```bash
git add src/cli/registry.ts src/cli/index.ts
git commit -m "feat: update /web command to use WebServerManager"
```

---

## Task 4: Verify Frontend Rendering

**Files:**
- Verify: `dist/web/index.html`
- Verify: `dist/web/assets/`
- Test: Run server and check rendering

- [ ] **Step 1: Verify build output exists**

Run: `ls -la dist/web/ && ls -la dist/web/assets/`
Expected: index.html and JS/CSS bundles exist

- [ ] **Step 2: Start server and test manually**

Run: `npm start` then type `/web`
Expected: Server starts, browser opens, frontend renders correctly

- [ ] **Step 3: Check for any rendering issues**

- Verify all CSS loads
- Verify all JS loads
- Verify React app mounts
- Verify API calls work

- [ ] **Step 4: Commit (if any fixes needed)**

```bash
git add -A
git commit -m "fix: ensure frontend renders correctly"
```

---

## Task 5: Full Build and Test

**Files:**
- All modified files

- [ ] **Step 1: Clean and rebuild**

Run: `npm run rebuild`
Expected: Build completes successfully

- [ ] **Step 2: Test CLI invocation**

Run: `./dist/index.js /web`
Expected: Server starts, shows URL, serves frontend

- [ ] **Step 3: Test multiple invocations**

Run `./dist/index.js /web` twice
Expected: Second invocation shows "already running" message

- [ ] **Step 4: Test graceful shutdown**

Press Ctrl+C while server is running
Expected: Clean shutdown message, process exits

- [ ] **Step 5: Final commit**

```bash
git add -A
git commit -m "feat: complete web server lifecycle management"
```
