import { Command } from 'commander';
import * as path from 'path';
import { promptModule, promptTipoGasto, promptOutputName } from './prompts';
import { processFiles } from './processor';
import { startInteractiveMode } from './interactive';
import { MODULES } from '../core/modules';
import { startServer } from '../server/index';
import { webServerManager } from '../server/web-server-manager';
import { setupGracefulShutdown } from '../server/graceful-shutdown';
import { CommandRegistry } from './registry';
import { setDebugEnabled } from '../utils/logger';
import { VersionService } from '../utils/version-service';
import { HelpService } from '../utils/help-service';

function getHeader(): string {
    return VersionService.getBanner();
}

export async function run() {
    setupGracefulShutdown();
    
    const program = new Command();

    program
        .name('invo')
        .description('Transformar archivos Excel mediante instrucciones predefinidas.')
        .version(VersionService.getVersion())
        .option('--tipo-gasto <value>', 'Tipo de gasto para la columna TIPO GASTO (default: EMPRESARIAL)')
        .option('--output <value>', 'Nombre del archivo de salida')
        .option('--debug', 'Activar modo debug con logging detallado')
        .argument('[files...]', 'Archivos Excel a transformar')
        .action(async (files: string[], options: { tipoGasto?: string; output?: string; debug?: boolean }) => {
            if (options.debug) {
                setDebugEnabled(true);
            }
            const firstArg = files[0];

            if (firstArg === '/' || firstArg === '/help' || firstArg === 'help') {
                const subArg = files[1];
                if (subArg) {
                    HelpService.command(subArg);
                } else {
                    HelpService.general();
                }
                return;
            }

            if (firstArg === '/version' || firstArg === 'version') {
                console.log(`InvoiceFlow version ${VersionService.getVersion()}\n`);
                return;
            }

            if (firstArg === '/web') {
                const port = 3000;
                
                if (webServerManager.isRunning()) {
                    console.log(`\n✓ InvoiceFlow Web ya está ejecutándose.\n`);
                    console.log(`URL:\nhttp://localhost:${port}\n`);
                } else {
                    await webServerManager.start(port);
                }
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
