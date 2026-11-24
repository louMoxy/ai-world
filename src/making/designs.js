/**
 * Design formats: what the island can make. A design is plain data (never code), so an AI
 * can write one and the world can build it. validateDesign() checks every design against
 * strict limits before it's used, and drops anything that doesn't fit.
 *
 * print  { kind: 'print', name, parts: [Part] }
 *   Part: { shape, at: [x, y, z], rot?: [x, y, z] (degrees), color: '#rrggbb', ...size }
 *     box      size: [width, height, depth]
 *     cylinder radius, height, radiusTop?
 *     cone     radius, height
 *     sphere   radius
 *     torus    radius, tube
 *   Units are metres. y = 0 is the print bed. The object must fit in PRINT_BOUNDS.
 *
 * fabric { kind: 'fabric', name, pattern, colors: ['#rrggbb' x 2–4], scale: 1–8 }
 *
 * outfit { kind: 'outfit', name, wearer: characterId,
 *          hat: { style, color }, neck: { style, fabric: <fabric design> } }
 */

export const THEMES = {
  print: { label: '3D printing', icon: '🖨️', making: 'Printing', place: 'printer' },
  fabric: { label: 'Textiles', icon: '🧵', making: 'Weaving', place: 'loom' },
  outfit: { label: 'Fashion', icon: '👗', making: 'Sewing', place: 'mannequin' },
}

export const PRINT_BOUNDS = { width: 2.4, height: 3, depth: 2.4 }
export const MAX_PARTS = 32
export const SHAPES = ['box', 'cylinder', 'cone', 'sphere', 'torus']
export const PATTERNS = ['stripes', 'checks', 'spots', 'zigzag', 'weave', 'waves']
export const HATS = ['none', 'beanie', 'top', 'cone', 'beret', 'crown', 'bucket']
export const NECKS = ['none', 'scarf', 'cape', 'collar']
export const WEARERS = ['nova', 'pip']

const HEX = /^#[0-9a-f]{6}$/i
const num = (v, min, max) => typeof v === 'number' && Number.isFinite(v) && v >= min && v <= max
const vec3 = (v, min, max) => Array.isArray(v) && v.length === 3 && v.every((n) => num(n, min, max))
const name = (v) => (typeof v === 'string' && v.trim() ? v.trim().slice(0, 60) : null)

/** Rough half-extent of a part, used to keep it inside the print area. */
function partExtent(p) {
  switch (p.shape) {
    case 'box':
      return Math.hypot(...p.size) / 2
    case 'cylinder':
      return Math.max(p.radius, p.radiusTop ?? p.radius, p.height / 2)
    case 'cone':
      return Math.max(p.radius, p.height / 2)
    case 'sphere':
      return p.radius
    case 'torus':
      return p.radius + p.tube
    default:
      return Infinity
  }
}

function cleanPart(p) {
  if (!p || !SHAPES.includes(p.shape) || !vec3(p.at, -5, 5) || !HEX.test(p.color ?? '')) return null
  const part = { shape: p.shape, at: p.at, color: p.color }
  if (p.rot !== undefined) {
    if (!vec3(p.rot, -360, 360)) return null
    part.rot = p.rot
  }
  if (p.shape === 'box') {
    if (!vec3(p.size, 0.03, 3)) return null
    part.size = p.size
  } else if (p.shape === 'sphere') {
    if (!num(p.radius, 0.02, 1.5)) return null
    part.radius = p.radius
  } else if (p.shape === 'torus') {
    if (!num(p.radius, 0.05, 1.2) || !num(p.tube, 0.02, 0.5)) return null
    Object.assign(part, { radius: p.radius, tube: p.tube })
  } else {
    if (!num(p.radius, 0.02, 1.2) || !num(p.height, 0.03, 3)) return null
    Object.assign(part, { radius: p.radius, height: p.height })
    if (p.shape === 'cylinder' && p.radiusTop !== undefined) {
      if (!num(p.radiusTop, 0, 1.2)) return null
      part.radiusTop = p.radiusTop
    }
  }
  // Keep it on the print bed and inside the print area (with a little slack).
  const e = partExtent(part)
  const [x, y, z] = part.at
  const { width, height, depth } = PRINT_BOUNDS
  if (Math.abs(x) + e * 0.7 > width / 2 + 0.2 || Math.abs(z) + e * 0.7 > depth / 2 + 0.2) return null
  if (y + e * 0.7 > height + 0.2 || y < -0.05) return null
  return part
}

export function cleanFabric(f) {
  if (!f || !PATTERNS.includes(f.pattern)) return null
  if (!Array.isArray(f.colors) || f.colors.length < 2 || f.colors.length > 4 || !f.colors.every((c) => HEX.test(c))) return null
  if (!num(f.scale, 1, 8)) return null
  return { kind: 'fabric', name: name(f.name) ?? 'Fabric', pattern: f.pattern, colors: f.colors, scale: Math.round(f.scale) }
}

/**
 * Check a design. Returns { ok, design, errors }. `design` is a cleaned copy with only the
 * allowed fields; bad parts of a print are dropped (with an error each) rather than failing it.
 */
export function validateDesign(d) {
  const errors = []
  if (!d || typeof d !== 'object') return { ok: false, errors: ['Not a design'] }

  if (d.kind === 'print') {
    if (!Array.isArray(d.parts) || !d.parts.length) return { ok: false, errors: ['A print needs parts'] }
    const parts = []
    d.parts.slice(0, MAX_PARTS).forEach((p, i) => {
      const clean = cleanPart(p)
      if (clean) parts.push(clean)
      else errors.push(`Part ${i + 1} is invalid or outside the print area`)
    })
    if (d.parts.length > MAX_PARTS) errors.push(`Only the first ${MAX_PARTS} parts are used`)
    if (!parts.length) return { ok: false, errors }
    return { ok: true, design: { kind: 'print', name: name(d.name) ?? 'Print', parts }, errors }
  }

  if (d.kind === 'fabric') {
    const design = cleanFabric(d)
    return design ? { ok: true, design, errors } : { ok: false, errors: ['Invalid fabric'] }
  }

  if (d.kind === 'outfit') {
    if (!WEARERS.includes(d.wearer)) return { ok: false, errors: ['Unknown wearer'] }
    const hat = d.hat && HATS.includes(d.hat.style) && HEX.test(d.hat.color ?? '') ? { style: d.hat.style, color: d.hat.color } : { style: 'none', color: '#000000' }
    const fabric = cleanFabric({ ...d.neck?.fabric })
    const neck = d.neck && NECKS.includes(d.neck.style) && fabric ? { style: d.neck.style, fabric } : { style: 'none', fabric: null }
    if (hat.style === 'none' && neck.style === 'none') return { ok: false, errors: ['An outfit needs a hat or a neck piece'] }
    return { ok: true, design: { kind: 'outfit', name: name(d.name) ?? 'Outfit', wearer: d.wearer, hat, neck }, errors }
  }

  return { ok: false, errors: [`Unknown kind "${d.kind}"`] }
}
