# Acceptance Criteria — Core Module

**Date:** 2026-07-13
**Status:** Draft

---

## AC-1: Transformation Identity

Given an input .xlsx file,
When processed with the refactored core,
Then the output must be byte-identical to the v1.0.3 output.

**Verification:** Compare output files before and after refactoring.

## AC-2: .xls Support

Given an input .xls file,
When processed,
Then it produces valid .xlsx output identical to .xlsx-converted-first processing.

## AC-3: Column Count

Given any valid input file,
When processed,
Then output has exactly 12 columns in the documented order.

## AC-4: BASE CERO Calculation

Given input with base0=100, valice=50, exento=25, noobjiva=10,
When processed,
Then BASE CERO = 185.

## AC-5: TIPO GASTO Insertion

Given options.tipoGasto = 'PERSONAL',
When processed,
Then column 8 (TIPO GASTO) contains 'PERSONAL'.

## AC-6: Style Cleanup

Given input with highlight colors,
When processed,
Then output has zero colored fills or fonts.

## AC-7: Formula Translation

Given input with formula in column C referencing column A,
When columns are rearranged,
Then the formula references are updated to the correct new positions.

## AC-8: Empty Row Removal

Given input with trailing empty rows,
When processed,
Then output has no trailing empty rows.

## AC-9: Build Pass

When `npm run build` is executed,
Then it completes with zero errors.

## AC-10: Tests Pass

When `npm test` is executed,
Then all tests pass with zero failures.
