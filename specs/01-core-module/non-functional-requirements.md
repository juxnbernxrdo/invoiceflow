# Non-Functional Requirements — Core Module

**Date:** 2026-07-13
**Status:** Draft

---

## NFR-1: Performance

- **NFR-1.1:** Process a single .xlsx file (< 1MB) in < 5 seconds on standard hardware
- **NFR-1.2:** Memory usage stays under 256MB for files up to 10MB
- **NFR-1.3:** No memory leaks when processing multiple files sequentially

## NFR-2: Reliability

- **NFR-2.1:** No data loss during transformation (input file untouched)
- **NFR-2.2:** Output file is always valid .xlsx (can be opened by Excel, LibreOffice)
- **NFR-2.3:** Temporary files are cleaned up even on error
- **NFR-2.4:** Partial failures don't corrupt already-processed files

## NFR-3: Compatibility

- **NFR-3.1:** Node.js >= 18.0.0
- **NFR-3.2:** Cross-platform: Linux, macOS, Windows
- **NFR-3.3:** Output compatible with Excel 2016+, LibreOffice Calc, Google Sheets

## NFR-4: Testability

- **NFR-4.1:** Core module can be tested without CLI or server
- **NFR-4.2:** ExcelTransformer accepts mock progress callbacks
- **NFR-4.3:** TransformStats provides enough data for test assertions

## NFR-5: Maintainability

- **NFR-5.1:** SEMANTIC_RULES are declarative and easy to modify
- **NFR-5.2:** Adding a new column operation requires changes in one place only
- **NFR-5.3:** Code follows existing TypeScript conventions
