import { webServerManager, WebServerManager } from './web-server-manager';
import express from 'express';
import { Request, Response } from 'express';
import path from 'path';
import fs from 'fs';
import filesRouter from './routes/files';

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
