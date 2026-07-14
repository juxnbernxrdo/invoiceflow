import * as fs from 'fs';
import * as path from 'path';
import * as readline from 'readline';
import prompts from 'prompts';
import { CommandRegistry } from './registry';

const QUICK_HELP = `
Escribe / para abrir la Command Palette interactiva.
Escribe @ para seleccionar archivos Excel.
`;

interface FileItem {
    name: string;
    relativePath: string;
    size: string;
    modified: string;
}

function getExcelFiles(): FileItem[] {
    const list: FileItem[] = [];
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
                            size: `${(subStats.size / 1024).toFixed(1)} KB`,
                            modified: subStats.mtime.toISOString().slice(0, 19).replace('T', ' ')
                        });
                    }
                }
            } else if (stats.isFile() && (file.endsWith('.xlsx') || file.endsWith('.xls'))) {
                const relPath = path.relative(process.cwd(), fullPath);
                list.push({
                    name: file,
                    relativePath: relPath.startsWith('.') ? relPath : `./${relPath}`,
                    size: `${(stats.size / 1024).toFixed(1)} KB`,
                    modified: stats.mtime.toISOString().slice(0, 19).replace('T', ' ')
                });
            }
        }
    } catch {}
    return list;
}

async function openFileSelector(rl: readline.Interface, keypressHandler: any): Promise<void> {
    process.stdin.off('keypress', keypressHandler);
    rl.pause();
    if (process.stdin.isTTY) {
        process.stdin.setRawMode(false);
    }

    try {
        process.stdout.write('\b \b');

        const excelFiles = getExcelFiles();
        if (excelFiles.length === 0) {
            console.log('⚠ No se encontraron archivos Excel en el directorio actual.');
            return;
        }

        console.log('\n  Archivos Excel disponibles:');

        const choices = [
            { title: 'Todos los archivos Excel', value: 'ALL_EXCEL_FILES' },
            ...excelFiles.map(f => ({
                title: f.name,
                description: `${f.relativePath} | ${f.size}`,
                value: `@${f.relativePath}`
            }))
        ];

        const response = await (prompts as any)({
            type: 'autocompleteMultiselect',
            name: 'selected',
            message: 'Selecciona archivos',
            choices: choices,
            hint: 'Espacio para seleccionar, Enter para confirmar',
            pointer: '>',
            validate: (selected: any[]) => {
                if (!selected || selected.length === 0) {
                    return 'Debe seleccionar al menos un archivo para continuar.';
                }
                return true;
            }
        });

        if (response && response.selected && response.selected.length > 0) {
            let pathsToInsert = [];
            if (response.selected.includes('ALL_EXCEL_FILES')) {
                pathsToInsert = excelFiles.map(f => `@${f.relativePath}`);
            } else {
                pathsToInsert = response.selected;
            }

            const formattedPaths = pathsToInsert.join(' ') + ' ';
            rl.write(formattedPaths);
        }
    } catch {
    } finally {
        if (process.stdin.isTTY) {
            process.stdin.setRawMode(true);
        }
        process.stdin.on('keypress', keypressHandler);
        rl.resume();
        rl.prompt();
    }
}

function getHeader(): string {
    return `
      ██╗███╗   ██╗██╗   ██╗ ██████╗   InvoiceFlow CLI 1.0.3
      ╚═╝████╗  ██║██║   ██║██╔═══██╗  Excel Processing Platform
      ██╗██╔██╗ ██║██║   ██║██║   ██║  github.com/juxnbernxrdo/invoiceflow
      ██║██║╚██╗██║╚██████╔╝╚██████╔╝  ~
      ╚═╝╚═╝ ╚═══╝ ╚═════╝  ╚═════╝
`;
}

function getBoxDrawnHeader(): string {
    const width = Math.min(80, (process.stdout.columns || 80) - 2);
    const line = '─'.repeat(width);
    return `\r${line}\n`;
}

