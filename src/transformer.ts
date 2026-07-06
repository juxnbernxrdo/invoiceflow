import * as ExcelJS from 'exceljs';
import * as JSZip from 'jszip';
import * as fs from 'fs';
import * as path from 'path';
import * as XLSX from 'xlsx';
import { classifyColor, ColorFamily } from './utils/colors';
import { colIndexToLabel, translateFormula } from './utils/formulas';

export interface TransformOptions {
    tipoGasto?: string;
}

export interface TransformStats {
    originalColumns: number;
    finalColumns: number;
    deletedColumns: string[];
    replacedColumns: { red: string; green: string }[];
    recalculatedRows: number;
}

export type ProgressCallback = (current: number, total: number, message: string) => void;

export interface TransformRules {
    deleteHeaders: string[];
    sumHeaders: string[];
    targetHeader: string;
    targetHumanNames: string[];
    replacements: { fromHeader: string; toHeader: string }[];
    fixedColumns: { header: string; value: any; position: 'after' | 'before'; refHeader: string }[];
}

// Semantic rules: 26-column input → 12-column output.
// Columns are identified by header meaning, NOT by color or position.
const SEMANTIC_RULES: TransformRules = {
    // Columns to DELETE from output (14 columns)
    deleteHeaders: [
        'tpcomproba',     // tipo comprobante
        'numautori',      // número autorización
        'fecautori',      // fecha autorización
        'placa',          // placa vehicular
        'nro_item',       // número ítem
        'codprincipal',   // código principal producto
        'codauxiliar',    // código auxiliar producto
        'cantidad',       // cantidad
        'precio_u',       // precio unitario
        'descuento',      // descuento
        'poriva',         // porcentaje IVA
        'base0',          // base tarifa 0% (used in BASE CERO calc, then deleted)
        'valice',         // valor ICE (used in BASE CERO calc, then deleted)
        'exento',         // exento de IVA (used in BASE CERO calc, then deleted)
        'noobjiva',       // no objeto de IVA (used in BASE CERO calc, then deleted)
    ],

    // Columns summed to calculate BASE CERO (tarifa 0%)
    sumHeaders: [
        'base0',          // base tarifa 0%
        'valice',         // valor ICE
        'exento',         // exento de IVA
        'noobjiva',       // no objeto de IVA
    ],

    // irbpnr is NOT a sum column — it's a legacy column that gets deleted.
    // Its value is NOT used in the output. BASE CERO is recalculated from sumHeaders.

    // Target column that receives the sum of sumHeaders.
    // In the output this appears as "BASE CERO".
    targetHeader: 'irbpnr',
    targetHumanNames: ['base cero', 'base0'],

    // Column header replacements (technical → human-readable output header)
    replacements: [
        { fromHeader: 'idrecep', toHeader: 'ID RECEPTOR' },
        { fromHeader: 'secuenciales', toHeader: 'SECUENCIAL ' },
        { fromHeader: 'ruc_emisor', toHeader: 'RUC EMISOR' },
        { fromHeader: 'razonsocial', toHeader: 'RAZÓN SOCIAL' },
        { fromHeader: 'fechaemi', toHeader: 'FECHA EMISIÓN' },
        { fromHeader: 'claveacceso', toHeader: 'CLAVE ACCESO' },
        { fromHeader: 'descripcion', toHeader: 'DESCRIPCIÓN' },
        { fromHeader: 'baseimp', toHeader: 'BASE  IVA' },
        { fromHeader: 'valiva', toHeader: 'IVA' },
        { fromHeader: 'precio_t', toHeader: 'TOTAL' },
    ],

    // Fixed columns inserted into the output (not from input)
    // value is a placeholder — actual value comes from TransformOptions.tipoGasto
    fixedColumns: [
        { header: 'TIPO GASTO', value: '', position: 'after', refHeader: 'descripcion' },
    ],
};

