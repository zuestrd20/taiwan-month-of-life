#!/usr/bin/env python3
"""Derive reusable GeoJSON and inset SVG paths from Taiwan NLSC open data.
Dependencies: pyshp, shapely>=2.1, pyproj. No hand-drawn boundaries.
"""
from pathlib import Path
import json, math, hashlib, zipfile, urllib.request
import shapefile, shapely
from shapely.geometry import shape, mapping, MultiPolygon
from shapely.ops import transform
from pyproj import Transformer

ROOT=Path(__file__).resolve().parents[1]
OUT=ROOT/'data'; OUT.mkdir(exist_ok=True)
URL='https://maps.nlsc.gov.tw/download/%E7%B8%A3%E5%B8%82%E7%95%8C%E7%B7%9A(TWD97%E7%B6%93%E7%B7%AF%E5%BA%A6).zip'
ZIP=Path('/tmp/counties.zip'); RAW=Path('/tmp/tw-counties-official')
if not ZIP.exists(): ZIP.write_bytes(urllib.request.urlopen(URL,timeout=60).read())
RAW.mkdir(exist_ok=True)
with zipfile.ZipFile(ZIP) as z: z.extractall(RAW)
r=shapefile.Reader(str(RAW/'COUNTY_MOI_1090820.shp'),encoding='utf-8')
records=r.records()
original=[shape(s.__geo_interface__) for s in r.shapes()]
# The source's near-identical shared vertices differ in the last decimal digits.
# Round to ~0.1 m before shared-edge simplification, preserving valid coverage.
precision=0.000001
snapped=shapely.set_precision(original,precision)
assert shapely.coverage_is_valid(snapped), 'Unexpected source coverage topology'
simple=shapely.coverage_simplify(snapped,0.0025,simplify_boundary=True)
assert shapely.coverage_is_valid(simple)
assert all(shapely.is_valid(simple))
to_wgs=Transformer.from_crs('EPSG:3824','EPSG:4326',always_xy=True).transform
geo=[]
for rec,g in zip(records,simple):
 g=transform(to_wgs,g)
 geo.append({'type':'Feature','properties':{'name':rec['COUNTYNAME'].replace('台','臺'),'code':rec['COUNTYCODE'],'name_en':rec['COUNTYENG']},'geometry':mapping(g)})
fc={'type':'FeatureCollection','features':geo}
(OUT/'counties.geojson').write_text(json.dumps(fc,ensure_ascii=False,separators=(',',':')))

# Spherical Mercator with north up; the main island is fitted without remote islets.
def merc(lon,lat):
 return [math.radians(lon),-math.log(math.tan(math.pi/4+math.radians(lat)/2))]
def polygons(g): return list(g.geoms) if g.geom_type=='MultiPolygon' else [g]
def combine(ps): return MultiPolygon(ps)
def project(g): return transform(lambda x,y:merc(x,y),g)
def fit(gs,box):
 proj=[project(g) for g in gs]
 b=[min(g.bounds[0] for g in proj),min(g.bounds[1] for g in proj),max(g.bounds[2] for g in proj),max(g.bounds[3] for g in proj)]
 x,y,w,h=box; scale=min(w/(b[2]-b[0]),h/(b[3]-b[1])); ox=x+(w-(b[2]-b[0])*scale)/2-b[0]*scale; oy=y+(h-(b[3]-b[1])*scale)/2-b[1]*scale
 return lambda g:transform(lambda x,y:(x*scale+ox,y*scale+oy),project(g)),scale

def svg_path(g):
 parts=[]
 for p in polygons(g):
  for ring in [p.exterior,*p.interiors]:
   c=list(ring.coords)
   parts.append('M'+'L'.join(f'{x:.2f},{y:.2f}' for x,y in c[:-1])+'Z')
 return ''.join(parts)

byname={f['properties']['name']:shape(f['geometry']) for f in geo}
offshore={'澎湖縣','金門縣','連江縣'}
main={}
omitted=[]
for name,g in byname.items():
 if name in offshore: continue
 shown=[]
 for p in polygons(g):
  c=p.representative_point()
  if 119.8<c.x<122.2 and 21.7<c.y<25.7: shown.append(p)
  else: omitted.append({'county':name,'centroid':[round(c.x,5),round(c.y,5)]})
 main[name]=combine(shown)
main_project,main_scale=fit(list(main.values()),[225,44,440,652])
# Every county has its own feature and click target. Insets are explicitly relocated.
inset_defs=[
 {'name':'澎湖縣','box':[35,166,150,158],'contentBox':[55,193,110,110],'label':[51,187]},
 {'name':'金門縣','box':[35,349,150,143],'contentBox':[49,380,122,89],'label':[51,372]},
 {'name':'連江縣','box':[35,517,150,158],'contentBox':[50,552,120,100],'label':[51,542]},
]
mapfeatures=[]
for f in geo:
 name=f['properties']['name']; g=byname[name]; other_parts=[]
 if name not in offshore:
  pixel=main_project(main[name]); inset=False
 else:
  d=next(x for x in inset_defs if x['name']==name)
  if name=='金門縣':
   # Wuqiu is geographically distant. Keep it as a labeled, separately scaled
   # small sub-inset inside the county panel, rather than silently moving it.
   west=combine([p for p in polygons(g) if p.representative_point().x<119])
   wuqiu=combine([p for p in polygons(g) if p.representative_point().x>=119])
   fn,scale=fit([west],[49,381,122,71]); pixel=fn(west)
   fw,sw=fit([wuqiu],[141,462,27,15]); extra=fw(wuqiu)
   other_parts=polygons(extra)
   d['subInsets']=[{'name':'烏坵','box':[133,457,40,27],'label':[142,486]}]
   d['scaleRelativeToMain']=round(scale/main_scale,2)
  else:
   fn,scale=fit([g],d['contentBox']); pixel=fn(g)
   d['scaleRelativeToMain']=round(scale/main_scale,2)
  inset=True
 largest=max(polygons(pixel),key=lambda p:p.area)
 anchor=largest.representative_point()
 drawn=combine(polygons(pixel)+other_parts)
 mapfeatures.append({**f['properties'],'path':svg_path(drawn),'anchor':[round(anchor.x,2),round(anchor.y,2)],'bounds':[round(v,2) for v in drawn.bounds],'inset':inset})

