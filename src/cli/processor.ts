import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { ExcelTransformer } from '../transformer';
import { validateFilePath } from '../utils/paths';
import { createProgressBar } from './progress';
import { getSuggestionForError } from './prompts';

export async function processFiles(
    filePaths: string[],
    moduleId: string,
    tipoGasto: string | undefined,
    outputName: string
): Promise<boolean> {
    const resolvedFiles: { original: string; resolved: string; isValid: boolean; error?: string }[] = [];

    for (const rawPath of filePaths) {
        let cleanPath = rawPath.startsWith('@') ? rawPath.slice(1) : rawPath;
        if (!cleanPath) continue;

        if (cleanPath.startsWith('~')) {
            cleanPath = path.join(os.homedir(), cleanPath.slice(1));
        }

        const validation = validateFilePath(cleanPath);
        resolvedFiles.push({
            original: rawPath,
            resolved: validation.resolvedPath || cleanPath,
            isValid: validation.isValid,
            error: validation.error
        });
    }

    if (resolvedFiles.length === 0) {
        console.log('⚠ No se seleccionaron archivos para procesar.');
        return false;
    }

    const progressBar = createProgressBar();
    const processedSuccessfully: string[] = [];
    const skippedFiles: { path: string; reason: string }[] = [];

    for (let idx = 0; idx < resolvedFiles.length; idx++) {
        const { original, resolved, isValid, error } = resolvedFiles[idx];

        if (!isValid) {
            console.log(`⚠ ${original}: ${getSuggestionForError(error || '')}`);
            skippedFiles.push({ path: original, reason: error || 'Archivo inválido' });
            continue;
        }

        const inputDir = path.dirname(resolved);
        const outPath = path.join(inputDir, outputName);

        progressBar.start(100, 0, { filename: path.basename(original) });

        try {
            const transformer = new ExcelTransformer(
                () => {},
                (current, total) => {
                    progressBar.update(Math.round((current / total) * 100));
                }
            );
            await transformer.transform(resolved, outPath, { tipoGasto, module: moduleId });
            
            progressBar.update(100);
            progressBar.stop();
            console.log(`✔ ${path.basename(original)} → ${path.basename(outPath)}`);
            processedSuccessfully.push(original);
        } catch (err: any) {
            progressBar.stop();
            console.log(`✘ ${original}: ${getSuggestionForError(err.message)}`);
            if (fs.existsSync(outPath)) {
                try { fs.unlinkSync(outPath); } catch {}
            }
            skippedFiles.push({ path: original, reason: err.message });
        }
    }

    if (resolvedFiles.length > 1) {
        console.log('');
        if (processedSuccessfully.length > 0) {
            console.log(`${processedSuccessfully.length} archivo(s) procesado(s)`);
        }
        if (skippedFiles.length > 0) {
            console.log(`${skippedFiles.length} archivo(s) omitido(s)`);
        }
    }

    return processedSuccessfully.length > 0;
}