async function openCommandPalette(rl: readline.Interface, keypressHandler: any): Promise<void> {
    process.stdin.off('keypress', keypressHandler);
    rl.pause();

    const commands = CommandRegistry.getAllUnique();
    const choices = [
        ...commands.map(cmd => {
            const padName = cmd.name.padEnd(14);
            return {
                title: `${padName} ${cmd.description}`,
                value: cmd.name
            };
        }),
        {
            title: `${'@archivo.xlsx'.padEnd(14)} Abre el selector de archivos Excel interactivo.`,
            value: '@'
        }
    ];

    try {
        process.stdout.write(getBoxDrawnHeader());
        const response = await (prompts as any)({
            type: 'autocomplete',
            name: 'commandName',
            message: '>',
            choices: choices,
            hint: '↑/↓ Navigate · enter Select · esc Cancel',
            pointer: '>',
            suggest: (input: string, choices: any[]) => {
                const search = input.toLowerCase().trim();
                if (!search || search === '/') return Promise.resolve(choices);

                const scored = choices.map((choice: any) => {
                    if (choice.value === '@') {
                        const target = '@archivo.xlsx abre el selector de archivos excel interactivo';
                        const score = target.includes(search) ? 1 : 0;
                        return { choice, score };
                    }

                    const cmd = CommandRegistry.get(choice.value);
                    if (!cmd) return { choice, score: 0 };

                    let score = 0;
                    const name = cmd.name.toLowerCase();
                    const desc = cmd.description.toLowerCase();
                    const keywords = cmd.keywords?.map(k => k.toLowerCase()) || [];

                    // Exact prefix or match gets highest priority
                    if (name === `/${search}` || name === search) {
                        score += 100;
                    } else if (name.startsWith(`/${search}`) || name.startsWith(search)) {
                        score += 50;
                    } else if (name.includes(search)) {
                        score += 20;
                    }

                    // Keyword matching
                    if (keywords.includes(search)) {
                        score += 30;
                    } else if (keywords.some(k => k.includes(search))) {
                        score += 10;
                    }

                    // Description matching
                    if (desc.includes(search)) {
                        score += 5;
                    }

                    return { choice, score };
                });

                const filtered = scored
                    .filter((item: any) => item.score > 0)
                    .sort((a: any, b: any) => b.score - a.score)
                    .map((item: any) => item.choice);

                return Promise.resolve(filtered);
            }
        });

        if (response && response.commandName) {
            if (response.commandName === '/help') {
                await openCommandPalette(rl, keypressHandler);
                return;
            }
            if (response.commandName === '@') {
                await openFileSelector(rl, keypressHandler);
                return;
            }
            const cmd = CommandRegistry.get(response.commandName);
            if (cmd) {
                console.log(`\nEjecutando: ${cmd.name}\n`);
                process.stdin.off('keypress', keypressHandler);
                // Pause and mute readline completely to prevent it from intercepting input
                rl.pause();
                const wasRaw = process.stdin.isRaw;
                if (process.stdin.isTTY) {
                    process.stdin.setRawMode(false);
                }
                try {
                    await cmd.handler([], rl, keypressHandler);
                } catch (err: any) {
                    console.error(`Error al ejecutar comando ${cmd.name}:`, err.message || err);
                }
                
                // Restore state after command execution
                if (process.stdin.isTTY) {
                    process.stdin.setRawMode(true);
                }
                process.stdin.on('keypress', keypressHandler);
                rl.resume();
                rl.prompt();
                return;
            }
        }
    } catch {
    }

    rl.resume();
    if (process.stdin.isTTY) {
        process.stdin.setRawMode(true);
    }
    process.stdin.on('keypress', keypressHandler);
    rl.prompt();
}

export async function startInteractiveMode(): Promise<void> {
    console.log(getHeader());

    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout,
        prompt: '> '
    });

    rl.prompt();

    readline.emitKeypressEvents(process.stdin);
    if (process.stdin.isTTY) {
        process.stdin.setRawMode(true);
    }

    let selectorOpen = false;
    let prevLine = '';

    const closeFileSelector = () => {
        selectorOpen = false;
    };

    const keypressHandler = (str: string, key: any) => {
        if (!key) { prevLine = (rl as any).line || ''; return; }

        const line = (rl as any).line || '';

        if (selectorOpen && (key.name === 'backspace' || key.name === 'delete')) {
            if (prevLine.includes('@') && !line.includes('@')) {
                prevLine = line;
                closeFileSelector();
                return;
            }
        }

        prevLine = line;

        if (!selectorOpen && (str === '@' || key.name === '@')) {
            openFileSelector(rl, keypressHandler);
            return;
        }

        if (!selectorOpen && str === '/' && (line === '' || line === '/')) {
            process.stdout.write('\b \b');
            rl.write(null, { ctrl: true, name: 'u' });
            openCommandPalette(rl, keypressHandler);
            return;
        }
    };

    process.stdin.on('keypress', keypressHandler);

    rl.on('line', async (line) => {
        const cleanLine = line.trim();
        if (!cleanLine) {
            rl.prompt();
            return;
        }

        if (cleanLine === '/' || cleanLine === '/help' || cleanLine === 'help') {
            await openCommandPalette(rl, keypressHandler);
            return;
        }

        const [cmdName, ...cmdArgs] = cleanLine.split(/\s+/);
        const command = CommandRegistry.get(cmdName);

        if (command) {
            try {
                process.stdin.off('keypress', keypressHandler);
                rl.pause();
                if (process.stdin.isTTY) {
                    process.stdin.setRawMode(false);
                }
                await command.handler(cmdArgs, rl, keypressHandler);
            } catch (err: any) {
                console.error(`Error al ejecutar comando ${cmdName}:`, err.message || err);
            } finally {
                if (process.stdin.isTTY) {
                    process.stdin.setRawMode(true);
                }
                process.stdin.on('keypress', keypressHandler);
                rl.resume();
                rl.prompt();
            }
            return;
        }

        // If the user inputs files without a command
        const tokens = cleanLine.split(/\s+/).filter(Boolean);
        const hasExcelFiles = tokens.some(t => t.endsWith('.xlsx') || t.endsWith('.xls') || t.startsWith('@'));
        if (hasExcelFiles) {
            console.log('⚠ Por favor escribe un comando primero (/facturas o /retenciones) seguido de los archivos.');
            console.log('Ejemplo: /facturas @archivo.xlsx\n');
        }

        rl.prompt();
    }).on('close', () => {
        console.log('\n¡Gracias por usar InvoiceFlow! ¡Hasta luego!\n');
        process.exit(0);
    });
}