interface ColumnInfo {
    index: number;
    headerTechnical: string | null;
    headerHuman: string | null;
    colorFamily: ColorFamily; // Color detected in data rows (row 3+)
}

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
        
        if (tempXlsxPath) {
            try { fs.unlinkSync(tempXlsxPath); } catch {}
        }
        
        this.updateProgress('Archivo cargado');

        const stats: TransformStats = {
            originalColumns: 0,
            finalColumns: 0,
            deletedColumns: [],
            replacedColumns: [],
            recalculatedRows: 0,
        };

        for (const sheet of workbook.worksheets) {
            stats.originalColumns = Math.max(stats.originalColumns, sheet.columnCount);

            const columns = this.readColumns(sheet);

            const deletedCols = this.matchDeleted(columns);
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
            const sumCols = columns.filter(c => this.matchHeader(c, SEMANTIC_RULES.sumHeaders));
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
            if (sheet.rowCount === 0) continue;

            // 1. Auto filter (all columns except last)
            const lastCol = sheet.columnCount > 1 ? sheet.columnCount - 1 : sheet.columnCount;
            const lastColLetter = String.fromCharCode(64 + lastCol);
            sheet.autoFilter = `A1:${lastColLetter}${sheet.rowCount}`;

            // 2. Freeze panes at row 2 (freeze header)
            sheet.views = [{ state: 'frozen', ySplit: 1 }];

            // 3. Header row formatting (row 1)
            const headerRow = sheet.getRow(1);
            headerRow.height = 31.2;
            for (let c = 1; c <= sheet.columnCount; c++) {
                const cell = headerRow.getCell(c);
                cell.font = { bold: true, size: 12, name: 'Arial' };
                cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
            }

            // 4. Data rows formatting
            const centerCols = new Set([1, 2, 3, 5, 6, 8, 9, 10, 11, 12]);
            const leftCols = new Set([4, 7]);
            const numberCols = new Set([9, 10, 11, 12]); // I,J,K,L
            const dateCol = 5;

            for (let r = 2; r <= sheet.rowCount; r++) {
                const row = sheet.getRow(r);
                for (let c = 1; c <= sheet.columnCount; c++) {
                    const cell = row.getCell(c);
                    cell.font = { size: 12, name: 'Arial' };

                    if (centerCols.has(c)) {
                        cell.alignment = { horizontal: 'center', vertical: 'middle' };
                    } else if (leftCols.has(c)) {
                        cell.alignment = { horizontal: 'left', vertical: 'middle' };
                    }

                    if (numberCols.has(c)) {
                        cell.numFmt = '#,##0.00';
                    }
                    if (c === dateCol) {
                        cell.numFmt = 'mm-dd-yy';
                    }
                }
            }

            // 5. Auto-width and row height
            const COL_MIN = 8;
            const COL_MAX_DEFAULT = 50;
            const COL_MAX_TEXT = 80;
            const PAD = 2;
            const CHAR_WIDTH: Record<string, number> = {
                'mm-dd-yy': 10,
                '#,##0.00': 10,
                '$#,##0.00': 11,
                '0%': 6,
            };
            // Columns that hold long text (RAZÓN SOCIAL, DESCRIPCIÓN)
            const textCols = new Set([4, 7]);

            const columnWidths: number[] = [];

            for (let c = 1; c <= sheet.columnCount; c++) {
                let maxWidth = 0;
                const col = sheet.getColumn(c);
                const numFmt = col.numFmt || 'General';
                const fmtWidth = CHAR_WIDTH[numFmt] || 0;

                for (let r = 1; r <= sheet.rowCount; r++) {
                    const cell = sheet.getRow(r).getCell(c);
                    const val = cell.value;
                    if (val === null || val === undefined || val === '') continue;

                    let w: number;
                    if (typeof val === 'number') {
                        w = fmtWidth || String(val).length;
                    } else if (val instanceof Date) {
                        w = fmtWidth || 10;
                    } else if (typeof val === 'object' && 'formula' in val) {
                        const result = (val as any).result;
                        w = fmtWidth || (result != null ? String(result).length : 8);
                    } else {
                        const str = String(val);
                        w = 0;
                        for (const ch of str) {
                            w += ch.charCodeAt(0) > 0x2E80 ? 2 : 1;
                        }
                    }
                    if (w > maxWidth) maxWidth = w;
                }

                // Header width (bold adds ~10%)
                const headerCell = sheet.getRow(1).getCell(c);
                const headerVal = headerCell.value;
                if (headerVal) {
                    let hw = 0;
                    for (const ch of String(headerVal)) {
                        hw += ch.charCodeAt(0) > 0x2E80 ? 2 : 1;
                    }
                    hw = Math.ceil(hw * 1.1);
                    if (hw > maxWidth) maxWidth = hw;
                }

                const colMax = textCols.has(c) ? COL_MAX_TEXT : COL_MAX_DEFAULT;
                const final = Math.min(colMax, Math.max(COL_MIN, maxWidth + PAD));
                columnWidths.push(final);
                col.width = final;
            }

            // Row height: calculate based on wrap for each row
            const BASE_HEIGHT = 15;
            const LINE_HEIGHT = 15;

            for (let r = 2; r <= sheet.rowCount; r++) {
                const row = sheet.getRow(r);
                let maxLines = 1;

                for (let c = 1; c <= sheet.columnCount; c++) {
                    const cell = row.getCell(c);
                    const val = cell.value;
                    if (val === null || val === undefined || val === '') continue;
                    if (typeof val === 'object' && 'formula' in val) continue;

                    const colWidth = columnWidths[c - 1];
                    const str = String(val);
                    const lines = str.split(/\r?\n/);
                    let cellLines = 0;

                    for (const line of lines) {
                        let lineW = 0;
                        for (const ch of line) {
                            lineW += ch.charCodeAt(0) > 0x2E80 ? 2 : 1;
                        }
                        cellLines += Math.max(1, Math.ceil(lineW / colWidth));
                    }

                    if (cellLines > maxLines) maxLines = cellLines;
                }

                if (maxLines > 1) {
                    row.height = BASE_HEIGHT + (maxLines - 1) * LINE_HEIGHT;
                }
            }
        }

        this.updateProgress('Guardando...');
        await workbook.xlsx.writeFile(outputPath);

        this.updateProgress('Limpiando...');
        await this.cleanupXlsxFile(outputPath);

        this.updateProgress('Listo');

        return stats;
    }

    private readColumns(sheet: ExcelJS.Worksheet): ColumnInfo[] {
        const h1 = sheet.getRow(1);
        const h2 = sheet.getRow(2);
        const cols: ColumnInfo[] = [];
        for (let i = 1; i <= sheet.columnCount; i++) {
            // Priority: data rows (blue/purple/yellow) > row 2 (green) > row 1 (red)
            let detectedColor: ColorFamily = 'none';
            
            // First check data rows for blue/purple/yellow (highest priority)
            for (let r = 3; r <= Math.min(sheet.rowCount, 10); r++) {
                const cell = sheet.getRow(r).getCell(i);
                if (cell.fill?.type === 'pattern' && cell.fill.fgColor?.argb) {
                    const color = classifyColor(cell.fill.fgColor.argb);
                    if (color === 'blue' || color === 'purple' || color === 'yellow') {
                        detectedColor = color;
                        break;
                    }
                }
            }
            
            // If no blue/purple/yellow found, check row 2 for green
            if (detectedColor === 'none') {
                const cellR2 = h2.getCell(i);
                if (cellR2.fill?.type === 'pattern' && cellR2.fill.fgColor?.argb) {
                    const color = classifyColor(cellR2.fill.fgColor.argb);
                    if (color === 'green') {
                        detectedColor = 'green';
                    }
                }
            }
            
            // If still no color, check row 1 for red
            if (detectedColor === 'none') {
                const cellR1 = h1.getCell(i);
                if (cellR1.fill?.type === 'pattern' && cellR1.fill.fgColor?.argb) {
                    const color = classifyColor(cellR1.fill.fgColor.argb);
                    if (color === 'red') {
                        detectedColor = 'red';
                    }
                }
            }
            
            cols.push({
                index: i,
                headerTechnical: h1.getCell(i).value ? String(h1.getCell(i).value).trim() : null,
                headerHuman: h2.getCell(i).value ? String(h2.getCell(i).value).trim() : null,
                colorFamily: detectedColor,
            });
        }
        return cols;
    }

    private matchDeleted(columns: ColumnInfo[]): ColumnInfo[] {
        // Match by color (yellow) AND by header names (deleteHeaders)
        const yellowCols = columns.filter(c => c.colorFamily === 'yellow');
        const headerCols = columns.filter(c => this.matchHeader(c, SEMANTIC_RULES.deleteHeaders));
        
        // Combine both sets (removing duplicates)
        const deletedIndices = new Set<number>();
        const result: ColumnInfo[] = [];
        
        for (const col of [...yellowCols, ...headerCols]) {
            if (!deletedIndices.has(col.index)) {
                deletedIndices.add(col.index);
                result.push(col);
            }
        }
        
        return result;
    }

    private matchHeader(col: ColumnInfo, targetHeaders: string[]): boolean {
        return this.matchHeaderSingle(col, null, targetHeaders) ||
            (col.headerTechnical !== null && targetHeaders.includes(col.headerTechnical.toLowerCase()));
    }

    private matchHeaderSingle(col: ColumnInfo, technicalTarget: string | null, humanTargets: string[]): boolean {
        if (technicalTarget && col.headerTechnical?.toLowerCase() === technicalTarget.toLowerCase()) return true;
        if (col.headerHuman) {
            const h = col.headerHuman.toLowerCase();
            for (const t of humanTargets) {
                if (h === t.toLowerCase()) return true;
            }
        }
        return false;
    }

    // Post-save cleanup: remove orphaned fill definitions from the xlsx zip.
    // ExcelJS may retain fill entries (e.g. yellow/blue highlights) that no active cell uses.
    // This strips them so the output file contains zero visual artifacts from the reference.
    private async cleanupXlsxFile(filePath: string): Promise<void> {
        const data = fs.readFileSync(filePath);
        const zip = await JSZip.loadAsync(data);

        const stylesFile = zip.file('xl/styles.xml');
        if (!stylesFile) return;

        let stylesXml = await stylesFile.async('string');

        // 1. Find which xf (cell style) indices are actually used by cells in any sheet
        const activeXfIds = new Set<number>();
        for (const filename of Object.keys(zip.files)) {
            if (!filename.startsWith('xl/worksheets/sheet')) continue;
            const sheetFile = zip.file(filename);
            if (!sheetFile) continue;
            const sheetXml = await sheetFile.async('string');
            for (const m of sheetXml.matchAll(/<c\s[^>]*?s="(\d+)"/g)) {
                activeXfIds.add(parseInt(m[1], 10));
            }
        }

        // 2. Parse cellXfs entries in order and find fillIds used by active xf entries
        const cellXfsMatch = stylesXml.match(/<cellXfs[^>]*>([\s\S]*?)<\/cellXfs>/);
        const activeFillIds = new Set<number>([0]); // always keep fillId 0 (none)

        if (cellXfsMatch) {
            const xfRe = /<xf\s[\s\S]*?\/>/g;
            let xfIdx = 0;
            let xfMatch: RegExpExecArray | null;
            while ((xfMatch = xfRe.exec(cellXfsMatch[1])) !== null) {
                if (activeXfIds.has(xfIdx)) {
                    const fid = xfMatch[0].match(/fillId="(\d+)"/);
                    if (fid) activeFillIds.add(parseInt(fid[1], 10));
                }
                xfIdx++;
            }
        }

        // 3. Parse individual <fill>...</fill> tags, keep only active ones
        const fillTagRe = /<fill>[\s\S]*?<\/fill>/g;
        const keptFills: string[] = [];
        const fillIndexMap = new Map<number, number>();
        let fillIdx = 0;
        let m: RegExpExecArray | null;

        while ((m = fillTagRe.exec(stylesXml)) !== null) {
            if (activeFillIds.has(fillIdx)) {
                fillIndexMap.set(fillIdx, keptFills.length);
                keptFills.push(m[0]);
            }
            fillIdx++;
        }

        if (keptFills.length === fillIdx) return;

        // 4. Replace the <fills> block
        stylesXml = stylesXml.replace(
            /<fills[^>]*>[\s\S]*?<\/fills>/,
            `<fills count="${keptFills.length}">${keptFills.join('')}</fills>`
        );

        // 5. Update fillId references: remap old indices to new ones
        stylesXml = stylesXml.replace(/fillId="(\d+)"/g, (_: string, oldId: string) => {
            const newId = fillIndexMap.get(parseInt(oldId, 10));
            return `fillId="${newId !== undefined ? newId : 0}"`;
        });

        // 6. Write back
        zip.file('xl/styles.xml', stylesXml);
        const output = await zip.generateAsync({ type: 'nodebuffer' });
        fs.writeFileSync(filePath, output);
    }

}
