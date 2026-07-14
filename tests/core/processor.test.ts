import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import * as ExcelJS from 'exceljs';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { processFile, processFiles } from '../../src/core/processor';

const TEST_DIR = path.join(os.tmpdir(), 'invoiceflow-processor-test-' + Date.now());

function createTestXlsx(filePath: string) {
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('Hoja1');

    const technicalHeaders = [
        'tpcomproba', 'numautori', 'fecautori', 'placa', 'nro_item',
        'codprincipal', 'codauxiliar', 'cantidad', 'precio_u', 'descuento',
        'poriva', 'base0', 'valice', 'exento', 'noobjiva', 'irbpnr',
        'idrecep', 'secuenciales', 'ruc_emisor', 'razonsocial', 'fechaemi',
        'claveacceso', 'descripcion', 'baseimp', 'valiva', 'precio_t'
    ];

    const headerRow = sheet.getRow(1);
    technicalHeaders.forEach((h, i) => {
        headerRow.getCell(i + 1).value = h;
    });

    const dataRow = sheet.getRow(2);
    dataRow.getCell(1).value = 'FACTURA';
    dataRow.getCell(2).value = '1234567890';
    dataRow.getCell(3).value = new Date();
    dataRow.getCell(4).value = 'ABC-1234';
    dataRow.getCell(5).value = 1;
    dataRow.getCell(6).value = 'P001';
    dataRow.getCell(7).value = 'A001';
    dataRow.getCell(8).value = 10;
    dataRow.getCell(9).value = 25.50;
    dataRow.getCell(10).value = 0;
    dataRow.getCell(11).value = 15;
    dataRow.getCell(12).value = 100;
    dataRow.getCell(13).value = 50;
    dataRow.getCell(14).value = 25;
    dataRow.getCell(15).value = 10;
    dataRow.getCell(16).value = 0;
    dataRow.getCell(17).value = '1712345678001';
    dataRow.getCell(18).value = '000000001';
    dataRow.getCell(19).value = '1799999999001';
    dataRow.getCell(20).value = 'EMPRESA TEST';
    dataRow.getCell(21).value = new Date();
    dataRow.getCell(22).value = '12345678901234567890123456789012345678901234';
    dataRow.getCell(23).value = 'Servicio de consultoria';
    dataRow.getCell(24).value = 500;
    dataRow.getCell(25).value = 75;
    dataRow.getCell(26).value = 575;

    return workbook.xlsx.writeFile(filePath);
}

describe('Processor', () => {
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

    describe('processFile()', () => {
        it('should process a file and return ProcessResult', async () => {
            const inputPath = path.join(TEST_DIR, 'processor-input.xlsx');
            await createTestXlsx(inputPath);

            const result = await processFile(inputPath, { tipoGasto: 'EMPRESARIAL' });

            expect(result).toHaveProperty('id');
            expect(result).toHaveProperty('originalName', 'processor-input.xlsx');
            expect(result).toHaveProperty('outputPath');
            expect(result).toHaveProperty('stats');
            expect(result.stats.originalColumns).toBe(26);
            expect(result.stats.finalColumns).toBe(12);
            expect(fs.existsSync(result.outputPath)).toBe(true);
        });

        it('should generate unique output paths per job ID', async () => {
            const inputPath = path.join(TEST_DIR, 'processor-unique.xlsx');
            await createTestXlsx(inputPath);

            const result1 = await processFile(inputPath, {}, 'job-1');
            const result2 = await processFile(inputPath, {}, 'job-2');

            expect(result1.outputPath).not.toBe(result2.outputPath);
            expect(result1.id).toBe('job-1');
            expect(result2.id).toBe('job-2');
        });

        it('should use provided jobId', async () => {
            const inputPath = path.join(TEST_DIR, 'processor-jobid.xlsx');
            await createTestXlsx(inputPath);

            const result = await processFile(inputPath, {}, 'custom-id-123');

            expect(result.id).toBe('custom-id-123');
        });

        it('should generate ID when jobId not provided', async () => {
            const inputPath = path.join(TEST_DIR, 'processor-genid.xlsx');
            await createTestXlsx(inputPath);

            const result = await processFile(inputPath, {});

            expect(result.id).toBeTruthy();
            expect(result.id.length).toBeGreaterThan(0);
        });

        it('should pass progress callback to transformer', async () => {
            const inputPath = path.join(TEST_DIR, 'processor-progress.xlsx');
            await createTestXlsx(inputPath);

            let progressCalled = false;
            await processFile(inputPath, {}, undefined, () => {
                progressCalled = true;
            });

            expect(progressCalled).toBe(true);
        });
    });

    describe('processFiles()', () => {
        it('should process multiple files sequentially', async () => {
            const input1 = path.join(TEST_DIR, 'multi-input-1.xlsx');
            const input2 = path.join(TEST_DIR, 'multi-input-2.xlsx');
            await createTestXlsx(input1);
            await createTestXlsx(input2);

            const results = await processFiles([input1, input2], { tipoGasto: 'PERSONAL' });

            expect(results.length).toBe(2);
            expect(results[0].stats.finalColumns).toBe(12);
            expect(results[1].stats.finalColumns).toBe(12);
        });

        it('should handle empty input array', async () => {
            const results = await processFiles([], {});
            expect(results.length).toBe(0);
        });
    });
});
