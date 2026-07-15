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
            res.sendFile('index.html', { root: webDist });
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
