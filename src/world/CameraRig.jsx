import { useRef } from 'react'
import { OrbitControls } from '@react-three/drei'
import * as THREE from 'three'

const MAX_PAN_RADIUS = 28
const before = new THREE.Vector3()

/**
 * Drag to rotate, scroll to zoom, right-drag to pan.
 * The view is limited so you can't go under the ground or drift off the island.
 */
export function CameraRig() {
  const controls = useRef()

  const clampTarget = () => {
    const c = controls.current
    if (!c) return
    const t = c.target
    before.copy(t)
    const r = Math.hypot(t.x, t.z)
    if (r > MAX_PAN_RADIUS) {
      t.x *= MAX_PAN_RADIUS / r
      t.z *= MAX_PAN_RADIUS / r
    }
    t.y = THREE.MathUtils.clamp(t.y, 0, 6)
    // Move the camera by the same amount so the view doesn't jump.
    c.object.position.add(before.sub(t).negate())
  }

  return (
    <OrbitControls
      ref={(c) => {
        controls.current = c
        if (import.meta.env.DEV) window.__controls = c // for looking around from the console
      }}
      makeDefault
      target={[0, 1.5, 0]}
      enableDamping
      dampingFactor={0.08}
      minDistance={10}
      maxDistance={85}
      minPolarAngle={0.15}
      maxPolarAngle={Math.PI / 2.25}
      screenSpacePanning={false}
      zoomSpeed={0.9}
      onChange={clampTarget}
    />
  )
}
