import { paintPattern } from './fabric'
import { THEMES } from './designs'

/**
 * Sketches: a hand-drawn page for each day's design. A sketch is a list of strokes, so the
 * easel can draw it a stroke at a time as the work goes on, and the Island Log can show
 * exactly what has been drawn so far (or the whole page once it's done).
 */

export const SKETCH_SIZE = 512
const PAPER = '#fbf7ee'
const PENCIL = '#39404f'
const HAND = '"Segoe Print", "Bradley Hand", "Comic Sans MS", cursive'

/** The strokes for a day's sketch. Each stroke is a function that draws onto a 2D context. */
export function sketchStrokes(day) {
  const d = day.design
  const strokes = [(ctx) => title(ctx, day.title, THEMES[d.kind]?.label)]
  if (d.kind === 'print') strokes.push(...printStrokes(d))
  if (d.kind === 'fabric') strokes.push(...fabricStrokes(d))
  if (d.kind === 'outfit') strokes.push(...outfitStrokes(d))
  ;(day.notes ?? []).slice(0, 3).forEach((note, i) => strokes.push((ctx) => noteLine(ctx, note, i)))
  if (day.sketcher) strokes.push((ctx) => signature(ctx, day.sketcher))
  return strokes
}

/** Draw the first `count` strokes on a fresh page. */
export function drawSketch(ctx, strokes, count = strokes.length) {
  const S = SKETCH_SIZE
  ctx.save()
  ctx.fillStyle = PAPER
  ctx.fillRect(0, 0, S, S)
  ctx.strokeStyle = 'rgba(90, 130, 180, 0.12)'
  ctx.lineWidth = 1
  for (let g = 32; g < S; g += 32) {
    line(ctx, g, 0, g, S)
    line(ctx, 0, g, S, g)
  }
  ctx.restore()
  strokes.slice(0, count).forEach((stroke) => {
    ctx.save()
    stroke(ctx)
    ctx.restore()
  })
}

const urls = new Map()

/** The sketch as an image (PNG data URL) with `count` strokes drawn. Cached. */
export function sketchImage(day, count) {
  const strokes = sketchStrokes(day)
  const n = count ?? strokes.length
  const key = `${day.id}:${n}`
  if (!urls.has(key)) {
    const canvas = document.createElement('canvas')
    canvas.width = canvas.height = SKETCH_SIZE
    drawSketch(canvas.getContext('2d'), strokes, n)
    urls.set(key, canvas.toDataURL('image/png'))
  }
  return urls.get(key)
}

// ---------- Strokes for each kind ----------

/** Front view of a print, drawn part by part from the bottom up. */
function printStrokes(design) {
  const parts = [...design.parts].sort((a, b) => partBox(a).bottom - partBox(b).bottom)
  const boxes = parts.map(partBox)
  const minX = Math.min(...boxes.map((b) => b.left))
  const maxX = Math.max(...boxes.map((b) => b.right))
  const maxY = Math.max(...boxes.map((b) => b.top))
  const area = { x: 110, y: 100, w: 260, h: 290 }
  const scale = Math.min(area.w / (maxX - minX), area.h / maxY)
  const cx = area.x + area.w / 2 - ((minX + maxX) / 2) * scale
  const ground = area.y + area.h
  const X = (v) => cx + v * scale
  const Y = (v) => ground - v * scale

  const strokes = [
    (ctx) => {
      pencil(ctx, 2)
      wobblyLine(ctx, X(minX) - 40, ground, X(maxX) + 40, ground)
    },
  ]
  for (const p of parts) {
    strokes.push((ctx) => {
      const [x, y] = p.at
      ctx.fillStyle = p.color
      ctx.globalAlpha = 0.4
      partPath(ctx, p, X(x), Y(y), scale)
      ctx.fill()
      ctx.globalAlpha = 1
      pencil(ctx, 1.6)
      partPath(ctx, p, X(x), Y(y), scale)
      ctx.stroke()
      partPath(ctx, p, X(x) + 0.8, Y(y) - 0.6, scale) // a second, slightly-off pass looks hand drawn
      ctx.globalAlpha = 0.35
      ctx.stroke()
    })
  }
  // Height measurement down the right-hand side.
  strokes.push((ctx) => {
    const x = X(maxX) + 34
    pencil(ctx, 1.2)
    line(ctx, x, ground, x, Y(maxY))
    line(ctx, x - 6, Y(maxY), x + 6, Y(maxY))
    line(ctx, x - 6, ground, x + 6, ground)
    handText(ctx, `${Math.round(maxY * 100)} cm`, x + 10, (ground + Y(maxY)) / 2, 15)
  })
  return strokes
}

