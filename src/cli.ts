import { Command } from 'commander';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import * as readline from 'readline';
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
║                     InvoiceFlow CLI                        ║
║                                                            ║
╚════════════════════════════════════════════════════════════╝`;

const QUICK_HELP = `
Seleccione uno o varios archivos Excel escribiendo @

Comandos disponibles

  @            Buscar archivos Excel
  @ruta        Abrir un archivo específico
  /quit        Salir de InvoiceFlow CLI

Ejemplos

  @facturas.xlsx
  @enero.xlsx @febrero.xlsx
  @./reportes/facturas.xlsx
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

export function getUniqueOutputPath(inputDir: string, index: number): string {
    const baseName = 'FACTURAS ELECTRÓNICAS.xlsx';
    if (index === 0) {
        const attempt = path.join(inputDir, baseName);
        if (!fs.existsSync(attempt)) {
            return attempt;
        }
    }
    let i = index === 0 ? 1 : index;
    while (true) {
        const attempt = path.join(inputDir, `FACTURAS ELECTRÓNICAS (${i}).xlsx`);
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

async function processFiles(filePaths: string[]): Promise<boolean> {
    const resolvedFiles: { original: string; resolved: string; isValid: boolean; error?: string }[] = [];
    
    for (const rawPath of filePaths) {
        let cleanPath = rawPath.startsWith('@') ? rawPath.slice(1) : rawPath;
        if (!cleanPath) continue;

        // Support home directory expansion
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

    // Process each file
    for (let idx = 0; idx < resolvedFiles.length; idx++) {
        const { original, resolved, isValid, error } = resolvedFiles[idx];

        if (!isValid) {
            console.log(chalk.yellow(`\n⚠ Omitiendo archivo inválido: ${original} - Razón: ${error}`));
            console.log(chalk.gray(`  💡 Sugerencia: ${getSuggestionForError(error || '')}`));
            skippedFiles.push({ path: original, reason: error || 'Archivo inválido' });
            continue;
        }

        const inputDir = path.dirname(resolved);
        const outPath = getUniqueOutputPath(inputDir, idx);

        console.log(chalk.cyan(`\nProcesando archivo ${idx + 1}/${resolvedFiles.length}: ${original}`));
        console.log(chalk.gray(`Destino de salida: ${outPath}`));

        // Iniciar barra de progreso
        progressBar.start(100, 0, { filename: path.basename(original) });

        const transformer = new ExcelTransformer(
            (msg) => {
                // La barra de progreso maneja la visualización
            },
            (current, total, message) => {
                const percentage = Math.round((current / total) * 100);
                progressBar.update(percentage, { filename: path.basename(original) });
            }
        );

        try {
            const stats = await transformer.transform(resolved, outPath);
            progressBar.update(100, { filename: path.basename(original) });
            progressBar.stop();

            console.log(chalk.green(`\n✔ ¡Transformación exitosa!`));
            console.log(chalk.gray(`- Columnas originales: ${stats.originalColumns}`));
            console.log(chalk.gray(`- Columnas finales: ${stats.finalColumns}`));
            console.log(chalk.gray(`- Columnas eliminadas: ${stats.deletedColumns.join(', ') || 'Ninguna'}`));
            if (stats.replacedColumns.length > 0) {
                console.log(chalk.gray(`- Columnas reemplazadas: ${stats.replacedColumns.map(r => `${r.red} -> ${r.green}`).join(', ')}`));
            }
            console.log(chalk.gray(`- Filas recalculadas (tarifa 0%): ${stats.recalculatedRows}`));
            console.log(chalk.green(`✔ Validación de integridad del archivo de salida superada.`));
            processedSuccessfully.push(original);
        } catch (err: any) {
            progressBar.stop();
            console.error(chalk.red(`\n❌ Error al procesar el archivo "${original}":`));
            console.error(chalk.red(`   Causa: ${err.message}`));
            console.log(chalk.gray(`  💡 Sugerencia: ${getSuggestionForError(err.message)}`));
            if (fs.existsSync(outPath)) {
                try {
                    fs.unlinkSync(outPath);
                } catch {}
            }
            skippedFiles.push({ path: original, reason: err.message });
        }
    }

    // Print final execution summary
    console.log(chalk.blue('\n============================================================='));
    console.log(chalk.bold('RESUMEN DE EJECUCIÓN:'));
    console.log(chalk.blue('-------------------------------------------------------------'));
    console.log(`Archivos procesados correctamente: ${chalk.green(processedSuccessfully.length)}`);
    if (processedSuccessfully.length > 0) {
        processedSuccessfully.forEach(f => console.log(`  ✓ ${chalk.green(f)}`));
    }
    console.log(`Archivos omitidos/fallidos: ${chalk.red(skippedFiles.length)}`);
    if (skippedFiles.length > 0) {
        skippedFiles.forEach(f => console.log(`  ❌ ${chalk.red(f.path)}: ${chalk.yellow(f.reason)}`));
    }
    console.log(chalk.blue('=============================================================\n'));

    return processedSuccessfully.length > 0;
}

export async function run() {
    const program = new Command();

    const bannerString = applyGradient(ASCII_ART);

    program
        .name('invoiceflow')
        .description('Transformar archivos Excel mediante instrucciones predefinidas.')
        .version('1.0.1')
        .argument('[files...]', 'Archivos Excel a transformar')
        .action(async (files: string[]) => {
            if (files && files.length > 0) {
                // Command line mode (Banner only once)
                console.log(bannerString);
                await processFiles(files);
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

                let handlingInteractiveSelector = false;

                const isAtKey = (str: string | undefined, key: { name?: string; ctrl?: boolean; meta?: boolean; shift?: boolean; }): boolean => {
                    return str === '@' || key?.name === '@';
                };

                const ensureStdinFlowing = () => {
                    // After rl.pause() and prompts library, stdin may not be in flowing
                    // state. Explicitly resume it so keypress events fire again.
                    if (process.stdin.isTTY && process.stdin.readable) {
                        process.stdin.resume();
                    }
                };

                const restoreStdinForKeypress = () => {
                    // After deep async operations (file processing, prompts library),
                    // stdin may lose its keypress transformation layer or enter a
                    // non-flowing state. Re-initialize everything to guarantee @ detection.
                    ensureStdinFlowing();
                    readline.emitKeypressEvents(process.stdin);
                    if (process.stdin.isTTY) {
                        process.stdin.setRawMode(true);
                    }
                };

                const openFileSelector = async () => {
                    handlingInteractiveSelector = true;

                    // Pause readline but keep stdin flowing for keypress detection.
                    // rl.pause() calls process.stdin.pause() which stops keypress
                    // events from firing — we must restore flowing state afterward.
                    rl.pause();

                    try {
                        // Clear the typed '@' from screen by writing backspace
                        process.stdout.write('\b \b');

                        const excelFiles = getExcelFiles();
                        if (excelFiles.length === 0) {
                            console.log(chalk.yellow('\n⚠ No se encontraron archivos Excel (.xlsx, .xls) en el directorio actual.'));
                            return;
                        }

                        console.log(chalk.cyan('\n🔍 Selector Inteligente de Archivos (Espacio para seleccionar, Enter para confirmar):'));

                        const choices = [
                            { title: '✨ Todos los archivos Excel', value: 'ALL_EXCEL_FILES' },
                            ...excelFiles.map(f => ({
                                title: `${f.name} (${f.relativePath})`,
                                description: `Tamaño: ${f.size} | Modificado: ${f.modified}`,
                                value: `@${f.relativePath}`
                            }))
                        ];

                        const response = await prompts({
                            type: 'autocompleteMultiselect',
                            name: 'selected',
                            message: 'Selecciona los archivos Excel',
                            choices: choices,
                            hint: '- Barra espaciadora para seleccionar. Enter para confirmar.'
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
                        // If prompts fails or is interrupted, ensure we recover
                    } finally {
                        // Restore readline first, then ensure stdin is flowing
                        // so that subsequent keypress events (@ detection) work.
                        rl.resume();
                        restoreStdinForKeypress();
                        rl.prompt();
                        handlingInteractiveSelector = false;
                    }
                };

                process.stdin.on('keypress', async (str, key) => {
                    if (handlingInteractiveSelector) return;

                    if (isAtKey(str, key)) {
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

                    // Parse inputs (split by spaces, considering path strings)
                    const tokens = cleanLine.split(/\s+/).filter(Boolean);
                    rl.pause();
                    await processFiles(tokens);
                    rl.resume();
                    restoreStdinForKeypress();
                    rl.prompt();
                }).on('close', () => {
                    console.log(chalk.green('\n¡Gracias por usar InvoiceFlow CLI! ¡Hasta luego!\n'));
                    process.exit(0);
                });
            }
        });

    program.parse(process.argv);
}
