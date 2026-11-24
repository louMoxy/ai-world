import { useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { WATER_LEVEL, waveHeight } from './terrain'
import { useMood } from '../looks/useMood'

export function Water() {
  const mood = useMood()
  const geometry = useMemo(() => {
    const g = new THREE.PlaneGeometry(300, 300, 90, 90)
    g.rotateX(-Math.PI / 2)
    return g
  }, [])
  const base = useMemo(() => geometry.attributes.position.array.slice(), [geometry])

  // Gentle low-poly waves.
  useFrame(({ clock }) => {
    const t = clock.elapsedTime
    const pos = geometry.attributes.position
    const arr = pos.array
    for (let i = 0; i < pos.count; i++) {
      const x = base[i * 3]
      const z = base[i * 3 + 2]
      arr[i * 3 + 1] = waveHeight(x, z, t)
    }
    pos.needsUpdate = true
  })

  return (
    <mesh geometry={geometry} position-y={WATER_LEVEL} receiveShadow>
      <meshStandardMaterial
        color={mood.water}
        transparent
        opacity={0.78}
        roughness={0.25}
        metalness={0.05}
        flatShading
      />
    </mesh>
  )
}
