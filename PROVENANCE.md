# Provenance

This repository is a public copy of selected files from a private repository. It has fresh history because the private history contains personal contact details.

| | |
|---|---|
| Source revision | `11e899b` |
| Private history at that revision | 23 commits. First commit 2026-03-01, last feature commit 2026-03-05, maintenance on 2026-04-30 and 2026-05-02, documentation on 2026-07-08 |

Files were read from the committed revision with `git archive`, then passed through a scripted allowlist, redaction and deny-list check.

## Files written for this copy

- `README.md`, `PROVENANCE.md`
- `tests/estimator.test.mjs`, `.github/workflows/ci.yml`
- `docs/images`, captured from the live site

Everything else is project code.

## Left out

- The original README, agent instruction files and editor rules
- Framework default images

## Changed

- The owner's email in the admin checks and in the row-level security policies is `owner@example.com`.
- The owner's social handle is the placeholder `your_handle`.
- Quoted remarks are removed from comments, and em dashes in code comments are normalised to hyphens.

## Verification

`pnpm build`, `tsc --noEmit` and `tests/estimator.test.mjs` were run on this copy. The build needs no environment variables.
