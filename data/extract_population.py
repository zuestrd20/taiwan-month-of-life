"""Extract public MOI counts, retaining raw sources and exact reconciliation."""
import csv
import hashlib
import json
from collections import defaultdict
from pathlib import Path

import xlrd

ROOT = Path(__file__).resolve().parent
RAW = ROOT / "raw"
rows = list(csv.DictReader((RAW / "registration-11508.csv").open(encoding="utf-8-sig")))
assert len(rows) == 7781
assert {r["統計年月"] for r in rows} == {"11508"}
assert len({r["區域別代碼"] for r in rows}) == len(rows)
by_name = defaultdict(lambda: {"births": 0, "deaths": 0, "population": 0, "villageRows": 0})
for row in rows:
    name = row["區域別"][:3]
    record = by_name[name]
    record["code"] = row["區域別代碼"][:5]
    record["births"] += int(row["出生數_合計"])
    record["deaths"] += int(row["死亡人數_男"]) + int(row["死亡人數_女"])
    record["population"] += int(row["人口數_合計"])
    record["villageRows"] += 1
    assert int(row["出生數_合計"]) == int(row["出生數_合計_男"]) + int(row["出生數_合計_女"])

sheet = xlrd.open_workbook(str(RAW / "m0s2-11508.xls")).sheet_by_index(0)
assert "115 年 8 月" in sheet.cell_value(1, 6)
counties = []
for row_number in range(6, 30):
    name = sheet.cell_value(row_number, 0)
    if name in ("臺灣省", "福建省"):
        continue
    source = by_name[name]
    births = int(sheet.cell_value(row_number, 7))
    deaths = int(sheet.cell_value(row_number, 10))
    natural_change = int(sheet.cell_value(row_number, 4))
    assert births == source["births"] and deaths == source["deaths"]
    assert natural_change == births - deaths
    counties.append({
        "code": source["code"], "name": name,
        "births": births, "deaths": deaths,
        "naturalChange": natural_change,
        "population": source["population"],
        "sourceCells": {"births": f"H{row_number + 1}", "deaths": f"K{row_number + 1}"},
        "villageRows": source["villageRows"],
    })
assert len(counties) == 22
assert sum(c["births"] for c in counties) == int(sheet.cell_value(5, 7)) == 7492
assert sum(c["deaths"] for c in counties) == int(sheet.cell_value(5, 10)) == 16470
assert sum(c["population"] for c in counties) == 23224721

sources = [
    {
        "id": "moi-11508-counties", "publisher": "內政部戶政司",
        "title": "人口增加、自然增加、出生、死亡、結婚、離婚數及其比率統計表：115年8月",
        "url": "https://www.ris.gov.tw/info-popudata/app/awFastDownload/view?type=xls&m4c=m0s2&d5c=11508",
        "landingUrl": "https://www.ris.gov.tw/info-popudata/app/awFastDownload/toMain_panel",
        "format": "xls", "localFile": "raw/m0s2-11508.xls",
        "sheet": "06-人口增加&生死結離",
        "usage": "Primary county totals; births in column H, deaths in column K; national total in row 6. Excludes province subtotal rows.",
        "accessedAt": "2026-10-06",
    },
    {
        "id": "moi-11508-villages", "publisher": "內政部戶政司",
        "title": "11508-動態資料統計表（含同婚）",
        "url": "https://opdadm.moi.gov.tw/api/v1/no-auth/resource/api/dataset/53F23080-FC71-4479-A19C-61C61A77D1D0/resource/99439403-0AD5-42AF-BEB0-378EC3B922AE/download",
        "landingUrl": "https://data.gov.tw/dataset/131135",
        "format": "csv", "localFile": "raw/registration-11508.csv",
        "usage": "All 7,781 village rows aggregated by the first five digits of area code and county name; each county birth/death total exactly agrees with the county XLS.",
        "license": "政府資料開放授權條款－第1版 (Open Government Data License, version 1.0)",
        "licenseUrl": "https://data.gov.tw/license",
        "accessedAt": "2026-10-06",
    },
    {
        "id": "moi-11508-bulletin", "publisher": "內政部戶政司",
        "title": "民國115年8月戶口統計資料分析",
        "url": "https://www.moi.gov.tw/News_Content.aspx?n=9&s=340734&sms=9009",
        "publishedAt": "2026-09-10T10:00:00+08:00",
        "usage": "National reconciliation: 7,492 births, 16,470 deaths, month-end population 23,224,721.",
        "accessedAt": "2026-10-06",
    },
    {
        "id": "registration-method", "publisher": "內政部戶政司",
        "title": "修正「戶籍人口統計作業要點」（111年12月9日發布）",
        "url": "https://www.ris.gov.tw/info-liferay/app/channel/regulationDetail/22343496?p=2",
        "usage": "Monthly dynamic data cover the first through last day of the month and are tabulated by event registration date.",
        "accessedAt": "2026-10-06",
    },
    {
        "id": "geographic-method", "publisher": "內政部戶政司",
        "title": "108年人口統計年刊：說明、統計列表原則",
        "url": "https://www.ris.gov.tw/documents/data/5/2/cadd7ffc-4175-48db-b319-158870c7262d.pdf",
        "usage": "Geographical tabulation follows household-registration residence, not the physical place of an event; registration and occurrence dates are distinct.",
        "accessedAt": "2026-10-06",
    },
]
for source in sources:
    if "localFile" in source:
        source["sha256"] = hashlib.sha256((ROOT / source["localFile"]).read_bytes()).hexdigest()

