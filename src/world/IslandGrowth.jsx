import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { useShallow } from 'zustand/react/shallow'
import * as THREE from 'three'
import { heightAt } from './terrain'
import { useMaking, allDays } from '../making/store'
import { PrintedObject } from '../making/PrintedObject'
import { fabricTexture } from '../making/fabric'
import { openLogProps } from '../making/MakingWorld'
import { PIER_SPOTS, pierPrints, bunting, placedAdditions } from './growth'

const WOOD = '#8a5a3b'
const DARK_WOOD = '#5c3b22'
const POLE_HEIGHT = 3.4

/** The island's growth: prints on the pier, bunting, and additions (see growth.js). */
export function Growth() {
  const days = useMaking(useShallow(allDays))
  const prints = useMemo(() => pierPrints(days), [days])
  const lines = useMemo(() => bunting(days), [days])
  const additions = useMemo(() => placedAdditions(days), [days])
  return (
    <>
      {prints.map((day, i) => (
        <PierPrint key={day.id} day={day} spot={PIER_SPOTS[i]} />
      ))}
      {lines.map(({ day, route }) => (
        <Bunting key={day.id} day={day} route={route} />
      ))}
      {additions.map(({ day, addition, plot }) => (
        <Addition key={day.id} day={day} addition={addition} plot={plot} />
      ))}
    </>
  )
}

/** Grows from nothing when it first appears, so new things pop into the world. */
function PopIn({ children, ...props }) {
  const ref = useRef()
  const t = useRef(0)
  useFrame((_, dt) => {
    if (t.current >= 1 || !ref.current) return
    t.current = Math.min(1, t.current + dt * 1.2)
    const k = t.current
    const s = 1 + 2.7 * (k - 1) ** 3 + 1.7 * (k - 1) ** 2 // ease out with a little overshoot
    ref.current.scale.setScalar(Math.max(0.001, s))
  })
  return (
    <group ref={ref} scale={0.001} {...props}>
      {children}
    </group>
  )
}

function PierPrint({ day, spot }) {
  return (
    <group position={[spot.x, spot.y, spot.z]} {...openLogProps(day.id)}>
      <PopIn>
        <mesh position-y={0.12} castShadow>
          <boxGeometry args={[0.6, 0.24, 0.6]} />
          <meshStandardMaterial color={WOOD} flatShading />
        </mesh>
        <PrintedObject design={day.design} position-y={0.24} scale={0.24} />
      </PopIn>
    </group>
  )
}

// ---------- Bunting ----------

function Pole({ at }) {
  const y = useMemo(() => heightAt(at.x, at.z), [at])
  return (
    <group position={[at.x, y, at.z]}>
      <mesh position-y={POLE_HEIGHT / 2} castShadow>
        <cylinderGeometry args={[0.06, 0.08, POLE_HEIGHT, 6]} />
        <meshStandardMaterial color={DARK_WOOD} />
      </mesh>
      <mesh position-y={POLE_HEIGHT + 0.06}>
        <sphereGeometry args={[0.1, 6, 4]} />
        <meshStandardMaterial color="#e0a458" />
      </mesh>
    </group>
  )
}

/** A sagging line between two pole tops, with triangle flags cut from the fabric. */
function useBuntingGeometry(route) {
  return useMemo(() => {
    const a = new THREE.Vector3(route.from.x, heightAt(route.from.x, route.from.z) + POLE_HEIGHT - 0.1, route.from.z)
    const b = new THREE.Vector3(route.to.x, heightAt(route.to.x, route.to.z) + POLE_HEIGHT - 0.1, route.to.z)
    const length = a.distanceTo(b)
    const sag = 0.4 + length * 0.04
    const at = (t) => new THREE.Vector3().lerpVectors(a, b, t).add(new THREE.Vector3(0, -sag * 4 * t * (1 - t), 0))

    const curve = new THREE.CatmullRomCurve3(Array.from({ length: 13 }, (_, i) => at(i / 12)))
    const rope = new THREE.TubeGeometry(curve, 40, 0.025, 4, false)

    const count = Math.max(3, Math.floor(length / 0.75))
    const half = 0.26 / length // half a flag's width, as a fraction of the line
    const positions = []
    const uvs = []
    for (let i = 0; i < count; i++) {
      const t = (i + 0.5) / count
      const left = at(t - half)
      const right = at(t + half)
      const tip = at(t).add(new THREE.Vector3(0, -0.5, 0))
      positions.push(...left.toArray(), ...right.toArray(), ...tip.toArray())
      const u = (i % 4) * 0.25 // each flag shows a different bit of the cloth
      uvs.push(u, 1, u + 0.25, 1, u + 0.125, 0.5)
    }
    const flags = new THREE.BufferGeometry()
    flags.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))
    flags.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2))
    flags.computeVertexNormals()
    return { rope, flags }
  }, [route])
}

