import * as THREE from 'three'

/**
 * Paint a fabric design into a 2D canvas rectangle. Used for the sketches, the log
 * pictures and (through fabricTexture) the cloth in the 3D world, so they always match.
 */
export function paintPattern(ctx, fabric, x, y, w, h) {
  const [c0, c1, c2 = c0, c3 = c1] = fabric.colors
  const unit = Math.min(w, h) / (fabric.scale * 2.5) // size of one repeat
  ctx.save()
  ctx.beginPath()
  ctx.rect(x, y, w, h)
  ctx.clip()
  ctx.fillStyle = c0
  ctx.fillRect(x, y, w, h)

  switch (fabric.pattern) {
    case 'stripes': {
      const colors = fabric.colors
      const band = unit / 2
      for (let i = 0, sx = x; sx < x + w; i++, sx += band) {
        ctx.fillStyle = colors[i % colors.length]
        ctx.fillRect(sx, y, band + 0.5, h)
      }
      break
    }
    case 'checks': {
      const s = unit / 2
      ctx.globalAlpha = 0.55
      ctx.fillStyle = c1
      for (let sx = x; sx < x + w; sx += s * 2) ctx.fillRect(sx, y, s, h)
      for (let sy = y; sy < y + h; sy += s * 2) ctx.fillRect(x, sy, w, s)
      ctx.globalAlpha = 1
      ctx.strokeStyle = c2
      ctx.lineWidth = Math.max(1, s * 0.08)
      for (let sx = x + s * 1.5; sx < x + w; sx += s * 2) line(ctx, sx, y, sx, y + h)
      break
    }
    case 'spots': {
      const s = unit / 1.6
      let row = 0
      for (let sy = y + s / 2; sy < y + h + s; sy += s, row++) {
        for (let sx = x + (row % 2 ? s / 2 : 0); sx < x + w + s; sx += s) {
          ctx.fillStyle = [c1, c2, c3][(row + Math.round(sx / s)) % 3]
          ctx.beginPath()
          ctx.arc(sx, sy, s * 0.22, 0, Math.PI * 2)
          ctx.fill()
        }
      }
      break
    }
    case 'zigzag': {
      const s = unit / 1.5
      ctx.lineWidth = s * 0.28
      ctx.lineJoin = 'miter'
      let i = 0
      for (let sy = y; sy < y + h + s; sy += s * 0.7, i++) {
        ctx.strokeStyle = [c1, c2, c3][i % 3]
        ctx.beginPath()
        for (let sx = x - s, k = 0; sx < x + w + s; sx += s / 2, k++) ctx.lineTo(sx, sy + (k % 2 ? s * 0.3 : 0))
        ctx.stroke()
      }
      break
    }
    case 'weave': {
      const s = unit / 2
      for (let sy = y, r = 0; sy < y + h; sy += s, r++) {
        for (let sx = x, c = 0; sx < x + w; sx += s, c++) {
          const across = (r + c) % 2 === 0
          ctx.fillStyle = across ? c1 : c2
          if (across) for (let k = 0; k < 3; k++) ctx.fillRect(sx + 1, sy + 1 + (k * s) / 3, s - 2, s / 3 - 2)
          else for (let k = 0; k < 3; k++) ctx.fillRect(sx + 1 + (k * s) / 3, sy + 1, s / 3 - 2, s - 2)
        }
      }
      break
    }
    case 'waves': {
      const s = unit / 1.4
      ctx.lineWidth = s * 0.2
      let i = 0
      for (let sy = y; sy < y + h + s; sy += s * 0.5, i++) {
        ctx.strokeStyle = [c1, c2, c3][i % 3]
        ctx.beginPath()
        for (let sx = x; sx <= x + w; sx += 2) ctx.lineTo(sx, sy + Math.sin(((sx - x) / s) * Math.PI * 2) * s * 0.15)
        ctx.stroke()
      }
      break
    }
  }
  ctx.restore()
}

function line(ctx, x1, y1, x2, y2) {
  ctx.beginPath()
  ctx.moveTo(x1, y1)
  ctx.lineTo(x2, y2)
  ctx.stroke()
}

const textures = new Map()

/** A repeating texture for a fabric (cached, so each fabric is painted once). */
export function fabricTexture(fabric) {
  const key = JSON.stringify([fabric.pattern, fabric.colors, fabric.scale])
  let tex = textures.get(key)
  if (!tex) {
    const canvas = document.createElement('canvas')
    canvas.width = canvas.height = 256
    paintPattern(canvas.getContext('2d'), fabric, 0, 0, 256, 256)
    tex = new THREE.CanvasTexture(canvas)
    tex.colorSpace = THREE.SRGBColorSpace
    tex.wrapS = tex.wrapT = THREE.RepeatWrapping
    tex.anisotropy = 4
    textures.set(key, tex)
  }
  return tex
}
