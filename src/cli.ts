import { Command } from 'commander';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import * as readline from 'readline';
import { exec } from 'child_process';
import chalk from 'chalk';
import prompts from 'prompts';
import * as cliProgress from 'cli-progress';
import { ExcelTransformer } from './transformer';
import { resolvePath, validateFilePath } from './utils/paths';
import { applyGradient } from './utils/gradient';

// Exact ASCII Art banner requested by the user
const ASCII_ART = `╔════════════════════════════════════════════════════════════╗
║                                                            ║
║   ██╗███╗   ██╗██╗   ██╗ ██████╗ ██╗ ██████╗███████╗       ║
║   ██║████╗  ██║██║   ██║██╔═══██╗██║██╔════╝██╔════╝       ║
║   ██║██╔██╗ ██║██║   ██║██║   ██║██║██║     █████╗         ║
║   ██║██║╚██╗██║╚██╗ ██╔╝██║   ██║██║██║     ██╔══╝         ║
║   ██║██║ ╚████║ ╚████╔╝ ╚██████╔╝██║╚██████╗███████╗       ║
║   ╚═╝╚═╝  ╚═══╝  ╚═══╝   ╚═════╝ ╚═╝ ╚═════╝╚══════╝       ║
║                                                            ║
║                       invo CLI                            ║
║                                                            ║
╚════════════════════════════════════════════════════════════╝`;

