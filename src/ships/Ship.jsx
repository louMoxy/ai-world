import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { Html } from '@react-three/drei'
import * as THREE from 'three'
import { waveHeight } from '../world/terrain'
import { useWorld, isThing } from '../store'
import { getBrain } from '../brains'
import { WAYPOINTS, WAYPOINT_INFO, BERTHS, planRoute } from './navigation'

const MAX_SPEED = 3.4
const TURN_RATE = 1.1 // radians per second
const SCALE = 1.2
const KEEP_APART = 5.5 // ships steer away from each other inside this distance

/** Where every ship is right now, so they can avoid each other. */
const shipPositions = new Map()

const angleDiff = (a, b) => Math.atan2(Math.sin(b - a), Math.cos(b - a))
const clamp = THREE.MathUtils.clamp

export function Ship({ ship }) {
  const group = useRef()
  const hull = useRef()
  const brain = getBrain(ship.id)
  const berth = BERTHS[ship.berth]

  const sim = useRef(null)
  if (!sim.current) {
    const atDock = ship.start === 'dock'
    const p = atDock ? berth.spot : WAYPOINTS.find((w) => w.id === ship.start)
    sim.current = {
      x: p.x,
      z: p.z,
      heading: atDock ? berth.heading : Math.random() * Math.PI * 2,
      speed: 0,
      turn: 0,
      atDock,
      berth: ship.berth,
      currentWaypointId: atDock ? null : ship.start,
      route: [],
      action: null,
      pending: false,
      lastAction: null,
      phase: Math.random() * 10,
    }
    if (import.meta.env.DEV) (window.__ships ??= {})[ship.id] = sim.current
  }

  const hovered = useWorld((s) => isThing(s.hovered, 'ship', ship.id))
  const selected = useWorld((s) => isThing(s.selected, 'ship', ship.id))
  const speech = useWorld((s) => s.speech[ship.id])
  const active = hovered || selected

  const startAction = (action) => {
    const s = sim.current
    const { setStatus, say } = useWorld.getState()

    if (action?.type === 'sailTo') {
      const index = WAYPOINTS.findIndex((w) => w.id === action.waypointId)
      if (index >= 0) {
        s.route = planRoute(s, { waypointIndex: index })
        s.atDock = false
        setStatus(ship.id, action.status ?? `Sailing ${WAYPOINTS[index].name.toLowerCase()}`)
        return { ...action, elapsed: 0 }
      }
    }
    if (action?.type === 'dock') {
      s.route = planRoute(s, { berth: s.berth })
      const moored = s.atDock
      setStatus(ship.id, moored ? action.arrivedStatus ?? 'Moored at the harbour' : action.status ?? 'Heading back to the harbour')
      return { ...action, seconds: action.seconds ?? 8, moored, elapsed: 0 }
    }
    if (action?.type === 'say') {
      say(ship.id, action.text, action.seconds ?? 3.5)
      return { ...action, elapsed: 0 }
    }
    s.route = []
    setStatus(ship.id, action?.status ?? (s.atDock ? 'Moored at the harbour' : 'Holding position'))
    return { type: 'idle', seconds: action?.seconds ?? 3, elapsed: 0 }
  }

  const finish = () => {
    const s = sim.current
    s.lastAction = s.action
    s.action = null
    s.route = []
  }

  useFrame((state, rawDt) => {
    const dt = Math.min(rawDt, 0.1)
    const t = state.clock.elapsedTime
    const s = sim.current

    // The brain can cut the current action short (e.g. after an order in chat).
    if (brain.interrupt) {
      brain.interrupt = false
      if (s.action) finish()
    }

    if (!s.action && !s.pending) {
      s.pending = true
      Promise.resolve(
        brain.decide({
          ship: { id: ship.id, name: ship.name, role: ship.role },
          position: { x: s.x, z: s.z },
          atDock: s.atDock,
          currentWaypointId: s.currentWaypointId,
          waypoints: WAYPOINT_INFO,
          lastAction: s.lastAction,
        }),
      )
        .then((action) => (s.action = startAction(action)))
        .catch(() => (s.action = startAction(null)))
        .finally(() => (s.pending = false))
    }

    const a = s.action
    let targetSpeed = 0
    let desiredHeading = s.heading

    if (a) {
      a.elapsed += dt
      const target = s.route[0]

      if ((a.type === 'sailTo' || a.type === 'dock') && target) {
        const dx = target.x - s.x
        const dz = target.z - s.z
        const dist = Math.hypot(dx, dz)
        const last = s.route.length === 1
        const toBerth = a.type === 'dock' && last

        if (dist < (toBerth ? 0.6 : 2.2)) {
          s.route.shift()
        } else {
          let vx = dx / dist
          let vz = dz / dist
          // Give other ships room (not while sliding into a berth).
          if (!toBerth) {
            for (const [id, o] of shipPositions) {
              if (id === ship.id) continue
              const ox = s.x - o.x
              const oz = s.z - o.z
              const d = Math.hypot(ox, oz)
              if (d < KEEP_APART && d > 0.01) {
                const push = (KEEP_APART - d) / KEEP_APART
                vx += (ox / d) * push * 1.5
                vz += (oz / d) * push * 1.5
              }
            }
          }
          desiredHeading = Math.atan2(vx, vz)
          const off = Math.abs(angleDiff(s.heading, desiredHeading))
          targetSpeed = MAX_SPEED * Math.max(0.15, Math.cos(Math.min(off, Math.PI / 2)))
          if (last) targetSpeed = Math.min(targetSpeed, Math.max(0.6, dist * 0.6))
        }
      } else if (a.type === 'sailTo') {
        s.currentWaypointId = a.waypointId
        finish()
      } else if (a.type === 'dock') {
        // Arrived (or already there): tie up and wait.
        if (!s.atDock) {
          s.atDock = true
          s.currentWaypointId = null
          a.elapsed = 0
          useWorld.getState().setStatus(ship.id, a.arrivedStatus ?? 'Moored at the harbour')
        }
        if (a.elapsed >= a.seconds) finish()
      } else if (a.elapsed >= (a.seconds ?? 2)) {
        finish()
      }
    }

    // Snug up to the berth when moored.
    if (s.atDock) {
      const k = Math.min(1, dt * 1.5)
      s.x += (berth.spot.x - s.x) * k
      s.z += (berth.spot.z - s.z) * k
      desiredHeading = berth.heading
    }

    const diff = angleDiff(s.heading, desiredHeading)
    const turn = clamp(diff, -TURN_RATE * dt, TURN_RATE * dt)
    s.heading += turn
    s.turn += (turn / Math.max(dt, 0.001) - s.turn) * Math.min(1, dt * 3)
    s.speed += (targetSpeed - s.speed) * Math.min(1, dt * 1.2)
    s.x += Math.sin(s.heading) * s.speed * dt
    s.z += Math.cos(s.heading) * s.speed * dt
    shipPositions.set(ship.id, { x: s.x, z: s.z })

    // Float on the waves, rock gently, and lean into turns.
    group.current.position.set(s.x, waveHeight(s.x, s.z, t), s.z)
    group.current.rotation.y = s.heading
    hull.current.rotation.x = Math.sin(t * 1.3 + s.phase) * 0.04 - s.speed * 0.008
    hull.current.rotation.z = Math.sin(t * 0.9 + s.phase) * 0.05 - s.turn * 0.25
  })

  return (
    <group
      ref={group}
      userData={{ aiEntity: ship.color }}
      onPointerOver={(e) => {
        e.stopPropagation()
        useWorld.getState().setHovered({ type: 'ship', id: ship.id })
        document.body.style.cursor = 'pointer'
      }}
      onPointerOut={() => {
        if (isThing(useWorld.getState().hovered, 'ship', ship.id)) useWorld.getState().setHovered(null)
        document.body.style.cursor = 'auto'
      }}
      onClick={(e) => {
        e.stopPropagation()
        useWorld.getState().select({ type: 'ship', id: ship.id })
      }}
    >
      <group ref={hull} scale={SCALE}>
        <ShipModel ship={ship} active={active} />
      </group>

      <mesh rotation-x={-Math.PI / 2} position-y={0.15} visible={active}>
        <ringGeometry args={[2.8, 3.1, 24]} />
        <meshBasicMaterial color={ship.color} toneMapped={false} transparent opacity={0.8} />
      </mesh>

      <Html position={[0, ship.variant === 'sail' ? 5.2 : 3.4, 0]} center zIndexRange={speech ? [9, 8] : [6, 0]} style={{ pointerEvents: 'none' }}>
        <div className="agent-tag" style={{ '--accent': ship.color }}>
          {speech && <div className="bubble">{speech.length > 90 ? speech.slice(0, 87) + '…' : speech}</div>}
          <div className={`nametag ${active ? 'active' : ''}`}>⚓ {ship.name}</div>
        </div>
      </Html>
    </group>
  )
}