function Bunting({ day, route }) {
  const { rope, flags } = useBuntingGeometry(route)
  const map = fabricTexture(day.design)
  return (
    <group {...openLogProps(day.id)}>
      <Pole at={route.from} />
      <Pole at={route.to} />
      <mesh geometry={rope}>
        <meshStandardMaterial color="#f1e3c8" />
      </mesh>
      <mesh geometry={flags} castShadow>
        <meshStandardMaterial map={map} side={THREE.DoubleSide} />
      </mesh>
    </group>
  )
}

// ---------- Additions ----------

function Addition({ day, addition, plot }) {
  const y = useMemo(() => heightAt(plot.x, plot.z), [plot])
  const Model = MODELS[addition.kind] ?? MODELS.signpost
  return (
    <group position={[plot.x, y, plot.z]} rotation-y={plot.rotation} {...openLogProps(day.id)}>
      <PopIn>
        <Model color={addition.color} />
      </PopIn>
    </group>
  )
}

const Mat = ({ color, ...props }) => <meshStandardMaterial color={color} flatShading {...props} />

const MODELS = {
  bench({ color }) {
    return (
      <>
        <mesh position-y={0.45} castShadow>
          <boxGeometry args={[1.5, 0.08, 0.5]} />
          <Mat color={color} />
        </mesh>
        <mesh position={[0, 0.78, -0.22]} rotation-x={-0.15} castShadow>
          <boxGeometry args={[1.5, 0.4, 0.06]} />
          <Mat color={color} />
        </mesh>
        {[-0.62, 0.62].map((x) => (
          <mesh key={x} position={[x, 0.22, 0]} castShadow>
            <boxGeometry args={[0.08, 0.45, 0.45]} />
            <Mat color={DARK_WOOD} />
          </mesh>
        ))}
      </>
    )
  },

  flowers({ color }) {
    const blooms = useMemo(
      () =>
        Array.from({ length: 9 }, (_, i) => ({
          x: ((i % 3) - 1) * 0.42 + Math.sin(i * 7.1) * 0.08,
          z: (Math.floor(i / 3) - 1) * 0.28 + Math.cos(i * 3.3) * 0.06,
          h: 0.3 + ((i * 37) % 10) / 40,
          c: i % 3 === 1 ? '#fff3b0' : color,
        })),
      [color],
    )
    return (
      <>
        <mesh position-y={0.12} castShadow receiveShadow>
          <boxGeometry args={[1.5, 0.24, 1]} />
          <Mat color={WOOD} />
        </mesh>
        <mesh position-y={0.25}>
          <boxGeometry args={[1.38, 0.04, 0.88]} />
          <Mat color="#5a3d2b" />
        </mesh>
        {blooms.map((b, i) => (
          <group key={i} position={[b.x, 0.25, b.z]}>
            <mesh position-y={b.h / 2}>
              <cylinderGeometry args={[0.015, 0.015, b.h, 4]} />
              <Mat color="#52b788" />
            </mesh>
            <mesh position-y={b.h}>
              <icosahedronGeometry args={[0.09, 0]} />
              <Mat color={b.c} />
            </mesh>
          </group>
        ))}
      </>
    )
  },

  lamp({ color }) {
    return (
      <>
        <mesh position-y={0.1}>
          <cylinderGeometry args={[0.2, 0.25, 0.2, 6]} />
          <Mat color="#3d405b" />
        </mesh>
        <mesh position-y={1.2} castShadow>
          <cylinderGeometry args={[0.05, 0.06, 2.2, 6]} />
          <Mat color="#3d405b" />
        </mesh>
        <mesh position-y={2.4}>
          <icosahedronGeometry args={[0.22, 0]} />
          <meshStandardMaterial color={color} emissive={color} emissiveIntensity={1.4} />
        </mesh>
        <mesh position-y={2.62}>
          <coneGeometry args={[0.28, 0.2, 6]} />
          <Mat color="#3d405b" />
        </mesh>
      </>
    )
  },

  signpost({ color }) {
    return (
      <>
        <mesh position-y={0.9} castShadow>
          <cylinderGeometry args={[0.06, 0.07, 1.8, 6]} />
          <Mat color={DARK_WOOD} />
        </mesh>
        {[
          [1.45, 0.4, 0.25],
          [1.1, -0.5, -0.3],
        ].map(([y, turn, shift], i) => (
          <group key={i} position-y={y} rotation-y={turn}>
            <mesh position-x={shift + 0.1} castShadow>
              <boxGeometry args={[0.8, 0.22, 0.05]} />
              <Mat color={i ? '#f1e3c8' : color} />
            </mesh>
            <mesh position-x={shift + 0.55 * Math.sign(shift || 1)} rotation-z={Math.PI / 2 * -Math.sign(shift || 1)}>
              <coneGeometry args={[0.11, 0.2, 3]} />
              <Mat color={i ? '#f1e3c8' : color} />
            </mesh>
          </group>
        ))}
      </>
    )
  },

  birdbath({ color }) {
    const bird = useRef()
    useFrame(({ clock }) => {
      if (bird.current) bird.current.position.y = 0.95 + Math.max(0, Math.sin(clock.elapsedTime * 3)) * 0.12
    })
    return (
      <>
        <mesh position-y={0.4} castShadow>
          <cylinderGeometry args={[0.1, 0.22, 0.8, 7]} />
          <Mat color="#d8cfc0" />
        </mesh>
        <mesh position-y={0.85} castShadow>
          <cylinderGeometry args={[0.55, 0.3, 0.2, 9]} />
          <Mat color={color} />
        </mesh>
        <mesh position-y={0.94}>
          <cylinderGeometry args={[0.47, 0.47, 0.02, 9]} />
          <meshStandardMaterial color="#7cc6e8" roughness={0.2} />
        </mesh>
        <group ref={bird} position={[0.3, 0.95, 0]}>
          <mesh position-y={0.08}>
            <icosahedronGeometry args={[0.08, 0]} />
            <Mat color="#e63946" />
          </mesh>
          <mesh position={[0.07, 0.12, 0]} rotation-z={-Math.PI / 2}>
            <coneGeometry args={[0.025, 0.06, 4]} />
            <Mat color="#ffb703" />
          </mesh>
        </group>
      </>
    )
  },

  beehive({ color }) {
    const bees = useRef()
    useFrame((_, dt) => {
      if (bees.current) bees.current.rotation.y += dt * 1.6
    })
    return (
      <>
        <mesh position-y={0.2}>
          <boxGeometry args={[0.7, 0.4, 0.7]} />
          <Mat color={DARK_WOOD} />
        </mesh>
        {[0.55, 0.85, 1.12].map((y, i) => (
          <mesh key={y} position-y={y} castShadow>
            <cylinderGeometry args={[0.36 - i * 0.06, 0.4 - i * 0.06, 0.3, 8]} />
            <Mat color={color} />
          </mesh>
        ))}
        <mesh position={[0, 0.5, 0.36]}>
          <boxGeometry args={[0.14, 0.08, 0.04]} />
          <Mat color="#2b2d42" />
        </mesh>
        <group ref={bees} position-y={1}>
          {[0, 2.1, 4.2].map((a) => (
            <mesh key={a} position={[Math.cos(a) * 0.65, Math.sin(a * 2) * 0.15, Math.sin(a) * 0.65]}>
              <sphereGeometry args={[0.04, 5, 4]} />
              <Mat color="#ffd166" />
            </mesh>
          ))}
        </group>
      </>
    )
  },
}
