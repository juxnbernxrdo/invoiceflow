import { Command } from 'commander';
import * as path from 'path';
import { promptModule, promptTipoGasto, promptOutputName } from './prompts';
import { processFiles } from './processor';
import { startInteractiveMode } from './interactive';
import { MODULES } from '../core/modules';
import { startServer } from '../server/index';
import { CommandRegistry } from './registry';

function getHeader(): string {
    return `
      ██╗███╗   ██╗██╗   ██╗ ██████╗   InvoiceFlow CLI 1.2.0
      ╚═╝████╗  ██║██║   ██║██╔═══██╗  Excel Processing Platform
      ██╗██╔██╗ ██║██║   ██║██║   ██║  github.com/juxnbernxrdo/invoiceflow
      ██║██║╚██╗██║╚██████╔╝╚██████╔╝  ~
      ╚═╝╚═╝ ╚═══╝ ╚═════╝  ╚═════╝
`;
}

export async function run() {
    const program = new Command();

    program
        .name('invo')
        .description('Transformar archivos Excel mediante instrucciones predefinidas.')
        .version('1.2.0')
        .option('--tipo-gasto <value>', 'Tipo de gasto para la columna TIPO GASTO (default: EMPRESARIAL)')
        .option('--output <value>', 'Nombre del archivo de salida')
        .argument('[files...]', 'Archivos Excel a transformar')
        .action(async (files: string[], options: { tipoGasto?: string; output?: string }) => {
            const firstArg = files[0];

            if (firstArg === '/' || firstArg === '/help' || firstArg === 'help') {
                console.log(getHeader());
                console.log('\nInvoiceFlow CLI\n');
                console.log('Comandos disponibles:\n');
                const commands = CommandRegistry.getAllUnique();
                commands.forEach(cmd => {
                    console.log(`  ${cmd.name.padEnd(15)} ${cmd.description}`);
                });
                console.log('');
                return;
            }

            if (firstArg === '/version' || firstArg === 'version') {
                console.log('InvoiceFlow version 1.2.0\n');
                return;
            }

            if (firstArg === '/web') {
                const port = 3000;
                const url = `http://localhost:${port}`;
                console.log(`\n  Iniciando InvoiceFlow web en ${url}...`);
                await startServer(port);
                return;
            }

            if (firstArg === '/facturas' || firstArg === '/retenciones') {
                console.log(getHeader());
                const isFacturas = firstArg === '/facturas';
                const moduleId = isFacturas ? 'facturas' : 'retenciones';
                const module = MODULES.find(m => m.id === moduleId)!;
                const actualFiles = files.slice(1).map(f => f.startsWith('@') ? f.slice(1) : f);

                if (actualFiles.length === 0) {
                    console.log(`⚠ Debes especificar al menos un archivo Excel para procesar con ${firstArg}.`);
                    console.log(`Ejemplo: invo ${firstArg} archivo.xlsx\n`);
                    return;
                }

                let tipoGasto = options.tipoGasto;
                if (module.supportsTipoGasto && !tipoGasto) {
                    tipoGasto = await promptTipoGasto();
                }

                if (actualFiles.length === 1) {
                    const defaultOutputName = options.output || module.defaultOutputName;
                    const outputName = options.output || await promptOutputName(defaultOutputName);
                    await processFiles(actualFiles, module.id, tipoGasto, outputName);
                } else {
                    console.log('\n  Archivos a procesar:');
                    actualFiles.forEach((f, i) => console.log(`    ${i + 1}. ${path.basename(f)}`));
                    console.log('');

                    for (let i = 0; i < actualFiles.length; i++) {
                        const baseName = path.basename(actualFiles[i]).replace(/\.(xlsx?|xls)$/i, '');
                        const defaultOutputName = options.output || `${module.defaultOutputName} ${baseName}`;
                        const outputName = options.output || await promptOutputName(defaultOutputName);
                        await processFiles([actualFiles[i]], module.id, tipoGasto, outputName);
                    }
                }
                return;
            }

            // Default to interactive mode if no arguments or arguments don't match commands
            await startInteractiveMode();
        });

    program.parse(process.argv);
}