/** A low-poly boat. Forward is +z. */
function ShipModel({ ship, active }) {
  const wood = '#6b4226'
  return (
    <>
      {/* Hull */}
      <mesh position-y={0.1} castShadow receiveShadow>
        <boxGeometry args={[1.4, 0.7, 3]} />
        <meshStandardMaterial color={wood} flatShading />
      </mesh>
      <mesh position={[0, 0.1, 1.5]} rotation-y={Math.PI / 4} castShadow>
        <boxGeometry args={[1, 0.7, 1]} />
        <meshStandardMaterial color={wood} flatShading />
      </mesh>
      {/* Coloured stripe */}
      <mesh position-y={0.32}>
        <boxGeometry args={[1.44, 0.12, 3.02]} />
        <meshStandardMaterial color={ship.color} flatShading />
      </mesh>
      {/* Deck */}
      <mesh position-y={0.46} receiveShadow>
        <boxGeometry args={[1.25, 0.06, 2.85]} />
        <meshStandardMaterial color="#d9b382" flatShading />
      </mesh>
      <mesh position={[0, 0.46, 1.5]} rotation-y={Math.PI / 4} receiveShadow>
        <boxGeometry args={[0.88, 0.06, 0.88]} />
        <meshStandardMaterial color="#d9b382" flatShading />
      </mesh>

      {ship.variant === 'sail' ? (
        <>
          <mesh position={[0, 2.1, 0.3]} castShadow>
            <cylinderGeometry args={[0.05, 0.07, 3.3, 5]} />
            <meshStandardMaterial color="#4a3020" />
          </mesh>
          <mesh position={[0, 2.2, -0.45]} castShadow>
            <boxGeometry args={[0.04, 2.2, 1.4]} />
            <meshStandardMaterial color="#fbf6ec" flatShading />
          </mesh>
          <mesh position={[0, 1.55, -0.45]}>
            <boxGeometry args={[0.05, 0.25, 1.42]} />
            <meshStandardMaterial color={ship.color} flatShading />
          </mesh>
          <mesh position={[0, 3.6, 0.05]}>
            <boxGeometry args={[0.02, 0.3, 0.5]} />
            <meshStandardMaterial color={ship.color} emissive={ship.color} emissiveIntensity={active ? 1.5 : 0.4} />
          </mesh>
        </>
      ) : (
        <>
          <mesh position={[0, 0.95, -0.5]} castShadow>
            <boxGeometry args={[1.05, 0.9, 1.2]} />
            <meshStandardMaterial color="#fbf6ec" flatShading />
          </mesh>
          <mesh position={[0, 1.45, -0.5]} castShadow>
            <boxGeometry args={[1.2, 0.1, 1.35]} />
            <meshStandardMaterial color={ship.color} flatShading />
          </mesh>
          <mesh position={[0, 1.0, 0.11]}>
            <boxGeometry args={[0.8, 0.35, 0.02]} />
            <meshStandardMaterial color="#9ad1e8" />
          </mesh>
          <mesh position={[0.3, 1.8, -0.8]} castShadow>
            <cylinderGeometry args={[0.1, 0.12, 0.6, 6]} />
            <meshStandardMaterial color="#444" flatShading />
          </mesh>
          <mesh position={[0, 1.75, -0.2]}>
            <icosahedronGeometry args={[0.1, 0]} />
            <meshStandardMaterial color={ship.color} emissive={ship.color} emissiveIntensity={active ? 2 : 0.6} />
          </mesh>
        </>
      )}
    </>
  )
}
