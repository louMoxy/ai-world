import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { mulberry32 } from './noise'

const puffGeo = new THREE.IcosahedronGeometry(1, 0)
export const cloudMaterial = new THREE.MeshStandardMaterial({ color: '#ffffff', flatShading: true, roughness: 1 })

const rng = mulberry32(5)
const CLOUDS = Array.from({ length: 8 }, () => ({
  x: (rng() - 0.5) * 160,
  y: 22 + rng() * 8,
  z: (rng() - 0.5) * 90,
  speed: 0.6 + rng() * 0.8,
  puffs: Array.from({ length: 3 + Math.floor(rng() * 3) }, (_, j) => ({
    x: j * 1.8 - 2 + rng(),
    y: rng() * 0.8,
    z: (rng() - 0.5) * 1.5,
    s: 1.4 + rng() * 1.2,
  })),
}))

const WRAP = 90

export function Clouds() {
  const refs = useRef([])

  useFrame((_, dt) => {
    refs.current.forEach((g, i) => {
      if (!g) return
      g.position.x += CLOUDS[i].speed * dt
      if (g.position.x > WRAP) g.position.x = -WRAP
    })
  })

  return CLOUDS.map((c, i) => (
    <group key={i} ref={(el) => (refs.current[i] = el)} position={[c.x, c.y, c.z]}>
      {c.puffs.map((p, j) => (
        <mesh
          key={j}
          geometry={puffGeo}
          material={cloudMaterial}
          position={[p.x, p.y, p.z]}
          scale={[p.s * 1.2, p.s * 0.8, p.s]}
          castShadow
        />
      ))}
    </group>
  ))
}
