# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.2.0] - 2026-07-14

### Added

- Modular CLI architecture: monolithic `src/cli.ts` split into `src/cli/` directory (`index`, `interactive`, `processor`, `progress`, `prompts`, `registry`)
- New retenciones module: `src/modules/retenciones/` with domain, mappers, and use-cases
- Web client enhancements: module selector (Facturas/Retenciones), Tailwind CSS 4, Zustand state management
- Custom output names per file
- Download individual files or bulk download
- Empty state UI for web client
- Module-aware processing for facturas and retenciones modules
- New commands: `/facturas`, `/retenciones`
- Column color detection for dynamic column identification
- Spec-driven development framework (`specs/` directory)
- Tests: 4 test files with 17 tests covering transformer, processor, and retenciones

### Changed

- Style cleanup via JSZip post-processing
- Output formatting improvements: dynamic column widths, date formatting
- Complete documentation rewrite

### Fixed

- Fixed ENOENT error when running `invo /web` after global npm install
- Fixed web assets not being included in npm package
- Web path resolution fix for npm global installation

### Removed

- Removed dead code: 5 unused transformer methods and unused imports

## [1.0.3] - 2026-07-03

### Changed

- Complete documentation rewrite
