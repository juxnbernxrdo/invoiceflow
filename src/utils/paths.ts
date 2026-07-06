import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

export function resolvePath(inputPath: string): string {
    let resolved = inputPath;
    
    // Expand ~ to user home directory
    if (resolved.startsWith('~')) {
        resolved = path.join(os.homedir(), resolved.slice(1));
    }
    
    return path.resolve(process.cwd(), resolved);
}

export interface PathValidation {
    isValid: boolean;
    error?: string;
    resolvedPath?: string;
}

export function validateFilePath(inputPath: string): PathValidation {
    try {
        const resolved = resolvePath(inputPath);
        
        if (!fs.existsSync(resolved)) {
            return { isValid: false, error: 'El archivo no existe.' };
        }
        
        const stats = fs.statSync(resolved);
        if (!stats.isFile()) {
            return { isValid: false, error: 'La ruta no corresponde a un archivo.' };
        }
        
        // Check read permissions
        try {
            fs.accessSync(resolved, fs.constants.R_OK);
        } catch {
            return { isValid: false, error: 'No se tienen permisos de lectura para este archivo.' };
        }
        
        return { isValid: true, resolvedPath: resolved };
    } catch (err: any) {
        return { isValid: false, error: err.message || 'Error al validar la ruta.' };
    }
}
