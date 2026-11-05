// Outlines of the states for small icons next to a label. Read at build time
// from us-atlas, which ships the states already projected with Albers USA
// (Alaska and Hawaii inset) at 975 by 610. Each state gets its own view box,
// so it fills its own square when drawn: the states are not to scale with each other.
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { geoPath } from 'd3-geo';
import { feature } from 'topojson-client';
import { FIPS } from './geo';

export interface StateShapeData {
  /** SVG path data in the atlas's coordinates. */
  d: string;
  /** "x y width height", the state's bounding box padded to a square so it stays centred. */
  viewBox: string;
}

let cache: Record<string, StateShapeData> | null = null;

export function stateShapes(): Record<string, StateShapeData> {
  if (cache) return cache;
  const topo = JSON.parse(readFileSync(join(process.cwd(), 'node_modules/us-atlas/states-albers-10m.json'), 'utf8'));
  const fc = feature(topo, topo.objects.states) as unknown as { features: { id: string }[] };
  const path = geoPath().digits(1);
  const out: Record<string, StateShapeData> = {};
  for (const f of fc.features) {
    const st = FIPS[f.id];
    if (!st) continue;
    const [[x0, y0], [x1, y1]] = path.bounds(f as never);
    const side = Math.max(x1 - x0, y1 - y0);
    const vx = (x0 + x1) / 2 - side / 2;
    const vy = (y0 + y1) / 2 - side / 2;
    out[st] = { d: path(f as never) ?? '', viewBox: [vx, vy, side, side].map((n) => +n.toFixed(1)).join(' ') };
  }
  cache = out;
  return out;
}
