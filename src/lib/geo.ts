// Build-time map geometry. Runs in Node during `astro build`.
//
// Projection: the three parts of d3.geoAlbersUsa (Albers for the lower 48,
// conic equal-area for Alaska and Hawaii, with the same parameters d3 uses),
// each fitted to its own box. Doing the composite by hand lets Alaska and
// Hawaii sit in framed insets wherever each layout needs them, and lets the
// ocean and contour lines be drawn inside each inset.
//
// Geometry is projected once ("canonical" coordinates, the wide layout).
// Each layout places it with a scale and translate, so the page carries one
// copy of every path however many layouts there are.
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { geoAlbers, geoConicEqualArea, geoPath, geoCentroid, geoContains, type GeoProjection } from 'd3-geo';
import { feature } from 'topojson-client';
import type { FeatureCollection, Feature, Geometry } from 'geojson';

const ROOT = process.cwd();
const readJson = (rel: string) => JSON.parse(readFileSync(join(ROOT, rel), 'utf8'));

export const FIPS: Record<string, string> = {
  '01': 'AL', '02': 'AK', '04': 'AZ', '05': 'AR', '06': 'CA', '08': 'CO', '09': 'CT', '10': 'DE',
  '12': 'FL', '13': 'GA', '15': 'HI', '16': 'ID', '17': 'IL', '18': 'IN', '19': 'IA', '20': 'KS',
  '21': 'KY', '22': 'LA', '23': 'ME', '24': 'MD', '25': 'MA', '26': 'MI', '27': 'MN', '28': 'MS',
  '29': 'MO', '30': 'MT', '31': 'NE', '32': 'NV', '33': 'NH', '34': 'NJ', '35': 'NM', '36': 'NY',
  '37': 'NC', '38': 'ND', '39': 'OH', '40': 'OK', '41': 'OR', '42': 'PA', '44': 'RI', '45': 'SC',
  '46': 'SD', '47': 'TN', '48': 'TX', '49': 'UT', '50': 'VT', '51': 'VA', '53': 'WA', '54': 'WV',
  '55': 'WI', '56': 'WY',
};

type Region = 'l48' | 'ak' | 'hi';
type Box = [x: number, y: number, w: number, h: number];
type Pt = [number, number];

/** Where labels sit when a state is too small: a point in the water, and which way the text runs. */
interface Callout { at: Pt; align: 'start' | 'end' | 'middle'; leader?: boolean }

export interface LayoutSpec {
  id: 'narrow' | 'mid' | 'wide';
  /** Media query that shows this layout. */
  media: string;
  width: number;
  height: number;
  l48: [Pt, Pt];
  ak: Box;
  hi: Box;
  /** Smallest pixels per unit this layout is shown at; label sizes are worked out for it. */
  minScale: number;
  /** Map label size in px. */
  labelPx: number;
  /** House squares: size and gap in layout units. */
  cell: number;
  gap: number;
  /**
   * House view (phones): only big delegations (12+) and the Atlantic column
   * are placed with their label; the rest get one afterwards where it fits.
   */
  houseLabelsAfter: boolean;
}

export const LAYOUTS: LayoutSpec[] = [
  {
    id: 'narrow', media: '(max-width: 639.98px)',
    width: 400, height: 300,
    l48: [[2, 2], [370, 236]], ak: [2, 238, 104, 60], hi: [110, 262, 62, 36],
    minScale: 328 / 400, labelPx: 12, cell: 5, gap: 1, houseLabelsAfter: true,
  },
  {
    id: 'mid', media: '(min-width: 640px) and (max-width: 1023.98px)',
    width: 700, height: 450,
    l48: [[176, 6], [650, 360]], ak: [6, 6, 158, 112], hi: [6, 128, 158, 66],
    minScale: 608 / 700, labelPx: 12, cell: 6.5, gap: 1.5, houseLabelsAfter: false,
  },
  {
    // From 1024px the details panel (260px) sits beside the map, so the map
    // itself is 676 to 916px wide.
    id: 'wide', media: '(min-width: 1024px)',
    width: 800, height: 520,
    l48: [[198, 8], [758, 392]], ak: [8, 8, 180, 128], hi: [8, 146, 180, 76],
    minScale: 676 / 800, labelPx: 13, cell: 7, gap: 1.5, houseLabelsAfter: false,
  },
];
const CANONICAL = LAYOUTS.find((l) => l.id === 'wide')!;

