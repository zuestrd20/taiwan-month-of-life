import test from 'node:test';
import assert from 'node:assert/strict';
import {createBubbleQueue, placeBubbles} from '../bubbles.js';

const items = (count, kind = 'births') => Array.from({length: count}, (_, i) => ({id: `${kind}-${i}`, kind, anchor: {x: 250, y: 250}}));
const ids = list => list.map(item => item.id);
const overlap = (a, b) => a.x < b.x + b.width && a.x + a.width > b.x && a.y < b.y + b.height && a.y + a.height > b.y;
const assertBounds = (placed, width, height) => {
  for (const rect of placed) {
    assert(rect.x >= 8 && rect.y >= 8);
    assert(rect.x + rect.width <= width - 8);
    assert(rect.y + rect.height <= height - 8);
  }
};

test('reset shows first news immediately, preserving news and sampled-life order', () => {
  const queue = createBubbleQueue();
  const life = items(2), news = items(2, 'news');
  assert.deepEqual(ids(queue.reset([life[0], news[0], life[1], news[1]])), ['news-0']);
  assert.deepEqual(ids(queue.advance(900)), ['news-0', 'news-1']);
  assert.deepEqual(ids(queue.advance(1800)), ['news-0', 'news-1', 'births-0', 'births-1']);
  assert.equal(queue.snapshot()[0].startedAt, 0);
  assert.equal(queue.snapshot()[0].expiresAt, 6500);
});

test('reset drops stale active and pending cards, including previously elapsed time', () => {
  const queue = createBubbleQueue();
  queue.reset(items(20));
  queue.advance(17000);
  assert.deepEqual(ids(queue.reset(items(2, 'news'))), ['news-0']);
  assert.deepEqual(ids(queue.advance(900)), ['news-0', 'news-1']);
  assert.deepEqual(queue.advance(10000), []);
  assert.deepEqual(queue.reset([]), []);
  assert.deepEqual(queue.advance(100000), []);
});

test('pause freezes both expiry and admissions without accumulating paused time', () => {
  const queue = createBubbleQueue({lifetime: 1500, gap: 900});
  queue.reset(items(3));
  const before = queue.advance(899);
  assert.deepEqual(queue.advance(100000, {paused: true}), before);
  assert.deepEqual(ids(queue.advance(1)), ['births-0', 'births-1']);
  assert.deepEqual(ids(queue.advance(600)), ['births-1']);
});

test('expiry is exact and finite: callouts do not reappear after exhausting the queue', () => {
  const queue = createBubbleQueue({lifetime: 100, gap: 50});
  queue.reset(items(2));
  assert.deepEqual(ids(queue.advance(99)), ['births-0', 'births-1']);
  assert.deepEqual(ids(queue.advance(1)), ['births-1']);
  assert.deepEqual(queue.advance(50), []);
  assert.deepEqual(queue.advance(500000), []);
});

test('active count stays bounded and full slots preserve the full reading lifetime', () => {
  const queue = createBubbleQueue({limit: 2, lifetime: 100, gap: 10});
  queue.reset(items(20));
  assert.deepEqual(ids(queue.advance(99)), ['births-0', 'births-1']);
  const next = queue.advance(1);
  assert.deepEqual(ids(next), ['births-1', 'births-2']);
  assert.equal(next[1].startedAt, 100);
  for (let i = 0; i < 300; i++) assert(queue.advance(10).length <= 2);
  assert.deepEqual(queue.snapshot(), []);
});

test('large-frame and small-frame advances have identical deterministic snapshots', () => {
  const large = createBubbleQueue({limit: 3, lifetime: 73, gap: 21});
  const small = createBubbleQueue({limit: 3, lifetime: 73, gap: 21});
  large.reset(items(100));
  small.reset(items(100));
  for (let i = 0; i < 987; i++) small.advance(1);
  assert.deepEqual(large.advance(987), small.snapshot());
  assert.deepEqual(large.advance(10000), small.advance(10000));
});

test('zero-gap queues are bounded, and duplicate IDs never reenter a batch', () => {
  const queue = createBubbleQueue({limit: 2, lifetime: 100, gap: 0});
  const first = {id: 'same', kind: 'births'};
  const news = {id: 'same', kind: 'news'};
  assert.deepEqual(ids(queue.reset([first, news, ...items(2), first, {id: ''}, null])), ['same', 'births-0']);
  assert.equal(queue.snapshot()[0].kind, 'news');
  assert.deepEqual(ids(queue.advance(100)), ['births-1']);
  assert.deepEqual(queue.advance(100), []);
});

test('input and returned array or anchor mutation cannot change the queue', () => {
  const queue = createBubbleQueue();
  const input = items(2);
  const result = queue.reset(input);
  input[0].id = 'changed';
  input[0].anchor.x = 999;
  result[0].id = 'also-changed';
  result[0].anchor.x = 777;
  result.pop();
  assert.equal(queue.snapshot()[0].id, 'births-0');
  assert.equal(queue.snapshot()[0].anchor.x, 250);
});

