import * as ExcelJS from 'exceljs';
import { ExcelRetencionMapper } from '../mappers/excel-retencion.mapper';
import { Retencion } from '../domain/retencion.entity';
import { cleanupXlsxFile } from '../../../core/style-cleaner';
import { TransformStats } from '../../../core/types';

export class TransformRetencionesUseCase {
    public async execute(workbook: ExcelJS.Workbook, outputPath: string, stats: TransformStats): Promise<void> {
        // Detect sheet structurally by headers
        let sourceSheet: ExcelJS.Worksheet | undefined;
        const colIdxs = {
            rucemisor: -1,
            razonsocial: -1,
            fechaemi: -1,
            numestab: -1,
            ptoemi: -1,
            secuencial: -1,
            numautori: -1,
            ftebase1: -1,
            fteporcen1: -1,
            ftevalret1: -1,
            ivabase1: -1,
            ivaporcen1: -1,
            ivavalret1: -1,
            sussecuenc: -1,
            susfecemi: -1,
            coddocum: -1
        };

        for (const sheet of workbook.worksheets) {
            const headerRow = sheet.getRow(1);
            const tempIdxs = {
                rucemisor: -1,
                razonsocial: -1,
                fechaemi: -1,
                numestab: -1,
                ptoemi: -1,
                secuencial: -1,
                numautori: -1,
                ftebase1: -1,
                fteporcen1: -1,
                ftevalret1: -1,
                ivabase1: -1,
                ivaporcen1: -1,
                ivavalret1: -1,
                sussecuenc: -1,
                susfecemi: -1,
                coddocum: -1
            };

            for (let c = 1; c <= sheet.columnCount; c++) {
                const val = headerRow.getCell(c).value;
                if (val) {
                    const h = String(val).trim().toLowerCase().replace(/_/g, '');
                    if (h === 'rucemisor') tempIdxs.rucemisor = c;
                    else if (h === 'razonsocial') tempIdxs.razonsocial = c;
                    else if (h === 'fechaemi') tempIdxs.fechaemi = c;
                    else if (h === 'numestab') tempIdxs.numestab = c;
                    else if (h === 'ptoemi') tempIdxs.ptoemi = c;
                    else if (h === 'secuencial') tempIdxs.secuencial = c;
                    else if (h === 'numautori') tempIdxs.numautori = c;
                    else if (h === 'ftebase1') tempIdxs.ftebase1 = c;
                    else if (h === 'fteporcen1') tempIdxs.fteporcen1 = c;
                    else if (h === 'ftevalret1') tempIdxs.ftevalret1 = c;
                    else if (h === 'ivabase1') tempIdxs.ivabase1 = c;
                    else if (h === 'ivaporcen1') tempIdxs.ivaporcen1 = c;
                    else if (h === 'ivavalret1') tempIdxs.ivavalret1 = c;
                    else if (h === 'sussecuenc') tempIdxs.sussecuenc = c;
                    else if (h === 'susfecemi') tempIdxs.susfecemi = c;
                    else if (h === 'coddocum') tempIdxs.coddocum = c;
                }
            }

            if (tempIdxs.razonsocial !== -1 && tempIdxs.sussecuenc !== -1) {
                sourceSheet = sheet;
                Object.assign(colIdxs, tempIdxs);
                break;
            }
        }

        if (!sourceSheet) {
            throw new Error('El archivo no tiene el formato esperado para Retenciones (se requiere al menos razonsocial y sussecuenc).');
        }

        stats.originalColumns = sourceSheet.columnCount;

        const entities: Retencion[] = [];
        let lastRow = sourceSheet.rowCount;
        while (lastRow > 1) {
            const checkRow = sourceSheet.getRow(lastRow);
            let hasData = false;
            for (let c = 1; c <= sourceSheet.columnCount; c++) {
                const cellVal = checkRow.getCell(c).value;
                if (cellVal !== null && cellVal !== undefined && cellVal !== '') {
                    hasData = true;
                    break;
                }
            }
            if (hasData) break;
            lastRow--;
        }

        for (let r = 2; r <= lastRow; r++) {
            const row = sourceSheet.getRow(r);
            try {
                const entity = ExcelRetencionMapper.mapRowToEntity(row, colIdxs);
                entities.push(entity);
                stats.recalculatedRows++;
            } catch (err: any) {
                throw new Error(`Fila ${r} inválida: ${err.message}`);
            }
        }

        stats.finalColumns = 12;

        // Delete all sheets in the current workbook
        const sheets = [...workbook.worksheets];
        for (const s of sheets) {
            workbook.removeWorksheet(s.id);
        }

        // Add fresh worksheets
        const sRet = workbook.addWorksheet('RETENCIÓN');
        const sVent = workbook.addWorksheet('VENTAS');

        sRet.autoFilter = undefined as any;
        sRet.views = [];
        sVent.autoFilter = undefined as any;
        sVent.views = [];

        // Write RETENCIÓN headers
        const h1Headers = [
            'RUC',
            'FECHA EMISIÓN',
            'RAZÓN SOCIAL',
            'SERIE',
            'SECUENCIA',
            'AUTORIZACIÓN',
            'BASE RENTA',
            '% RET RENTA',
            'VALOR RET RENTA',
            'BASE IVA',
            '% RET IVA',
            'VALOR RET IVA'
        ];
        const h1Row = sRet.getRow(1);
        h1Row.height = 26.85;
        h1Headers.forEach((h, i) => {
            const cell = h1Row.getCell(i + 1);
            cell.value = h;
            cell.font = { bold: true, size: 12, name: 'Arial' };
            cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
            cell.border = {};
            cell.fill = { type: 'pattern', pattern: 'none' };
        });

        // Write RETENCIÓN data
        entities.forEach((ent, idx) => {
            const rIdx = idx + 2;
            const row = sRet.getRow(rIdx);
            row.height = 17;

            row.getCell(1).value = ent.ruc;
            row.getCell(2).value = ent.fechaEmisionRetencion;
            row.getCell(3).value = ent.razonSocial;
            row.getCell(4).value = ent.serie;
            row.getCell(5).value = ent.secuencia;
            row.getCell(6).value = ent.autorizacion;
            row.getCell(7).value = ent.baseRenta;
            row.getCell(8).value = ent.porcenRenta;
            row.getCell(9).value = ent.valorRenta;
            row.getCell(10).value = ent.baseIva;
            row.getCell(11).value = ent.porcenIva;
            row.getCell(12).value = ent.valorIva;

            for (let c = 1; c <= 12; c++) {
                const cell = row.getCell(c);
                cell.font = { size: 12, name: 'Arial' };
                cell.border = {};
                cell.fill = { type: 'pattern', pattern: 'none' };
                
                if (c === 3) {
                    cell.alignment = { horizontal: 'left', vertical: 'middle', wrapText: false };
                } else {
                    cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: false };
                }

                if (c === 2) {
                    cell.numFmt = 'dd/mm/yyyy';
                } else {
                    cell.numFmt = 'General';
                }
            }
        });

