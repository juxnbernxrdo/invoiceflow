export function colIndexToLabel(index: number): string {
    let label = '';
    let temp = index;
    while (temp > 0) {
        const remainder = (temp - 1) % 26;
        label = String.fromCharCode(65 + remainder) + label;
        temp = Math.floor((temp - remainder - 1) / 26);
    }
    return label;
}

export function labelToColIndex(label: string): number {
    let index = 0;
    const cleanLabel = label.replace(/\$/g, '').toUpperCase();
    for (let i = 0; i < cleanLabel.length; i++) {
        index = index * 26 + (cleanLabel.charCodeAt(i) - 64);
    }
    return index;
}

export function translateFormula(
    formula: string, 
    colMap: Map<number, number>, 
    originalRow?: number, 
    outputRow?: number
): string {
    // Matches patterns like A1, $A$1, AA123, $AB$12
    return formula.replace(/(\$?)([A-Z]+)(\$?)(\d+)/g, (match, prefix, colLabel, rowDollar, rowNum) => {
        const oldIndex = labelToColIndex(colLabel);
        const newIndex = colMap.get(oldIndex);
        
        // Adjust row number if needed
        let newRowNum = parseInt(rowNum, 10);
        if (originalRow !== undefined && outputRow !== undefined && newRowNum === originalRow) {
            newRowNum = outputRow;
        }
        
        if (newIndex !== undefined) {
            const newLabel = colIndexToLabel(newIndex);
            return `${prefix}${newLabel}${rowDollar}${newRowNum}`;
        } else {
            // If the referenced column was deleted
            return '#REF!';
        }
    });
}
