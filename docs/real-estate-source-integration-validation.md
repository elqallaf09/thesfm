# Property source integration validation

## 2026-09-16

Connected-source implementation commit: `955ddfe6c2844d2fe744752d7a90148b0bb5f54c`.
Integrated reviewed main `c12b50fc8c6cc0577082cdb534b89608feef3d53` via merge `948dd7fb5bcdc07a4093b70b77ae5ef9b143146b`, preserving both economic-intelligence and colocated property test discovery. The completed one-shot write-capable integration workflow was removed in `68b1dbff722e6132f6ce862dcc27fe4686913d35`.

Initial source verification: https://github.com/elqallaf09/thesfm/actions/runs/35114794628

- Passed full TypeScript, ESLint/no warning-debt growth, translation parity and source-maintainability checks.
- Passed 58 deterministic tests across 14 source/request/UI/persistence test files.
- The real-source test correctly FAILED: the latest published transaction's municipality was missing from the returned directory. This was not treated as successful ingestion and no test assertion was weakened.

Read-only public diagnostic: https://github.com/elqallaf09/thesfm/actions/runs/35115310954

The actual first grouped API response returned `total_count: 100` and 100 rows, but no Umm Slal rows although the latest public transaction is in that municipality. The implementation had treated this page-capped grouped count as the entire directory and stopped at page one. The fix continues until a short page, uses every grouped field in the sort order, and still fails closed at the overall page budget rather than silently truncating. New unconditional tests model capped counts, later pages, duplicate bilingual rows and the hard pagination bound.

The diagnostic workflow is removed after use. Production was not read or written by either public probe. Exact-current-head live-source and browser results must still be obtained; this document does not assume they passed from mocked tests.
