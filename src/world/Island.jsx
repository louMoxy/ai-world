import { useMemo } from 'react'
import * as THREE from 'three'
import { heightAt } from './terrain'
import { mulberry32 } from './noise'

const SIZE = 84
const SEGMENTS = 84

const WET_SAND = new THREE.Color('#cdb680')
const SAND = new THREE.Color('#ecd9a0')
const GRASS_LIGHT = new THREE.Color('#8fcf5a')
const GRASS_DARK = new THREE.Color('#4f9e45')
const ROCK = new THREE.Color('#9a9488')

export function Island() {
  const geometry = useMemo(() => {
    const plane = new THREE.PlaneGeometry(SIZE, SIZE, SEGMENTS, SEGMENTS)
    plane.rotateX(-Math.PI / 2)
    const pos = plane.attributes.position
    for (let i = 0; i < pos.count; i++) {
      pos.setY(i, heightAt(pos.getX(i), pos.getZ(i)))
    }

    // Non-indexed so every triangle can have its own flat colour.
    const geo = plane.toNonIndexed()
    plane.dispose()
    const p = geo.attributes.position
    const colors = new Float32Array(p.count * 3)
    const rng = mulberry32(7)
    const c = new THREE.Color()

    for (let i = 0; i < p.count; i += 3) {
      const y = (p.getY(i) + p.getY(i + 1) + p.getY(i + 2)) / 3
      if (y < -0.2) c.copy(WET_SAND)
      else if (y < 0.45) c.copy(SAND)
      else if (y < 7) c.copy(GRASS_LIGHT).lerp(GRASS_DARK, Math.min(1, (y - 0.45) / 6) * 0.7 + rng() * 0.3)
      else c.copy(ROCK)
      c.offsetHSL(0, 0, (rng() - 0.5) * 0.05)
      for (let k = 0; k < 3; k++) colors.set([c.r, c.g, c.b], (i + k) * 3)
    }

    geo.setAttribute('color', new THREE.BufferAttribute(colors, 3))
    geo.computeVertexNormals()
    return geo
  }, [])

  return (
    <group>
      <mesh geometry={geometry} receiveShadow>
        <meshStandardMaterial vertexColors flatShading roughness={0.95} />
      </mesh>
      {/* Sea floor beyond the island, seen through the water. */}
      <mesh rotation-x={-Math.PI / 2} position-y={-3.3}>
        <planeGeometry args={[400, 400]} />
        <meshStandardMaterial color="#b9a46f" roughness={1} />
      </mesh>
    </group>
  )
}
