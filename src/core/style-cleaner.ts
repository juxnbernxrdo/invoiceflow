import * as fs from 'fs';
import * as JSZip from 'jszip';

// Post-save cleanup: remove orphaned fill definitions from the xlsx zip.
// ExcelJS may retain fill entries (e.g. yellow/blue highlights) that no active cell uses.
// This strips them so the output file contains zero visual artifacts from the reference.
export async function cleanupXlsxFile(filePath: string): Promise<void> {
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
