import { heightAt } from './terrain'

/**
 * The harbour sits on the east coast. Positions near it are given in "dock space":
 *   a = distance along the pier (0 = waterline, positive = out to sea)
 *   b = distance to the side of the pier
 */
export const DOCK_ANGLE = 0 // pointing along +x (east)

const ux = Math.cos(DOCK_ANGLE)
const uz = Math.sin(DOCK_ANGLE)
const vx = -uz
const vz = ux

function findShore() {
  for (let r = 0; r < 60; r += 0.1) if (heightAt(ux * r, uz * r) < 0) return r
  return 30
}

/** Distance from the island centre to the waterline along the dock direction. */
export const SHORE_R = findShore()

export const PIER = { start: -2, end: 14, width: 2.4, deckY: 0.65 }

export const toWorld = (a, b) => ({
  x: ux * (SHORE_R + a) + vx * b,
  z: uz * (SHORE_R + a) + vz * b,
})

export const toDock = (x, z) => {
  const dx = x - ux * SHORE_R
  const dz = z - uz * SHORE_R
  return { a: dx * ux + dz * uz, b: dx * vx + dz * vz }
}

/** Heading (rotation.y) that points out to sea along the pier. */
export const HEADING_OUT = Math.atan2(ux, uz)
/** rotation.y that turns local +x to point along the pier. */
export const DOCK_ROTATION = -DOCK_ANGLE

/** Where the harbour hut stands: just inland of the pier. */
export const HARBOUR_HUT = toWorld(-3.5, 0)
