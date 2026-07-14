import { MODULES, getModuleById } from '../core/modules';
import prompts from 'prompts';
import { processFiles } from './processor';
import { promptTipoGasto, promptOutputName } from './prompts';
import { startServer } from '../server/index';
import { exec } from 'child_process';
import * as path from 'path';
import * as fs from 'fs';

export interface CLICommand {
    id: string;
    name: string;
    description: string;
    category: 'Procesamiento' | 'Interfaz' | 'Sistema';
    aliases?: string[];
    keywords?: string[];
    handler: (args: string[], rl: any, keypressHandler: any) => Promise<void>;
}

export class CommandRegistry {
    private static commands: Map<string, CLICommand> = new Map();

    public static register(command: CLICommand): void {
        this.commands.set(command.name, command);
        if (command.aliases) {
            for (const alias of command.aliases) {
                this.commands.set(alias, command);
            }
        }
    }

    public static get(name: string): CLICommand | undefined {
        return this.commands.get(name);
    }

    public static getAllUnique(): CLICommand[] {
        const unique = new Map<string, CLICommand>();
        for (const [key, cmd] of this.commands.entries()) {
            unique.set(cmd.id, cmd);
        }
        return Array.from(unique.values());
    }
}

// Register default commands
CommandRegistry.register({
    id: 'facturas',
    name: '/facturas',
    description: 'Procesa archivos de facturas electrónicas (26→12 columnas).',
    category: 'Procesamiento',
    aliases: ['facturas'],
    keywords: ['compras', 'gastos', 'procesar', 'factura'],
    handler: async (args, rl, keypressHandler) => {
        await handleModuleExecution('facturas', args, rl, keypressHandler);
    }
});

CommandRegistry.register({
    id: 'retenciones',
    name: '/retenciones',
    description: 'Procesa archivos de retenciones electrónicas (40→7 columnas).',
    category: 'Procesamiento',
    aliases: ['retenciones'],
    keywords: ['ventas', 'retencion', 'procesar', 'sri'],
    handler: async (args, rl, keypressHandler) => {
        await handleModuleExecution('retenciones', args, rl, keypressHandler);
    }
});

CommandRegistry.register({
    id: 'web',
    name: '/web',
    description: 'Inicia el cliente web e interactivo en el navegador.',
    category: 'Interfaz',
    aliases: ['web'],
    keywords: ['server', 'browser', 'gui'],
    handler: async (args, rl, keypressHandler) => {
        rl.pause();
        const port = 3000;
        const url = `http://localhost:${port}`;
        console.log(`\n  Iniciando InvoiceFlow web en ${url}...`);
        await startServer(port);

        const openCmd = process.platform === 'darwin' ? 'open'
            : process.platform === 'win32' ? 'start'
            : 'xdg-open';
        exec(`${openCmd} ${url}`, (err) => {
            if (err) {
                console.log('⚠ No se pudo abrir el navegador automáticamente.');
                console.log(`  Abre manualmente: ${url}\n`);
            }
        });
    }
});

CommandRegistry.register({
    id: 'help',
    name: '/help',
    description: 'Muestra la paleta de comandos interactiva.',
    category: 'Sistema',
    aliases: ['help', '/'],
    keywords: ['ayuda', 'comandos', 'palette'],
    handler: async (args, rl, keypressHandler) => {
        // Handled directly inside command palette launcher
    }
});

CommandRegistry.register({
    id: 'version',
    name: '/version',
    description: 'Muestra la versión instalada de InvoiceFlow.',
    category: 'Sistema',
    aliases: ['version'],
    keywords: ['info', 'build'],
    handler: async (args, rl, keypressHandler) => {
        console.log('InvoiceFlow version 1.0.3\n');
    }
});

CommandRegistry.register({
    id: 'exit',
    name: '/exit',
    description: 'Salir de la aplicación InvoiceFlow.',
    category: 'Sistema',
    aliases: ['exit', 'quit', '/quit', '/exit'],
    keywords: ['cerrar', 'salir', 'terminar'],
    handler: async (args, rl, keypressHandler) => {
        rl.close();
        process.exit(0);
    }
});

async function handleModuleExecution(moduleId: string, args: string[], rl: any, keypressHandler: any) {
    rl.pause();
    const module = getModuleById(moduleId)!;
    let tokens = args.map(t => t.startsWith('@') ? t.slice(1) : t);

    if (tokens.length === 0) {
        console.log(`\n  Iniciando flujo para ${module.name}.`);
        const excelFiles = getExcelFiles();
        if (excelFiles.length === 0) {
            console.log('⚠ No se encontraron archivos Excel en el directorio actual.');
            return;
        }

        const response = await (prompts as any)({
            type: 'autocompleteMultiselect',
            name: 'selected',
            message: 'Selecciona archivos a procesar',
            choices: excelFiles.map(f => ({
                title: f.name,
                description: `${f.relativePath} | ${f.size}`,
                value: f.relativePath
            })),
            pointer: '>',
            validate: (selected: any[]) => {
                if (!selected || selected.length === 0) {
                    return 'Debe seleccionar al menos un archivo para continuar.';
                }
                return true;
            }
        });

        if (!response.selected || response.selected.length === 0) {
            console.log('⚠ No se seleccionaron archivos.');
            return;
        }
        tokens = response.selected;
    }

    let tipoGasto: string | undefined;
    if (module.supportsTipoGasto) {
        tipoGasto = await promptTipoGasto();
    }

    if (tokens.length === 1) {
        const defaultOutputName = module.defaultOutputName;
        const outputName = await promptOutputName(defaultOutputName);
        await processFiles(tokens, module.id, tipoGasto, outputName);
    } else {
        for (let i = 0; i < tokens.length; i++) {
            const baseName = path.basename(tokens[i]).replace(/\.(xlsx?|xls)$/i, '');
            const defaultOutputName = `${module.defaultOutputName} ${baseName}`;
            const outputName = await promptOutputName(defaultOutputName);
            await processFiles([tokens[i]], module.id, tipoGasto, outputName);
        }
    }
}

function getExcelFiles() {
    const list: any[] = [];
    const searchDir = process.cwd();
    try {
        const files = fs.readdirSync(searchDir);
        for (const file of files) {
            if (file === 'node_modules' || file === '.git' || file === 'dist') continue;

            const fullPath = path.join(searchDir, file);
            const stats = fs.statSync(fullPath);

            if (stats.isDirectory()) {
                const subfiles = fs.readdirSync(fullPath);
                for (const sub of subfiles) {
                    const subFullPath = path.join(fullPath, sub);
                    const subStats = fs.statSync(subFullPath);
                    if (subStats.isFile() && (sub.endsWith('.xlsx') || sub.endsWith('.xls'))) {
                        const relPath = path.relative(process.cwd(), subFullPath);
                        list.push({
                            name: sub,
                            relativePath: relPath.startsWith('.') ? relPath : `./${relPath}`,
                            size: `${(subStats.size / 1024).toFixed(1)} KB`
                        });
                    }
                }
            } else if (stats.isFile() && (file.endsWith('.xlsx') || file.endsWith('.xls'))) {
                const relPath = path.relative(process.cwd(), fullPath);
                list.push({
                    name: file,
                    relativePath: relPath.startsWith('.') ? relPath : `./${relPath}`,
                    size: `${(stats.size / 1024).toFixed(1)} KB`
                });
            }
        }
    } catch {}
    return list;
}