/** A swatch filled in band by band, then colour chips. */
function fabricStrokes(fabric) {
  const sw = { x: 96, y: 96, w: 320, h: 240 }
  const bands = 4
  const strokes = [
    (ctx) => {
      pencil(ctx, 2)
      wobblyRect(ctx, sw.x, sw.y, sw.w, sw.h)
    },
  ]
  for (let i = 0; i < bands; i++) {
    strokes.push((ctx) => {
      const y = sw.y + (sw.h / bands) * i
      ctx.beginPath()
      ctx.rect(sw.x, y, sw.w, sw.h / bands + 0.5)
      ctx.clip()
      paintPattern(ctx, fabric, sw.x, sw.y, sw.w, sw.h)
    })
  }
  strokes.push(...chipStrokes(fabric.colors, { y: sw.y + sw.h + 22 }))
  return strokes
}

/** A character outline, then the hat, then the neck piece in its fabric. */
function outfitStrokes(outfit) {
  const cx = 200
  const strokes = [
    (ctx) => {
      // Body (capsule) and head, like the island's characters.
      pencil(ctx, 2)
      ctx.beginPath()
      ctx.roundRect(cx - 62, 230, 124, 170, 62)
      ctx.stroke()
      ctx.beginPath()
      ctx.arc(cx, 190, 58, 0, Math.PI * 2)
      ctx.stroke()
      ctx.fillStyle = PENCIL
      for (const ex of [-20, 20]) {
        ctx.beginPath()
        ctx.arc(cx + ex, 184, 5, 0, Math.PI * 2)
        ctx.fill()
      }
    },
  ]
  const { neck, hat } = outfit
  if (neck.style !== 'none') {
    const neckPath = (ctx) => {
      ctx.beginPath()
      if (neck.style === 'scarf') {
        ctx.roundRect(cx - 66, 232, 132, 34, 16)
        ctx.roundRect(cx + 14, 250, 30, 90, 8)
      } else if (neck.style === 'cape') {
        ctx.moveTo(cx - 56, 236)
        ctx.lineTo(cx + 56, 236)
        ctx.lineTo(cx + 96, 404)
        ctx.lineTo(cx - 96, 404)
        ctx.closePath()
      } else {
        ctx.moveTo(cx - 70, 228)
        ctx.lineTo(cx + 70, 228)
        ctx.lineTo(cx + 46, 262)
        ctx.lineTo(cx - 46, 262)
        ctx.closePath()
      }
    }
    strokes.push((ctx) => {
      ctx.save()
      neckPath(ctx)
      ctx.clip()
      paintPattern(ctx, neck.fabric, cx - 100, 220, 200, 190)
      ctx.restore()
      neckPath(ctx) // painting the pattern replaced the path, so trace it again to ink it
      pencil(ctx, 1.8)
      ctx.stroke()
    })
  }
  if (hat.style !== 'none') {
    strokes.push((ctx) => {
      ctx.fillStyle = hat.color
      ctx.beginPath()
      hatPath(ctx, hat.style, cx, 142)
      ctx.fill()
      pencil(ctx, 1.8)
      ctx.stroke()
    })
  }
  const colors = [hat.style !== 'none' ? hat.color : null, ...(neck.fabric?.colors ?? [])].filter(Boolean)
  strokes.push(...chipStrokes(colors.slice(0, 4), { x: 400, y: 150, vertical: true }))
  return strokes
}

function hatPath(ctx, style, cx, top) {
  switch (style) {
    case 'beanie':
      ctx.arc(cx, top + 22, 60, Math.PI, 0)
      ctx.rect(cx - 62, top + 18, 124, 16)
      break
    case 'top':
      ctx.rect(cx - 78, top + 18, 156, 12)
      ctx.rect(cx - 44, top - 60, 88, 80)
      break
    case 'cone':
      ctx.moveTo(cx - 58, top + 26)
      ctx.lineTo(cx, top - 90)
      ctx.lineTo(cx + 58, top + 26)
      ctx.closePath()
      break
    case 'beret':
      ctx.ellipse(cx + 10, top + 10, 74, 26, -0.18, 0, Math.PI * 2)
      break
    case 'crown':
      ctx.moveTo(cx - 52, top + 24)
      for (let i = 0; i <= 4; i++) {
        ctx.lineTo(cx - 52 + i * 26, top - 22)
        if (i < 4) ctx.lineTo(cx - 39 + i * 26, top + 2)
      }
      ctx.lineTo(cx + 52, top + 24)
      ctx.closePath()
      break
    case 'bucket':
      ctx.moveTo(cx - 80, top + 30)
      ctx.lineTo(cx + 80, top + 30)
      ctx.lineTo(cx + 44, top - 26)
      ctx.lineTo(cx - 44, top - 26)
      ctx.closePath()
      break
  }
}

/** Colour swatches in a row (or a column, with vertical). */
function chipStrokes(colors, { x = 120, y, vertical = false }) {
  return colors.map((c, i) => (ctx) => {
    const cx = vertical ? x : x + i * 46
    const cy = (vertical ? y + i * 46 : y) + 14
    ctx.fillStyle = c
    ctx.beginPath()
    ctx.arc(cx, cy, 15, 0, Math.PI * 2)
    ctx.fill()
    pencil(ctx, 1.3)
    ctx.stroke()
  })
}

// ---------- Shapes and handwriting ----------