// Label anchors where the centroid is a poor spot (lon, lat).
const ANCHORS: Record<string, Pt> = {
  AK: [-151.5, 63.8], CA: [-119.9, 37.3], FL: [-81.6, 28.3], HI: [-156.4, 20.25], ID: [-114.8, 43.9],
  KY: [-85.4, 37.6], LA: [-92.5, 31.0], MI: [-84.7, 43.5], MN: [-94.4, 46.1], NY: [-75.4, 42.9],
  OK: [-97.4, 35.5], TX: [-99.2, 31.4], VA: [-78.6, 37.5], WV: [-80.75, 38.55], NC: [-79.4, 35.6],
  TN: [-86.4, 35.8], SC: [-80.9, 33.9], WA: [-120.4, 47.4], ME: [-69.2, 45.3], MD: [-76.8, 39.2],
  NJ: [-74.6, 40.1], MA: [-71.9, 42.35], CT: [-72.7, 41.6], DE: [-75.5, 38.98], NH: [-71.6, 43.6],
  VT: [-72.7, 44.0], RI: [-71.55, 41.68], IL: [-89.2, 40.0], OH: [-82.8, 40.3], PA: [-77.6, 40.9],
};

// Small eastern states: labels and House squares go out in the Atlantic,
// in one column east of Cape Cod, north to south. Vermont's label goes
// north into Quebec instead, where there is room.
const COLUMN = ['NH', 'MA', 'RI', 'CT', 'NJ', 'DE', 'MD'];
const COLUMN_AT: Pt = [-68.6, 41.5];
const CALLOUTS: Record<string, Callout> = {
  ...Object.fromEntries(COLUMN.map((st) => [st, { at: COLUMN_AT, align: 'start' as const }])),
  VT: { at: [-72.9, 45.6], align: 'middle' },
  // In the water just south-west of the chain, close enough to need no line.
  HI: { at: [-158.9, 20.15], align: 'middle', leader: false },
};

function regionOf(st: string): Region {
  return st === 'AK' ? 'ak' : st === 'HI' ? 'hi' : 'l48';
}

// The sub-projections of d3.geoAlbersUsa, with d3's parameters.
function makeProjection(region: Region): GeoProjection {
  if (region === 'l48') return geoAlbers();
  if (region === 'ak') return geoConicEqualArea().rotate([154, 0]).center([-2, 58.5]).parallels([55, 65]);
  return geoConicEqualArea().rotate([157, 0]).center([-3, 19.9]).parallels([8, 18]);
}

const boxExtent = (b: Box, pad = 0): [Pt, Pt] => [[b[0] + pad, b[1] + pad], [b[0] + b[2] - pad, b[1] + b[3] - pad]];

/** Scale and translate taking canonical coordinates into a layout. */
export interface Transform { s: number; tx: number; ty: number }
const apply = (t: Transform, [x, y]: Pt): Pt => [t.s * x + t.tx, t.s * y + t.ty];
const invert = (t: Transform, [x, y]: Pt): Pt => [(x - t.tx) / t.s, (y - t.ty) / t.s];

export interface Geo {
  /** Canonical path data. */
  states: Record<string, { region: Region; d: string }>;
  layers: Record<Region, { land: string; lakes: string; bathymetry: { depth: number; d: string }[] }>;
  layouts: LayoutGeo[];
  stateOrder: string[];
}

export interface LabelSpot {
  state: string;
  /** Percent of the layout's width and height. */
  x: number;
  y: number;
  align: 'start' | 'end' | 'middle';
  /** Placed away from the state, in the water or on neighbouring land. */
  callout: boolean;
  /** The callout sits on land outside the US (ink text) rather than water. */
  onLand: boolean;
  /** Leader line in layout units, from the state to the label. */
  leader: [Pt, Pt] | null;
  /** The state is too narrow for the "2" badge beside the code: put it below. */
  badgeBelow: boolean;
}

export type LabelSide = 'above' | 'right' | 'left' | 'below';

export interface HouseGrid {
  state: string;
  x: number;
  y: number;
  cols: number;
  n: number;
  /**
   * Label anchor in percent; `side` says where it sits against the grid.
   * Null on phones when there is no room: the panel names the state on tap.
   */
  label: { x: number; y: number; side: LabelSide } | null;
  leader: [Pt, Pt] | null;
  /** Moved out to the Atlantic column. */
  offshore: boolean;
}

