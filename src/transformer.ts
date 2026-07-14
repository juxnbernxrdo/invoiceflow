import * as ExcelJS from 'exceljs';
import * as fs from 'fs';
import * as path from 'path';
import * as XLSX from 'xlsx';
import { classifyColor } from './utils/colors';
import { colIndexToLabel, translateFormula } from './utils/formulas';
import { TransformOptions, TransformStats, ProgressCallback } from './core/types';
import { SEMANTIC_RULES, TransformRules } from './core/semantic-rules';
import { ColumnInfo, readColumns, matchDeleted, matchHeader } from './core/column-detector';
import { applyOutputFormatting, applyVentasOutputFormatting } from './core/excel-formatter';
import { cleanupXlsxFile } from './core/style-cleaner';

export { TransformOptions, TransformStats, ProgressCallback } from './core/types';
export { TransformRules } from './core/semantic-rules';

export class ExcelTransformer {
    private onProgress: (msg: string) => void;
    private onProgressUpdate?: ProgressCallback;
    private totalSteps: number = 0;
    private currentStep: number = 0;

    constructor(onProgress: (msg: string) => void, onProgressUpdate?: ProgressCallback) {
        this.onProgress = onProgress;
        this.onProgressUpdate = onProgressUpdate;
    }

    private updateProgress(message: string) {
        this.currentStep++;
        if (this.onProgressUpdate) {
            this.onProgressUpdate(this.currentStep, this.totalSteps, message);
        }
    }

