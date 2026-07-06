import express from 'express';
import path from 'path';
import filesRouter from './routes/files';

export function createServer(port: number = 3000): express.Express {
    const app = express();

    app.use(express.json());
    app.use('/api/files', filesRouter);

    const webDist = path.join(__dirname, '..', '..', 'src', 'web', 'dist');
    app.use(express.static(webDist));

    app.get('/{*splat}', (_req, res) => {
        res.sendFile(path.join(webDist, 'index.html'));
    });

    return app;
}

export function startServer(port: number = 3000): Promise<void> {
    return new Promise((resolve) => {
        const app = createServer(port);
        app.listen(port, () => {
            console.log(`\n  InvoiceFlow web iniciado en http://localhost:${port}\n`);
            resolve();
        });
    });
}
