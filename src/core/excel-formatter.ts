import * as ExcelJS from 'exceljs';

export function applyOutputFormatting(sheet: ExcelJS.Worksheet): void {
    if (sheet.rowCount === 0) return;

    // 1. Auto filter (all columns except last)
    const lastCol = sheet.columnCount > 1 ? sheet.columnCount - 1 : sheet.columnCount;
    const lastColLetter = String.fromCharCode(64 + lastCol);
    sheet.autoFilter = `A1:${lastColLetter}${sheet.rowCount}`;

    // 2. Freeze panes at row 2 (freeze header) and show grid lines
    sheet.views = [{ state: 'frozen', ySplit: 1, showGridLines: true }];

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
    const COL_MIN = 10; // slightly increased min width to avoid cramped columns
    const COL_MAX_DEFAULT = 50;
    const COL_MAX_TEXT = 80;
    const PAD = 4; // increased padding to ensure Excel/Numbers display correctly without truncating
    const CHAR_WIDTH: Record<string, number> = {
        'mm-dd-yy': 10,
        '#,##0.00': 12,
        '$#,##0.00': 14,
        '0%': 6,
    };
    // Columns that hold long text (RAZÓN SOCIAL, DESCRIPCIÓN)
    const textCols = new Set([4, 7]);

    const columnWidths: number[] = [];

    for (let c = 1; c <= sheet.columnCount; c++) {
        let maxWidth = 0;
        const col = sheet.getColumn(c);
        
        // Retrieve cell format or default
        const numFmt = col.numFmt || 'General';
        const fmtWidth = CHAR_WIDTH[numFmt] || 0;

        for (let r = 1; r <= sheet.rowCount; r++) {
            const cell = sheet.getRow(r).getCell(c);
            const val = cell.value;
            const cellFmt = cell.numFmt || numFmt;
            const cellFmtWidth = CHAR_WIDTH[cellFmt] || fmtWidth;

            if (val === null || val === undefined || val === '') continue;

            let w: number;
            if (typeof val === 'number') {
                if (cellFmtWidth) {
                    w = cellFmtWidth;
                } else {
                    // Approximate formatted number length (e.g. including decimals/commas)
                    const str = val.toFixed(2);
                    w = str.includes('.') ? str.length + Math.floor(str.length / 3) : str.length;
                }
            } else if (val instanceof Date) {
                w = cellFmtWidth || 10;
            } else if (typeof val === 'object' && 'formula' in val) {
                const result = (val as any).result;
                w = cellFmtWidth || (result != null ? String(result).length : 12);
            } else {
                const str = String(val);
                w = 0;
                for (const ch of str) {
                    w += ch.charCodeAt(0) > 0x2E80 ? 2 : 1;
                }
            }
            if (w > maxWidth) maxWidth = w;
        }

        // Header width (bold adds ~15% visually)
        const headerCell = sheet.getRow(1).getCell(c);
        const headerVal = headerCell.value;
        if (headerVal) {
            let hw = 0;
            for (const ch of String(headerVal)) {
                hw += ch.charCodeAt(0) > 0x2E80 ? 2 : 1;
            }
            hw = Math.ceil(hw * 1.15);
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

export function applyVentasOutputFormatting(sheet: ExcelJS.Worksheet): void {
    if (sheet.rowCount === 0) return;

    // AutoFilter and views removed to match RETENCIONES FINAL.xlsx structure
    sheet.autoFilter = undefined as any;
    sheet.views = [{ showGridLines: true }];

    // 3. Header row formatting (row 1)
    const headerRow = sheet.getRow(1);
    headerRow.height = 31.2;
    for (let c = 1; c <= sheet.columnCount; c++) {
        const cell = headerRow.getCell(c);
        cell.font = { bold: true, size: 12, name: 'Arial' };
        cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
    }

    // 4. Data rows formatting
    const leftCols = new Set([1]);
    const centerCols = new Set([2, 3]);
    const rightCols = new Set([4, 5, 6, 7]);
    const numberCols = new Set([4, 5, 6, 7]);
    const dateCol = 3;

    for (let r = 2; r <= sheet.rowCount; r++) {
        const row = sheet.getRow(r);
        for (let c = 1; c <= sheet.columnCount; c++) {
            const cell = row.getCell(c);
            cell.font = { size: 12, name: 'Arial' };

            if (leftCols.has(c)) {
                cell.alignment = { horizontal: 'left', vertical: 'middle' };
            } else if (centerCols.has(c)) {
                cell.alignment = { horizontal: 'center', vertical: 'middle' };
            } else if (rightCols.has(c)) {
                cell.alignment = { horizontal: 'right', vertical: 'middle' };
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
    const COL_MIN = 10;
    const COL_MAX_DEFAULT = 50;
    const COL_MAX_TEXT = 80;
    const PAD = 4;
    const CHAR_WIDTH: Record<string, number> = {
        'mm-dd-yy': 10,
        '#,##0.00': 12,
        '$#,##0.00': 14,
        '0%': 6,
    };
    const textCols = new Set([1]); // RAZÓN SOCIAL

    const columnWidths: number[] = [];

    for (let c = 1; c <= sheet.columnCount; c++) {
        let maxWidth = 0;
        const col = sheet.getColumn(c);
        
        // Retrieve cell format or default
        const numFmt = col.numFmt || 'General';
        const fmtWidth = CHAR_WIDTH[numFmt] || 0;

        for (let r = 1; r <= sheet.rowCount; r++) {
            const cell = sheet.getRow(r).getCell(c);
            const val = cell.value;
            const cellFmt = cell.numFmt || numFmt;
            const cellFmtWidth = CHAR_WIDTH[cellFmt] || fmtWidth;

            if (val === null || val === undefined || val === '') continue;

            let w: number;
            if (typeof val === 'number') {
                if (cellFmtWidth) {
                    w = cellFmtWidth;
                } else {
                    const str = val.toFixed(2);
                    w = str.includes('.') ? str.length + Math.floor(str.length / 3) : str.length;
                }
            } else if (val instanceof Date) {
                w = cellFmtWidth || 10;
            } else if (typeof val === 'object' && 'formula' in val) {
                const result = (val as any).result;
                w = cellFmtWidth || (result != null ? String(result).length : 12);
            } else {
                const str = String(val);
                w = 0;
                for (const ch of str) {
                    w += ch.charCodeAt(0) > 0x2E80 ? 2 : 1;
                }
            }
            if (w > maxWidth) maxWidth = w;
        }

        const headerCell = sheet.getRow(1).getCell(c);
        const headerVal = headerCell.value;
        if (headerVal) {
            let hw = 0;
            for (const ch of String(headerVal)) {
                hw += ch.charCodeAt(0) > 0x2E80 ? 2 : 1;
            }
            hw = Math.ceil(hw * 1.15);
            if (hw > maxWidth) maxWidth = hw;
        }

        const colMax = textCols.has(c) ? COL_MAX_TEXT : COL_MAX_DEFAULT;
        const final = Math.min(colMax, Math.max(COL_MIN, maxWidth + PAD));
        columnWidths.push(final);
        col.width = final;
    }

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

