import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import * as ExcelJS from 'exceljs';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { ExcelTransformer } from '../../src/transformer';

const TEST_DIR = path.join(os.tmpdir(), 'invoiceflow-retenciones-test-' + Date.now());

function createTestRetencionInput(filePath: string) {
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('RETENCION ORIGINAL');

    const headers = [
        'ruc_emisor', 'razonsocial', 'tipocompr', 'numestab', 'ptoemi', 'secuencial',
        'numautori', 'claveacceso', 'fecautori', 'fechaemi', 'dias_dif', 'coddocum',
        'sucestab', 'susptoemi', 'sussecuenc', 'susfecemi', 'ftecodret1', 'ftebase1',
        'fteporcen1', 'ftevalret1', 'ivabase1', 'ivaporcen1', 'ivavalret1', 'sumaret'
    ];

    const headerRow = sheet.getRow(1);
    headers.forEach((h, i) => {
        headerRow.getCell(i + 1).value = h;
    });

    // Row 2: Standard Invoice with IVA
    const r2 = sheet.getRow(2);
    r2.getCell(1).value = '1792375851001';
    r2.getCell(2).value = 'PLASTICOS Y ENVASES ALDASROJ S. A.';
    r2.getCell(12).value = '01'; // coddocum
    r2.getCell(15).value = '000000068'; // sussecuenc
    r2.getCell(16).value = new Date('2026-01-05'); // susfecemi
    r2.getCell(18).value = 200; // ftebase1
    r2.getCell(21).value = 30; // ivabase1

    // Row 3: Tarifa Cero Invoice
    const r3 = sheet.getRow(3);
    r3.getCell(1).value = '1792392802001';
    r3.getCell(2).value = 'BANGSTUDIO AUDIOVISUALES CIA. LTDA.';
    r3.getCell(12).value = '01'; // coddocum
    r3.getCell(15).value = '000000072'; // sussecuenc
    r3.getCell(16).value = new Date('2026-04-20'); // susfecemi
    r3.getCell(18).value = 200; // ftebase1
    r3.getCell(21).value = 0; // ivabase1

    // Row 4: Public Entity / Authorized doc (coddocum 20) with no IVA but Subtotal
    const r4 = sheet.getRow(4);
    r4.getCell(1).value = '1760013210001';
    r4.getCell(2).value = 'SERVICIO DE RENTAS INTERNAS';
    r4.getCell(12).value = '20'; // coddocum
    r4.getCell(15).value = '067097711'; // sussecuenc
    r4.getCell(16).value = new Date('2026-06-18'); // susfecemi
    r4.getCell(18).value = 6.18; // ftebase1
    r4.getCell(21).value = 0; // ivabase1

    return workbook.xlsx.writeFile(filePath);
}

describe('Retenciones Module Transformation', () => {
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

    it('should transform RETENCION ORIGINAL to VENTAS sheet with 7 columns', async () => {
        const inputPath = path.join(TEST_DIR, 'retenciones.xlsx');
        const outputPath = path.join(TEST_DIR, 'ventas_output.xlsx');

        await createTestRetencionInput(inputPath);

        const transformer = new ExcelTransformer(() => {}, () => {});
        const stats = await transformer.transform(inputPath, outputPath, { module: 'retenciones' });

        expect(stats.finalColumns).toBe(12);
        expect(fs.existsSync(outputPath)).toBe(true);

        const workbook = new ExcelJS.Workbook();
        await workbook.xlsx.readFile(outputPath);
        
        // Output should contain both RETENCIÓN and VENTAS sheets
        expect(workbook.worksheets.length).toBe(2);
        expect(workbook.worksheets[0].name).toBe('RETENCIÓN');
        const sheet = workbook.worksheets[1];
        expect(sheet.name).toBe('VENTAS');

        // Check headers
        const headers = [];
        for (let c = 1; c <= 7; c++) {
            headers.push(sheet.getRow(1).getCell(c).value);
        }
        expect(headers).toEqual([
            'RAZÓN SOCIAL',
            'NÚMERO DE FACTURA',
            'FECHA EMISIÓN',
            'SUB TOTAL ',
            'VENTAS  TARIFA CERO',
            'IVA',
            'TOTAL'
        ]);

        // Row 2 (Standard IVA 15%)
        const row2 = sheet.getRow(2);
        expect(row2.getCell(1).value).toBe('PLASTICOS Y ENVASES ALDASROJ S. A.');
        expect(row2.getCell(2).value).toBe('000000068');
        expect(row2.getCell(4).value).toBe(200); // SUB TOTAL
        expect(row2.getCell(5).value).toBeNull(); // TARIFA CERO
        expect(row2.getCell(6).value).toBe(30); // IVA
        expect(row2.getCell(7).value).toEqual({ formula: '+D2+F2', result: 230 });

        // Row 3 (Tarifa Cero)
        const row3 = sheet.getRow(3);
        expect(row3.getCell(1).value).toBe('BANGSTUDIO AUDIOVISUALES CIA. LTDA.');
        expect(row3.getCell(2).value).toBe('000000072');
        expect(row3.getCell(4).value).toBeNull(); // SUB TOTAL
        expect(row3.getCell(5).value).toBe(200); // TARIFA CERO
        expect(row3.getCell(6).value).toBe(0); // IVA
        expect(row3.getCell(7).value).toEqual({ formula: '+E3+F3', result: 200 });

        // Row 4 (coddocum 20)
        const row4 = sheet.getRow(4);
        expect(row4.getCell(1).value).toBe('SERVICIO DE RENTAS INTERNAS');
        expect(row4.getCell(2).value).toBe('067097711');
        expect(row4.getCell(4).value).toBe(6.18); // SUB TOTAL
        expect(row4.getCell(5).value).toBeNull(); // TARIFA CERO
        expect(row4.getCell(6).value).toBe(0); // IVA
        expect(row4.getCell(7).value).toEqual({ formula: '+D4+F4', result: 6.18 });
    });
});
