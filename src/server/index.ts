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
