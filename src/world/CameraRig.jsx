import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { OrbitControls } from '@react-three/drei'
import * as THREE from 'three'
import { useWorld } from '../store'
import { tracked } from './tracking'

const MAX_PAN_RADIUS = 28
const before = new THREE.Vector3()
const goal = new THREE.Vector3()
const step = new THREE.Vector3()
const offset = new THREE.Vector3()

/** How close the camera comes in when it starts following someone. */
const FOLLOW_DISTANCE = { agent: 11, ship: 17 }

/**
 * Drag to rotate, scroll to zoom, right-drag to pan.
 * The view is limited so you can't go under the ground or drift off the island.
 *
 * When a character or ship is selected, the camera glides over, zooms in and follows
 * them. You can still drag to look around them and scroll to zoom.
 */
export function CameraRig() {
  const controls = useRef()
  const follow = useRef({ id: null, zooming: 0 })

  const following = () => {
    const sel = useWorld.getState().selected
    return sel && (sel.type === 'agent' || sel.type === 'ship') ? sel : null
  }

  const clampTarget = () => {
    const c = controls.current
    if (!c || following()) return // ships can be far out at sea
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

  useFrame((_, rawDt) => {
    const c = controls.current
    if (!c) return
    const dt = Math.min(rawDt, 0.1)
    const sel = following()
    const f = follow.current

    if ((sel?.id ?? null) !== f.id) {
      f.id = sel?.id ?? null
      f.zooming = sel ? 1.5 : 0 // seconds of easing in towards the follow distance
      c.minDistance = sel ? 5 : 10
    }
    const obj = sel && tracked.get(sel.id)
    if (!obj) return

    // Glide the view so it stays centred on them (camera and target move together).
    goal.copy(obj.position)
    goal.y += sel.type === 'ship' ? 1.6 : 1.3
    step.subVectors(goal, c.target).multiplyScalar(1 - Math.exp(-dt * 4))
    c.target.add(step)
    c.object.position.add(step)

    // Ease in to a close-up when following starts.
    if (f.zooming > 0) {
      f.zooming -= dt
      offset.subVectors(c.object.position, c.target)
      const d = offset.length()
      offset.setLength(d + (FOLLOW_DISTANCE[sel.type] - d) * Math.min(1, dt * 3))
      c.object.position.copy(c.target).add(offset)
    }
  })

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
