import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import * as ExcelJS from 'exceljs';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { ExcelTransformer, TransformStats } from '../../src/transformer';

const TEST_DIR = path.join(os.tmpdir(), 'invoiceflow-test-' + Date.now());

function createTestXlsx(filePath: string, options?: { sheetNames?: string[]; data?: any[][] }) {
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet(options?.sheetNames?.[0] || 'Hoja1');

    // Standard 26-column Ecuadorian invoice header (row 1 - technical names)
    const technicalHeaders = [
        'tpcomproba', 'numautori', 'fecautori', 'placa', 'nro_item',
        'codprincipal', 'codauxiliar', 'cantidad', 'precio_u', 'descuento',
        'poriva', 'base0', 'valice', 'exento', 'noobjiva', 'irbpnr',
        'idrecep', 'secuenciales', 'ruc_emisor', 'razonsocial', 'fechaemi',
        'claveacceso', 'descripcion', 'baseimp', 'valiva', 'precio_t'
    ];

    // Row 1: technical headers
    const headerRow = sheet.getRow(1);
    technicalHeaders.forEach((h, i) => {
        headerRow.getCell(i + 1).value = h;
    });

    // Row 2: data row (with numeric values for BASE CERO calculation)
    const dataRow = sheet.getRow(2);
    dataRow.getCell(1).value = 'FACTURA';      // tpcomproba
    dataRow.getCell(2).value = '1234567890';   // numautori
    dataRow.getCell(3).value = new Date();      // fecautori
    dataRow.getCell(4).value = 'ABC-1234';     // placa
    dataRow.getCell(5).value = 1;               // nro_item
    dataRow.getCell(6).value = 'P001';          // codprincipal
    dataRow.getCell(7).value = 'A001';          // codauxiliar
    dataRow.getCell(8).value = 10;              // cantidad
    dataRow.getCell(9).value = 25.50;           // precio_u
    dataRow.getCell(10).value = 0;              // descuento
    dataRow.getCell(11).value = 15;             // poriva
    dataRow.getCell(12).value = 100;            // base0
    dataRow.getCell(13).value = 50;             // valice
    dataRow.getCell(14).value = 25;             // exento
    dataRow.getCell(15).value = 10;             // noobjiva
    dataRow.getCell(16).value = 0;              // irbpnr
    dataRow.getCell(17).value = '1712345678001'; // idrecep
    dataRow.getCell(18).value = '000000001';   // secuenciales
    dataRow.getCell(19).value = '1799999999001'; // ruc_emisor
    dataRow.getCell(20).value = 'EMPRESA TEST'; // razonsocial
    dataRow.getCell(21).value = new Date();     // fechaemi
    dataRow.getCell(22).value = '12345678901234567890123456789012345678901234'; // claveacceso
    dataRow.getCell(23).value = 'Servicio de consultoria'; // descripcion
    dataRow.getCell(24).value = 500;            // baseimp
    dataRow.getCell(25).value = 75;             // valiva
    dataRow.getCell(26).value = 575;            // precio_t

    return workbook.xlsx.writeFile(filePath);
}

