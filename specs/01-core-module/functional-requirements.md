# Functional Requirements — Core Module

**Date:** 2026-07-13
**Status:** Draft

---

## FR-1: File Reading

- **FR-1.1:** Accept .xlsx files and read directly via ExcelJS
- **FR-1.2:** Accept .xls files and convert to .xlsx via SheetJS before processing
- **FR-1.3:** Suppress SheetJS console output during .xls conversion
- **FR-1.4:** Clean up temporary .xlsx file after conversion

## FR-2: Column Detection

- **FR-2.1:** Read column headers from row 1 (technical names)
- **FR-2.2:** Read secondary headers from row 2 if present (human names)
- **FR-2.3:** Detect color family (yellow, blue, red, green, purple) via HSL classification
- **FR-2.4:** Check data rows (row 3+) for blue/purple/yellow colors first
- **FR-2.5:** Fall back to row 2 for green, then row 1 for red
- **FR-2.6:** Classify colors based on HSL hue ranges with saturation/lightness guards

## FR-3: Column Deletion

- **FR-3.1:** Delete columns matching `deleteHeaders` by technical name
- **FR-3.2:** Delete columns with yellow color family
- **FR-3.3:** Union of both sets (no duplicates)
- **FR-3.4:** 14 columns deleted by header match, 1 additional by color (15 total)

## FR-4: Column Renaming

- **FR-4.1:** Replace 10 technical headers with human-readable output names
- **FR-4.2:** Match is case-insensitive
- **FR-4.3:** Unmatched headers pass through unchanged

## FR-5: Column Insertion

- **FR-5.1:** Insert TIPO GASTO column after DESCRIPCIÓN column
- **FR-5.2:** Value comes from TransformOptions.tipoGasto (default: 'EMPRESARIAL')

## FR-6: BASE CERO Calculation

- **FR-6.1:** Sum values from base0 + valice + exento + noobjiva per row
- **FR-6.2:** Handle numeric values and numeric strings
- **FR-6.3:** Non-numeric values treated as 0
- **FR-6.4:** Result placed before BASE IVA column
- **FR-6.5:** Original irbpnr column excluded from output

## FR-7: Formula Translation

- **FR-7.1:** Detect ExcelJS formula objects in cell values
- **FR-7.2:** Translate column references using column index map
- **FR-7.3:** Preserve absolute/relative reference markers ($)
- **FR-7.4:** Output #REF! for references to deleted columns

## FR-8: Style Processing

- **FR-8.1:** Strip highlight fill colors (yellow, blue, purple, red, green)
- **FR-8.2:** Strip highlight font colors (same families)
- **FR-8.3:** Strip column-level highlight styles
- **FR-8.4:** Remove conditional formatting
- **FR-8.5:** Remove merged cells
- **FR-8.6:** Remove comments and notes

## FR-9: Output Formatting

- **FR-9.1:** Header row: Arial 12, bold, centered, wrap text, height 31.2
- **FR-9.2:** Autofilter on all columns except last
- **FR-9.3:** Freeze pane at row 1
- **FR-9.4:** Data row font: Arial 12
- **FR-9.5:** Center alignment for columns 1,2,3,5,6,8,9,10,11,12
- **FR-9.6:** Left alignment for columns 4,7
- **FR-9.7:** Number format #,##0.00 for columns 9,10,11,12
- **FR-9.8:** Date format mm-dd-yy for column 5
- **FR-9.9:** Dynamic column width (min 8, max 50 default, max 80 for text)
- **FR-9.10:** Row height calculated from content wrapping

## FR-10: Post-Processing Cleanup

- **FR-10.1:** Strip orphaned fill definitions from styles.xml via JSZip
- **FR-10.2:** Remap fillId references after cleanup
- **FR-10.3:** Preserve fillId 0 (none) always

## FR-11: Validation

- **FR-11.1:** Throw error if any worksheet is empty after transformation
- **FR-11.2:** Validate input file exists and is readable
