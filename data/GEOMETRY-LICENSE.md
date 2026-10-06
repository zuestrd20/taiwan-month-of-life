# Taiwan county/city geometry

## Required attribution

內政部國土測繪中心 2020 直轄市、縣市界線（COUNTY_MOI_1090820）。此開放資料依政府資料開放授權條款第1版進行公眾釋出。

- Dataset: https://data.gov.tw/dataset/7442
- License: Government Open Data License 1.0, https://data.gov.tw/license
- Official download index: https://maps.nlsc.gov.tw/pro/download.jsp
- Exact ZIP download URL and SHA-256: `geometry-source.json`
- Retrieved: 2026-10-06
- Source data revision: 2020-08-20. The official download page was updated in 2025, but its delivered shapefile and embedded metadata are the 2020 version.

This is a derivative: coordinates aligned to 0.000001 degrees, boundaries topology-preservingly simplified, and converted from TWD97 geographic coordinates to WGS84. All 22 county/city feature names use 臺. No boundaries were drawn by hand.

## Files

- `counties.geojson`: 22 features with `name`, `name_en`, `code`; geographic coordinates and distant polygons retained as provided, subject to geometric simplification.
- `counties-map.json`: Mercator SVG paths in a 720 × 760 viewBox, plus on-land county anchor points and clearly separated offshore inset frames.
- `counties-preview.svg`: Geometry QA image; labels only illustrate anchors and are not a polished UI.
- `geometry-source.json`: Structured source, license, checksum, date, processing and validation record.
- `../scripts/build_county_map.py`: Reproducible processing script. Python dependencies: pyshp, shapely >= 2.1, pyproj.

## Rendering requirements

Show the attribution and link to the license in the app's source details. Also disclose: 「離島採分幅插圖，位置與比例經調整。主圖顯示臺灣本島及鄰近島嶼；遠方離島未於主圖呈現。」

- `features[].path` is a complete SVG path string. Use `fill-rule="evenodd"` and a subtle stroke.
- `features[].anchor` is inside the county's largest displayed land polygon.
- Main island map and nearby islands share one projection and scale.
- Penghu, Kinmen and Lienchiang each have independent inset fitting. The inset scale relative to the main map is recorded.
- Wuqiu uses a small, separately fitted sub-inset inside Kinmen's inset; render its returned label 「烏坵」.
- Label inset headers via `insets[].label`. Making each whole inset frame clickable improves touch access without inventing larger island geometries.
- Taipei, Keelung, Hsinchu City and Chiayi City are small; use short labels or leader lines and provide a list-based keyboard/touch alternative.
- Overview is illustrative and is not suitable for surveying, navigation, cadastral or legal boundary decisions.