describe('ExcelTransformer', () => {
    beforeAll(async () => {
        if (!fs.existsSync(TEST_DIR)) {
            fs.mkdirSync(TEST_DIR, { recursive: true });
        }
    });

    afterAll(() => {
        if (fs.existsSync(TEST_DIR)) {
            fs.rmSync(TEST_DIR, { recursive: true, force: true });
        }
    });

    describe('transform()', () => {
        it('should transform a 26-column file to 12 columns', async () => {
            const inputPath = path.join(TEST_DIR, 'input-26cols.xlsx');
            const outputPath = path.join(TEST_DIR, 'output-12cols.xlsx');

            await createTestXlsx(inputPath);

            const transformer = new ExcelTransformer(() => {}, () => {});
            const stats = await transformer.transform(inputPath, outputPath);

            expect(stats.originalColumns).toBe(26);
            expect(stats.finalColumns).toBe(12);
            expect(fs.existsSync(outputPath)).toBe(true);
        });

        it('should calculate BASE CERO as sum of base0 + valice + exento + noobjiva', async () => {
            const inputPath = path.join(TEST_DIR, 'input-base-cero.xlsx');
            const outputPath = path.join(TEST_DIR, 'output-base-cero.xlsx');

            await createTestXlsx(inputPath);

            const transformer = new ExcelTransformer(() => {}, () => {});
            await transformer.transform(inputPath, outputPath);

            // Read output and verify BASE CERO value
            const workbook = new ExcelJS.Workbook();
            await workbook.xlsx.readFile(outputPath);
            const sheet = workbook.worksheets[0];

            // BASE CERO should be in column 9 (before BASE IVA)
            // base0=100 + valice=50 + exento=25 + noobjiva=10 = 185
            const baseCeroCell = sheet.getRow(2).getCell(9);
            expect(baseCeroCell.value).toBe(185);
        });

        it('should insert TIPO GASTO column after DESCRIPCIÓN', async () => {
            const inputPath = path.join(TEST_DIR, 'input-tipo-gasto.xlsx');
            const outputPath = path.join(TEST_DIR, 'output-tipo-gasto.xlsx');

            await createTestXlsx(inputPath);

            const transformer = new ExcelTransformer(() => {}, () => {});
            await transformer.transform(inputPath, outputPath, { tipoGasto: 'PERSONAL' });

            const workbook = new ExcelJS.Workbook();
            await workbook.xlsx.readFile(outputPath);
            const sheet = workbook.worksheets[0];

            // Check header row for TIPO GASTO
            const headers: string[] = [];
            for (let c = 1; c <= sheet.columnCount; c++) {
                const val = sheet.getRow(1).getCell(c).value;
                if (val) headers.push(String(val));
            }

            const tipoGastoIndex = headers.indexOf('TIPO GASTO');
            expect(tipoGastoIndex).toBeGreaterThan(-1);

            // Check data row has the value
            const tipoGastoValue = sheet.getRow(2).getCell(tipoGastoIndex + 1).value;
            expect(tipoGastoValue).toBe('PERSONAL');
        });

        it('should rename technical headers to human-readable names', async () => {
            const inputPath = path.join(TEST_DIR, 'input-rename.xlsx');
            const outputPath = path.join(TEST_DIR, 'output-rename.xlsx');

            await createTestXlsx(inputPath);

            const transformer = new ExcelTransformer(() => {}, () => {});
            await transformer.transform(inputPath, outputPath);

            const workbook = new ExcelJS.Workbook();
            await workbook.xlsx.readFile(outputPath);
            const sheet = workbook.worksheets[0];

            const headers: string[] = [];
            for (let c = 1; c <= sheet.columnCount; c++) {
                const val = sheet.getRow(1).getCell(c).value;
                if (val) headers.push(String(val));
            }

            // Verify renamed headers exist
            expect(headers).toContain('ID RECEPTOR');
            expect(headers).toContain('SECUENCIAL ');
            expect(headers).toContain('RUC EMISOR');
            expect(headers).toContain('RAZÓN SOCIAL');
            expect(headers).toContain('FECHA EMISIÓN');
            expect(headers).toContain('CLAVE ACCESO');
            expect(headers).toContain('DESCRIPCIÓN');
            expect(headers).toContain('BASE  IVA');
            expect(headers).toContain('IVA');
            expect(headers).toContain('TOTAL');

            // Verify old technical names are gone
            expect(headers).not.toContain('idrecep');
            expect(headers).not.toContain('secuenciales');
            expect(headers).not.toContain('ruc_emisor');
        });

        it('should delete 15 columns (by header name)', async () => {
            const inputPath = path.join(TEST_DIR, 'input-delete.xlsx');
            const outputPath = path.join(TEST_DIR, 'output-delete.xlsx');

            await createTestXlsx(inputPath);

            const transformer = new ExcelTransformer(() => {}, () => {});
            const stats = await transformer.transform(inputPath, outputPath);

            // Should have deleted columns
            expect(stats.deletedColumns.length).toBeGreaterThan(0);

            const workbook = new ExcelJS.Workbook();
            await workbook.xlsx.readFile(outputPath);
            const sheet = workbook.worksheets[0];

            const headers: string[] = [];
            for (let c = 1; c <= sheet.columnCount; c++) {
                const val = sheet.getRow(1).getCell(c).value;
                if (val) headers.push(String(val));
            }

            // Verify deleted headers are not in output
            expect(headers).not.toContain('tpcomproba');
            expect(headers).not.toContain('numautori');
            expect(headers).not.toContain('fecautori');
            expect(headers).not.toContain('placa');
            expect(headers).not.toContain('nro_item');
            expect(headers).not.toContain('codprincipal');
            expect(headers).not.toContain('codauxiliar');
            expect(headers).not.toContain('cantidad');
            expect(headers).not.toContain('precio_u');
            expect(headers).not.toContain('descuento');
            expect(headers).not.toContain('poriva');
        });

        it('should handle default tipoGasto as EMPRESARIAL', async () => {
            const inputPath = path.join(TEST_DIR, 'input-default-tipo.xlsx');
            const outputPath = path.join(TEST_DIR, 'output-default-tipo.xlsx');

            await createTestXlsx(inputPath);

            const transformer = new ExcelTransformer(() => {}, () => {});
            await transformer.transform(inputPath, outputPath);

            const workbook = new ExcelJS.Workbook();
            await workbook.xlsx.readFile(outputPath);
            const sheet = workbook.worksheets[0];

            const headers: string[] = [];
            for (let c = 1; c <= sheet.columnCount; c++) {
                const val = sheet.getRow(1).getCell(c).value;
                if (val) headers.push(String(val));
            }

            const tipoGastoIndex = headers.indexOf('TIPO GASTO');
            expect(tipoGastoIndex).toBeGreaterThan(-1);

            const tipoGastoValue = sheet.getRow(2).getCell(tipoGastoIndex + 1).value;
            expect(tipoGastoValue).toBe('EMPRESARIAL');
        });

        it('should call onProgressUpdate callback during transformation', async () => {
            const inputPath = path.join(TEST_DIR, 'input-progress.xlsx');
            const outputPath = path.join(TEST_DIR, 'output-progress.xlsx');

            await createTestXlsx(inputPath);

            const progressUpdates: { current: number; total: number; message: string }[] = [];

            const transformer = new ExcelTransformer(
                () => {},
                (current, total, message) => progressUpdates.push({ current, total, message })
            );

            await transformer.transform(inputPath, outputPath);

            expect(progressUpdates.length).toBeGreaterThan(0);
        });

        it('should handle empty worksheet without throwing', async () => {
            const inputPath = path.join(TEST_DIR, 'input-empty.xlsx');
            const outputPath = path.join(TEST_DIR, 'output-empty.xlsx');

            // Create a workbook with empty sheet
            const workbook = new ExcelJS.Workbook();
            workbook.addWorksheet('Empty');
            await workbook.xlsx.writeFile(inputPath);

            const transformer = new ExcelTransformer(() => {}, () => {});

            // Current behavior: returns stats with 0 columns, doesn't throw
            const stats = await transformer.transform(inputPath, outputPath);
            expect(stats.originalColumns).toBe(0);
            expect(stats.finalColumns).toBe(1); // header row is always created
        });
    });
});
