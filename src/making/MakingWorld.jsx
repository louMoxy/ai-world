import { useEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { useShallow } from 'zustand/react/shallow'
import * as THREE from 'three'
import { heightAt } from '../world/terrain'
import { useWorld } from '../store'
import { useMaking, sketchProgress, makeProgress, galleryPieces } from './store'
import { GALLERY_SLOTS, getWorkstation } from './workstations'
import { sketchStrokes, drawSketch, SKETCH_SIZE } from './sketch'
import { fabricTexture } from './fabric'
import { PrintedObject } from './PrintedObject'
import { Outfit } from './Outfit'
import { Growth } from '../world/IslandGrowth'

const WOOD = '#8a5a35'
const DARK_WOOD = '#5c3b22'
const METAL = '#4a4e5a'
const STONE = '#d8cfc0'

/** Everything to do with making: the workstations and the Gallery displays. */
export function MakingWorld() {
  const ready = useMaking((s) => s.ready)
  useEffect(() => {
    if (!ready) useMaking.getState().start()
  }, [ready])
  if (!ready) return null
  return (
    <>
      <Easel ws={getWorkstation('easel')} />
      <Printer ws={getWorkstation('printer')} />
      <Mannequin ws={getWorkstation('mannequin')} />
      <Loom ws={getWorkstation('loom')} />
      <GalleryDisplays />
      <Growth />
    </>
  )
}

/** Click handlers that open today's page in the Island Log. */
export function openLogProps(dayId) {
  return {
    onPointerOver: (e) => {
      e.stopPropagation()
      document.body.style.cursor = 'pointer'
    },
    onPointerOut: () => (document.body.style.cursor = 'auto'),
    onClick: (e) => {
      e.stopPropagation()
      useWorld.getState().select({ type: 'log', id: dayId })
    },
  }
}

/** A prop standing on the ground at a workstation, facing where the worker stands. */
function Place({ ws, children, ...props }) {
  const y = useMemo(() => heightAt(ws.x, ws.z), [ws])
  return (
    <group position={[ws.x, y, ws.z]} rotation-y={ws.rotation} {...props}>
      {children}
    </group>
  )
}

/** Smoothly follows a target value from the making store. */
function useEased(get, speed = 1.5) {
  const value = useRef(get())
  return (dt) => (value.current += (get() - value.current) * Math.min(1, dt * speed))
}

// ---------- Easel: the sketch, drawn stroke by stroke ----------

function Easel({ ws }) {
  const day = useMaking((s) => s.day)
  const strokes = useMemo(() => (day ? sketchStrokes(day) : []), [day?.id]) // eslint-disable-line react-hooks/exhaustive-deps
  const { canvas, texture } = useMemo(() => {
    const canvas = document.createElement('canvas')
    canvas.width = canvas.height = SKETCH_SIZE
    const texture = new THREE.CanvasTexture(canvas)
    texture.colorSpace = THREE.SRGBColorSpace
    texture.anisotropy = 4
    return { canvas, texture }
  }, [])
  const drawn = useRef(-1)
  const eased = useEased(() => sketchProgress(useMaking.getState().day))
  const pencil = useRef()

  useFrame(({ clock }, dt) => {
    const p = eased(dt)
    const count = Math.round(p * strokes.length)
    if (count !== drawn.current) {
      drawn.current = count
      drawSketch(canvas.getContext('2d'), strokes, count)
      texture.needsUpdate = true
    }
    // The pencil scribbles while the sketch is being drawn.
    const busy = p > 0.001 && p < 0.999
    pencil.current.visible = busy
    if (busy) pencil.current.position.set(Math.sin(clock.elapsedTime * 3) * 0.4, 1.5 + Math.cos(clock.elapsedTime * 2.3) * 0.35, 0.12)
  })

  return (
    <Place ws={ws} {...openLogProps(day?.id)}>
      {/* Three legs */}
      {[-0.5, 0.5].map((x) => (
        <mesh key={x} position={[x * 0.9, 1.2, 0.05]} rotation-z={x * 0.12} castShadow>
          <boxGeometry args={[0.08, 2.4, 0.08]} />
          <meshStandardMaterial color={WOOD} flatShading />
        </mesh>
      ))}
      <mesh position={[0, 1.1, -0.45]} rotation-x={-0.35} castShadow>
        <boxGeometry args={[0.08, 2.3, 0.08]} />
        <meshStandardMaterial color={WOOD} flatShading />
      </mesh>
      {/* Ledge and board */}
      <mesh position={[0, 0.72, 0.14]} castShadow>
        <boxGeometry args={[1.5, 0.08, 0.2]} />
        <meshStandardMaterial color={DARK_WOOD} flatShading />
      </mesh>
      <group position={[0, 1.6, 0.1]} rotation-x={-0.1}>
        <mesh position-z={-0.03} castShadow>
          <boxGeometry args={[1.62, 1.62, 0.05]} />
          <meshStandardMaterial color={DARK_WOOD} flatShading />
        </mesh>
        <mesh>
          <planeGeometry args={[1.5, 1.5]} />
          <meshStandardMaterial map={texture} roughness={0.95} />
        </mesh>
      </group>
      <mesh ref={pencil} rotation-z={0.7}>
        <cylinderGeometry args={[0.025, 0.025, 0.3, 6]} />
        <meshStandardMaterial color="#f4c430" flatShading />
      </mesh>
    </Place>
  )
}

// ---------- 3D printer ----------

function Printer({ ws }) {
  const day = useMaking((s) => s.day)
  const printing = day?.design.kind === 'print' && day.status === 'active' ? day : null
  const gantry = useRef()
  const nozzle = useRef()
  const head = useRef(0)

  useFrame(({ clock }) => {
    const busy = printing && makeProgress(useMaking.getState().day) > 0.001
    const y = 0.4 + head.current * 0.9 + 0.25
    gantry.current.position.y = THREE.MathUtils.lerp(gantry.current.position.y, busy ? y : 3.4, 0.08)
    const t = clock.elapsedTime
    nozzle.current.position.x = busy ? Math.sin(t * 4.1) * 0.7 : 0
    nozzle.current.position.z = busy ? Math.cos(t * 3.3) * 0.55 : 0
    nozzle.current.material.emissiveIntensity = busy ? 1.2 + Math.sin(t * 20) * 0.4 : 0.2
  })

  return (
    <Place ws={ws} {...openLogProps(day?.id)}>
      {/* Base and print bed */}
      <mesh position-y={0.05} castShadow receiveShadow>
        <boxGeometry args={[3, 0.7, 3]} />
        <meshStandardMaterial color={METAL} flatShading />
      </mesh>
      <mesh position-y={0.42} receiveShadow>
        <boxGeometry args={[2.6, 0.04, 2.6]} />
        <meshStandardMaterial color="#2b2d36" flatShading />
      </mesh>
      {/* Frame */}
      {[
        [-1.4, -1.4],
        [1.4, -1.4],
        [-1.4, 1.4],
        [1.4, 1.4],
      ].map(([x, z]) => (
        <mesh key={`${x}${z}`} position={[x, 2.1, z]} castShadow>
          <boxGeometry args={[0.14, 3.6, 0.14]} />
          <meshStandardMaterial color="#e9ecef" flatShading />
        </mesh>
      ))}
      {[-1.4, 1.4].map((z) => (
        <mesh key={z} position={[0, 3.9, z]} castShadow>
          <boxGeometry args={[2.94, 0.14, 0.14]} />
          <meshStandardMaterial color="#e9ecef" flatShading />
        </mesh>
      ))}
      {/* Moving gantry and nozzle */}
      <group ref={gantry} position-y={3.4}>
        <mesh>
          <boxGeometry args={[2.8, 0.12, 0.16]} />
          <meshStandardMaterial color="#90be6d" flatShading />
        </mesh>
        <mesh ref={nozzle} position-y={-0.15}>
          <coneGeometry args={[0.12, 0.25, 6]} />
          <meshStandardMaterial color="#f8961e" emissive="#f8961e" emissiveIntensity={0.2} flatShading />
        </mesh>
      </group>
      {printing && (
        <PrintedObject
          key={printing.id}
          design={printing.design}
          position-y={0.44}
          scale={0.9}
          getProgress={() => makeProgress(useMaking.getState().day)}
          onHeight={(h) => (head.current = h)}
        />
      )}
    </Place>
  )
}

// ---------- Mannequin (fashion) ----------

function Dummy() {
  return (
    <>
      <mesh position-y={0.35}>
        <cylinderGeometry args={[0.04, 0.04, 0.7, 6]} />
        <meshStandardMaterial color={METAL} />
      </mesh>
      <mesh position-y={0.04}>
        <cylinderGeometry args={[0.35, 0.4, 0.08, 10]} />
        <meshStandardMaterial color={METAL} flatShading />
      </mesh>
      <mesh position-y={0.68} castShadow>
        <capsuleGeometry args={[0.4, 0.55, 3, 8]} />
        <meshStandardMaterial color="#e7dccb" flatShading />
      </mesh>
      <mesh position-y={1.62} castShadow>
        <icosahedronGeometry args={[0.38, 1]} />
        <meshStandardMaterial color="#efe6d8" flatShading />
      </mesh>
    </>
  )
}

function Mannequin({ ws }) {
  const day = useMaking((s) => s.day)
  const sewing = day?.design.kind === 'outfit' && day.status === 'active' ? day : null
  const eased = useEased(() => makeProgress(useMaking.getState().day))
  const amounts = useRef({ neck: 0, hat: 0 })
  useFrame((_, dt) => {
    const m = eased(dt)
    amounts.current.neck = THREE.MathUtils.clamp(m / 0.6, 0, 1)
    amounts.current.hat = THREE.MathUtils.clamp((m - 0.6) / 0.4, 0, 1)
  })
  return (
    <Place ws={ws} {...openLogProps(day?.id)}>
      <group position-y={0.3}>
        <Dummy />
        {sewing && <Outfit key={sewing.id} outfit={sewing.design} getAmounts={() => amounts.current} />}
      </group>
    </Place>
  )
}

// ---------- Loom (textiles) ----------

const CLOTH_W = 2.2
const CLOTH_H = 2

function Loom({ ws }) {
  const day = useMaking((s) => s.day)
  const weaving = day?.design.kind === 'fabric' && day.status === 'active' ? day : null
  const texture = useMemo(() => {
    if (!weaving) return null
    const t = fabricTexture(weaving.design).clone()
    t.needsUpdate = true
    return t
  }, [weaving?.id]) // eslint-disable-line react-hooks/exhaustive-deps
  const cloth = useRef()
  const shuttle = useRef()
  const eased = useEased(() => makeProgress(useMaking.getState().day))

  useFrame(({ clock }, dt) => {
    const p = eased(dt)
    if (cloth.current) {
      cloth.current.visible = p > 0.005
      cloth.current.scale.y = Math.max(p, 0.005) * CLOTH_H
      cloth.current.position.y = 0.5 + (p * CLOTH_H) / 2
      texture.repeat.set(CLOTH_W / 1.1, (p * CLOTH_H) / 1.1)
    }
    const busy = weaving && p > 0.001 && p < 0.999
    shuttle.current.visible = !!busy
    shuttle.current.position.set(Math.sin(clock.elapsedTime * 2.5) * 1, 0.5 + p * CLOTH_H, 0.08)
  })

  return (
    <Place ws={ws} {...openLogProps(day?.id)}>
      {[-1.3, 1.3].map((x) => (
        <mesh key={x} position={[x, 1.4, 0]} castShadow>
          <boxGeometry args={[0.16, 2.8, 0.3]} />
          <meshStandardMaterial color={WOOD} flatShading />
        </mesh>
      ))}
      {[0.45, 2.6].map((y) => (
        <mesh key={y} position={[0, y, 0]} rotation-z={Math.PI / 2} castShadow>
          <cylinderGeometry args={[0.08, 0.08, 2.7, 8]} />
          <meshStandardMaterial color={DARK_WOOD} flatShading />
        </mesh>
      ))}
      {/* Warp threads */}
      {Array.from({ length: 14 }, (_, i) => (
        <mesh key={i} position={[-1.05 + (i * 2.1) / 13, 1.52, 0]}>
          <boxGeometry args={[0.015, 2.1, 0.015]} />
          <meshStandardMaterial color="#f4ecdc" />
        </mesh>
      ))}
      {texture && (
        <mesh ref={cloth} position={[0, 0.5, 0.02]} scale={[CLOTH_W, 0.01, 1]} castShadow>
          <planeGeometry args={[1, 1]} />
          <meshStandardMaterial map={texture} side={THREE.DoubleSide} />
        </mesh>
      )}
      <mesh ref={shuttle}>
        <boxGeometry args={[0.35, 0.08, 0.1]} />
        <meshStandardMaterial color="#e9c46a" flatShading />
      </mesh>
    </Place>
  )
}

// ---------- Gallery ----------

function GalleryDisplays() {
  const pieces = useMaking(useShallow((s) => galleryPieces(s, GALLERY_SLOTS.length)))
  return GALLERY_SLOTS.map((slot, i) => <Display key={i} slot={slot} day={pieces[i]} />)
}

function Display({ slot, day }) {
  const y = useMemo(() => heightAt(slot.x, slot.z), [slot])
  const spin = useRef()
  useFrame((_, dt) => {
    if (spin.current) spin.current.rotation.y += dt * 0.4
  })
  const kind = day?.design.kind
  return (
    <group position={[slot.x, y, slot.z]} rotation-y={slot.rotation} {...(day ? openLogProps(day.id) : {})}>
      <mesh position-y={0.25} castShadow receiveShadow>
        <cylinderGeometry args={[0.6, 0.7, 1.1, 8]} />
        <meshStandardMaterial color={STONE} flatShading />
      </mesh>
      {day && (
        <mesh position-y={0.81} rotation-x={-Math.PI / 2}>
          <ringGeometry args={[0.5, 0.6, 8]} />
          <meshStandardMaterial color="#f72585" emissive="#f72585" emissiveIntensity={0.4} />
        </mesh>
      )}
      {kind === 'print' && (
        <group ref={spin} position-y={0.8}>
          <PrintedObject design={day.design} scale={0.5} />
        </group>
      )}
      {kind === 'fabric' && <Banner fabric={day.design} />}
      {kind === 'outfit' && (
        <group ref={spin} position-y={0.8} scale={0.62}>
          <Dummy />
          <Outfit outfit={day.design} />
        </group>
      )}
    </group>
  )
}

function Banner({ fabric }) {
  const map = fabricTexture(fabric)
  return (
    <group position-y={0.8}>
      {[-0.55, 0.55].map((x) => (
        <mesh key={x} position={[x, 0.85, 0]} castShadow>
          <cylinderGeometry args={[0.04, 0.04, 1.7, 6]} />
          <meshStandardMaterial color={DARK_WOOD} />
        </mesh>
      ))}
      <mesh position={[0, 1.62, 0]} rotation-z={Math.PI / 2}>
        <cylinderGeometry args={[0.035, 0.035, 1.2, 6]} />
        <meshStandardMaterial color={DARK_WOOD} />
      </mesh>
      <mesh position={[0, 1.02, 0]} castShadow>
        <planeGeometry args={[1, 1.15]} />
        <meshStandardMaterial map={map} side={THREE.DoubleSide} />
      </mesh>
    </group>
  )
}