        // Hardcode specific column widths for RETENCIÓN
        const h1Widths = [17.66, 14.55, 46.21, 15.1, 15.99, 63.87, 14.1, 15.99, 14.55, 14.55, 15.99, 14.87];
        h1Widths.forEach((width, idx) => {
            sRet.getColumn(idx + 1).width = width;
        });

        // VENTAS Headers
        const h2Headers = [
            'RAZÓN SOCIAL',
            'NÚMERO DE FACTURA',
            'FECHA EMISIÓN',
            'SUB TOTAL ',
            'VENTAS  TARIFA CERO',
            'IVA',
            'TOTAL'
        ];

        const h2Row = sVent.getRow(1);
        h2Row.height = 39.55;
        h2Headers.forEach((h, i) => {
            const cell = h2Row.getCell(i + 1);
            cell.value = h;
            cell.font = { bold: true, size: 12, name: 'Arial' };
            cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
            cell.border = {};
            cell.fill = { type: 'pattern', pattern: 'none' };
        });

        // VENTAS Data
        entities.forEach((ent, idx) => {
            const rIdx = idx + 2;
            const row = sVent.getRow(rIdx);
            row.height = 17;

            row.getCell(1).value = ent.razonSocial;
            row.getCell(2).value = ent.numeroFactura;
            row.getCell(3).value = ent.fechaEmisionFactura;
            row.getCell(4).value = ent.subtotal;
            row.getCell(5).value = ent.tarifaCero;
            row.getCell(6).value = ent.iva;

            if (ent.subtotal !== null && ent.subtotal !== 0) {
                row.getCell(7).value = {
                    formula: `+D${rIdx}+F${rIdx}`,
                    result: ent.total
                };
            } else {
                row.getCell(7).value = {
                    formula: `+E${rIdx}+F${rIdx}`,
                    result: ent.total
                };
            }

            for (let c = 1; c <= 7; c++) {
                const cell = row.getCell(c);
                cell.font = { size: 12, name: 'Arial' };
                cell.border = {};
                cell.fill = { type: 'pattern', pattern: 'none' };

                if (c === 1) {
                    cell.alignment = { horizontal: 'left', vertical: 'middle', wrapText: false };
                } else {
                    cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: false };
                }

                if (c === 3) {
                    cell.numFmt = 'dd/mm/yyyy';
                } else {
                    cell.numFmt = 'General';
                }
            }
        });

        // Ensure all comments and notes are completely cleaned from both worksheets
        for (const sheet of workbook.worksheets) {
            sheet.eachRow({ includeEmpty: true }, (row) => {
                row.eachCell({ includeEmpty: true }, (cell) => {
                    delete (cell as any)._comment;
                    delete (cell as any).note;
                    if (cell.model) {
                        delete (cell.model as any).comment;
                        delete (cell.model as any).note;
                    }
                });
            });
            if (sheet.model) {
                if ((sheet.model as any).comments) {
                    (sheet.model as any).comments = [];
                }
            }
        }

        // Hardcode specific column widths for VENTAS
        const h2Widths = [46.21, 15.99, 15.55, 14.1, 14.1, 14.55, 11.55];
        h2Widths.forEach((width, idx) => {
            sVent.getColumn(idx + 1).width = width;
        });

        await workbook.xlsx.writeFile(outputPath);
        await cleanupXlsxFile(outputPath);
    }
}