export interface LayoutGeo {
  spec: LayoutSpec;
  transforms: Record<Region, Transform>;
  /** Anchor of every state, in layout units. */
  anchors: Record<string, Pt>;
  senateLabels: LabelSpot[];
  /** House squares for each apportionment key (see mapData.ts). */
  house: Record<string, HouseGrid[]>;
}

const r1 = (n: number) => Math.round(n * 10) / 10;
const pct = (v: number, of: number) => Math.round((v / of) * 10000) / 100;

/** Width of a postal code label in px (Barlow Semi Condensed 600, tracked). */
const labelWidthPx = (text: string, px: number) => text.length * px * 0.74;

export function buildGeo(apportionments: Record<string, Record<string, number>>): Geo {
  // us-atlas states-10m.json, simplified by pipeline/geo/build_geo.py.
  const us = readJson('public/geo/states.topo.json');
  const ocean = readJson('public/geo/ocean.topo.json');
  const landTopo = readJson('public/geo/land.topo.json');

  const all = feature(us, us.objects.states) as unknown as FeatureCollection;
  const states = all.features
    .filter((f) => FIPS[String(f.id)])
    .map((f) => ({ ...f, properties: { st: FIPS[String(f.id)] } })) as Feature<Geometry, { st: string }>[];
  if (states.length !== 50) throw new Error(`Expected 50 states in us-atlas, found ${states.length}`);
  const byRegion = (r: Region) => ({
    type: 'FeatureCollection' as const,
    features: states.filter((f) => regionOf(f.properties.st) === r),
  });

  // Fit each region in each layout.
  const fitted = LAYOUTS.map((spec) => ({
    spec,
    proj: {
      l48: makeProjection('l48').fitExtent(spec.l48, byRegion('l48')),
      ak: makeProjection('ak').fitExtent(boxExtent(spec.ak, spec.ak[2] * 0.06), byRegion('ak')),
      hi: makeProjection('hi').fitExtent(boxExtent(spec.hi, spec.hi[2] * 0.08), byRegion('hi')),
    } as Record<Region, GeoProjection>,
  }));
  const canon = fitted.find((f) => f.spec.id === CANONICAL.id)!.proj;

  const transformFor = (p: GeoProjection, c: GeoProjection): Transform => {
    const s = p.scale() / c.scale();
    const [tx, ty] = p.translate();
    const [cx, cy] = c.translate();
    return { s, tx: tx - s * cx, ty: ty - s * cy };
  };

  // Visible area of each region in canonical coordinates, over all layouts.
  const regions: Region[] = ['l48', 'ak', 'hi'];
  const clip: Record<Region, [Pt, Pt]> = {} as Record<Region, [Pt, Pt]>;
  for (const r of regions) {
    let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
    for (const f of fitted) {
      const t = transformFor(f.proj[r], canon[r]);
      const frame: Box = r === 'l48' ? [0, 0, f.spec.width, f.spec.height] : f.spec[r];
      const a = invert(t, [frame[0], frame[1]]);
      const b = invert(t, [frame[0] + frame[2], frame[1] + frame[3]]);
      x0 = Math.min(x0, a[0]); y0 = Math.min(y0, a[1]); x1 = Math.max(x1, b[0]); y1 = Math.max(y1, b[1]);
    }
    clip[r] = [[x0 - 2, y0 - 2], [x1 + 2, y1 + 2]];
  }

  const pathFor = (r: Region) => geoPath(makeProjection(r).scale(canon[r].scale()).translate(canon[r].translate()).clipExtent(clip[r])).digits(1);
  const paths = { l48: pathFor('l48'), ak: pathFor('ak'), hi: pathFor('hi') };
  // Unclipped, for states (always inside the frame).
  const statePath = Object.fromEntries(regions.map((r) => [r, geoPath(canon[r]).digits(1)])) as Record<Region, ReturnType<typeof geoPath>>;

  const bathy = feature(ocean, ocean.objects.bathymetry) as unknown as FeatureCollection<Geometry, { depth: number }>;
  const lakes = feature(ocean, ocean.objects.lakes) as unknown as FeatureCollection;
  const land = feature(landTopo, landTopo.objects.land) as unknown as FeatureCollection;
  // Only Vermont's callout can fall on land; the column and Hawaii's are water.
  const calloutOnLand = Object.fromEntries(Object.entries(CALLOUTS).map(([st, c]) => [st, st === 'VT' && geoContains(land, c.at)]));
  const depths = [...new Set(bathy.features.map((f) => f.properties.depth))].sort((a, b) => a - b);

  const layers = Object.fromEntries(regions.map((r) => [r, {
    land: paths[r](land) ?? '',
    lakes: paths[r](lakes) ?? '',
    bathymetry: depths.map((depth) => ({
      depth,
      d: paths[r]({ type: 'FeatureCollection', features: bathy.features.filter((f) => f.properties.depth === depth) }) ?? '',
    })).filter((b) => b.d),
  }])) as Geo['layers'];

  const statePaths: Geo['states'] = {};
  const canonAnchor: Record<string, Pt> = {};
  for (const f of states) {
    const st = f.properties.st;
    const r = regionOf(st);
    statePaths[st] = { region: r, d: statePath[r](f) ?? '' };
    canonAnchor[st] = canon[r](ANCHORS[st] ?? geoCentroid(f)) as Pt;
  }
  const canonBounds = Object.fromEntries(states.map((f) => [f.properties.st, statePath[regionOf(f.properties.st)].bounds(f) as [Pt, Pt]]));

  // West to east, then north to south: the order keyboard users move through.
  const stateOrder = Object.keys(canonAnchor).sort((a, b) => canonAnchor[a][0] - canonAnchor[b][0]);

  const layouts: LayoutGeo[] = fitted.map(({ spec, proj }) => {
    const transforms = Object.fromEntries(regions.map((r) => [r, transformFor(proj[r], canon[r])])) as Record<Region, Transform>;
    const anchors: Record<string, Pt> = {};
    const bounds: Record<string, [Pt, Pt]> = {};
    for (const st of Object.keys(canonAnchor)) {
      const t = transforms[regionOf(st)];
      anchors[st] = apply(t, canonAnchor[st]);
      bounds[st] = [apply(t, canonBounds[st][0]), apply(t, canonBounds[st][1])];
    }
    const unitsPerPx = 1 / spec.minScale;
    const labelH = spec.labelPx * unitsPerPx;
    // The column: each label at its state's height if it can be, pushed
    // down just far enough to clear the one above.
    const colX = (proj.l48(COLUMN_AT) as Pt)[0];
    const step = labelH * 1.2;
    const columnY: Record<string, number> = {};
    let lastY = -Infinity;
    for (const st of COLUMN) {
      columnY[st] = Math.max(anchors[st][1], lastY + step);
      lastY = columnY[st];
    }
    const calloutAt = (st: string): Pt =>
      COLUMN.includes(st) ? [colX, columnY[st]] : (proj[regionOf(st)](CALLOUTS[st].at) as Pt);

    // ---- Senate labels ----
    const senateLabels: LabelSpot[] = Object.keys(anchors).sort().map((st) => {
      const [[x0, y0], [x1, y1]] = bounds[st];
      const textW = labelWidthPx(st, spec.labelPx) * unitsPerPx;
      // Room for the code and the "2" badge beside it.
      const fits = x1 - x0 > textW * 1.9 && y1 - y0 > labelH * 1.4;
      const a = anchors[st];
      const badgeBelow = x1 - x0 < textW + (16 + 8) * unitsPerPx;
      // The eastern states always go in the column, so it reads as one list.
      if (!CALLOUTS[st] || (fits && !COLUMN.includes(st))) {
        return { state: st, x: pct(a[0], spec.width), y: pct(a[1], spec.height), align: 'middle', callout: false, onLand: false, leader: null, badgeBelow };
      }
      const c = calloutAt(st);
      const co = CALLOUTS[st];
      return {
        state: st, x: pct(c[0], spec.width), y: pct(c[1], spec.height), align: co.align, callout: true,
        onLand: calloutOnLand[st], badgeBelow: false,
        leader: co.leader === false ? null : [[r1(a[0]), r1(a[1])], [r1(c[0] - (co.align === 'start' ? 2 : 0)), r1(c[1])]],
      };
    });

    // ---- House squares ----
    // One grid of squares per state, near its anchor, with the postal code
    // on a chip beside it. Placement is greedy: the Atlantic column first,
    // then the biggest delegations, each smaller one taking the nearest
    // free spot on a spiral around its own. It always ends, and the final
    // check below makes the build fail if two grids ever touch.
    const pitch = spec.cell + spec.gap;
    const PAD = spec.gap * 2;
    const chipW = (st: string) => (labelWidthPx(st, spec.labelPx) + 4) * unitsPerPx;
    const chipH = labelH + 2 * unitsPerPx;
    type Rect = [number, number, number, number];
    const hits = (a: Rect, b: Rect) => a[0] < b[2] + PAD && b[0] < a[2] + PAD && a[1] < b[3] + PAD && b[1] < a[3] + PAD;
    const insetRect = (b: Box): Rect => [b[0], b[1], b[0] + b[2], b[1] + b[3]];
    // Where the title block sits over the map (bottom-left, from 640px).
    const titleArea: Rect | null = spec.id === 'narrow' ? null : [0, spec.height * 0.8, spec.width * 0.27, spec.height];

    /** Grid and label rectangles for a grid whose top-left is (gx, gy). */
    function shape(gx: number, gy: number, gw: number, gh: number, lw: number, side: LabelSide) {
      const g: Rect = [gx, gy, gx + gw, gy + gh];
      const gap = 2;
      const l: Rect =
        side === 'above' ? [gx + gw / 2 - lw / 2, gy - gap - chipH, gx + gw / 2 + lw / 2, gy - gap] :
        side === 'below' ? [gx + gw / 2 - lw / 2, gy + gh + gap, gx + gw / 2 + lw / 2, gy + gh + gap + chipH] :
        side === 'right' ? [gx + gw + gap, gy, gx + gw + gap + lw, gy + chipH] :
        [gx - gap - lw, gy, gx - gap, gy + chipH];
      return { g, l };
    }

    const house: Record<string, HouseGrid[]> = {};
    for (const [key, seats] of Object.entries(apportionments)) {
      const placed: Rect[] = [];
      const out: HouseGrid[] = [];

      const dims = (st: string) => {
        const n = seats[st];
        const [[x0, y0], [x1, y1]] = bounds[st];
        const aspect = Math.min(1.8, Math.max(0.6, (y1 - y0) / (x1 - x0)));
        const cols = Math.max(1, Math.round(Math.sqrt(n / aspect)));
        const gw = cols * pitch - spec.gap;
        const gh = Math.ceil(n / cols) * pitch - spec.gap;
        // With labels placed afterwards, only the Atlantic column and the
        // big delegations claim label room up front.
        const labelled = !spec.houseLabelsAfter || COLUMN.includes(st) || n >= 12;
        return { n, cols, gw, gh, lw: labelled ? chipW(st) : 0, labelled };
      };

      const finish = (st: string, gx: number, gy: number, side: LabelSide, offshore: boolean) => {
        const d = dims(st);
        const { g, l } = shape(gx, gy, d.gw, d.gh, d.lw, side);
        placed.push(g);
        if (d.labelled) placed.push(l);
        const a = anchors[st];
        const [[bx0, by0], [bx1, by1]] = bounds[st];
        const cx = gx + d.gw / 2;
        const cy = gy + d.gh / 2;
        const overState = cx > bx0 && cx < bx1 && cy > by0 && cy < by1;
        const nearAnchor = Math.hypot(cx - a[0], cy - a[1]) < Math.max(d.gw, d.gh) / 2 + pitch;
        let leader: [Pt, Pt] | null = null;
        if (offshore || !(overState || nearAnchor)) {
          leader = [[r1(a[0]), r1(a[1])], [r1(Math.min(Math.max(a[0], gx), gx + d.gw)), r1(Math.min(Math.max(a[1], gy), gy + d.gh))]];
        }
        const lx = side === 'right' ? l[0] : side === 'left' ? l[2] : (l[0] + l[2]) / 2;
        const ly = side === 'above' ? l[3] : side === 'below' ? l[1] : l[1];
        out.push({
          state: st, x: r1(gx), y: r1(gy), cols: d.cols, n: d.n,
          label: d.labelled ? { x: pct(lx, spec.width), y: pct(ly, spec.height), side } : null,
          leader, offshore,
        });
      };

      // 1. The Atlantic column, north to south, each grid at its state's
      //    height or just below the one above.
      const roomy = (st: string) => {
        const d = dims(st);
        const [[x0, y0], [x1, y1]] = bounds[st];
        return x1 - x0 > Math.max(d.gw, d.lw) * 1.15 && y1 - y0 > (d.gh + chipH) * 1.15;
      };
      const offshore = COLUMN.filter((st) => !roomy(st));
      let bottom = -Infinity;
      for (const st of offshore) {
        const d = dims(st);
        const gy = Math.max(anchors[st][1] - d.gh / 2, bottom + PAD * 2);
        // Shift left only as far as needed to keep the label inside the frame.
        const gx = Math.min(colX, spec.width - 2 - d.gw - 2 - d.lw);
        finish(st, gx, gy, 'right', true);
        bottom = gy + Math.max(d.gh, chipH);
      }

      // 2. Everyone else, biggest first.
      const SIDES: LabelSide[] = ['above', 'right', 'left', 'below'];
      const rest = Object.keys(anchors).filter((st) => !offshore.includes(st))
        .sort((a, b) => seats[b] - seats[a] || a.localeCompare(b));
      for (const st of rest) {
        const d = dims(st);
        const region = regionOf(st);
        const frame: Rect = region === 'l48' ? [1, 1, spec.width - 1, spec.height - 1] : insetRect(spec[region]);
        const blockers: Rect[] = region === 'l48'
          ? [insetRect(spec.ak), insetRect(spec.hi), ...(titleArea ? [titleArea] : [])]
          : [];
        const inFrame = (r: Rect) => r[0] >= frame[0] && r[1] >= frame[1] && r[2] <= frame[2] && r[3] <= frame[3];
        const free = (r: Rect) => inFrame(r) && !placed.some((p) => hits(r, p)) && !blockers.some((b) => hits(r, b));
        const [ax, ay] = anchors[st];
        let found: { gx: number; gy: number; side: LabelSide } | null = null;
        for (let ring = 0; ring < 400 && !found; ring++) {
          const rad = ring * (pitch / 2);
          const steps = ring === 0 ? 1 : 24;
          for (let k = 0; k < steps && !found; k++) {
            const t = (k / steps) * Math.PI * 2;
            const gx = ax + rad * Math.cos(t) - d.gw / 2;
            const gy = ay + rad * Math.sin(t) - d.gh / 2;
            for (const side of SIDES) {
              const { g, l } = shape(gx, gy, d.gw, d.gh, d.lw, side);
              if (free(g) && (!d.labelled || free(l))) { found = { gx, gy, side }; break; }
            }
          }
        }
        if (!found) throw new Error(`No room for the ${st} House squares in the ${spec.id} layout (${key})`);
        finish(st, found.gx, found.gy, found.side, false);
      }

      // 3. Phones: labels where there is room, biggest delegations first.
      if (spec.houseLabelsAfter) {
        const SIDES: LabelSide[] = ['above', 'right', 'left', 'below'];
        for (const g of [...out].sort((a, b) => b.n - a.n || a.state.localeCompare(b.state))) {
          if (g.label) continue;
          const region = regionOf(g.state);
          const frame: Rect = region === 'l48' ? [1, 1, spec.width - 1, spec.height - 1] : insetRect(spec[region]);
          const blockers: Rect[] = region === 'l48' ? [insetRect(spec.ak), insetRect(spec.hi)] : [];
          const gw = g.cols * pitch - spec.gap;
          const gh = Math.ceil(g.n / g.cols) * pitch - spec.gap;
          const lw = chipW(g.state);
          for (const side of SIDES) {
            const { l } = shape(g.x, g.y, gw, gh, lw, side);
            const ok = l[0] >= frame[0] && l[1] >= frame[1] && l[2] <= frame[2] && l[3] <= frame[3] &&
              !placed.some((p) => hits(l, p)) && !blockers.some((b) => hits(l, b));
            if (!ok) continue;
            placed.push(l);
            const lx = side === 'right' ? l[0] : side === 'left' ? l[2] : (l[0] + l[2]) / 2;
            const ly = side === 'above' ? l[3] : l[1];
            g.label = { x: pct(lx, spec.width), y: pct(ly, spec.height), side };
            break;
          }
        }
      }

      // Belt and braces: nothing may overlap.
      for (let i = 0; i < placed.length; i++) {
        for (let j = i + 1; j < placed.length; j++) {
          const a = placed[i], b = placed[j];
          if (a[0] < b[2] && b[0] < a[2] && a[1] < b[3] && b[1] < a[3]) {
            throw new Error(`House squares overlap in the ${spec.id} layout (${key})`);
          }
        }
      }
      house[key] = out.sort((a, b) => a.state.localeCompare(b.state));
    }

    return { spec, transforms, anchors, senateLabels, house };
  });

  return { states: statePaths, layers, layouts, stateOrder };
}