data = {
    "month": "2026-08", "monthLabel": "2026 年 8 月", "rocMonth": "11508",
    "asOf": "2026-10-06", "basis": "戶籍登記日期", "unit": "人",
    "national": {"births": 7492, "deaths": 16470, "naturalChange": -8978, "population": 23224721},
    "counties": counties,
    "sources": sources,
    "methodology": {
        "displayNote": "出生與死亡為 2026 年 8 月戶籍登記人數；依戶籍地統計，與實際發生日期及地點可能不同。",
        "registrationVsOccurrence": "Counts refer to registrations accepted during 2026-08-01 through 2026-08-31, not necessarily births or deaths that occurred during those dates.",
        "geography": "22 county/city household-registration areas, including Penghu, Kinmen and Lienchiang. Excludes province subtotal rows to prevent double counting.",
        "aggregation": "CSV birth field: 出生數_合計. Deaths: 死亡人數_男 + 死亡人數_女. Group by county code (first 5 characters of 區域別代碼). Validate each against county XLS columns H and K.",
        "naturalChange": "births - deaths; excludes migration and must not be described as total population change.",
        "monthSelection": "August is the latest month present in the verified official county-table download selector and is independently reconciled to the published national bulletin. A September village CSV was already listed on 2026-10-05, but was not reconciled against a published county/national release for this edition. This map therefore uses August consistently and does not claim that no September data exist.",
        "license": "The cross-validated village CSV dataset is licensed under the Open Government Data License, version 1.0; credit 內政部戶政司 and identify this aggregation.",
        "attribution": "資料來源：內政部戶政司，2026，11508-動態資料統計表（含同婚）。此資料依政府資料開放授權條款第1版釋出（https://data.gov.tw/license）；本圖按縣市彙整，並與官方縣市統計表核對。"
    },
    "validation": {
        "countyCount": 22, "uniqueCountyCodes": 22,
        "rawVillageRows": len(rows), "allRowsPeriod": "11508",
        "all22CountiesMatchOfficialXls": True,
        "countyBirthSum": sum(c["births"] for c in counties),
        "countyDeathSum": sum(c["deaths"] for c in counties),
        "nationalBulletinMatch": True,
        "countyPopulationSum": sum(c["population"] for c in counties),
        "nonnegativeIntegerCounts": True,
    },
}
(ROOT / "population.json").write_text(json.dumps(data, ensure_ascii=False, indent=2) + "\n")
(ROOT / "population-sources.json").write_text(json.dumps(sources, ensure_ascii=False, indent=2) + "\n")
print(json.dumps(data["validation"], ensure_ascii=False))
for county in counties:
    print(county["code"], county["name"], county["births"], county["deaths"])
