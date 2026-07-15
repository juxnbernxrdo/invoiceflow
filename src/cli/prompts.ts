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
    if (lowerError.includes('no se pudo procesar ninguna fila')) {
        return 'El archivo no contiene filas válidas para procesar. Verifica el formato del archivo.';
    }
    if (lowerError.includes('razón social no puede estar vacía')) {
        return 'Hay filas con la razón social vacía. Verifica que el archivo tenga los datos completos.';
    }
    if (lowerError.includes('número de factura no puede estar vacío')) {
        return 'Hay filas sin número de factura asociado. Esto puede ocurrir en retenciones directas sin factura.';
    }
    if (lowerError.includes('fila') && lowerError.includes('inválida')) {
        return 'Una o más filas tienen datos inválidos. Revisa el archivo en Excel y verifica los datos.';
    }
    if (lowerError.includes('no tiene el formato esperado')) {
        return 'El archivo no tiene las columnas requeridas. Asegúrate de usar un archivo de retenciones del SRI.';
    }

    return 'Si el problema persiste, intenta con otro archivo o verifica que el archivo no esté dañado.';
}
