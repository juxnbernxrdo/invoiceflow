import * as ExcelJS from 'exceljs';
import { classifyColor, ColorFamily } from '../utils/colors';
import { SEMANTIC_RULES } from './semantic-rules';

export interface ColumnInfo {
    index: number;
    headerTechnical: string | null;
    headerHuman: string | null;
    colorFamily: ColorFamily;
}

export function readColumns(sheet: ExcelJS.Worksheet): ColumnInfo[] {
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

export function matchHeader(col: ColumnInfo, targetHeaders: string[]): boolean {
    return matchHeaderSingle(col, null, targetHeaders) ||
        (col.headerTechnical !== null && targetHeaders.includes(col.headerTechnical.toLowerCase()));
}

export function matchHeaderSingle(col: ColumnInfo, technicalTarget: string | null, humanTargets: string[]): boolean {
    if (technicalTarget && col.headerTechnical?.toLowerCase() === technicalTarget.toLowerCase()) return true;
    if (col.headerHuman) {
        const h = col.headerHuman.toLowerCase();
        for (const t of humanTargets) {
            if (h === t.toLowerCase()) return true;
        }
    }
    return false;
}

export function matchDeleted(columns: ColumnInfo[]): ColumnInfo[] {
    // Match by color (yellow) AND by header names (deleteHeaders)
    const yellowCols = columns.filter(c => c.colorFamily === 'yellow');
    const headerCols = columns.filter(c => matchHeader(c, SEMANTIC_RULES.deleteHeaders));

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
