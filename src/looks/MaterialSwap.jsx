import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { useLook } from './useMood'

/**
 * Material modes a look can ask for (see looks.js):
 * - standard: the materials as built
 * - toon:     cartoon shading with three flat light bands
 * - vision:   the world goes black and only AI entities (characters, ships) keep a colour,
 *             so the AI Vision filter can pick them out
 *
 * Groups mark themselves as AI entities with userData={{ aiEntity: '#colour' }}.
 */

/** Three flat light bands: shadow, mid and lit. */
const toonGradient = (() => {
  const tex = new THREE.DataTexture(new Uint8Array([80, 165, 255]), 3, 1, THREE.RedFormat)
  tex.minFilter = THREE.NearestFilter
  tex.magFilter = THREE.NearestFilter
  tex.generateMipmaps = false
  tex.needsUpdate = true
  return tex
})()

const MODES = {
  toon: {
    make: (original) => {
      const m = new THREE.MeshToonMaterial({ gradientMap: toonGradient })
      m.map = original.map
      m.vertexColors = original.vertexColors
      m.transparent = original.transparent
      m.depthWrite = original.depthWrite
      m.side = original.side
      m.fog = original.fog
      return m
    },
    // Copy anything that can change at runtime (hover highlights, fades).
    sync: (original, m) => {
      m.color.copy(original.color)
      m.emissive.copy(original.emissive)
      m.emissiveIntensity = original.emissiveIntensity
      m.opacity = original.opacity
      m.visible = original.visible
    },
  },
  vision: {
    make: (original, entity) =>
      new THREE.MeshBasicMaterial({
        color: entity ?? '#000000',
        fog: false,
        side: original.side,
      }),
    sync: (original, m) => {
      m.visible = original.visible
    },
  },
}

const caches = { toon: new WeakMap(), vision: new WeakMap() } // mode -> original -> copy

function swapFor(mode, original, entity) {
  const cache = caches[mode]
  let m = cache.get(original)
  if (!m) {
    m = MODES[mode].make(original, entity)
    cache.set(original, m)
  }
  return m
}

/** Put every surface into the given material mode. Returns how many are swapped. */
export function applyMaterials(scene, mode) {
  let swapped = 0
  const visit = (obj, entity) => {
    if (obj.userData.aiEntity) entity = obj.userData.aiEntity
    if (obj.isMesh && !Array.isArray(obj.material)) {
      // A standard material here is the original (possibly a fresh one React just set).
      const original = obj.material.isMeshStandardMaterial ? obj.material : obj.userData.lookOriginal
      if (original) {
        if (mode === 'standard' || !MODES[mode]) {
          obj.material = original
          delete obj.userData.lookOriginal
        } else {
          const m = swapFor(mode, original, entity)
          obj.userData.lookOriginal = original
          obj.material = m
          MODES[mode].sync(original, m)
          swapped++
        }
      }
    }
    for (const child of obj.children) visit(child, entity)
  }
  visit(scene, null)
  return swapped
}

/**
 * Changes the material of every surface to match the look.
 * Each frame it also catches meshes that appeared since, and copies hover colours across.
 */
export function MaterialSwap() {
  const look = useLook()
  const swapped = useRef(0)

  useFrame(({ scene }) => {
    if (look.materials === 'standard' && swapped.current === 0) return
    swapped.current = applyMaterials(scene, look.materials)
  })

  return null
}
