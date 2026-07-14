import * as ExcelJS from 'exceljs';
import { TransformRetencionesUseCase } from '../../src/modules/retenciones/use-cases/transform-retenciones';
import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

describe('Retenciones Sheet Detección y Renombrado Test', () => {
    it('should dynamically find and transform sheet regardless of sheet name', async () => {
        const tempXlsxInput = path.resolve(os.tmpdir(), 'temp_renamed_input.xlsx');
        const tempXlsxOutput = path.resolve(os.tmpdir(), 'temp_renamed_output.xlsx');

        // Create workbook with custom named sheet
        const origWb = new ExcelJS.Workbook();
        const sheet = origWb.addWorksheet('NombreDeHojaAleatorio');

        const headers = [
            'ruc_emisor', 'razonsocial', 'sussecuenc', 'susfecemi', 'ftebase1', 'ivabase1', 'coddocum'
        ];
        const headerRow = sheet.getRow(1);
        headers.forEach((h, i) => {
            headerRow.getCell(i + 1).value = h;
        });

        // Add dummy row
        const r2 = sheet.getRow(2);
        r2.getCell(1).value = '1792375851001';
        r2.getCell(2).value = 'PLASTICOS Y ENVASES ALDASROJ S. A.';
        r2.getCell(3).value = '000000068';
        r2.getCell(4).value = new Date('2026-01-05');
        r2.getCell(5).value = 200;
        r2.getCell(6).value = 30;
        r2.getCell(7).value = '01';

        await origWb.xlsx.writeFile(tempXlsxInput);

        const testWb = new ExcelJS.Workbook();
        await testWb.xlsx.readFile(tempXlsxInput);

        const useCase = new TransformRetencionesUseCase();
        const stats = { originalColumns: 0, finalColumns: 0, deletedColumns: [], replacedColumns: [], recalculatedRows: 0 };
        await useCase.execute(testWb, tempXlsxOutput, stats);

        const outputWb = new ExcelJS.Workbook();
        await outputWb.xlsx.readFile(tempXlsxOutput);

        expect(outputWb.worksheets.length).toBe(2);
        expect(outputWb.worksheets[0].name).toBe('RETENCIÓN');
        expect(outputWb.worksheets[1].name).toBe('VENTAS');
        expect(outputWb.worksheets[1].rowCount).toBe(2);

        // Cleanup
        try { fs.unlinkSync(tempXlsxInput); } catch {}
        try { fs.unlinkSync(tempXlsxOutput); } catch {}
    });
});