/** The front-view outline of a part. (x, y) is the part's centre on the page. */
function partPath(ctx, p, x, y, s) {
  ctx.beginPath()
  const flat = p.rot && Math.abs(Math.abs(p.rot[0]) - 90) < 20 // lying flat (rings, discs)
  switch (p.shape) {
    case 'box': {
      const [w, h] = p.size
      ctx.rect(x - (w * s) / 2, y - (h * s) / 2, w * s, h * s)
      break
    }
    case 'cylinder': {
      const r = p.radius * s
      const rt = (p.radiusTop ?? p.radius) * s
      const h = p.height * s
      ctx.moveTo(x - r, y + h / 2)
      ctx.lineTo(x - rt, y - h / 2)
      ctx.ellipse(x, y - h / 2, rt, rt * 0.22, 0, Math.PI, 0)
      ctx.lineTo(x + r, y + h / 2)
      ctx.ellipse(x, y + h / 2, r, r * 0.22, 0, 0, Math.PI)
      break
    }
    case 'cone': {
      const r = p.radius * s
      const h = p.height * s
      ctx.moveTo(x - r, y + h / 2)
      ctx.lineTo(x, y - h / 2)
      ctx.lineTo(x + r, y + h / 2)
      ctx.ellipse(x, y + h / 2, r, r * 0.22, 0, 0, Math.PI)
      break
    }
    case 'sphere':
      ctx.arc(x, y, p.radius * s, 0, Math.PI * 2)
      break
    case 'torus': {
      const outer = (p.radius + p.tube) * s
      const inner = (p.radius - p.tube) * s
      if (flat) {
        ctx.ellipse(x, y, outer, Math.max(outer * 0.22, p.tube * s), 0, 0, Math.PI * 2)
      } else {
        ctx.arc(x, y, outer, 0, Math.PI * 2)
        ctx.moveTo(x + inner, y)
        ctx.arc(x, y, inner, 0, Math.PI * 2, true)
      }
      break
    }
  }
}

/** Approximate front-view box of a part (in metres). */
function partBox(p) {
  const [x, y] = p.at
  const flat = p.rot && Math.abs(Math.abs(p.rot[0]) - 90) < 20
  let hw = 0
  let hh = 0
  if (p.shape === 'box') [hw, hh] = [p.size[0] / 2, p.size[1] / 2]
  else if (p.shape === 'sphere') hw = hh = p.radius
  else if (p.shape === 'torus') [hw, hh] = [p.radius + p.tube, flat ? p.tube : p.radius + p.tube]
  else [hw, hh] = [Math.max(p.radius, p.radiusTop ?? 0), p.height / 2]
  return { left: x - hw, right: x + hw, bottom: y - hh, top: y + hh }
}

function title(ctx, text, theme) {
  ctx.fillStyle = PENCIL
  ctx.font = `600 28px ${HAND}`
  ctx.fillText(text, 28, 52, SKETCH_SIZE - 56)
  const width = Math.min(ctx.measureText(text).width, SKETCH_SIZE - 56)
  pencil(ctx, 1.4)
  wobblyLine(ctx, 26, 60, 30 + width, 61)
  if (theme) {
    ctx.font = `15px ${HAND}`
    ctx.globalAlpha = 0.7
    ctx.fillText(theme, 30, 80)
  }
}

function noteLine(ctx, note, i) {
  handText(ctx, `• ${note}`, 32, 438 + i * 22, 15, SKETCH_SIZE - 64)
}

function signature(ctx, name) {
  ctx.fillStyle = PENCIL
  ctx.font = `italic 17px ${HAND}`
  ctx.textAlign = 'right'
  ctx.fillText(`– ${name}`, SKETCH_SIZE - 26, 76)
}

function handText(ctx, text, x, y, size, maxWidth) {
  ctx.fillStyle = PENCIL
  ctx.font = `${size}px ${HAND}`
  ctx.fillText(text, x, y, maxWidth)
}

function pencil(ctx, width) {
  ctx.strokeStyle = PENCIL
  ctx.lineWidth = width
  ctx.lineCap = 'round'
  ctx.lineJoin = 'round'
}

function line(ctx, x1, y1, x2, y2) {
  ctx.beginPath()
  ctx.moveTo(x1, y1)
  ctx.lineTo(x2, y2)
  ctx.stroke()
}

function wobblyLine(ctx, x1, y1, x2, y2) {
  ctx.beginPath()
  ctx.moveTo(x1, y1)
  const steps = 8
  for (let i = 1; i <= steps; i++) {
    const t = i / steps
    ctx.lineTo(x1 + (x2 - x1) * t, y1 + (y2 - y1) * t + Math.sin(i * 2.3) * 1.2)
  }
  ctx.stroke()
}

function wobblyRect(ctx, x, y, w, h) {
  wobblyLine(ctx, x, y, x + w, y)
  wobblyLine(ctx, x + w, y, x + w, y + h)
  wobblyLine(ctx, x + w, y + h, x, y + h)
  wobblyLine(ctx, x, y + h, x, y)
}
