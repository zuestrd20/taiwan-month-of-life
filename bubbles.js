// Playback-time helpers only: no DOM, wall clock, timers, or random numbers.
const copyItem = item => ({...item, ...(item.anchor ? {anchor: {...item.anchor}} : {})});

/**
 * A finite queue for one day's callouts. News precedes sampled life items, with
 * stable ordering within each group. Full queues wait for a slot rather than
 * cutting an existing callout's lifetime short. Reset discards the previous day.
 * Returned items retain their fields and gain startedAt/expiresAt playback times.
 */
export function createBubbleQueue({limit = 4, lifetime = 6500, gap = 900} = {}) {
  if (!Number.isInteger(limit) || limit < 1) throw new RangeError('limit must be a positive integer');
  if (!Number.isFinite(lifetime) || lifetime <= 0) throw new RangeError('lifetime must be positive');
  if (!Number.isFinite(gap) || gap < 0) throw new RangeError('gap must be nonnegative');

  let now = 0, nextAt = 0, cursor = 0, pending = [], active = [];
  const snapshot = () => active.map(copyItem);
  const runUntil = target => {
    while (cursor < pending.length) {
      // Expiry and admission are processed at their exact playback times, so a
      // single long frame produces the same state as many short frames.
      const at = active.length < limit ? nextAt : Math.max(nextAt, Math.min(...active.map(item => item.expiresAt)));
      if (at > target) break;
      active = active.filter(item => item.expiresAt > at);
      active.push({...pending[cursor++], startedAt: at, expiresAt: at + lifetime});
      nextAt = at + gap;
    }
    now = target;
    active = active.filter(item => item.expiresAt > now);
    return snapshot();
  };

  return {
    reset(items = []) {
      const seen = new Set();
      const ordered = [...items].filter(item => item && (
        typeof item.id === 'string' && item.id.trim() ||
        typeof item.id === 'number' && Number.isFinite(item.id)
      ));
      ordered.sort((a, b) => Number(b.kind === 'news') - Number(a.kind === 'news'));
      pending = ordered.filter(item => {
        const id = String(item.id);
        if (seen.has(id)) return false;
        seen.add(id);
        return true;
      }).map(copyItem);
      now = 0;
      nextAt = 0;
      cursor = 0;
      active = [];
      return runUntil(0);
    },
    advance(delta, {paused = false} = {}) {
      if (!Number.isFinite(delta) || delta < 0 || !Number.isFinite(now + delta)) {
        throw new RangeError('delta must be finite, nonnegative playback milliseconds');
      }
      return paused ? snapshot() : runUntil(now + delta);
    },
    snapshot,
  };
}

const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
const overlaps = (a, b, space = 0) => a.x < b.x + b.width + space &&
  a.x + a.width + space > b.x && a.y < b.y + b.height + space &&
  a.y + a.height + space > b.y;
const validRect = rect => rect && ['x', 'y', 'width', 'height'].every(key => Number.isFinite(rect[key])) && rect.width > 0 && rect.height > 0;

/**
 * Place screen-pixel cards inside a viewport with an 8px inset/gutter. Obstacles
 * use {x,y,width,height}. Cards shrink to fit a narrow viewport. Input priority
 * is preserved; an item is omitted when no collision-free candidate fits.
 * connector starts at the unchanged geographic anchor and ends at a card edge.
 */
export function placeBubbles(items, {width, height, cardWidth = 180, cardHeight = 88, obstacles = []} = {}) {
  const padding = 8, gutter = 8, offset = 18;
  if (![width, height, cardWidth, cardHeight].every(Number.isFinite) ||
      width <= padding * 2 || height <= padding * 2 || cardWidth <= 0 || cardHeight <= 0) return [];

  const w = Math.min(cardWidth, width - padding * 2);
  const h = Math.min(cardHeight, height - padding * 2);
  const minX = padding, maxX = width - padding - w;
  const minY = padding, maxY = height - padding - h;
  const occupied = obstacles.filter(validRect).map(rect => ({...rect}));
  const placed = [];

  for (const item of items) {
    const anchor = item?.anchor;
    if (!anchor || !Number.isFinite(anchor.x) || !Number.isFinite(anchor.y)) continue;

    // Obstacle edges provide deterministic escape positions even when many
    // anchors cluster or a control occupies the preferred side of the map.
    const xs = [anchor.x + offset, anchor.x - w - offset, anchor.x - w / 2, minX, maxX];
    const ys = [anchor.y - h - offset, anchor.y + offset, anchor.y - h / 2, minY, maxY];
    for (const rect of occupied) {
      xs.push(rect.x - w - gutter, rect.x + rect.width + gutter);
      ys.push(rect.y - h - gutter, rect.y + rect.height + gutter);
    }
    const candidates = [];
    for (const x of new Set(xs.map(x => clamp(x, minX, maxX)))) {
      for (const y of new Set(ys.map(y => clamp(y, minY, maxY)))) {
        const rect = {x, y, width: w, height: h};
        const anchorBox = {x: anchor.x - 4, y: anchor.y - 4, width: 8, height: 8};
        if (overlaps(rect, anchorBox) || occupied.some(other => overlaps(rect, other, gutter))) continue;
        const endX = clamp(anchor.x, x, x + w), endY = clamp(anchor.y, y, y + h);
        const edgeDistance = (endX - anchor.x) ** 2 + (endY - anchor.y) ** 2;
        const centerDistance = (x + w / 2 - anchor.x) ** 2 + (y + h / 2 - anchor.y) ** 2;
        candidates.push({...rect, score: edgeDistance + centerDistance * 0.05, endX, endY});
      }
    }
    candidates.sort((a, b) => a.score - b.score || a.y - b.y || a.x - b.x);
    const best = candidates[0];
    if (!best) continue;
    const {x, y, width: placedWidth, height: placedHeight, endX, endY} = best;
    const rect = {x, y, width: placedWidth, height: placedHeight};
    placed.push({...copyItem(item), ...rect, connector: {x1: anchor.x, y1: anchor.y, x2: endX, y2: endY}});
    occupied.push(rect);
  }
  return placed;
}
