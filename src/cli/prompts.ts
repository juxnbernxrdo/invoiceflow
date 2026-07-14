import prompts from 'prompts';
import { MODULES, ModuleDefinition } from '../core/modules';

export async function promptModule(): Promise<ModuleDefinition> {
    const response = await (prompts as any)({
        type: 'select',
        name: 'module',
        message: 'Selecciona el módulo',
        choices: MODULES.map(m => ({
            title: `${m.icon} ${m.name}`,
            description: m.description,
            value: m.id,
        })),
        initial: 0,
        pointer: '>',
    });
    
    const moduleId = response.module || 'facturas';
    return MODULES.find(m => m.id === moduleId) || MODULES[0];
}

export async function promptTipoGasto(): Promise<string> {
    const response = await (prompts as any)({
        type: 'select',
        name: 'tipo',
        message: 'Tipo de gasto',
        choices: [
            { title: 'EMPRESARIAL', value: 'EMPRESARIAL' },
            { title: 'PERSONAL', value: 'PERSONAL' },
        ],
        initial: 0,
        pointer: '>',
    });
    return response.tipo || 'EMPRESARIAL';
}

export async function promptOutputName(defaultName: string = 'FACTURAS ELECTRÓNICAS'): Promise<string> {
    const response = await prompts({
        type: 'text',
        name: 'name',
        message: 'Nombre del archivo de salida:',
        initial: defaultName,
        validate: (value: string) => {
            const cleaned = value.replace(/\.xlsx$/i, '').trim();
            if (!cleaned) return 'El nombre no puede estar vacío';
            if (/[\/\\]/.test(cleaned)) return 'El nombre no puede contener / o \\';
            return true;
        },
    });
    const name = (response.name || defaultName).trim();
    return name.endsWith('.xlsx') ? name : name + '.xlsx';
}

export function getSuggestionForError(errorMessage: string): string {
    const lowerError = errorMessage.toLowerCase();

    if (lowerError.includes('no existe') || lowerError.includes('enoent')) {
        return 'Verifica que la ruta del archivo sea correcta y que el archivo exista.';
    }
    if (lowerError.includes('permiso') || lowerError.includes('eacces')) {
        return 'Verifica los permisos de lectura del archivo.';
    }
    if (lowerError.includes('zip') || lowerError.includes('central directory')) {
        return 'El archivo podría estar corrupto. Intenta abrirlo en Excel y guárdalo nuevamente.';
    }
    if (lowerError.includes('formato') || lowerError.includes('invalid')) {
        return 'Asegúrate de usar archivos Excel (.xlsx o .xls) válidos.';
    }
    if (lowerError.includes('xlrdfssheet')) {
        return 'El archivo podría tener hojas protegidas o formato incompatible. Prueba guardarlo como .xlsx.';
    }

    return 'Si el problema persiste, intenta con otro archivo o verifica que el archivo no esté dañado.';
}
