import { useEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'

const deg = THREE.MathUtils.degToRad

function geometryFor(p) {
  switch (p.shape) {
    case 'box':
      return new THREE.BoxGeometry(...p.size)
    case 'cylinder':
      return new THREE.CylinderGeometry(p.radiusTop ?? p.radius, p.radius, p.height, 12)
    case 'cone':
      return new THREE.ConeGeometry(p.radius, p.height, 12)
    case 'sphere':
      return new THREE.IcosahedronGeometry(p.radius, 1)
    case 'torus':
      return new THREE.TorusGeometry(p.radius, p.tube, 6, 18)
  }
}

/**
 * A printed design. With `getProgress` (0–1) it prints itself bottom-up: each part grows
 * upwards once the print head reaches it. `onHeight` reports the print head height.
 * Without `getProgress` it's shown finished.
 */
export function PrintedObject({ design, getProgress, onHeight, ...props }) {
  const parts = useMemo(
    () =>
      design.parts.map((p) => {
        const geometry = geometryFor(p)
        const rotation = (p.rot ?? [0, 0, 0]).map(deg)
        // Find how far the part reaches up and down once rotated.
        const probe = geometry.clone().applyMatrix4(new THREE.Matrix4().makeRotationFromEuler(new THREE.Euler(...rotation)))
        probe.computeBoundingBox()
        const bottom = p.at[1] + probe.boundingBox.min.y
        const top = p.at[1] + probe.boundingBox.max.y
        probe.dispose()
        return { p, geometry, rotation, bottom, top }
      }),
    [design],
  )
  useEffect(() => () => parts.forEach((pt) => pt.geometry.dispose()), [parts])

  const maxTop = Math.max(...parts.map((pt) => pt.top))
  const groups = useRef([])
  const shown = useRef(getProgress ? getProgress() : 1)

  useFrame((_, dt) => {
    if (!getProgress) return
    shown.current += (getProgress() - shown.current) * Math.min(1, dt * 1.5)
    const head = shown.current * maxTop
    parts.forEach((pt, i) => {
      const g = groups.current[i]
      if (!g) return
      const f = THREE.MathUtils.clamp((head - pt.bottom) / Math.max(pt.top - pt.bottom, 0.001), 0, 1)
      g.visible = f > 0.002
      g.scale.y = Math.max(f, 0.002)
    })
    onHeight?.(head, shown.current)
  })

  return (
    <group {...props}>
      {parts.map((pt, i) => (
        <group
          key={i}
          ref={(el) => (groups.current[i] = el)}
          position={[pt.p.at[0], pt.bottom, pt.p.at[2]]}
          visible={!getProgress}
          scale-y={getProgress ? 0.002 : 1}
        >
          <mesh geometry={pt.geometry} position-y={pt.p.at[1] - pt.bottom} rotation={pt.rotation} castShadow receiveShadow>
            <meshStandardMaterial color={pt.p.color} flatShading roughness={0.55} />
          </mesh>
        </group>
      ))}
    </group>
  )
}