const QUICK_HELP = `
Escribe @ para seleccionar archivos Excel

  @            Buscar archivos
  @ruta        Abrir archivo específico
  /web         Iniciar cliente web
  /quit        Salir
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

export function getUniqueOutputPath(inputDir: string, index: number, customName?: string): string {
    let baseName: string;
    if (customName) {
        const sanitized = customName.replace(/[/\\]/g, '');
        baseName = sanitized.endsWith('.xlsx') ? sanitized : sanitized + '.xlsx';
    } else {
        baseName = 'FACTURAS ELECTRÓNICAS.xlsx';
    }

    if (index === 0) {
        const attempt = path.join(inputDir, baseName);
        if (!fs.existsSync(attempt)) {
            return attempt;
        }
    }
    const withoutExt = baseName.replace(/\.xlsx$/i, '');
    let i = index === 0 ? 1 : index;
    while (true) {
        const attempt = path.join(inputDir, `${withoutExt} (${i}).xlsx`);
        if (!fs.existsSync(attempt)) {
            return attempt;
        }
        i++;
    }
}

function createProgressBar(): cliProgress.SingleBar {
    return new cliProgress.SingleBar({
        format: '  {bar} | {percentage}% | {value}/{total} | {filename}',
        barCompleteChar: '\u2588',
        barIncompleteChar: '\u2591',
        hideCursor: true,
        clearOnComplete: false,
        stopOnComplete: true,
        gracefulExit: true
    });
}

function getSuggestionForError(errorMessage: string): string {
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

async function processFiles(
    filePaths: string[],
    tipoGasto?: string,
    outputNames?: Map<number, string>
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
        console.log(chalk.yellow('No se seleccionaron archivos para procesar.'));
        return false;
    }

    const progressBar = createProgressBar();
    const processedSuccessfully: string[] = [];
    const skippedFiles: { path: string; reason: string }[] = [];

    for (let idx = 0; idx < resolvedFiles.length; idx++) {
        const { original, resolved, isValid, error } = resolvedFiles[idx];

        if (!isValid) {
            console.log(chalk.yellow(`  ⚠ ${original}: ${getSuggestionForError(error || '')}`));
            skippedFiles.push({ path: original, reason: error || 'Archivo inválido' });
            continue;
        }

        const inputDir = path.dirname(resolved);
        const customName = outputNames?.get(idx);
        const outPath = getUniqueOutputPath(inputDir, idx, customName);

        progressBar.start(100, 0, { filename: path.basename(original) });

        const transformer = new ExcelTransformer(
            () => {},
            (current, total) => {
                progressBar.update(Math.round((current / total) * 100));
            }
        );

        try {
            await transformer.transform(resolved, outPath, { tipoGasto });
            progressBar.update(100);
            progressBar.stop();
            console.log(chalk.green(`  ✔ ${path.basename(original)} → ${path.basename(outPath)}`));
            processedSuccessfully.push(original);
        } catch (err: any) {
            progressBar.stop();
            console.log(chalk.red(`  ✘ ${original}: ${getSuggestionForError(err.message)}`));
            if (fs.existsSync(outPath)) {
                try { fs.unlinkSync(outPath); } catch {}
            }
            skippedFiles.push({ path: original, reason: err.message });
        }
    }

    if (resolvedFiles.length > 1) {
        console.log('');
        if (processedSuccessfully.length > 0) {
            console.log(chalk.green(`  ${processedSuccessfully.length} archivo(s) procesado(s)`));
        }
        if (skippedFiles.length > 0) {
            console.log(chalk.red(`  ${skippedFiles.length} archivo(s) omitido(s)`));
        }
    }

    return processedSuccessfully.length > 0;
}

export async function run() {
    const program = new Command();

    const bannerString = applyGradient(ASCII_ART);

    program
        .name('invo')
        .description('Transformar archivos Excel mediante instrucciones predefinidas.')
        .version('1.0.3')
        .option('--tipo-gasto <value>', 'Tipo de gasto para la columna TIPO GASTO (default: EMPRESARIAL)')
        .option('--output-name <name>', 'Nombre personalizado para el archivo de salida')
        .argument('[files...]', 'Archivos Excel a transformar')
        .action(async (files: string[], options: { tipoGasto?: string; outputName?: string }) => {
            if (files && files.length > 0) {
                // Command line mode (Banner only once)
                console.log(bannerString);

                let outputNames: Map<number, string> | undefined;

                // If --output-name provided with multiple files, prompt for each name
                if (options.outputName && files.length > 1) {
                    console.log(chalk.cyan('\n  Archivos a procesar:'));
                    files.forEach((f, i) => console.log(chalk.white(`    ${i + 1}. ${path.basename(f)}`)));
                    console.log('');

                    outputNames = new Map();
                    for (let i = 0; i < files.length; i++) {
                        const response = await prompts({
                            type: 'text',
                            name: 'name',
                            message: `Nombre de salida para ${path.basename(files[i])}:`,
                            initial: options.outputName,
                        });
                        if (response.name && response.name.trim()) {
                            outputNames.set(i, response.name.trim());
                        }
                    }
                } else if (options.outputName && files.length === 1) {
                    outputNames = new Map();
                    outputNames.set(0, options.outputName);
                }

                await processFiles(files, options.tipoGasto, outputNames);
            } else {
                // Interactive Mode (Banner only once)
                console.log(bannerString);
                console.log(QUICK_HELP);

                const rl = readline.createInterface({
                    input: process.stdin,
                    output: process.stdout,
                    prompt: '> '
                });

                rl.prompt();

                // Listen to keypresses to detect '@' immediately
                readline.emitKeypressEvents(process.stdin);
                if (process.stdin.isTTY) {
                    process.stdin.setRawMode(true);
                }

                let selectorOpen = false;
                let selectorAbort: (() => void) | null = null;
                let prevLine = '';
                let tipoGastoValue: string | undefined = options.tipoGasto;

                const ensureStdinFlowing = () => {
                    if (process.stdin.isTTY && process.stdin.readable) {
                        process.stdin.resume();
                    }
                };

                const restoreStdinForKeypress = () => {
                    ensureStdinFlowing();
                    readline.emitKeypressEvents(process.stdin);
                    if (process.stdin.isTTY) {
                        process.stdin.setRawMode(true);
                    }
                };

                const closeFileSelector = () => {
                    selectorOpen = false;
                    if (selectorAbort) {
                        selectorAbort();
                        selectorAbort = null;
                    }
                };

                const openFileSelector = async () => {
                    selectorOpen = true;
                    rl.pause();

                    try {
                        process.stdout.write('\b \b');

                        const excelFiles = getExcelFiles();
                        if (excelFiles.length === 0) {
                            console.log(chalk.yellow('\n  No se encontraron archivos Excel en el directorio actual.'));
                            return;
                        }

                        console.log(chalk.cyan('\n  Archivos Excel disponibles:'));

                        const choices = [
                            { title: 'Todos los archivos Excel', value: 'ALL_EXCEL_FILES' },
                            ...excelFiles.map(f => ({
                                title: f.name,
                                description: `${f.relativePath} | ${f.size}`,
                                value: `@${f.relativePath}`
                            }))
                        ];

                        let cancelled = false;
                        const response = await new Promise<any>((resolve) => {
                            selectorAbort = () => {
                                cancelled = true;
                                resolve({ selected: [] });
                            };
                            prompts({
                                type: 'autocompleteMultiselect',
                                name: 'selected',
                                message: 'Selecciona archivos',
                                choices: choices,
                                hint: 'Espacio para seleccionar, Enter para confirmar'
                            }).then(resolve).catch(() => resolve({ selected: [] }));
                        });

                        if (!cancelled && response && response.selected && response.selected.length > 0) {
                            let pathsToInsert = [];
                            if (response.selected.includes('ALL_EXCEL_FILES')) {
                                pathsToInsert = excelFiles.map(f => `@${f.relativePath}`);
                            } else {
                                pathsToInsert = response.selected;
                            }

                            // Prompt for tipo gasto if not provided via CLI flag
                            if (!tipoGastoValue) {
                                const tipoResponse = await prompts({
                                    type: 'select',
                                    name: 'tipo',
                                    message: 'Tipo de gasto',
                                    choices: [
                                        { title: 'EMPRESARIAL', value: 'EMPRESARIAL' },
                                        { title: 'PERSONAL', value: 'PERSONAL' },
                                    ],
                                    initial: 0,
                                });
                                if (tipoResponse.tipo) {
                                    tipoGastoValue = tipoResponse.tipo;
                                }
                            }

                            const formattedPaths = pathsToInsert.join(' ') + ' ';
                            rl.write(formattedPaths);
                        }
                    } catch {
                    } finally {
                        selectorAbort = null;
                        rl.resume();
                        restoreStdinForKeypress();
                        rl.prompt();
                        selectorOpen = false;
                    }
                };

                // Single listener: handles both open (@ typed) and close (@ removed).
                // When backspace/delete fires, readline has already updated the line
                // BEFORE the keypress event, so prevLine vs line correctly detects
                // whether '@' was removed.
                process.stdin.on('keypress', async (str, key) => {
                    if (!key) { prevLine = (rl as any).line || ''; return; }

                    const line = (rl as any).line || '';

                    // Detect @ removal: prevLine had @, current line does not
                    if (selectorOpen && (key.name === 'backspace' || key.name === 'delete')) {
                        if (prevLine.includes('@') && !line.includes('@')) {
                            prevLine = line;
                            closeFileSelector();
                            return;
                        }
                    }

                    prevLine = line;

                    // Detect @ addition: only when selector is not already open
                    if (!selectorOpen && (str === '@' || key.name === '@')) {
                        await openFileSelector();
                    }
                });

                rl.on('line', async (line) => {
                    const cleanLine = line.trim();
                    if (!cleanLine) {
                        rl.prompt();
                        return;
                    }

                    // Global commands to exit safely
                    if (
                        cleanLine === '/quit' || 
                        cleanLine === 'exit' || 
                        cleanLine === 'quit' || 
                        cleanLine === '/exit'
                    ) {
                        rl.close();
                        return;
                    }

                    // Start web server
                    if (cleanLine === '/web') {
                        rl.pause();
                        const { startServer } = require('./server/index');
                        const port = 3000;
                        const url = `http://localhost:${port}`;
                        console.log(chalk.cyan(`\n  Iniciando InvoiceFlow web en ${url}...`));
                        await startServer(port);

                        const openCmd = process.platform === 'darwin' ? 'open'
                            : process.platform === 'win32' ? 'start'
                            : 'xdg-open';
                        exec(`${openCmd} ${url}`, (err) => {
                            if (err) {
                                console.log(chalk.yellow(`\n  No se pudo abrir el navegador automáticamente.`));
                                console.log(chalk.white(`  Abre manualmente: ${chalk.cyan(url)}\n`));
                            }
                        });
                        return;
                    }

                    // Parse inputs (split by spaces, considering path strings)
                    const tokens = cleanLine.split(/\s+/).filter(Boolean);

                    // If processing files and no tipo gasto was selected yet, prompt for it
                    const hasExcelFiles = tokens.some(t => t.endsWith('.xlsx') || t.endsWith('.xls'));
                    if (hasExcelFiles && !tipoGastoValue) {
                        rl.pause();
                        const tipoResponse = await prompts({
                            type: 'select',
                            name: 'tipo',
                            message: 'Tipo de gasto',
                            choices: [
                                { title: 'EMPRESARIAL', value: 'EMPRESARIAL' },
                                { title: 'PERSONAL', value: 'PERSONAL' },
                            ],
                            initial: 0,
                        });
                        if (tipoResponse.tipo) {
                            tipoGastoValue = tipoResponse.tipo;
                        }
                        rl.resume();
                        restoreStdinForKeypress();
                    }

                    rl.pause();
                    await processFiles(tokens, tipoGastoValue);
                    rl.resume();
                    restoreStdinForKeypress();
                    rl.prompt();
                }).on('close', () => {
                    console.log(chalk.green('\n¡Gracias por usar invo! ¡Hasta luego!\n'));
                    process.exit(0);
                });
            }
        });

    program.parse(process.argv);
}
