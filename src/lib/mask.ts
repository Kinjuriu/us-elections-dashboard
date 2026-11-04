// A coarse raster of one map layout: which cells are water, neighbouring
// land, or which state. Used at build time to keep House squares inside
// their state (or wholly in the water) and labels clear of land.
import { geoPath, type GeoProjection } from 'd3-geo';
import type { Feature, FeatureCollection } from 'geojson';

type Pt = [number, number];
export type Rect = [x0: number, y0: number, x1: number, y1: number];

export const WATER = 0;
export const FOREIGN = 1;
/** States are numbered from here. */
export const FIRST_STATE = 2;

export class Mask {
  readonly cols: number;
  readonly rows: number;
  readonly cells: Uint8Array;
  private sats = new Map<string, Int32Array>();

  /** `res` layout units per cell. */
  constructor(readonly width: number, readonly height: number, readonly res: number) {
    this.cols = Math.ceil(width / res);
    this.rows = Math.ceil(height / res);
    this.cells = new Uint8Array(this.cols * this.rows);
  }

  /** Paint a feature, projected and clipped to `clip`, with `value` (even-odd fill). */
  paint(projection: GeoProjection, f: Feature | FeatureCollection, value: number, clip: Rect): void {
    const rings: Pt[][] = [];
    let cur: Pt[] = [];
    const ctx = {
      moveTo: (x: number, y: number) => { cur = [[x, y]]; rings.push(cur); },
      lineTo: (x: number, y: number) => { cur.push([x, y]); },
      closePath: () => {},
      arc: () => {},
    };
    projection.clipExtent([[clip[0], clip[1]], [clip[2], clip[3]]]);
    geoPath(projection, ctx as unknown as CanvasRenderingContext2D)(f);
    projection.clipExtent(null);

    const { res, cols } = this;
    const c0 = Math.max(0, Math.floor(clip[0] / res));
    const c1 = Math.min(cols - 1, Math.ceil(clip[2] / res) - 1);
    const r0 = Math.max(0, Math.floor(clip[1] / res));
    const r1 = Math.min(this.rows - 1, Math.ceil(clip[3] / res) - 1);
    for (let r = r0; r <= r1; r++) {
      const y = (r + 0.5) * res;
      const xs: number[] = [];
      for (const ring of rings) {
        for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
          const [xa, ya] = ring[j];
          const [xb, yb] = ring[i];
          if ((ya <= y) !== (yb <= y)) xs.push(xa + ((y - ya) / (yb - ya)) * (xb - xa));
        }
      }
      xs.sort((a, b) => a - b);
      for (let k = 0; k + 1 < xs.length; k += 2) {
        const from = Math.max(c0, Math.ceil(xs[k] / res - 0.5));
        const to = Math.min(c1, Math.floor(xs[k + 1] / res - 0.5));
        for (let c = from; c <= to; c++) this.cells[r * cols + c] = value;
      }
    }
    this.sats.clear();
  }

  /** Set every cell in a rectangle to `value`. */
  fill(rect: Rect, value: number): void {
    const { res, cols } = this;
    for (let r = Math.max(0, Math.floor(rect[1] / res)); r < Math.min(this.rows, Math.ceil(rect[3] / res)); r++) {
      for (let c = Math.max(0, Math.floor(rect[0] / res)); c < Math.min(cols, Math.ceil(rect[2] / res)); c++) {
        this.cells[r * cols + c] = value;
      }
    }
    this.sats.clear();
  }

  value(p: Pt): number {
    const c = Math.floor(p[0] / this.res);
    const r = Math.floor(p[1] / this.res);
    if (c < 0 || r < 0 || c >= this.cols || r >= this.rows) return WATER;
    return this.cells[r * this.cols + c];
  }

  /** Share of the cells under `rect` that hold `value` (0 to 1). */
  share(rect: Rect, value: number): number {
    const key = String(value);
    let sat = this.sats.get(key);
    const W = this.cols + 1;
    if (!sat) {
      sat = new Int32Array(W * (this.rows + 1));
      for (let r = 0; r < this.rows; r++) {
        let run = 0;
        for (let c = 0; c < this.cols; c++) {
          run += this.cells[r * this.cols + c] === value ? 1 : 0;
          sat[(r + 1) * W + c + 1] = sat[r * W + c + 1] + run;
        }
      }
      this.sats.set(key, sat);
    }
    const { res } = this;
    const c0 = Math.max(0, Math.floor(rect[0] / res));
    const c1 = Math.min(this.cols, Math.ceil(rect[2] / res));
    const r0 = Math.max(0, Math.floor(rect[1] / res));
    const r1 = Math.min(this.rows, Math.ceil(rect[3] / res));
    const n = (c1 - c0) * (r1 - r0);
    if (n <= 0) return 0;
    const sum = sat[r1 * W + c1] - sat[r0 * W + c1] - sat[r1 * W + c0] + sat[r0 * W + c0];
    return sum / n;
  }
}
