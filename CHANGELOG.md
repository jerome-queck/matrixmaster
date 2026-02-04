# Changelog

Purpose:
- Provide a single, versioned record of user-visible changes.
- Ensure PRs map cleanly to release notes.

Update rules:
- Every PR must update `Unreleased` with bullet(s) in the right section.
- On release, move `Unreleased` entries into a new version section.
- Use the actual release date (YYYY-MM-DD).
- Internal refactors should note "no user-visible changes" under `Changed`.

Source of truth:
- PR descriptions and release notes drive entries here.
- Use `.github/PULL_REQUEST_TEMPLATE.md` to keep notes consistent.

## Unreleased
### Added

### Changed

### Fixed

### Deprecated

### Removed

### Security

## 1.1.0 - 2026-02-04
### Added
- Added analysis metrics (determinant, norms, condition number) to results, reports, and exports.

### Changed
- Improved matrix operations expression UX with validation and matrix-name insert chips.
- Enhanced the operation builder with reorder/duplicate/insert controls, inline dimensions, and clearer error summaries.
- Cached matrix expression parsing and builder conversion to reduce recomputation.
- Added analysis warnings for singular or ill-conditioned matrices when SVD is computed.

### Fixed

### Deprecated

### Removed
- Removed the Determinant of Operation mode; legacy states now load as Matrix Operations.

### Security

## 1.0.6 - 2026-02-04
### Added

### Changed
- Added package metadata fields to improve desktop packaging diagnostics.

### Fixed
- Ensured desktop update actions report unsupported states instead of failing silently in dev builds.
- Made desktop updates manual to align with the UI-driven flow.
- Prevented Windows installs from failing on macOS-only `dmg-license`.

### Deprecated

### Removed

### Security

## 1.0.5 - 2026-02-04
### Added

### Changed

### Fixed
- Prevented calculation views from crashing when summarized row-operation steps omit matrices.
- Fixed result detail panels referencing an undefined `props` value during rendering.

### Deprecated

### Removed

### Security

## 1.0.4 - 2026-02-04
### Added

### Changed

### Fixed
- Guarded storage access to prevent crashes when storage is blocked or full.
- Improved clipboard operations with safe fallbacks and error handling.
- Hardened auto-update error messaging and release artifact checks.

### Deprecated

### Removed

### Security

## 1.0.3 - 2026-02-04
### Added

### Changed
- Documented release-driven workflow, changelog policy, and PR template usage.

### Fixed

### Deprecated

### Removed

### Security
