import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { fabricTexture } from './fabric'

/**
 * Outfit pieces, sized for the island's characters (head centred at y 1.62, body below).
 * Optional `getAmounts` returns { neck, hat } from 0 to 1, so pieces can appear while
 * they're being sewn; without it the outfit is complete.
 */
export function Outfit({ outfit, getAmounts }) {
  const neck = useRef()
  const hat = useRef()

  useFrame(() => {
    if (!getAmounts) return
    const a = getAmounts()
    for (const [ref, v] of [
      [neck, a.neck],
      [hat, a.hat],
    ]) {
      if (!ref.current) continue
      ref.current.visible = v > 0.01
      ref.current.scale.setScalar(Math.max(0.01, v))
    }
  })

  return (
    <>
      {outfit.neck.style !== 'none' && (
        <group ref={neck} position-y={1.25}>
          <NeckPiece style={outfit.neck.style} fabric={outfit.neck.fabric} />
        </group>
      )}
      {outfit.hat.style !== 'none' && (
        <group ref={hat} position-y={1.9}>
          <Hat style={outfit.hat.style} color={outfit.hat.color} />
        </group>
      )}
    </>
  )
}

/** Hats, positioned around y = 0 at the top of the head. */
function Hat({ style, color }) {
  const mat = <meshStandardMaterial color={color} flatShading />
  switch (style) {
    case 'beanie':
      return (
        <>
          <mesh position-y={-0.22} castShadow>
            <sphereGeometry args={[0.41, 10, 6, 0, Math.PI * 2, 0, Math.PI / 2]} />
            {mat}
          </mesh>
          <mesh position-y={-0.2} rotation-x={Math.PI / 2}>
            <torusGeometry args={[0.4, 0.06, 5, 14]} />
            {mat}
          </mesh>
        </>
      )
    case 'top':
      return (
        <>
          <mesh position-y={0.02} castShadow>
            <cylinderGeometry args={[0.55, 0.55, 0.05, 14]} />
            {mat}
          </mesh>
          <mesh position-y={0.27} castShadow>
            <cylinderGeometry args={[0.3, 0.32, 0.48, 12]} />
            {mat}
          </mesh>
          <mesh position-y={0.1}>
            <cylinderGeometry args={[0.325, 0.325, 0.08, 12]} />
            <meshStandardMaterial color="#c1121f" flatShading />
          </mesh>
        </>
      )
    case 'cone':
      return (
        <mesh position-y={0.3} castShadow>
          <coneGeometry args={[0.4, 0.85, 10]} />
          {mat}
        </mesh>
      )
    case 'beret':
      return (
        <group rotation-z={-0.25} position={[0.06, 0.02, 0]}>
          <mesh scale={[1, 0.32, 1]} castShadow>
            <sphereGeometry args={[0.47, 12, 8]} />
            {mat}
          </mesh>
          <mesh position-y={0.16}>
            <cylinderGeometry args={[0.03, 0.04, 0.08, 5]} />
            {mat}
          </mesh>
        </group>
      )
    case 'crown':
      return (
        <>
          <mesh position-y={0.06}>
            <cylinderGeometry args={[0.33, 0.35, 0.18, 10, 1, true]} />
            <meshStandardMaterial color={color} side={THREE.DoubleSide} flatShading />
          </mesh>
          {[0, 1, 2, 3, 4].map((i) => {
            const a = (i / 5) * Math.PI * 2
            return (
              <mesh key={i} position={[Math.sin(a) * 0.32, 0.22, Math.cos(a) * 0.32]}>
                <coneGeometry args={[0.07, 0.16, 4]} />
                {mat}
              </mesh>
            )
          })}
        </>
      )
    case 'bucket':
      return (
        <>
          <mesh position-y={-0.04}>
            <cylinderGeometry args={[0.58, 0.58, 0.04, 14]} />
            {mat}
          </mesh>
          <mesh position-y={0.08} castShadow>
            <cylinderGeometry args={[0.3, 0.4, 0.26, 12]} />
            {mat}
          </mesh>
        </>
      )
    default:
      return null
  }
}

/** Neck pieces, positioned around y = 0 at the bottom of the head. */
function NeckPiece({ style, fabric }) {
  const map = fabricTexture(fabric)
  const mat = <meshStandardMaterial map={map} side={THREE.DoubleSide} />
  switch (style) {
    case 'scarf':
      return (
        <>
          <mesh rotation-x={Math.PI / 2} castShadow>
            <torusGeometry args={[0.31, 0.11, 6, 16]} />
            {mat}
          </mesh>
          <mesh position={[0.17, -0.27, 0.33]} rotation={[0.15, 0, 0.18]} castShadow>
            <boxGeometry args={[0.18, 0.5, 0.06]} />
            {mat}
          </mesh>
        </>
      )
    case 'cape':
      return (
        <>
          <mesh position-y={-0.5} castShadow>
            <cylinderGeometry args={[0.43, 0.6, 1, 14, 1, true, Math.PI / 2, Math.PI]} />
            {mat}
          </mesh>
          <mesh rotation-x={Math.PI / 2}>
            <torusGeometry args={[0.36, 0.05, 5, 14]} />
            {mat}
          </mesh>
        </>
      )
    case 'collar':
      return (
        <mesh position-y={0.02}>
          <cylinderGeometry args={[0.47, 0.32, 0.2, 14, 1, true]} />
          {mat}
        </mesh>
      )
    default:
      return null
  }
}
