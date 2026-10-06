// All days and locations in this module are explicitly synthetic, never personal records.
export const SEED = 'island-days-2026-08-v1';
export const SIMULATION_LABEL = '模擬分布，非真實時間或位置';
export function hash(text) { let h=2166136261; for(const c of text){h^=c.charCodeAt(0);h=Math.imul(h,16777619);}return h>>>0; }
export function random(seed){let a=hash(seed);return()=>{a+=0x6D2B79F5;let t=a;t=Math.imul(t^t>>>15,t|1);t^=t+Math.imul(t^t>>>7,t|61);return((t^t>>>14)>>>0)/4294967296;};}
export function distribute(total, county, type, days=31){if(total===null)return null;if(!Number.isSafeInteger(total)||total<0)throw Error('Invalid monthly count');const bins=Array(days).fill(0),rng=random(`${SEED}:${county}:${type}`);for(let n=0;n<total;n++)bins[Math.floor(rng()*days)]++;return bins;}
export function createSimulation(counties){return counties.map(c=>({...c,dailyBirths:distribute(c.births,c.name,'births'),dailyDeaths:distribute(c.deaths,c.name,'deaths')}));}
export function sumToDay(bins, day){return bins===null?null:bins.slice(0,Math.min(31,Math.max(0,Math.floor(day)))).reduce((a,b)=>a+b,0);}
export function totals(counties, day=31){return counties.reduce((a,c)=>{for(const [key,bins] of [['births',c.dailyBirths],['deaths',c.dailyDeaths]]){const n=sumToDay(bins,day);if(n===null)a.missing[key]++;else a[key]+=n;}return a;},{births:0,deaths:0,missing:{births:0,deaths:0}});}
export function filterEvents(events,{county='all',categories=[],day=31}={}){return events.filter(e=>(county==='all'||e.county===county)&&categories.includes(e.category)&&Number(e.date.slice(-2))<=day);}
export function validateEvents(events,month='2026-08',counties=[]){
 const ids=new Set(),fingerprints=new Set(),categories=['rescue','community','culture','nature','accident','violence'];
 const validDate=d=>/^\d{4}-\d{2}-\d{2}$/.test(d)&&Number.isFinite(Date.parse(d+'T00:00:00+08:00'))&&new Date(d+'T00:00:00Z').toISOString().slice(0,10)===d;
 for(const e of events){
  for(const k of ['id','date','publishedDate','county','category','title','summary','sourceName','url','dateNote'])if(typeof e[k]!=='string'||!e[k].trim())throw Error('Missing event field: '+k);
  if(ids.has(e.id))throw Error('Duplicate ID');ids.add(e.id);
  const key=e.date+'|'+e.county+'|'+e.title;if(fingerprints.has(key))throw Error('Duplicate event');fingerprints.add(key);
  const url=new URL(e.url);
  if(!validDate(e.date)||!validDate(e.publishedDate)||!e.date.startsWith(month+'-')||e.publishedDate<e.date||url.protocol!=='https:'||!url.hostname||!categories.includes(e.category)||(counties.length&&!counties.includes(e.county))||(e.time!==null&&!/^([01]\d|2[0-3]):[0-5]\d$/.test(e.time)))throw Error('Invalid event date, link, category, county, or time');
 }return true;
}

export function normalizeDay(value){const n=Number(value);return Number.isFinite(n)?Math.max(1,Math.min(31,Math.floor(n))):1;}
