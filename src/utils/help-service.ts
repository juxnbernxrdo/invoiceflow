import * as os from 'os';
import { VersionService } from './version-service';

const c = {
    reset: '\x1b[0m',
    bold: '\x1b[1m',
    dim: '\x1b[2m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    magenta: '\x1b[35m',
    cyan: '\x1b[36m',
    white: '\x1b[37m',
};

export class HelpService {
    private static drawSeparator(title?: string): string {
        const width = Math.min(80, (process.stdout.columns || 80) - 2);
        if (!title) {
            return c.dim + '─'.repeat(width) + c.reset;
        }
        const titleText = ` ${title} `;
        const sideWidth = Math.max(2, Math.floor((width - titleText.length) / 2));
        const left = '─'.repeat(sideWidth);
        const right = '─'.repeat(width - sideWidth - titleText.length);
        return `${c.dim}${left}${c.reset}${c.bold}${c.cyan}${titleText}${c.reset}${c.dim}${right}${c.reset}`;
    }

    public static general(): void {
        console.log(VersionService.getBanner());
        
        console.log(this.about());
        console.log('');
        
        console.log(this.drawSeparator('FORMATOS SOPORTADOS'));
        console.log(`  ${c.bold}Entrada:${c.reset} Archivos Excel de SRI (.xls, .xlsx)`);
        console.log(`           * Los archivos .xls antiguos se convierten internamente a .xlsx`);
        console.log(`  ${c.bold}Salida:${c.reset}  Archivos Excel formateados y filtrados (.xlsx)`);
        console.log('');

        console.log(this.drawSeparator('LISTA DE COMANDOS'));
        console.log(`  ${c.bold}${c.green}/facturas${c.reset}     Procesa archivos de facturas electrónicas (26 → 12 columnas).`);
        console.log(`  ${c.bold}${c.green}/retenciones${c.reset}  Procesa archivos de retenciones electrónicas (40 → 7 columnas).`);
        console.log(`  ${c.bold}${c.green}/web${c.reset}          Inicia el cliente web interactivo en http://localhost:3000.`);
        console.log(`  ${c.bold}${c.green}/version${c.reset}      Muestra la versión de InvoiceFlow instalada.`);
        console.log(`  ${c.bold}${c.green}/help${c.reset}         Muestra esta ayuda detallada de InvoiceFlow.`);
        console.log(`  ${c.bold}${c.green}/exit${c.reset}         Cierra la CLI de InvoiceFlow.`);
        console.log(`\n  ${c.dim}Para ayuda específica de un comando, escribe: /help <comando> (ej. /help facturas)${c.reset}`);
        console.log('');

        console.log(this.drawSeparator('FLUJO RECOMENDADO DE TRABAJO'));
        console.log(this.workflow());
        console.log('');

        console.log(this.drawSeparator('ATAJOS DE TECLADO'));
        console.log(this.shortcuts());
        console.log('');

        console.log(this.drawSeparator('SOLUCIÓN DE PROBLEMAS (FAQ)'));
        console.log(this.troubleshooting());
        console.log('');

        console.log(this.drawSeparator('INFORMACIÓN DEL SISTEMA'));
        console.log(this.systemInfo());
        console.log('');

        console.log(this.drawSeparator('ENLACES ÚTILES'));
        console.log(this.links());
        console.log('');
    }

    public static about(): string {
        return `  ${c.bold}InvoiceFlow CLI${c.reset} es una herramienta profesional diseñada para transformar
  y unificar archivos de facturación electrónica ecuatoriana en formato Excel.
  
  Remueve columnas innecesarias, aplica filtros automáticos, detecta y calcula
  campos tributarios (como base imponible, tarifa de IVA, y montos de retención),
  y genera archivos de salida con formatos y anchos de columna optimizados.`;
    }

    public static workflow(): string {
        return `  ${c.bold}Inicio (CLI)${c.reset}
       ↓
  ${c.bold}Seleccionar módulo${c.reset}  (escribe /facturas o /retenciones, o usa @)
       ↓
  ${c.bold}Seleccionar archivos${c.reset} (selector interactivo con Espacio y Enter)
       ↓
  ${c.bold}Ingresar tipo gasto${c.reset}  (EMPRESARIAL o PERSONAL, si aplica)
       ↓
  ${c.bold}Nombre de archivo${c.reset}    (se sugiere automáticamente basándose en la fecha)
       ↓
  ${c.bold}Procesamiento${c.reset}       (barra de progreso en tiempo real)
       ↓
  ${c.bold}Archivo generado${c.reset}    (guardado y formateado en el mismo directorio)`;
    }

    public static shortcuts(): string {
        return `  ${c.bold}↑, ↓${c.reset}          Navegar por las opciones o la paleta de comandos
  ${c.bold}Espacio${c.reset}        Seleccionar/Deseleccionar un archivo Excel
  ${c.bold}Enter${c.reset}          Confirmar selección y ejecutar acción
  ${c.bold}@${c.reset}              Abrir selector interactivo de archivos Excel en cualquier momento
  ${c.bold}/${c.reset}              Abrir la Paleta de Comandos Interactiva rápidamente
  ${c.bold}Backspace/Del${c.reset}  Cerrar selector de archivos o limpiar entrada
  ${c.bold}Ctrl + C${c.reset}       Salir inmediatamente de la aplicación`;
    }

    public static troubleshooting(): string {
        return `  ${c.yellow}No aparecen archivos Excel al escribir @${c.reset}
  • Asegúrate de que el terminal esté abierto en el directorio con archivos .xls o .xlsx.
  • Verifica que el usuario tenga permisos de lectura sobre esos archivos.

  ${c.dim}──────────────────────────────────────────────────────────────────────────────${c.reset}
  
  ${c.yellow}No se puede abrir o escribir en el archivo de salida${c.reset}
  • Comprueba que el archivo Excel de salida no esté abierto en otra aplicación (ej. Microsoft Excel).
  • Cierra la aplicación que está bloqueando el archivo e intenta de nuevo.

  ${c.dim}──────────────────────────────────────────────────────────────────────────────${c.reset}

  ${c.yellow}Puerto 3000 ya está ocupado al iniciar /web${c.reset}
  • Cierra cualquier otra instancia del cliente web que se esté ejecutando en segundo plano.
  • Asegúrate de que otra aplicación no esté utilizando el puerto 3000.`;
    }

    public static systemInfo(): string {
        return `  ${c.bold}Versión CLI:${c.reset}       ${VersionService.getVersion()}
  ${c.bold}Plataforma:${c.reset}        ${os.platform()} (${os.release()})
  ${c.bold}Versión de Node:${c.reset}   ${process.version}
  ${c.bold}Directorio CWD:${c.reset}    ${process.cwd()}
  ${c.bold}Arquitectura OS:${c.reset}  ${os.arch()}`;
    }

    public static links(): string {
        return `  ${c.bold}Repositorio:${c.reset}       https://github.com/juxnbernxrdo/invoiceflow
  ${c.bold}Reporte de Errores:${c.reset} https://github.com/juxnbernxrdo/invoiceflow/issues
  ${c.bold}Documentación:${c.reset}      https://github.com/juxnbernxrdo/invoiceflow#readme
  ${c.bold}Licencia:${c.reset}           ISC License`;
    }

    public static command(cmdName: string): void {
        const cleanName = cmdName.toLowerCase().replace(/^\//, '');

        if (cleanName === 'facturas') {
            console.log(this.drawSeparator('AYUDA: /facturas'));
            console.log(`\n  ${c.bold}Objetivo:${c.reset}`);
            console.log(`    Transforma reportes de facturas de SRI de 26 columnas a un formato limpio de 12 columnas.`);
            console.log(`    Ideal para declaraciones de IVA y análisis de gastos.`);
            console.log(`\n  ${c.bold}Funcionamiento:${c.reset}`);
            console.log(`    Lee comprobantes de compra/venta SRI y extrae: RUC, Razón Social, Fecha, Tipo,`);
            console.log(`    Base Imponible, IVA, Total y le asocia una clasificación de tipo de gasto.`);
            console.log(`\n  ${c.bold}Uso / Parámetros (No interactivo):${c.reset}`);
            console.log(`    invo /facturas <archivo1.xlsx> [archivo2.xlsx...] [opciones]`);
            console.log(`\n  ${c.bold}Opciones:${c.reset}`);
            console.log(`    --tipo-gasto <value>   'EMPRESARIAL' o 'PERSONAL' (por defecto: 'EMPRESARIAL')`);
            console.log(`    --output <value>       Nombre específico para el archivo generado`);
            console.log(`    --debug                Habilita logs detallados de la transformación`);
            console.log(`\n  ${c.bold}Ejemplos de Uso:${c.reset}`);
            console.log(`    ${c.green}invo /facturas facturas_sri.xlsx${c.reset}`);
            console.log(`    ${c.green}invo /facturas facturas1.xlsx facturas2.xlsx --tipo-gasto PERSONAL${c.reset}`);
            console.log(`\n  ${c.bold}Posibles Errores:${c.reset}`);
            console.log(`    • El archivo no contiene el formato de columnas de facturas SRI (26 columnas).`);
            console.log(`    • Se especifica un archivo de salida que ya está abierto en Excel.`);
            console.log(`\n  ${c.bold}Recomendaciones:${c.reset}`);
            console.log(`    Revisa el archivo de salida generado para verificar la correcta asignación tributaria.`);
            console.log('');
        } else if (cleanName === 'retenciones') {
            console.log(this.drawSeparator('AYUDA: /retenciones'));
            console.log(`\n  ${c.bold}Objetivo:${c.reset}`);
            console.log(`    Transforma reportes de retenciones electrónicas de 40 columnas a un formato resumido de 7 columnas.`);
            console.log(`    Útil para el anexo transaccional simplificado (ATS) y declaraciones.`);
            console.log(`\n  ${c.bold}Funcionamiento:${c.reset}`);
            console.log(`    Extrae: RUC, Proveedor, Fecha Emisión, Número de Comprobante Retenido,`);
            console.log(`    Impuesto Retenido (IVA/Renta), Base Imponible y Valor Retenido.`);
            console.log(`\n  ${c.bold}Uso / Parámetros (No interactivo):${c.reset}`);
            console.log(`    invo /retenciones <archivo1.xlsx> [archivo2.xlsx...] [opciones]`);
            console.log(`\n  ${c.bold}Opciones:${c.reset}`);
            console.log(`    --output <value>       Nombre específico para el archivo de salida`);
            console.log(`    --debug                Habilita logs detallados`);
            console.log(`\n  ${c.bold}Ejemplos de Uso:${c.reset}`);
            console.log(`    ${c.green}invo /retenciones retenciones_sri.xls${c.reset}`);
            console.log(`    ${c.green}invo /retenciones retenciones_2026.xlsx --output resumen_ret.xlsx${c.reset}`);
            console.log(`\n  ${c.bold}Posibles Errores:${c.reset}`);
            console.log(`    • Archivo de entrada dañado o con cabecera incompatible (debe tener las 40 columnas estándar).`);
            console.log(`\n  ${c.bold}Recomendaciones:${c.reset}`);
            console.log(`    Idealmente ejecuta este comando al final del período contable para procesar todo el lote de retenciones.`);
            console.log('');
        } else if (cleanName === 'web') {
            console.log(this.drawSeparator('AYUDA: /web'));
            console.log(`\n  ${c.bold}Objetivo:${c.reset}`);
            console.log(`    Inicia un servidor local Express que hospeda la interfaz web SPA moderna.`);
            console.log(`\n  ${c.bold}Funcionamiento:${c.reset}`);
            console.log(`    Levanta la aplicación en el puerto 3000 e intenta abrir el navegador predeterminado.`);
            console.log(`    Permite arrastrar y soltar (drag & drop) archivos para procesamiento visual.`);
            console.log(`\n  ${c.bold}Uso:${c.reset}`);
            console.log(`    invo /web`);
            console.log(`    ó mediante argumento: invo --web`);
            console.log(`\n  ${c.bold}Posibles Errores:${c.reset}`);
            console.log(`    • "EADDRINUSE: address already in use :::3000": El puerto está ocupado por otra app o servidor.`);
            console.log(`\n  ${c.bold}Recomendaciones:${c.reset}`);
            console.log(`    Si el navegador no se abre automáticamente, dirígete a: http://localhost:3000`);
            console.log('');
        } else if (cleanName === 'version') {
            console.log(this.drawSeparator('AYUDA: /version'));
            console.log(`\n  ${c.bold}Objetivo:${c.reset}`);
            console.log(`    Muestra la versión de InvoiceFlow CLI instalada.`);
            console.log(`\n  ${c.bold}Uso:${c.reset}`);
            console.log(`    invo /version`);
            console.log(`    ó mediante argumento: invo --version`);
            console.log('');
        } else if (cleanName === 'exit' || cleanName === 'quit') {
            console.log(this.drawSeparator('AYUDA: /exit'));
            console.log(`\n  ${c.bold}Objetivo:${c.reset}`);
            console.log(`    Finaliza la sesión interactiva actual de la CLI y cierra el programa.`);
            console.log(`\n  ${c.bold}Uso:${c.reset}`);
            console.log(`    invo /exit`);
            console.log(`    ó usando comandos abreviados: /quit, exit, quit`);
            console.log('');
        } else if (cleanName === 'help') {
            console.log(this.drawSeparator('AYUDA: /help'));
            console.log(`\n  ${c.bold}Objetivo:${c.reset}`);
            console.log(`    Muestra la documentación general y las guías de uso de InvoiceFlow CLI.`);
            console.log(`\n  ${c.bold}Uso:${c.reset}`);
            console.log(`    invo /help`);
            console.log(`    invo /help <nombre_comando>`);
            console.log('');
        } else {
            console.log(`\n⚠ Comando "${cmdName}" no reconocido en el sistema de ayuda.`);
            console.log(`  Escribe /help para ver la lista de comandos disponibles.\n`);
        }
    }
}
