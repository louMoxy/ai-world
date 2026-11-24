import { fbm } from './noise'

export const WATER_LEVEL = 0
export const FOG_COLOR = '#cfe9f7'

/** Height of the waves at (x, z) at time t. Used by the water and by floating ships. */
export const waveHeight = (x, z, t) => Math.sin(x * 0.25 + t * 0.9) * 0.1 + Math.cos(z * 0.3 + t * 0.7) * 0.1

const smoothstep =(a, b, x) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)))
  return t * t * (3 - 2 * t)
}

/**
 * Height of the ground at (x, z). Everything that stands on the island
 * (stations, trees, characters) uses this so it sits on the surface.
 */
export function heightAt(x, z) {
  // Wobble the coastline so the island isn't a perfect circle.
  const angle = Math.atan2(z, x)
  const wobble = fbm(Math.cos(angle) * 2 + 5, Math.sin(angle) * 2 + 5, 3) - 0.5
  const r = Math.hypot(x, z) * (1 + wobble * 0.35)

  const land = 1 - smoothstep(20, 36, r) // 1 on the island, 0 out at sea
  const bumps = fbm(x * 0.07 + 11, z * 0.07 + 3)
  const hill = 5 * Math.exp(-((x + 12) ** 2 + (z - 10) ** 2) / 90)

  return land * (1.6 + bumps * 2.2 + hill) - (1 - land) * 3 - 0.4
}
