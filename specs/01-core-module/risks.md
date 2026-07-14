# Risks — Core Module

**Date:** 2026-07-13
**Status:** Draft

---

| ID | Risk | Probability | Impact | Mitigation |
|----|------|-------------|--------|------------|
| R1 | Refactoring transformer introduces subtle behavioral changes | Medium | High | Behavioral tests before refactoring; byte-identical output comparison |
| R2 | ExcelJS version incompatibility after refactor | Low | High | Pin ExcelJS version; test with existing .xlsx files |
| R3 | JSZip cleanup breaks on edge-case styles.xml | Low | Medium | Test with variety of input files; fallback to skip cleanup |
| R4 | Formula translation edge cases (nested references, named ranges) | Medium | Medium | Test with formulas in various positions; keep existing algorithm |
| R5 | Color detection regressions on non-standard highlights | Low | Medium | Test with files having various color schemes |
| R6 | .xls conversion loses data (sheet names > 31 chars) | Known | Low | Existing truncation logic preserved; test with long sheet names |
| R7 | Performance regression from additional component boundaries | Low | Low | Benchmark before/after; components are lightweight |
