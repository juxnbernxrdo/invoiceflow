import { Router, Request, Response } from 'express';
import multer from 'multer';
import * as path from 'path';
import * as fs from 'fs';
import * as os from 'os';
import { addFile, getFile, getAllFiles, removeFile, updateFile, getStore } from '../store';
import { processFile } from '../../core/processor';

const router = Router();
const upload = multer({
    dest: path.join(os.tmpdir(), 'invoiceflow-uploads'),
    limits: { fileSize: 50 * 1024 * 1024 },
    fileFilter: (_req, file, cb) => {
        const ext = path.extname(file.originalname).toLowerCase();
        if (ext === '.xlsx' || ext === '.xls') {
            cb(null, true);
        } else {
            cb(new Error('Solo se permiten archivos .xlsx o .xls'));
        }
    }
});

function generateId(): string {
    return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

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
            const id = generateId();
            // Preserve original extension for transformer (.xls vs .xlsx detection)
            const ext = path.extname(file.originalname).toLowerCase();
            const tempDir = path.dirname(file.path);
            const newPath = path.join(tempDir, id + ext);
            fs.renameSync(file.path, newPath);
            addFile(id, {
                id,
                originalName: file.originalname,
                status: 'pending',
                createdAt: Date.now(),
            }, newPath);
            results.push({ id, originalName: file.originalname });
        }

        res.json({ files: results, tipoGasto });
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
});

router.get('/', (_req: Request, res: Response) => {
    res.json({ files: getAllFiles() });
});

router.get('/:id', (req: Request, res: Response) => {
    const id = req.params.id as string;
    const file = getFile(id);
    if (!file) { res.status(404).json({ error: 'No encontrado' }); return; }
    res.json(file);
});

router.delete('/:id', (req: Request, res: Response) => {
    const id = req.params.id as string;
    const removed = removeFile(id);
    if (!removed) { res.status(404).json({ error: 'No encontrado' }); return; }
    res.json({ ok: true });
});

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

        res.json({ results });
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
});

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

export default router;
