import { useEffect, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { Html } from '@react-three/drei'
import * as THREE from 'three'
import { heightAt } from '../world/terrain'
import { OBSTACLES } from '../world/layout'
import { STATIONS, getStation } from '../stations/stations'
import { useWorld, isThing } from '../store'
import { getBrain } from '../brains'
import { tracked } from '../world/tracking'
import { getWorkstation } from '../making/workstations'
import { useMaking, wornOutfit } from '../making/store'
import { Outfit } from '../making/Outfit'

const SPEED = 2.2
const STAND_RADIUS = 3.6 // how far from a station's centre a character stops
const BODY_RADIUS = 0.4
const MAX_WALK_SECONDS = 30
const STATION_INFO = STATIONS.map(({ id, name, description }) => ({ id, name, description }))

const angleDiff = (a, b) => Math.atan2(Math.sin(b - a), Math.cos(b - a))

export function Agent({ agent }) {
  const group = useRef()
  const body = useRef()
  const brain = getBrain(agent.id)

  const sim = useRef({
    x: agent.start[0],
    z: agent.start[1],
    heading: Math.random() * Math.PI * 2,
    action: null,
    pending: false,
    lastAction: null,
    currentStationId: null,
  })

  useEffect(() => {
    tracked.set(agent.id, group.current)
    return () => tracked.delete(agent.id)
  }, [agent.id])

  const hovered = useWorld((s) => isThing(s.hovered, 'agent', agent.id))
  const selected = useWorld((s) => isThing(s.selected, 'agent', agent.id))
  const speech = useWorld((s) => s.speech[agent.id])
  const active = hovered || selected
  const outfit = useMaking((s) => wornOutfit(s, agent.id))

  // Turn a brain's Action into something the character can carry out.
  const startAction = (action) => {
    const s = sim.current
    const { setStatus } = useWorld.getState()
    const here = getStation(s.currentStationId)
    if (action?.type !== 'say') setStatus(agent.id, here ? `Hanging out at ${here.name}` : 'Looking around')
    if (action?.type === 'walkTo') {
      const station = getStation(action.stationId)
      const spot = getWorkstation(action.stationId)
      if (spot) {
        // Workstations have an exact place to stand.
        setStatus(agent.id, action.status ?? `Walking to the ${spot.name.toLowerCase()}`)
        // `side` moves them sideways along the front of the workstation (for a helper).
        const side = action.side ?? 0
        const tx = spot.stand.x + Math.cos(spot.rotation) * side
        const tz = spot.stand.z - Math.sin(spot.rotation) * side
        return { ...action, tx, tz, elapsed: 0 }
      }
      if (station) {
        setStatus(agent.id, action.status ?? `Walking to ${station.name}`)
        const [sx, sz] = station.position
        // Stop on the side we're approaching from, with a little variation.
        const angle = Math.atan2(s.z - sz, s.x - sx) + (Math.random() - 0.5) * 1.6
        return { ...action, tx: sx + Math.cos(angle) * STAND_RADIUS, tz: sz + Math.sin(angle) * STAND_RADIUS, elapsed: 0 }
      }
    }
    if (action?.type === 'say') {
      useWorld.getState().say(agent.id, action.text, action.seconds ?? 3.5)
      return { ...action, elapsed: 0 }
    }
    if (action?.type === 'idle') {
      if (action.status) setStatus(agent.id, action.status)
      return { ...action, elapsed: 0 }
    }
    if (action?.type === 'work') {
      // Busy at a workstation or station: face it and get on with the job.
      setStatus(agent.id, action.status ?? 'Working')
      const spot = getWorkstation(s.currentStationId)
      const station = getStation(s.currentStationId)
      const [fx, fz] = spot ? [spot.x, spot.z] : station ? station.position : [s.x, s.z + 1]
      return { ...action, seconds: action.seconds ?? 8, face: Math.atan2(fx - s.x, fz - s.z), elapsed: 0 }
    }
    return { type: 'idle', seconds: 2, elapsed: 0 } // unknown action: just wait
  }

  const finish = () => {
    const s = sim.current
    s.lastAction = s.action
    s.action = null
  }

  useFrame((state, rawDt) => {
    const dt = Math.min(rawDt, 0.1)
    const s = sim.current
    const t = state.clock.elapsedTime
    let moving = false
    let working = false
    let desiredHeading = s.heading

    // Ask the brain what to do next.
    if (!s.action && !s.pending) {
      s.pending = true
      Promise.resolve(
        brain.decide({
          agent: { id: agent.id, name: agent.name, role: agent.role },
          position: { x: s.x, z: s.z },
          currentStationId: s.currentStationId,
          stations: STATION_INFO,
          lastAction: s.lastAction,
        }),
      )
        .then((action) => (s.action = startAction(action)))
        .catch(() => (s.action = startAction(null)))
        .finally(() => (s.pending = false))
    }

    const a = s.action
    if (a) {
      a.elapsed += dt
      if (a.type === 'walkTo') {
        const dx = a.tx - s.x
        const dz = a.tz - s.z
        const dist = Math.hypot(dx, dz)
        if (dist < 0.3 || a.elapsed > MAX_WALK_SECONDS) {
          s.currentStationId = a.stationId
          finish()
        } else {
          let vx = dx / dist
          let vz = dz / dist
          // Steer around stations, trees and rocks (not needed in the last stretch).
          if (dist > 1.5) {
            let ax = 0
            let az = 0
            for (const o of OBSTACLES) {
              const ox = s.x - o.x
              const oz = s.z - o.z
              const d = Math.hypot(ox, oz)
              const reach = o.r + BODY_RADIUS + 0.2
              if (d > 0.001 && d < reach + 1.2) {
                const push = (reach + 1.2 - d) / 1.2
                const nx = ox / d
                const nz = oz / d
                let tx = -nz
                let tz = nx
                if (tx * vx + tz * vz < 0) {
                  tx = -tx
                  tz = -tz
                }
                ax += nx * push * 1.2 + tx * push
                az += nz * push * 1.2 + tz * push
              }
            }
            vx += ax
            vz += az
            const len = Math.hypot(vx, vz) || 1
            vx /= len
            vz /= len
          }
          s.x += vx * SPEED * dt
          s.z += vz * SPEED * dt
          desiredHeading = Math.atan2(vx, vz)
          moving = true
        }
      } else {
        if (a.type === 'work') {
          desiredHeading = a.face
          working = true
        }
        if (a.elapsed >= (a.seconds ?? 2)) finish()
      }
    }

    // Never stand inside a building or tree.
    for (const o of OBSTACLES) {
      const ox = s.x - o.x
      const oz = s.z - o.z
      const d = Math.hypot(ox, oz)
      const min = o.r + BODY_RADIUS
      if (d < min && d > 0.001) {
        s.x = o.x + (ox / d) * min
        s.z = o.z + (oz / d) * min
      }
    }

    s.heading += angleDiff(s.heading, desiredHeading) * Math.min(1, dt * 8)
    const bob = moving ? Math.abs(Math.sin(t * 10)) * 0.12 : 0
    group.current.position.set(s.x, heightAt(s.x, s.z) + bob, s.z)
    group.current.rotation.y = s.heading
    body.current.scale.y = 1 + Math.sin(t * 2.2) * 0.03
    body.current.rotation.z = moving ? Math.sin(t * 10) * 0.06 : working ? Math.sin(t * 6) * 0.05 : 0
    body.current.rotation.x = working ? 0.12 + Math.sin(t * 3) * 0.04 : 0 // lean in to work
  })

  return (
    <group
      ref={group}
      userData={{ aiEntity: agent.color }}
      onPointerOver={(e) => {
        e.stopPropagation()
        useWorld.getState().setHovered({ type: 'agent', id: agent.id })
        document.body.style.cursor = 'pointer'
      }}
      onPointerOut={() => {
        if (isThing(useWorld.getState().hovered, 'agent', agent.id)) useWorld.getState().setHovered(null)
        document.body.style.cursor = 'auto'
      }}
      onClick={(e) => {
        e.stopPropagation()
        useWorld.getState().select({ type: 'agent', id: agent.id })
      }}
    >
      <group ref={body}>
        <mesh position-y={0.68} castShadow>
          <capsuleGeometry args={[0.4, 0.55, 3, 8]} />
          <meshStandardMaterial color={agent.color} flatShading />
        </mesh>
        <mesh position-y={1.62} castShadow>
          <icosahedronGeometry args={[0.38, 1]} />
          <meshStandardMaterial color="#f6f1e7" flatShading />
        </mesh>
        {[-0.13, 0.13].map((ex) => (
          <mesh key={ex} position={[ex, 1.67, 0.33]}>
            <sphereGeometry args={[0.06, 8, 6]} />
            <meshBasicMaterial color="#1d1d2b" />
          </mesh>
        ))}
        {/* Antenna: the glowing tip is the character's "AI" light. */}
        <mesh position-y={2.12}>
          <cylinderGeometry args={[0.025, 0.025, 0.3, 4]} />
          <meshStandardMaterial color="#555" />
        </mesh>
        <mesh position-y={2.3}>
          <icosahedronGeometry args={[0.09, 0]} />
          <meshStandardMaterial color={agent.color} emissive={agent.color} emissiveIntensity={active ? 2 : 0.8} />
        </mesh>
        {/* The newest outfit the island has made for this character. */}
        {outfit && <Outfit outfit={outfit} />}
      </group>

      <mesh rotation-x={-Math.PI / 2} position-y={0.05} visible={active}>
        <ringGeometry args={[0.6, 0.78, 20]} />
        <meshBasicMaterial color={agent.color} toneMapped={false} />
      </mesh>

      <Html position={[0, 2.75, 0]} center zIndexRange={speech ? [9, 8] : [6, 0]} style={{ pointerEvents: 'none' }}>
        <div className="agent-tag" style={{ '--accent': agent.color }}>
          {speech && <div className="bubble">{speech.length > 90 ? speech.slice(0, 87) + '…' : speech}</div>}
          <div className={`nametag ${active ? 'active' : ''}`}>{agent.name}</div>
        </div>
      </Html>
    </group>
  )
}
