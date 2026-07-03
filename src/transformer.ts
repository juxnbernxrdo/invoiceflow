import * as ExcelJS from 'exceljs';
import * as JSZip from 'jszip';
import * as fs from 'fs';
import * as path from 'path';
import * as XLSX from 'xlsx';
import { classifyColor, ColorFamily } from './utils/colors';
import { colIndexToLabel, translateFormula } from './utils/formulas';

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
}

// Semantic rules learned from the reference file.
// These are identified by header meaning, NOT by color or position.
// The CLI works on any file following the same structure, with or without color highlighting.
const SEMANTIC_RULES: TransformRules = {
    // Fields that represent auxiliary/complementary data not needed in the final output.
    // Identified by their technical header names (row 1).
    // These columns are highlighted in yellow or blue in the reference file.
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
        'base0',          // base tarifa 0% (integrated into irbpnr)
        'valice',         // valor ICE (integrated into irbpnr)
        'exento',         // exento de IVA (integrated into irbpnr)
        'noobjiva',       // no objeto de IVA (integrated into irbpnr)
    ],

    // Columns whose values must be summed to calculate "irbpnr" (tarifa 0%).
    // These represent values with 0% IVA rate and are highlighted in blue.
    sumHeaders: [
        'base0',          // base tarifa 0%
        'valice',         // valor ICE
        'exento',         // exento de IVA
        'noobjiva',       // no objeto de IVA
    ],

    // Target column that receives the sum of the sumHeaders columns.
    // This column is highlighted in purple in the reference file.
    targetHeader: 'irbpnr',
    targetHumanNames: ['irbpnr', 'base cero'],

    // Red→Green field replacements.
    // Format: { fromHeader: 'red_col', toHeader: 'green_col' }
    // The red columns (row 1) are replaced by green columns (row 2).
    replacements: [
        { fromHeader: 'idrecep', toHeader: 'ID RECEPTOR' },
        { fromHeader: 'secuenciales', toHeader: 'SECUENCIAL' },
        { fromHeader: 'ruc_emisor', toHeader: 'RUC EMISOR' },
        { fromHeader: 'razonsocial', toHeader: 'RAZÓN SOCIAL' },
        { fromHeader: 'fechaemi', toHeader: 'FECHA EMISIÓN' },
        { fromHeader: 'claveacceso', toHeader: 'CLAVE ACCESO' },
        { fromHeader: 'descripcion', toHeader: 'DESCRIPCIÓN' },
        { fromHeader: 'baseimp', toHeader: 'BASE IVA' },
        { fromHeader: 'valiva', toHeader: 'IVA' },
        { fromHeader: 'precio_t', toHeader: 'TOTAL' },
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

    public async transform(inputPath: string, outputPath: string): Promise<TransformStats> {
        this.totalSteps = 8; // Total de pasos de progreso
        this.currentStep = 0;

        const workbook = new ExcelJS.Workbook();
        
        // Check if file is .xls (old format) - need to convert first
        const ext = path.extname(inputPath).toLowerCase();
        let fileToRead = inputPath;
        let tempXlsxPath = '';
        
        if (ext === '.xls') {
            this.onProgress('Convirtiendo archivo .xls a .xlsx...');
            this.updateProgress('Convirtiendo archivo .xls a .xlsx...');
            // Use SheetJS to read .xls and write as .xlsx
            const xlsxWorkbook = XLSX.readFile(inputPath, { type: 'file' });
            tempXlsxPath = inputPath.replace(/\.xls$/i, '') + '_converted.xlsx';
            XLSX.writeFile(xlsxWorkbook, tempXlsxPath, { bookType: 'xlsx' });
            fileToRead = tempXlsxPath;
        }
        
        await workbook.xlsx.readFile(fileToRead);
        
        // Clean up temp file
        if (tempXlsxPath) {
            try { fs.unlinkSync(tempXlsxPath); } catch {}
        }
        
        this.updateProgress('Archivo cargado');
        this.updateProgress('Analizando hojas...');

        const stats: TransformStats = {
            originalColumns: 0,
            finalColumns: 0,
            deletedColumns: [],
            replacedColumns: [],
            recalculatedRows: 0,
        };

        for (const sheet of workbook.worksheets) {
            stats.originalColumns = Math.max(stats.originalColumns, sheet.columnCount);

            this.onProgress(`Detectando columnas en la hoja ${sheet.name}...`);
            const columns = this.readColumns(sheet);

            const deletedCols = this.matchDeleted(columns);
            const pairs = this.matchReplacements(columns, deletedCols);
            stats.deletedColumns.push(...deletedCols.map(c => c.headerTechnical || `Columna ${c.index}`));

            const getColByHeader = (tech: string) => columns.find(c => c.headerTechnical?.toLowerCase() === tech);
            const irbpnrCol = getColByHeader('irbpnr');
            const valiceCol = getColByHeader('valice');
            const exentoCol = getColByHeader('exento');
            const noobjivaCol = getColByHeader('noobjiva');

            // Identify blue columns (tarifa 0% components)
            const blueCols = columns.filter(c => c.colorFamily === 'blue');
            const purpleCol = columns.find(c => c.colorFamily === 'purple');

            this.onProgress(`Columnas azules detectadas: ${blueCols.length}`);
            this.updateProgress(`Columnas azules detectadas: ${blueCols.length}`);
            this.onProgress(`Columna púrpura detectada: ${purpleCol ? purpleCol.headerTechnical : 'No encontrada'}`);
            this.updateProgress(`Columna púrpura detectada: ${purpleCol ? purpleCol.headerTechnical : 'No encontrada'}`);
            
            if (purpleCol) {
                this.onProgress(`Calculando ${purpleCol.headerTechnical} como suma de columnas azules (tarifa 0%)...`);
                this.updateProgress(`Calculando ${purpleCol.headerTechnical} como suma de columnas azules (tarifa 0%)...`);
            }

            // Build set of column indices to exclude (deleted + green-side of replacements)
            const excludeIndices = new Set<number>();
            for (const d of deletedCols) excludeIndices.add(d.index);
            for (const p of pairs) excludeIndices.add(p.toIndex);

            // Columns to keep in the output
            const keepCols = columns.filter(c => !excludeIndices.has(c.index));
            stats.finalColumns = keepCols.length;

            // Map original 1-based column index → new 1-based column index
            const colMap = new Map<number, number>();
            keepCols.forEach((c, i) => colMap.set(c.index, i + 1));

            const getLabel = (colInfo?: ColumnInfo): string | null => {
                if (!colInfo) return null;
                const newIdx = colMap.get(colInfo.index);
                return newIdx ? colIndexToLabel(newIdx) : null;
            };

            const irbpnrLabel = getLabel(irbpnrCol);
            const valiceLabel = getLabel(valiceCol);
            const exentoLabel = getLabel(exentoCol);
            const noobjivaLabel = getLabel(noobjivaCol);

            this.onProgress('Transformando...');
            // Only 1 header row in output (row 1 with human names from green columns)
            const headerRowsCount = 1;
            const newData: any[][] = [];
            const newStyles: Partial<ExcelJS.Style>[][] = [];
            const rowHeights: number[] = [];

            // Get row 2 values for header replacement
            const row2 = sheet.getRow(2);

            // Find the last row with actual data (skip empty trailing rows)
            let lastDataRow = sheet.rowCount;
            while (lastDataRow > 2) {
                const checkRow = sheet.getRow(lastDataRow);
                let hasData = false;
                for (const col of keepCols) {
                    const cell = checkRow.getCell(col.index);
                    if (cell.value !== null && cell.value !== undefined && cell.value !== '') {
                        hasData = true;
                        break;
                    }
                }
                if (hasData) break;
                lastDataRow--;
            }

            for (let r = 1; r <= lastDataRow; r++) {
                const row = sheet.getRow(r);
                
                // Skip row 2 (green headers) - we'll use them in row 1
                if (r === 2) continue;
                
                rowHeights.push(row.height);

                const rowData: any[] = [];
                const rowStyle: Partial<ExcelJS.Style>[] = [];

                for (const col of keepCols) {
                    let srcIndex = col.index;

                    // If this column is the red-side of a replacement, use the green-side source
                    const rep = pairs.find(p => p.fromIndex === col.index);
                    if (rep) srcIndex = rep.toIndex;

                    const cell = row.getCell(srcIndex);
                    let val = cell.value;
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

                    delete (cell as any)._comment;

                    // For header row (r=1), use human name from row 2 if this column has a green header
                    if (r === 1) {
                        const cellR2 = row2.getCell(col.index);
                        if (cellR2.value) {
                            val = cellR2.value;
                        }
                    }

                    // Recalculate target columns for data rows
                    // Purple column (irbpnr) = sum of all blue columns (tarifa 0%)
                    // Note: r is the original row number, but in output row 2 is skipped
                    // So for formulas, we need to use r-1 when r > 2
                    const outputRow = r > 2 ? r - 1 : r;
                    
                    if (r > headerRowsCount && purpleCol && col.index === purpleCol.index) {
                        // Calculate sum of blue columns directly (hardcoded values, not formulas)
                        let sum = 0;
                        for (const blueCol of blueCols) {
                            const blueCell = row.getCell(blueCol.index);
                            const blueVal = blueCell.value;
                            if (typeof blueVal === 'number') {
                                sum += blueVal;
                            } else if (typeof blueVal === 'string' && !isNaN(Number(blueVal))) {
                                sum += Number(blueVal);
                            }
                        }
                        val = sum;
                        stats.recalculatedRows++;
                    } else if (r > headerRowsCount && val && typeof val === 'object' && 'formula' in val && val.formula) {
                        val = { formula: translateFormula(val.formula, colMap, r, outputRow), result: val.result };
                    }

                    rowData.push(val);
                    rowStyle.push(style);
                }

                newData.push(rowData);
                newStyles.push(rowStyle);
            }

            // Save column widths
            const colWidths = keepCols.map(c => sheet.getColumn(c.index).width);

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

        this.onProgress('Validando resultados...');
        this.updateProgress('Validando resultados...');
        for (const sheet of workbook.worksheets) {
            if (sheet.rowCount === 0) {
                throw new Error(`La hoja ${sheet.name} quedó vacía después del procesamiento.`);
            }
        }

        this.onProgress('Guardando archivo...');
        this.updateProgress('Guardando archivo...');
        await workbook.xlsx.writeFile(outputPath);

        this.onProgress('Limpiando estilos residuales del archivo...');
        this.updateProgress('Limpiando estilos residuales del archivo...');
        await this.cleanupXlsxFile(outputPath);

        this.onProgress('Proceso finalizado correctamente.');
        this.updateProgress('Proceso finalizado correctamente.');

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

    private matchSumColumns(columns: ColumnInfo[]): ColumnInfo[] {
        return columns.filter(c => this.matchHeader(c, SEMANTIC_RULES.sumHeaders));
    }

    private matchTarget(columns: ColumnInfo[]): ColumnInfo | undefined {
        return columns.find(c => this.matchHeaderSingle(c, SEMANTIC_RULES.targetHeader, SEMANTIC_RULES.targetHumanNames));
    }

    private matchReplacements(columns: ColumnInfo[], deletedCols: ColumnInfo[]): { fromIndex: number; toIndex: number }[] {
        const pairs: { fromIndex: number; toIndex: number }[] = [];
        const deletedIndices = new Set(deletedCols.map(c => c.index));
        const usedToIndices = new Set<number>();

        // Try to match by color first (red → green)
        // Red columns are those with red color in data rows
        // Green columns are those with green color in row 2 (human headers)
        const redCols = columns.filter(c => 
            !deletedIndices.has(c.index) && 
            c.colorFamily === 'red'
        );
        
        // For each red column, find a green column with similar header
        for (const redCol of redCols) {
            // Find green column by matching header patterns
            const greenCol = columns.find(c => 
                !deletedIndices.has(c.index) && 
                !usedToIndices.has(c.index) &&
                c.colorFamily === 'green' &&
                this.headersMatch(redCol, c)
            );
            
            if (greenCol) {
                pairs.push({ fromIndex: redCol.index, toIndex: greenCol.index });
                usedToIndices.add(greenCol.index);
            }
        }

        // Fallback to header-based matching
        if (pairs.length === 0) {
            for (const rule of SEMANTIC_RULES.replacements) {
                const fromCol = columns.find(c =>
                    !deletedIndices.has(c.index) && this.matchHeaderSingle(c, rule.fromHeader, [])
                );
                const toCol = columns.find(c =>
                    !deletedIndices.has(c.index) && !usedToIndices.has(c.index) && this.matchHeaderSingle(c, rule.toHeader, [])
                );
                if (fromCol && toCol) {
                    pairs.push({ fromIndex: fromCol.index, toIndex: toCol.index });
                    usedToIndices.add(toCol.index);
                }
            }
        }
        
        return pairs;
    }
    
    private headersMatch(col1: ColumnInfo, col2: ColumnInfo): boolean {
        // Simple heuristic: check if headers share common patterns
        const h1 = col1.headerTechnical?.toLowerCase() || '';
        const h2 = col2.headerHuman?.toLowerCase() || '';
        
        // Check for common prefixes or patterns
        if (h1.includes('id') && h2.includes('id')) return true;
        if (h1.includes('secuencia') && h2.includes('secuencia')) return true;
        if (h1.includes('ruc') && h2.includes('ruc')) return true;
        if (h1.includes('razon') && h2.includes('razón')) return true;
        if (h1.includes('fecha') && h2.includes('fecha')) return true;
        if (h1.includes('clave') && h2.includes('clave')) return true;
        if (h1.includes('descripcion') && h2.includes('descripción')) return true;
        if (h1.includes('base') && h2.includes('base')) return true;
        if (h1.includes('val') && h2.includes('iva')) return true;
        if (h1.includes('precio') && h2.includes('total')) return true;
        
        return false;
    }

    private matchHeader(col: ColumnInfo, targetHeaders: string[]): boolean {
        return this.matchHeaderSingle(col, null, targetHeaders) ||
            (col.headerTechnical !== null && targetHeaders.includes(col.headerTechnical.toLowerCase()));
    }

    // Check if a formula string references a specific column by its original 1-based index.
    private formulaReferencesColumn(formula: string, colOldIndex: number): boolean {
        const colLabel = colIndexToLabel(colOldIndex);
        // Match the column label followed by a row number (with optional $ signs)
        const pattern = new RegExp(`\\$?${colLabel}\\$?\\d+`);
        return pattern.test(formula);
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