test('invalid queue configuration and playback deltas are rejected', () => {
  for (const options of [{limit: 0}, {limit: 1.5}, {lifetime: 0}, {lifetime: Infinity}, {gap: -1}, {gap: NaN}]) {
    assert.throws(() => createBubbleQueue(options), RangeError);
  }
  const queue = createBubbleQueue();
  for (const delta of [-1, NaN, Infinity]) assert.throws(() => queue.advance(delta), RangeError);
});

test('clustered anchors produce bounded nonoverlapping deterministic cards', () => {
  const input = items(4);
  const options = {width: 700, height: 700};
  const placed = placeBubbles(input, options);
  assert.equal(placed.length, 4);
  assert.deepEqual(placed, placeBubbles(input, options));
  assertBounds(placed, options.width, options.height);
  for (let i = 0; i < placed.length; i++) {
    for (let j = i + 1; j < placed.length; j++) assert(!overlap(placed[i], placed[j]));
    assert.deepEqual(placed[i].anchor, input[i].anchor);
  }
});

test('cards avoid map-control obstacles, including wide barriers', () => {
  const obstacles = [{x: 8, y: 8, width: 384, height: 70}, {x: 170, y: 80, width: 60, height: 220}];
  const placed = placeBubbles(items(4), {width: 400, height: 550, cardWidth: 140, cardHeight: 80, obstacles});
  assert.equal(placed.length, 4);
  for (const card of placed) for (const obstacle of obstacles) assert(!overlap(card, obstacle));
  assertBounds(placed, 400, 550);
});

test('edge anchors and callout connectors preserve the actual geographic anchor', () => {
  const input = [{id: 'top-left', anchor: {x: 0, y: 0}}, {id: 'bottom-right', anchor: {x: 399, y: 399}}];
  const placed = placeBubbles(input, {width: 400, height: 400});
  assert.equal(placed.length, 2);
  assertBounds(placed, 400, 400);
  for (const card of placed) {
    const line = card.connector;
    assert.equal(line.x1, card.anchor.x);
    assert.equal(line.y1, card.anchor.y);
    assert(line.x2 >= card.x && line.x2 <= card.x + card.width);
    assert(line.y2 >= card.y && line.y2 <= card.y + card.height);
    assert(line.x2 === card.x || line.x2 === card.x + card.width || line.y2 === card.y || line.y2 === card.y + card.height);
  }
});

test('narrow layouts shrink card width, fit vertically, and drop overflow cards', () => {
  const input = items(12).map(item => ({...item, anchor: {x: 60, y: 150}}));
  const placed = placeBubbles(input, {width: 120, height: 300});
  assert(placed.length > 0 && placed.length < input.length);
  assert(placed.every(item => item.width === 104));
  assertBounds(placed, 120, 300);
  for (let i = 0; i < placed.length; i++) for (let j = i + 1; j < placed.length; j++) assert(!overlap(placed[i], placed[j]));
});

test('impossible, obstructed, and invalid layouts skip safely without mutation', () => {
  const input = items(2);
  const before = structuredClone(input);
  assert.deepEqual(placeBubbles(input, {width: 12, height: 300}), []);
  assert.deepEqual(placeBubbles(input, {width: 300, height: 0}), []);
  assert.deepEqual(placeBubbles(input, {width: NaN, height: 300}), []);
  assert.deepEqual(placeBubbles(input, {width: 300, height: 300, obstacles: [{x: 0, y: 0, width: 300, height: 300}]}), []);
  assert.deepEqual(placeBubbles([{anchor: {x: NaN, y: 2}}, {}], {width: 300, height: 300}), []);
  assert.deepEqual(input, before);
});

test('short-tail option skips distant placements rather than drawing long connectors', () => {
 const items=[{id:'news',anchor:{x:200,y:200}}];
 const near=placeBubbles(items,{width:500,height:400,cardWidth:100,cardHeight:78,maxTailDistance:34});
 assert.equal(near.length,1);
 for(const p of near)assert.ok(Math.hypot(p.connector.x2-p.anchor.x,p.connector.y2-p.anchor.y)<=34);
 const blocked=placeBubbles(items,{width:500,height:400,cardWidth:100,cardHeight:78,maxTailDistance:34,obstacles:[{x:145,y:145,width:110,height:110}]});
 assert.equal(blocked.length,0);
});

test('compact phone balloon fits beside Penghu without a long tail or hiding labels',()=>{
 const obstacles=[[21.817,78.988,64.208,16.667],[21.817,169.003,64.208,16.667],[181.741,125.426,34.38,17.333],[185.969,100.966,34.38,17.333]].map(([x,y,width,height])=>({x,y,width,height}));
 const placed=placeBubbles([{id:'news',anchor:{x:63.879,y:112.65}}],{width:350.33,height:357.79,cardWidth:80,cardHeight:64,maxTailDistance:34,obstacles});
 assert.equal(placed.length,1);assertBounds(placed,350.33,357.79);for(const r of obstacles)assert(!overlap(placed[0],r));
});
