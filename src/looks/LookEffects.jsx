import { useEffect, useMemo, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import {
  EffectComposer,
  RenderPass,
  EffectPass,
  BloomEffect,
  VignetteEffect,
  PixelationEffect,
} from 'postprocessing'
import { OutlineEffect, PosterizeEffect, BlueprintEffect, VisionEffect } from './effects'
import { LOOKS } from './looks'
import { applyMaterials } from './MaterialSwap'
import { useLook } from './useMood'

/** The filters each effect name in looks.js stands for. */
function makeFilters(name, dpr) {
  const pixel = Math.round(5 * dpr)
  switch (name) {
    case 'outline':
      return [new OutlineEffect({ thickness: Math.max(2, dpr * 2.3) })]
    case 'bloom':
      return [
        new BloomEffect({ mipmapBlur: true, intensity: 2.2, luminanceThreshold: 0.35, luminanceSmoothing: 0.3 }),
        new VignetteEffect({ offset: 0.25, darkness: 0.55 }),
      ]
    case 'pixel':
      return [new PixelationEffect(pixel), new PosterizeEffect({ levels: 8, cell: pixel })]
    case 'blueprint':
      return [new BlueprintEffect({ thickness: Math.max(2, dpr * 2), grid: Math.round(28 * dpr) })]
    case 'vision':
      return [new VisionEffect({ thickness: Math.max(1.5, dpr * 1.5) })]
    case 'glow':
      return [new BloomEffect({ mipmapBlur: true, intensity: 1.6, luminanceThreshold: 0.75, luminanceSmoothing: 0.2 })]
    default:
      return []
  }
}

/**
 * Full-screen filters drawn after the scene.
 *
 * Every look's filters are built and compiled once while the loading screen is up, then
 * switching looks only turns one pass on and another off, so it's instant.
 * Looks without filters draw the scene directly, so the Default look costs nothing extra.
 */
export function LookEffects() {
  const look = useLook()
  const { gl, scene, camera, size } = useThree()
  const frame = useRef(0)

  const { composer, passes } = useMemo(() => {
    const dpr = gl.getPixelRatio()
    const composer = new EffectComposer(gl, { frameBufferType: THREE.HalfFloatType, multisampling: 4 })
    composer.addPass(new RenderPass(scene, camera))
    const passes = {}
    for (const l of LOOKS) {
      const effects = l.effects.flatMap((name) => makeFilters(name, dpr))
      if (!effects.length) continue
      const pass = new EffectPass(camera, ...effects)
      pass.enabled = false
      composer.addPass(pass)
      passes[l.id] = pass
    }
    if (import.meta.env.DEV) window.__looks = { composer, passes }
    return { composer, passes }
  }, [gl, scene, camera])

  useEffect(() => () => composer.dispose(), [composer])
  useEffect(() => composer.setSize(size.width, size.height, false), [composer, size])

  const activate = (id) => {
    for (const [passId, pass] of Object.entries(passes)) {
      pass.enabled = passId === id
      pass.renderToScreen = passId === id
    }
  }

  useEffect(() => activate(look.id))

  // Priority 1 means this callback does the drawing for the whole app.
  useFrame((_, dt) => {
    // On the second frame (still behind the loading screen) draw every look once, with
    // its materials, so all the shaders are compiled before anyone switches.
    if (++frame.current === 2) {
      for (const l of LOOKS) {
        applyMaterials(scene, l.materials)
        activate(l.id)
        if (passes[l.id]) composer.render(0)
        else gl.render(scene, camera)
      }
      applyMaterials(scene, look.materials)
      activate(look.id)
    }

    if (passes[look.id]) composer.render(dt)
    else gl.render(scene, camera)
  }, 1)

  return null
}
