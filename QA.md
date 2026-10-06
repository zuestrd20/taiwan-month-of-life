# Verification record

## Passed locally, 2026-10-06

- Node syntax checks for app.js and simulation.js.
- `npm test`: 13/13 automated tests passed.
- All 22 county/city names are unique and match the 22 official map features, including Penghu, Kinmen, and Lienchiang.
- County totals match the official XLS and aggregation of 7,781 official village CSV rows. National reconciliation: 7,492 births; 16,470 deaths.
- Every county's seeded 31-day simulation sums exactly to its original monthly total; repeat runs are identical; null is not coerced to zero.
- Date filtering is based on explicit Taiwan date strings, with first/last-day checks and no UTC parsing shifts.
- Sixteen unique news items, 15 counties, all occurrence dates within August 2026, separate publication dates, 14 null times and two sourced local times.
- News never changes population statistics. No individual birth/death records, private names, minor details, precise home points or reproduced news photos.
- Geometric source, revision, license, inset transformations and limitations retained.

## Independent static audit

Fixed fractional URL day normalization, paused replay URL state, manual reduced-motion anchor scrolling, decorative particle pointer interception, and correct even-odd county holes/clipping for Taipei/New Taipei and Chiayi City/County. Added regression checks for day normalization, fill rules and strict event validation. Further audit fixes: concise live status instead of rereading the full news grid, restored keyboard focus after map markers, explicit registration-geography label, actionable empty-state reset, touch-safe map labels, and larger phone labels with a county dropdown alternative. HTML validation found no duplicate IDs. No visual/browser claims are made from static checks.

## Not yet verified

- Live desktop/narrow-layout rendering, browser controls, Back/Forward, downloads, reduced-motion UI, and runtime console.
- Final remote site commit, corresponding GitHub Pages deployment, and HTTP availability of runtime assets.

## Publication state

Public repository created and native GitHub Pages `main` / root source saved. Initial README commit: `068aa1383a2376ca5063038f1dce6b9f296a2572`.

The first GitHub tree write returned `user cancelled MCP tool call`. No site commit or branch-ref update was attempted afterward, no alternate upload route was used, and publication is paused pending explicit clarification. Read-only check of remote `index.html` returned 404, so the site files are not present on the current default branch. A tree object might have been created before cancellation, but an unreferenced tree does not publish content.
