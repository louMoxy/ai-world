import { heightAt } from './terrain'
import { toWorld, toDock, PIER } from './dock'
import { STATIONS, getStation } from '../stations/stations'
import { WORKSTATIONS, GALLERY_SLOTS } from '../making/workstations'

/**
 * How the island grows over time. Everything here is worked out from the finished days,
 * so the island is always rebuilt the same way from data/making.json:
 *
 *   - every finished print gets a small copy on the pier, newest first (PIER_SPOTS);
 *   - every finished fabric strings a line of bunting between two places (BUNTING_ROUTES);
 *   - the newest fabric becomes the Gull's sail;
 *   - a day can also add something to the island (a bench, flowers…), chosen by the daily
 *     AI about once a week. Additions go on fixed plots (PLOTS) so they never land in a
 *     tree or in someone's way.
 */

export const ADDITION_KINDS = {
  bench: 'a bench',
  flowers: 'a flower bed',
  lamp: 'a lamp post',
  signpost: 'a signpost',
  birdbath: 'a bird bath',
  beehive: 'a beehive',
}
/** Stations an addition can be placed near. */
export const ADDITION_PLACES = ['hub', 'library', 'workshop', 'garden', 'observatory', 'gallery']

const dist = (a, b) => Math.hypot(a.x - b.x, a.z - b.z)
const onLand = (p) => heightAt(p.x, p.z) > 0.5
const nearPier = (p) => {
  const d = toDock(p.x, p.z)
  return d.a > -7 && d.a < PIER.end + 3 && Math.abs(d.b) < 4
}
const busy = [
  ...WORKSTATIONS.flatMap((w) => [{ x: w.x, z: w.z, r: w.r + 1.4 }, { x: w.stand.x, z: w.stand.z, r: 1.4 }]),
  ...GALLERY_SLOTS.map((g) => ({ x: g.x, z: g.z, r: 1.8 })),
]
const clear = (p, taken, gap) =>
  onLand(p) && !nearPier(p) && busy.every((b) => dist(p, b) > b.r) && taken.every((t) => dist(p, t) > gap)

/** Small copies of finished prints along the pier, both sides, from the shore outwards. */
export const PIER_SPOTS = [3.5, 6.5, 9.5, 12.5].flatMap((a) =>
  [-1, 1].map((side) => ({ ...toWorld(a, side * (PIER.width / 2 - 0.35)), y: PIER.deckY + 0.11 })),
)

/** Where bunting is strung, in order: the first finished fabric gets the first route. */
const ROUTES = [
  ['hub', 'library'],
  ['hub', 'garden'],
  ['hub', 'gallery'],
  ['hub', 'workshop'],
  ['hub', 'observatory'],
  ['library', 'gallery'],
  ['observatory', 'garden'],
  ['observatory', 'gallery'],
]

const taken = []

/** A pole beside a station, roughly towards another one, kept clear of everything else. */
function poleNear(fromId, toId) {
  const [fx, fz] = getStation(fromId).position
  const [tx, tz] = getStation(toId).position
  const base = Math.atan2(tz - fz, tx - fx)
  for (const turn of [0.6, -0.6, 1.1, -1.1, 0.3, -0.3, 1.5, -1.5]) {
    const p = { x: fx + Math.cos(base + turn) * 3.6, z: fz + Math.sin(base + turn) * 3.6 }
    if (clear(p, taken, 1.6)) {
      taken.push(p)
      return p
    }
  }
  return null
}

export const BUNTING_ROUTES = ROUTES.map(([a, b]) => {
  const from = poleNear(a, b)
  const to = poleNear(b, a)
  return from && to ? { from, to } : null
}).filter(Boolean)

/** Plots for additions: up to 3 around each station. */
export const PLOTS = ADDITION_PLACES.flatMap((stationId) => {
  const [sx, sz] = getStation(stationId).position
  const out = []
  for (let k = 0; k < 12 && out.length < 3; k++) {
    const a = (k / 12) * Math.PI * 2 + (stationId === 'hub' ? 0.26 : 0)
    const p = { x: sx + Math.cos(a) * 4.8, z: sz + Math.sin(a) * 4.8 }
    if (!clear(p, taken, 2.4)) continue
    // Face the station.
    const plot = { ...p, stationId, rotation: Math.atan2(sx - p.x, sz - p.z) }
    taken.push(plot)
    out.push(plot)
  }
  return out
})

/** Everything above, as spots that trees keep clear of and characters walk around. */
export const GROWTH_OBSTACLES = [
  ...BUNTING_ROUTES.flatMap((r) => [{ ...r.from, r: 0.35 }, { ...r.to, r: 0.35 }]),
  ...PLOTS.map((p) => ({ x: p.x, z: p.z, r: 0.8 })),
]

const finished = (days) => days.filter((d) => d.status === 'finished')

/** Prints on the pier, newest first, one per spot. */
export const pierPrints = (days) =>
  finished(days)
    .filter((d) => d.design.kind === 'print')
    .reverse()
    .slice(0, PIER_SPOTS.length)

/** Bunting: each finished fabric (oldest first) gets the next route. */
export const bunting = (days) =>
  finished(days)
    .filter((d) => d.design.kind === 'fabric')
    .slice(0, BUNTING_ROUTES.length)
    .map((day, i) => ({ day, route: BUNTING_ROUTES[i] }))

/** The Gull's sail: the newest finished fabric, if there is one. */
export const sailFabric = (days) =>
  [...finished(days)].reverse().find((d) => d.design.kind === 'fabric')?.design ?? null

/** Additions from finished days, each on a plot near the station it asked for (or the nearest free one). */
export function placedAdditions(days) {
  const used = new Set()
  const out = []
  for (const day of finished(days)) {
    const add = day.addition
    if (!add) continue
    const [sx, sz] = getStation(add.near)?.position ?? [0, 0]
    const free = PLOTS.filter((p) => !used.has(p))
    if (!free.length) break
    const plot = free.find((p) => p.stationId === add.near) ?? free.sort((a, b) => dist(a, { x: sx, z: sz }) - dist(b, { x: sx, z: sz }))[0]
    used.add(plot)
    out.push({ day, addition: add, plot })
  }
  return out
}

/** "a bench by the Library" */
export const describeAddition = (add) =>
  `${ADDITION_KINDS[add.kind] ?? 'something new'} ${add.near === 'hub' ? 'by The Spire' : `by the ${STATIONS.find((s) => s.id === add.near)?.name ?? 'island'}`}`