result={'viewBox':'0 0 720 760','width':720,'height':760,'projection':'Mercator; north up; independently fitted county insets','features':mapfeatures,'insets':inset_defs,'notes':['離島採分幅插圖，位置與比例經調整。','主圖顯示臺灣本島及鄰近島嶼；遠方離島未於主圖呈現。','烏坵在金門縣插圖內另作分幅。'],'omittedFromOverview':omitted}
(OUT/'counties-map.json').write_text(json.dumps(result,ensure_ascii=False,separators=(',',':')))

source={
 'title':'直轄市、縣市界線(TWD97經緯度)',
 'provider':'內政部國土測繪中心',
 'datasetUrl':'https://data.gov.tw/dataset/7442',
 'downloadPage':'https://maps.nlsc.gov.tw/pro/download.jsp',
 'downloadUrl':URL,
 'retrievedDate':'2026-10-06',
 'sourceRevisionDate':'2020-08-20',
 'sourceFile':'COUNTY_MOI_1090820.shp',
 'archiveSha256':hashlib.sha256(ZIP.read_bytes()).hexdigest(),
 'license':'政府資料開放授權條款－第1版 / Open Government Data License 1.0',
 'licenseUrl':'https://data.gov.tw/license',
 'attribution':'內政部國土測繪中心 2020 直轄市、縣市界線（COUNTY_MOI_1090820）。此開放資料依政府資料開放授權條款第1版進行公眾釋出。',
 'modifications':['來源為 TWD97 經緯度（EPSG:3824），轉為 WGS84（EPSG:4326）。','共邊先以 0.000001 度座標精度對齊，再以 0.0025 度容差作保留拓樸的共邊簡化。','GeoJSON 保留全部 22 縣市的來源圖徵；SVG 路徑經墨卡托投影、主圖範圍篩選及離島插圖配置。','僅作互動概覽，不作測量、導航、地籍或法定界線用途。'],
 'countyCount':len(geo),
 'originalCoordinateCount':int(sum(shapely.get_num_coordinates(original))),
 'simplifiedCoordinateCount':int(sum(shapely.get_num_coordinates(simple))),
 'coverageValidAfterPrecisionAndSimplification':bool(shapely.coverage_is_valid(simple)),
 'cartographicNotes':result['notes'],
 'sourceVersionCaveat':'官方下載頁標示更新日期 2025-11-18，但實際 ZIP 內圖資與詮釋資料版本為 2020-08-20；本成果依實際檔案版本標示。'
}
(OUT/'geometry-source.json').write_text(json.dumps(source,ensure_ascii=False,indent=2))

# Reviewable standalone SVG (no fake coastlines, paths share county boundaries).
svg=['<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 720 760"><rect width="720" height="760" fill="#eaf1ee"/>']
for d in inset_defs:
 x,y,w,h=d['box']; svg.append(f'<rect x="{x}" y="{y}" width="{w}" height="{h}" rx="14" fill="none" stroke="#a0b5ae" stroke-dasharray="4 5"/>')
colors=['#bfd4a1','#adcbaa','#94bdb0','#80b2ae','#bdd2aa']
for i,f in enumerate(mapfeatures):
 svg.append(f'<path d="{f["path"]}" fill="{colors[i%len(colors)]}" stroke="#506c60" stroke-width="0.8" stroke-linejoin="round" fill-rule="evenodd"/>')
for f in mapfeatures:
 x,y=f['anchor']; name=f['name']; svg.append(f'<circle cx="{x}" cy="{y}" r="2" fill="#172d24"/><text x="{x+4}" y="{y+3}" font-size="11" font-family="sans-serif" fill="#172d24">{name}</text>')
svg.append('<text x="35" y="719" font-size="11" font-family="sans-serif" fill="#506c60">離島採分幅插圖；位置與比例經調整。遠方離島未於主圖呈現。</text></svg>')
(OUT/'counties-preview.svg').write_text(''.join(svg))
print(json.dumps({'counties':len(geo),'geojsonBytes':(OUT/'counties.geojson').stat().st_size,'pathJsonBytes':(OUT/'counties-map.json').stat().st_size,'coordinates':source['simplifiedCoordinateCount'],'omittedOverviewPolygons':len(omitted),'coverageValid':source['coverageValidAfterPrecisionAndSimplification']},ensure_ascii=False))
