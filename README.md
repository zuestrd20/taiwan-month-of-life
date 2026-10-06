# 島嶼的日常 · Island Days

A quiet, Traditional Chinese interactive replay of Taiwan in **August 2026**. Static HTML/CSS/JavaScript; no build, login, tracking, or backend.

## Data integrity

- Official household-registration month counts: **7,492 births / 16,470 deaths**, all **22 counties/cities**. These are registration dates and household-registration locations, not necessarily occurrence dates or places.
- County XLS cross-checked against all **7,781 village CSV records** and the [MOI national bulletin](https://www.moi.gov.tw/News_Content.aspx?n=9&s=340734&sms=9009).
- August is this edition’s fully reconciled month. September village data were available but not cross-checked to the published county/national release; this project does not claim no newer data exist.
- Daily life distributions are **SIMULATED**, reproducible with seed `island-days-2026-08-v1`, with exact monthly conservation. Geographic points are decorative simulated county-level locations, never person records, actual addresses, or precise event sites.
- 16 individually sourced news selections across 15 counties, actual occurrence dates in August, and separate publication dates. Unknown times remain null. This is neither comprehensive nor representative and must not be used to rank county safety.
- News entries are never added to registration counts. Sensitive private names, minors’ personal details, and precise home addresses are excluded. Allegations and ongoing investigations are not convictions.
- Dates are interpreted as Taiwan local calendar days (Asia/Taipei); historical replay only, not real-time monitoring.

## Use

Open the published GitHub Pages site or serve this directory with any static HTTP server. All required data are under `data/`. Optional Google Fonts have system-font fallbacks.

Controls: county map/dropdown, category filters, life/news layer toggles, day slider, speed, play/pause, reset, reduced-motion preference. URL state supports Back/Forward. No autoplay; system reduced-motion preference is honored. CSV simulation export repeats the simulation disclaimer on every row.

## Verification

Run `npm test` (Node 20+; no dependencies). Tests cover monthly conservation, reproducibility, null handling, date boundaries, dataset coverage, event schema/deduplication and accessibility/disclosure presence. Browser interaction results are documented in QA.md after verification.

## Provenance and licensing

Population sources, definitions, source cell references and SHA-256 checksums: `data/population.json` and `data/population-sources.json`. The `localFile` keys identify original research evidence files; upstream download URLs are provided to retrieve them, rather than publishing redundant large raw records. `data/extract_population.py` reproduces extraction (see its dependencies).

Map: [National Land Surveying and Mapping Center](https://data.gov.tw/dataset/7442), **COUNTY_MOI_1090820 (2020-08-20)**. The download-page update date is newer than the actual archive revision. Simplified boundaries, source provenance, license and transformation notes are in `data/geometry-source.json` and `data/GEOMETRY-LICENSE.md`; reproduction in `scripts/build_county_map.py`.

Government datasets are used under [Open Government Data License 1.0](https://data.gov.tw/license), with attribution. Offshore county insets are relocated and rescaled; Kinmen includes a separate Wuqiu inset. Distant islands outside the main map window are omitted. This is not a legal boundary, navigation or measurement map.

News: concise original paraphrases with direct source links, not reproduced articles or photographs. Stories reflect cited reports, not guaranteed final case status as of the data-check date. Data checked 2026-10-06.

Built for https://github.com/zuestrd20/dot-tasks/issues/22 .
