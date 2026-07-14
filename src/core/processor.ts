import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { ExcelTransformer } from '../transformer';
import { TransformOptions, TransformStats, ProgressCallback } from './types';
import { generateId } from '../utils/id';

export interface ProcessResult {
    id: string;
    originalName: string;
    outputPath: string;
    stats: TransformStats;
    module?: string;
}

export async function processFile(
    inputPath: string,
    options: TransformOptions,
    jobId?: string,
    onProgress?: ProgressCallback
): Promise<ProcessResult> {
    const originalName = path.basename(inputPath);
    const outputDir = path.join(os.tmpdir(), 'invoiceflow');
    if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true });

    const uniqueId = jobId || generateId();
    const outputPath = path.join(outputDir, uniqueId + '.xlsx');

    const transformer = new ExcelTransformer(
        () => {},
        onProgress
    );

    const stats = await transformer.transform(inputPath, outputPath, options);

    return {
        id: uniqueId,
        originalName,
        outputPath,
        stats,
        module: options.module || 'facturas',
    };
}

export async function processFiles(
    inputPaths: string[],
    options: TransformOptions,
    onFileProgress?: (index: number, total: number, progress: ProgressCallback) => void
): Promise<ProcessResult[]> {
    const results: ProcessResult[] = [];
    for (let i = 0; i < inputPaths.length; i++) {
        const result = await processFile(inputPaths[i], options, undefined, (cur, total, msg) => {
            if (onFileProgress) {
                onFileProgress(i, inputPaths.length, (c, t, m) => {});
            }
        });
        results.push(result);
    }
    return results;
}