    public async transform(inputPath: string, outputPath: string, options?: TransformOptions): Promise<TransformStats> {
        this.totalSteps = 8;
        this.currentStep = 0;

        const tipoGastoValue = options?.tipoGasto || 'EMPRESARIAL';
        const moduleId = options?.module || 'facturas';

        const workbook = new ExcelJS.Workbook();

        // Check if file is .xls (old format) - need to convert first
        const ext = path.extname(inputPath).toLowerCase();
        let fileToRead = inputPath;
        let tempXlsxPath = '';

        if (ext === '.xls') {
            // Convert .xls to .xlsx using SheetJS (suppress all output)
            const origLog = console.log;
            const origWarn = console.warn;
            const origStdoutWrite = process.stdout.write.bind(process.stdout);
            const origStderrWrite = process.stderr.write.bind(process.stderr);
            console.log = () => {};
            console.warn = () => {};
            process.stdout.write = () => true;
            process.stderr.write = () => true;
            try {
                const xlsxWorkbook = XLSX.readFile(inputPath, { type: 'file' });
                for (const name of xlsxWorkbook.SheetNames) {
                    if (name.length > 31) {
                        const shortName = name.substring(0, 31);
                        xlsxWorkbook.Sheets[shortName] = xlsxWorkbook.Sheets[name];
                        delete xlsxWorkbook.Sheets[name];
                        const idx = xlsxWorkbook.SheetNames.indexOf(name);
                        xlsxWorkbook.SheetNames[idx] = shortName;
                    }
                }
                tempXlsxPath = inputPath.replace(/\.xls$/i, '') + '_converted.xlsx';
                XLSX.writeFile(xlsxWorkbook, tempXlsxPath, { bookType: 'xlsx' });
                fileToRead = tempXlsxPath;
            } finally {
                console.log = origLog;
                console.warn = origWarn;
                process.stdout.write = origStdoutWrite;
                process.stderr.write = origStderrWrite;
            }
        }

        await workbook.xlsx.readFile(fileToRead);

        this.updateProgress('Archivo cargado');

        const stats: TransformStats = {
            originalColumns: 0,
            finalColumns: 0,
            deletedColumns: [],
            replacedColumns: [],
            recalculatedRows: 0,
        };

        if (moduleId === 'retenciones') {
            const { TransformRetencionesUseCase } = await import('./modules/retenciones');
            const useCase = new TransformRetencionesUseCase();
            await useCase.execute(workbook, outputPath, stats);
            if (tempXlsxPath) {
                try { fs.unlinkSync(tempXlsxPath); } catch {}
            }
            this.updateProgress('Listo');
            return stats;
        }

        if (tempXlsxPath) {
            try { fs.unlinkSync(tempXlsxPath); } catch {}
        }

        for (const sheet of workbook.worksheets) {
            stats.originalColumns = Math.max(stats.originalColumns, sheet.columnCount);

            const columns = readColumns(sheet);

            const deletedCols = matchDeleted(columns);
            stats.deletedColumns.push(...deletedCols.map(c => c.headerTechnical || `Columna ${c.index}`));

            // Build set of column indices to exclude (deleted)
            const excludeIndices = new Set<number>();
            for (const d of deletedCols) excludeIndices.add(d.index);
            const newData: any[][] = [];
            const newStyles: Partial<ExcelJS.Style>[][] = [];
            const rowHeights: number[] = [];

            // Detect if row 2 is human headers or data
            // Old format: row 2 = human headers (text labels)
            // New format: row 2 = first data row (numbers, dates, IDs)
            const row2 = sheet.getRow(2);
            let row2IsData = false;
            if (sheet.rowCount >= 2) {
                let numericCount = 0;
                let totalChecked = 0;
                for (const col of columns) {
                    const cell = row2.getCell(col.index);
                    if (cell.value !== null && cell.value !== undefined && cell.value !== '') {
                        totalChecked++;
                        if (typeof cell.value === 'number' || cell.value instanceof Date) {
                            numericCount++;
                        }
                    }
                }
                // If most values are numeric/date, row 2 is data
                if (totalChecked > 0 && numericCount / totalChecked > 0.5) {
                    row2IsData = true;
                }
            }

            const headerRowsCount = row2IsData ? 1 : 2;

            // Find the last row with actual data (skip empty trailing rows)
            let lastDataRow = sheet.rowCount;
            while (lastDataRow > headerRowsCount) {
                const checkRow = sheet.getRow(lastDataRow);
                let hasData = false;
                for (const col of columns) {
                    const cell = checkRow.getCell(col.index);
                    if (cell.value !== null && cell.value !== undefined && cell.value !== '') {
                        hasData = true;
                        break;
                    }
                }
                if (hasData) break;
                lastDataRow--;
            }

            // Build output column order:
            // 1. Kept columns (not deleted) in their original order
            // 2. Insert fixed columns at specified positions
            // 3. Target column (irbpnr) is replaced by the calculated sum (BASE CERO)
            const keptCols = columns.filter(c => !excludeIndices.has(c.index));
            const targetColInfo = columns.find(c =>
                c.headerTechnical?.toLowerCase() === SEMANTIC_RULES.targetHeader.toLowerCase()
            );

            // Build the final output column list with fixed columns inserted
            interface OutputCol {
                type: 'data' | 'fixed' | 'calculated';
                colInfo?: ColumnInfo;
                fixedValue?: any;
                fixedHeader?: string;
            }

            const outputCols: OutputCol[] = [];
            const sumCols = columns.filter(c => matchHeader(c, SEMANTIC_RULES.sumHeaders));
            let baseCeroInserted = false;

            for (const col of keptCols) {
                // Skip the target column (irbpnr) — it will be replaced by calculated sum
                if (targetColInfo && col.index === targetColInfo.index) continue;

                // Insert BASE CERO before BASE IVA
                if (!baseCeroInserted && col.headerTechnical?.toLowerCase() === 'baseimp') {
                    outputCols.push({ type: 'calculated', fixedHeader: 'BASE CERO' });
                    baseCeroInserted = true;
                }

                outputCols.push({ type: 'data', colInfo: col });

                // Check if a fixed column should be inserted after this one
                for (const fc of SEMANTIC_RULES.fixedColumns) {
                    if (fc.position === 'after' && col.headerTechnical?.toLowerCase() === fc.refHeader.toLowerCase()) {
                        const fixedVal = fc.header === 'TIPO GASTO' ? tipoGastoValue : fc.value;
                        outputCols.push({ type: 'fixed', fixedValue: fixedVal, fixedHeader: fc.header });
                    }
                }
            }

            // If BASE CERO wasn't inserted yet (baseimp not found), add at end
            if (!baseCeroInserted) {
                outputCols.push({ type: 'calculated', fixedHeader: 'BASE CERO' });
            }

            stats.finalColumns = outputCols.length;

            // Map original 1-based column index → new 1-based column index (for formula translation)
            const dataCols = outputCols.filter(oc => oc.type === 'data' && oc.colInfo);
            const colMap = new Map<number, number>();
            dataCols.forEach((oc, i) => colMap.set(oc.colInfo!.index, i + 1));

            // Build header row using replacement rules
            const headerRow: any[] = outputCols.map(oc => {
                if (oc.type === 'fixed') return oc.fixedHeader;
                if (oc.type === 'calculated') return oc.fixedHeader;
                // Find replacement for this column
                const replacement = SEMANTIC_RULES.replacements.find(
                    r => r.fromHeader.toLowerCase() === oc.colInfo!.headerTechnical?.toLowerCase()
                );
                return replacement ? replacement.toHeader : oc.colInfo!.headerTechnical || '';
            });

            newData.push(headerRow);
            newStyles.push(outputCols.map(() => ({})));

            // Process data rows
            const dataStartRow = row2IsData ? 2 : 3;
            for (let r = dataStartRow; r <= lastDataRow; r++) {
                const row = sheet.getRow(r);
                rowHeights.push(row.height);

                const rowData: any[] = [];
                const rowStyle: Partial<ExcelJS.Style>[] = [];

                for (const oc of outputCols) {
                    let val: any;

                    if (oc.type === 'fixed') {
                        val = oc.fixedValue;
                    } else if (oc.type === 'calculated') {
                        // Calculate sum of sumHeaders
                        let sum = 0;
                        for (const sc of sumCols) {
                            const cell = row.getCell(sc.index);
                            const v = cell.value;
                            if (typeof v === 'number') {
                                sum += v;
                            } else if (typeof v === 'string' && !isNaN(Number(v))) {
                                sum += Number(v);
                            }
                        }
                        val = sum;
                        stats.recalculatedRows++;
                    } else {
                        // Data column
                        const col = oc.colInfo!;
                        const cell = row.getCell(col.index);
                        val = cell.value;
                        const style = { ...cell.style };

                        // Strip highlight fill colors
                        if (style.fill?.type === 'pattern' && style.fill.fgColor?.argb) {
                            if (classifyColor(style.fill.fgColor.argb) !== 'none') {
                                delete style.fill;
                            }
                        }
                        // Strip highlight font colors
                        if (style.font?.color?.argb) {
                            if (classifyColor(style.font.color.argb) !== 'none') {
                                delete style.font.color;
                            }
                        }

                        // Translate formulas to new column positions
                        if (val && typeof val === 'object' && 'formula' in val && val.formula) {
                            val = { formula: translateFormula(val.formula, colMap), result: val.result };
                        }

                        rowStyle.push(style);
                    }

                    rowData.push(val);
                    if (oc.type !== 'fixed' && oc.type !== 'calculated') {
                        // rowStyle already pushed for data columns
                    } else {
                        rowStyle.push({});
                    }
                }

                newData.push(rowData);
                newStyles.push(rowStyle);
            }

            // Save column widths
            const colWidths = dataCols.map(oc => {
                if (oc.colInfo) {
                    return sheet.getColumn(oc.colInfo.index).width;
                }
                return undefined;
            });

            // Clear the worksheet
            while (sheet.rowCount > 0) sheet.spliceRows(1, 1);

            // Strip column-level highlight styles
            for (let c = 1; c <= sheet.columnCount; c++) {
                const col = sheet.getColumn(c);
                if (col.style?.fill?.type === 'pattern' && col.style.fill.fgColor?.argb) {
                    if (classifyColor(col.style.fill.fgColor.argb) !== 'none') {
                        col.style = { ...col.style, fill: undefined };
                    }
                }
            }

            // Write transformed data back
            newData.forEach((rowVal, rIdx) => {
                const row = sheet.getRow(rIdx + 1);

                if (row.fill?.type === 'pattern' && row.fill.fgColor?.argb) {
                    if (classifyColor(row.fill.fgColor.argb) !== 'none') {
                        row.fill = undefined as any;
                    }
                }

                rowVal.forEach((val, cIdx) => {
                    const cell = row.getCell(cIdx + 1);
                    cell.value = val;
                    cell.style = newStyles[rIdx][cIdx];

                    delete (cell as any)._comment;
                    if (cell.model) {
                        delete (cell.model as any).comment;
                        delete (cell.model as any).note;
                    }
                });

                if (rowHeights[rIdx] !== undefined) {
                    row.height = rowHeights[rIdx];
                }
            });

            colWidths.forEach((width, cIdx) => {
                if (width !== undefined) sheet.getColumn(cIdx + 1).width = width;
            });

            // Clean up conditional formatting, comments, and merged cells
            if (sheet.model) {
                if ((sheet.model as any).conditionalFormattings) {
                    (sheet.model as any).conditionalFormattings = [];
                }
                if ((sheet.model as any).comments) {
                    (sheet.model as any).comments = [];
                }
                sheet.model.merges = [];
            }
        }

        this.updateProgress('Validando...');
        for (const sheet of workbook.worksheets) {
            if (sheet.rowCount === 0) {
                throw new Error(`La hoja ${sheet.name} quedó vacía después del procesamiento.`);
            }
        }

        // Apply output formatting to match reference style
        for (const sheet of workbook.worksheets) {
            applyOutputFormatting(sheet);
        }

        this.updateProgress('Guardando...');
        await workbook.xlsx.writeFile(outputPath);

        this.updateProgress('Limpiando...');
        await cleanupXlsxFile(outputPath);

        this.updateProgress('Listo');

        return stats;
    }

}
