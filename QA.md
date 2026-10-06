# Verification record — 2026-10-06

## Automated and independent data audit

`npm test`: **13/13 tests passed**. Node syntax checks passed for app.js and simulation.js.

- All 22 unique county/city names and codes match the official map, including Penghu, Kinmen and Lienchiang.
- Independently re-aggregated 7,781 official village CSV rows: every county birth, death and population value matches the official county XLS. Raw-file checksums match. National totals: **7,492 births / 16,470 deaths**.
- Each seeded 31-day county distribution conserves its monthly total, repeats exactly, keeps missing values null, and does not mix real-news counts into registration statistics.
- Date filters use Taiwan calendar-day strings, without UTC shifts. URL day values normalize to valid integers.
- Sixteen unique events across 15 counties, all occurring in August 2026, with separate publication dates; 14 unknown times and two explicit sourced local times. Validation rejects impossible dates, invalid URLs, unknown categories and unknown counties.
- Official geometry source and revision, license, offshore scaling/relocation and omitted distant islands are disclosed. Even-odd fill/clip rules preserve Taipei and Chiayi City enclaves.
- No individual birth/death records, private names, minors' personal details, precise home points or reproduced news photos.
- DOM content uses textContent rather than injecting untrusted HTML; news URLs require HTTPS. HTML has no duplicate IDs.

## Live cloud Chrome checks passed

Tested the public GitHub Pages application, not a file/localhost substitute.

- Desktop layout: recognizable mainland, all county controls, Penghu/Kinmen/Lienchiang insets and Wuqiu sub-inset; timeline, disclosure and statistics panels render.
- Narrow responsive layout: ordinary Chrome zoom produced **393 CSS px** viewport; layout stacks, controls remain usable, and document/body width does not exceed viewport. This is a desktop-browser responsive test, not a physical-phone or touch-device test. Dense city labels have the fully accessible county dropdown alternative.
- Lienchiang selection displays **7 / 3** births/deaths; Taipei displays **809 / 1,600**; nationwide **7,492 / 16,470**.
- First-day / last-day keyboard slider boundaries: **8/1 → 1 story**, **8/31 → 16 stories**. County filter, reset and browser Back restore correct state.
- Lienchiang no-news empty state switches from “see month end” to actionable “view all Taiwan news”; returns all 16 entries.
- Turning off culture leaves 13 stories; turning off news removes all news markers and shows explanatory empty state. Turning off both simulated life layers hides every particle without changing official totals.
- Playback advances the day; pause stops playback and saves the actual paused date into the URL. Speed selection works.
- Manual reduced motion disables smooth scrolling, stops the current playback and holds particle animation. System preference support is covered by source inspection; the operating-system preference was not changed.
- Keyboard county selection works for Taipei. Keyboard news-marker activation focuses the journal heading. Kaohsiung entry shows occurrence **2026-08-23 21:45 Taiwan time**, separate publication **2026-08-24**. Unknown times remain explicitly unknown.
- Browser-generated CSV downloaded successfully: **682 county/day rows**, 22 counties, August 1–31, exact totals **7,492 / 16,470**, simulation disclaimer on every row.
- No application-origin errors/warnings captured. The managed browser extension emitted unrelated metadata errors; these are not application errors.

## Publication verification

Initial complete site commit: `228e06ffc5d9fe3181d4213c67807aaed35f6e1e`.
Native GitHub Pages run [37401379652](https://github.com/zuestrd20/taiwan-month-of-life/actions/runs/37401379652) completed successfully for that exact SHA.

All eight required runtime assets returned HTTP 200 and byte-for-byte SHA-256 matches to local files: index.html, style.css, app.js, simulation.js, icon.svg, population.json, counties-map.json and events.json.

This QA record and a small responsive title-layout polish are committed afterward. The release handoff records the final commit and exact corresponding Pages run after verifying them.

## Intentional limitations

Historical August 2026 edition only; no automatic refresh. Registration date/location are not occurrence date/location. Simulated daily/point distribution is illustrative, not estimated individual records. News selection is finite and unrepresentative, and must not be used to rank safety. Offshore and marine stories use county-scale illustrative placement. Boundary version is 2020-08-20, simplified for display. No screen-reader hardware, physical touchscreen, or other browser engine was tested.
