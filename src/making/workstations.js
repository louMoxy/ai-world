import { getStation } from '../stations/stations'

/**
 * Places where the characters make things. Each sits beside a station, on the side facing
 * the middle of the island. `stand` is where a character stands to work, `rotation` turns
 * the prop to face them, and `r` is how much room it takes (characters walk around it).
 */
function beside(stationId, turn, distance, standDistance) {
  const [sx, sz] = getStation(stationId).position
  const len = Math.hypot(sx, sz) || 1
  const a = Math.atan2(-sz / len, -sx / len) + turn // towards the middle, turned a little
  const dx = Math.cos(a)
  const dz = Math.sin(a)
  const x = sx + dx * distance
  const z = sz + dz * distance
  const stand = { x: sx + dx * standDistance, z: sz + dz * standDistance }
  return { x, z, stand, rotation: Math.atan2(stand.x - x, stand.z - z) }
}

export const WORKSTATIONS = [
  { id: 'easel', name: 'Easel', r: 0.7, ...beside('library', 0, 4.4, 5.8) },
  { id: 'printer', name: '3D Printer', r: 1.6, ...beside('workshop', 0, 5, 7.4) },
  { id: 'mannequin', name: 'Mannequin', r: 0.6, ...beside('workshop', 1.05, 4.4, 5.8) },
  { id: 'loom', name: 'Loom', r: 1.2, ...beside('garden', 0, 4.6, 6.5) },
]

export const getWorkstation = (id) => WORKSTATIONS.find((w) => w.id === id)

/** Display spots around the Gallery, facing inwards. Newest creations fill them first. */
export const GALLERY_SLOTS = (() => {
  const [gx, gz] = getStation('gallery').position
  return Array.from({ length: 8 }, (_, i) => {
    const a = (i / 8) * Math.PI * 2 + Math.PI / 8
    const x = gx + Math.cos(a) * 5
    const z = gz + Math.sin(a) * 5
    return { x, z, rotation: Math.atan2(gx - x, gz - z), r: 0.8 }
  })
})()
