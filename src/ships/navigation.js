import { heightAt } from '../world/terrain'
import { DOCK_ANGLE, PIER, SHORE_R, toWorld, toDock, HEADING_OUT } from '../world/dock'

/**
 * Ships sail between 8 named waypoints in a ring around the island,
 * hopping from one to the next so they never cut across land.
 */
const COMPASS = [
  ['e', 'East'],
  ['se', 'South-East'],
  ['s', 'South'],
  ['sw', 'South-West'],
  ['w', 'West'],
  ['nw', 'North-West'],
  ['n', 'North'],
  ['ne', 'North-East'],
]
const STEP = (Math.PI * 2) / COMPASS.length

/** First distance from the centre where the sea is properly deep. */
function deepWaterRadius(angle) {
  const c = Math.cos(angle)
  const s = Math.sin(angle)
  let r = 15
  while (r < 80 && ![0, 2, 4].every((k) => heightAt(c * (r + k), s * (r + k)) < -2.5)) r += 0.5
  return r
}

export const DOCK_WAYPOINT_INDEX = ((Math.round(DOCK_ANGLE / STEP) % COMPASS.length) + COMPASS.length) % COMPASS.length

export const WAYPOINTS = COMPASS.map(([id, name], k) => {
  const angle = k * STEP
  let r = Math.max(36, deepWaterRadius(angle) + 6)
  // The waypoint off the harbour sits beyond the end of the pier.
  if (k === DOCK_WAYPOINT_INDEX) r = Math.max(r, SHORE_R + PIER.end + 10)
  return { id, name, angle, x: Math.cos(angle) * r, z: Math.sin(angle) * r }
})

export const WAYPOINT_INFO = WAYPOINTS.map(({ id, name }) => ({ id, name }))

/** Mooring spots along the pier. Each ship has its own. */
export const BERTHS = [
  { a: 6, side: 1 },
  { a: 9, side: -1 },
  { a: 12, side: 1 },
].map(({ a, side }) => ({
  approach: toWorld(PIER.end + 4, side * 7),
  entry: toWorld(a, side * 7),
  spot: toWorld(a, side * 2.9),
  heading: HEADING_OUT,
}))

const nearestWaypointIndex = (x, z) => {
  const angle = Math.atan2(z, x)
  return ((Math.round(angle / STEP) % COMPASS.length) + COMPASS.length) % COMPASS.length
}

function ringPath(from, to) {
  const n = COMPASS.length
  const forward = (to - from + n) % n
  const dir = forward <= n / 2 ? 1 : -1
  const path = [WAYPOINTS[from]]
  for (let i = from; i !== to; ) {
    i = (i + dir + n) % n
    path.push(WAYPOINTS[i])
  }
  return path
}

/** Is (x, z) in the water close to the harbour (on the dock side of the ring)? */
const nearHarbour = (x, z) => {
  const { a, b } = toDock(x, z)
  return a > -2 && a < PIER.end + 6 && Math.abs(b) < 9
}

/**
 * List of points a ship should sail through.
 * dest = { waypointIndex } or { berth: index }
 */
export function planRoute({ x, z, atDock, berth }, dest) {
  const points = []
  let start
  if (atDock || nearHarbour(x, z)) {
    if (dest.berth !== undefined) {
      if (atDock) return []
      const d = BERTHS[dest.berth]
      return [d.approach, d.entry, d.spot]
    }
    // Leave the harbour the way we came in.
    const b = BERTHS[berth]
    if (atDock) points.push(b.entry)
    points.push(b.approach)
    start = DOCK_WAYPOINT_INDEX
  } else {
    start = nearestWaypointIndex(x, z)
  }

  if (dest.berth !== undefined) {
    const b = BERTHS[dest.berth]
    points.push(...ringPath(start, DOCK_WAYPOINT_INDEX), b.approach, b.entry, b.spot)
  } else {
    points.push(...ringPath(start, dest.waypointIndex))
  }
  return points
}
