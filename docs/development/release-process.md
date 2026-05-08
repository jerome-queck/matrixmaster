# Release Process

Matrix Master uses release-driven PRs. Each meaningful PR declares whether it is
a `patch`, `minor`, or `major` change and keeps release notes aligned with the
changelog.

## Local Checklist

1. Confirm the PR scope is one theme.
2. Choose the SemVer bump category.
3. Update `package.json` and `package-lock.json` for release PRs.
4. Update `CHANGELOG.md` under `Unreleased` for user-visible or
   release-relevant changes. For docs-only or internal-only PRs with no release
   note impact, state `No changelog entry` in the PR.
5. Run the appropriate verification gate:
   - normal PR: `npm run test` or `npm run verify`
   - desktop/build PR: `npm run verify:desktop`
   - release PR: `npm run release:check`
6. Confirm generated dependency/build outputs are not committed:
   - `node_modules/`
   - `dist/`
   - `electron-dist/`
   - `.cache/`
7. Fill in `.github/PULL_REQUEST_TEMPLATE.md`.

## Release Candidate Gate

`npm run release:check` is the canonical local release gate. It checks that
`package.json` and `package-lock.json` agree on the version, runs tests,
packages Electron artifacts, and verifies update metadata.

GitHub Actions also runs `Release Check` on macOS and Windows for PRs. Treat CI
as the merge gate for release candidates because desktop packaging can differ by
platform.

## Desktop Artifacts

Electron builder emits packaged artifacts and update metadata. Expected metadata
includes:

- macOS: `latest-mac.yml`
- Windows: `latest.yml`

The helper `scripts/check-release-artifacts.js` checks both `dist/` and
`electron-dist/` for update metadata because local and CI packaging paths can
vary.

## Publishing

For an actual release:

1. Move `CHANGELOG.md` `Unreleased` entries into a dated version section.
2. Confirm `Unreleased` is empty after the release entry is created.
3. Confirm CI passed on macOS and Windows.
4. Publish the GitHub release with the desktop artifacts.
5. Tag the release using the current project release process.
6. Merge the release PR and delete the remote branch.

## Rollback

Prefer reverting the release PR or publishing a patch release. If desktop
artifacts are bad, remove or replace the GitHub Release artifacts and document
the mitigation in the follow-up PR.
