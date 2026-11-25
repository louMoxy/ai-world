import { heightAt } from './terrain'
import { mulberry32 } from './noise'
import { STATIONS } from '../stations/stations'
import { toDock, PIER } from './dock'
import { WORKSTATIONS, GALLERY_SLOTS } from '../making/workstations'
import { GROWTH_OBSTACLES } from './growth'

/** Keep the bunting poles and the plots for new things clear of trees and rocks. */
const growthClear = (t) => GROWTH_OBSTACLES.every((g) => Math.hypot(g.x - t.x, g.z - t.z) > g.r + 1.1)

/** Place things randomly (but the same every load) on suitable ground. */
function scatter({ count, seed, minHeight, maxHeight, keepOut, spacing, accept }) {
  const rng = mulberry32(seed)
  const out = []
  let tries = 0
  while (out.length < count && tries < count * 80) {
    tries++
    const a = rng() * Math.PI * 2
    const r = Math.sqrt(rng()) * 34
    const x = Math.cos(a) * r
    const z = Math.sin(a) * r
    const y = heightAt(x, z)
    if (y < minHeight || y > maxHeight) continue
    if (STATIONS.some((s) => Math.hypot(s.position[0] - x, s.position[1] - z) < keepOut)) continue
    if (WORKSTATIONS.some((w) => Math.hypot(w.stand.x - x, w.stand.z - z) < 3)) continue
    if (GALLERY_SLOTS.some((g) => Math.hypot(g.x - x, g.z - z) < 2.2)) continue // room for the displays
    if (out.some((o) => Math.hypot(o.x - x, o.z - z) < spacing)) continue
    const d = toDock(x, z)
    if (d.a > -8 && d.a < PIER.end + 3 && Math.abs(d.b) < 5) continue // keep the pier clear
    if (accept && !accept(r, rng)) continue
    out.push({ x, y, z, scale: 0.8 + rng() * 0.6, rotation: rng() * Math.PI * 2, variant: rng() })
  }
  return out
}

// Trees mostly around the edges so the middle stays open for walking.
export const TREES = scatter({
  count: 75,
  seed: 42,
  minHeight: 0.7,
  maxHeight: 5.5,
  keepOut: 5.5,
  spacing: 1.8,
  accept: (r, rng) => r > 8 && (r > 17 || rng() < 0.25),
})
  .filter(growthClear)
  .map((t) => ({ ...t, kind: t.variant < 0.6 ? 'pine' : 'round' }))

export const ROCKS = scatter({
  count: 30,
  seed: 99,
  minHeight: -0.6,
  maxHeight: 8,
  keepOut: 4.5,
  spacing: 1.4,
}).filter(growthClear)

/** Circles that characters walk around. */
export const OBSTACLES = [
  ...STATIONS.map((s) => ({ x: s.position[0], z: s.position[1], r: 2.8 })),
  ...TREES.map((t) => ({ x: t.x, z: t.z, r: 0.5 * t.scale })),
  ...ROCKS.map((r) => ({ x: r.x, z: r.z, r: 0.5 * r.scale })),
  ...WORKSTATIONS.map((w) => ({ x: w.x, z: w.z, r: w.r })),
  ...GALLERY_SLOTS.map((g) => ({ x: g.x, z: g.z, r: g.r })),
  ...GROWTH_OBSTACLES,
]
