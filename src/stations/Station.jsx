import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { Html } from '@react-three/drei'
import * as THREE from 'three'
import { heightAt } from '../world/terrain'
import { PIER } from '../world/dock'
import { useWorld, isThing } from '../store'

const STONE = '#d8cfc0'
const WALL = '#f3ece0'
const BASE_TOP = 0.3
const tmp = new THREE.Vector3()

/** The building on top of each station's base. Returns its height so the crystal floats above it. */
const BUILDINGS = {
  spire: {
    top: 6.6,
    render: (color) => (
      <>
        <mesh position-y={1.6} castShadow receiveShadow>
          <cylinderGeometry args={[0.7, 1.1, 3.2, 6]} />
          <meshStandardMaterial color={WALL} flatShading />
        </mesh>
        <mesh position-y={4.0} castShadow>
          <coneGeometry args={[0.95, 1.8, 6]} />
          <meshStandardMaterial color={color} flatShading />
        </mesh>
        {[0, 1, 2].map((i) => (
          <mesh key={i} position={[Math.cos((i * Math.PI * 2) / 3) * 1.7, 0.5, Math.sin((i * Math.PI * 2) / 3) * 1.7]} castShadow>
            <cylinderGeometry args={[0.2, 0.25, 1, 5]} />
            <meshStandardMaterial color={STONE} flatShading />
          </mesh>
        ))}
      </>
    ),
  },
  dome: {
    top: 4.6,
    render: (color) => (
      <>
        <mesh position-y={0.8} castShadow receiveShadow>
          <cylinderGeometry args={[1.6, 1.7, 1.6, 8]} />
          <meshStandardMaterial color={WALL} flatShading />
        </mesh>
        <mesh position-y={1.6} castShadow>
          <sphereGeometry args={[1.6, 8, 5, 0, Math.PI * 2, 0, Math.PI / 2]} />
          <meshStandardMaterial color={color} flatShading />
        </mesh>
        <mesh position={[0.6, 2.6, 0.6]} rotation={[0.6, 0.8, 0]} castShadow>
          <cylinderGeometry args={[0.18, 0.3, 1.4, 6]} />
          <meshStandardMaterial color="#5c677d" flatShading />
        </mesh>
      </>
    ),
  },
  house: {
    top: 4.5,
    render: (color) => (
      <>
        <mesh position-y={0.9} castShadow receiveShadow>
          <boxGeometry args={[2.8, 1.8, 2.2]} />
          <meshStandardMaterial color={WALL} flatShading />
        </mesh>
        <mesh position-y={2.4} rotation-y={Math.PI / 4} scale={[1.45, 1, 1.1]} castShadow>
          <coneGeometry args={[1.6, 1.3, 4]} />
          <meshStandardMaterial color={color} flatShading />
        </mesh>
        <mesh position={[0, 0.55, 1.11]}>
          <boxGeometry args={[0.6, 1.1, 0.05]} />
          <meshStandardMaterial color="#7a4e2d" />
        </mesh>
      </>
    ),
  },
  tower: {
    top: 5.2,
    render: (color) => (
      <>
        <mesh position-y={1.5} castShadow receiveShadow>
          <boxGeometry args={[1.8, 3, 1.8]} />
          <meshStandardMaterial color={WALL} flatShading />
        </mesh>
        <mesh position-y={3.2} castShadow>
          <boxGeometry args={[2.2, 0.4, 2.2]} />
          <meshStandardMaterial color={color} flatShading />
        </mesh>
        <mesh position={[0.6, 3.9, -0.5]} castShadow>
          <cylinderGeometry args={[0.2, 0.25, 1.1, 6]} />
          <meshStandardMaterial color="#6b6b6b" flatShading />
        </mesh>
        <mesh position={[-1.6, 0.4, 0.8]} rotation-y={0.4} castShadow>
          <boxGeometry args={[0.8, 0.8, 0.8]} />
          <meshStandardMaterial color="#b08968" flatShading />
        </mesh>
      </>
    ),
  },
  arch: {
    top: 4.4,
    render: (color) => (
      <>
        {[-1.2, 1.2].map((x) => (
          <mesh key={x} position={[x, 1.3, 0]} castShadow>
            <boxGeometry args={[0.5, 2.6, 0.5]} />
            <meshStandardMaterial color={STONE} flatShading />
          </mesh>
        ))}
        <mesh position-y={2.75} castShadow>
          <boxGeometry args={[3.2, 0.4, 0.7]} />
          <meshStandardMaterial color={color} flatShading />
        </mesh>
        {[-1.6, -0.8, 0.8, 1.6].map((x, i) => (
          <mesh key={x} position={[x, 0.25, 1.4]} castShadow>
            <icosahedronGeometry args={[0.3, 0]} />
            <meshStandardMaterial color={['#ff8fab', '#ffd166', '#c77dff', '#ff8fab'][i]} flatShading />
          </mesh>
        ))}
      </>
    ),
  },
}

/**
 * The harbour: a hut on the shore and a pier out to sea. In this group, local +x
 * points along the pier and the hut is 3.5 units inland of the waterline.
 */
const HUT_OFFSET = 3.5
const SEABED_Y = -3.3

function Dock({ color, y }) {
  const deckY = PIER.deckY - y // keep the deck at the same height above the water
  const length = PIER.end - PIER.start
  const centre = (PIER.start + PIER.end) / 2 + HUT_OFFSET
  const postBottom = SEABED_Y - y
  const posts = []
  for (let a = PIER.start + 1; a <= PIER.end; a += 3) {
    for (const side of [-1, 1]) posts.push([a + HUT_OFFSET, side * (PIER.width / 2 - 0.1)])
  }
  return (
    <>
      {/* Hut */}
      <mesh position-y={-0.4} receiveShadow>
        <boxGeometry args={[3, 1, 2.8]} />
        <meshStandardMaterial color={STONE} flatShading />
      </mesh>
      <mesh position-y={0.8} castShadow receiveShadow>
        <boxGeometry args={[2.2, 1.6, 2]} />
        <meshStandardMaterial color="#a47148" flatShading />
      </mesh>
      <mesh position-y={2.1} rotation-y={Math.PI / 4} scale={[1.2, 1, 1.1]} castShadow>
        <coneGeometry args={[1.7, 1, 4]} />
        <meshStandardMaterial color={color} flatShading />
      </mesh>
      {/* Crates and a barrel */}
      <mesh position={[0.6, 0.3, 1.7]} rotation-y={0.3} castShadow>
        <boxGeometry args={[0.7, 0.7, 0.7]} />
        <meshStandardMaterial color="#b08968" flatShading />
      </mesh>
      <mesh position={[-0.4, 0.3, 1.8]} castShadow>
        <cylinderGeometry args={[0.3, 0.3, 0.7, 7]} />
        <meshStandardMaterial color="#7f5539" flatShading />
      </mesh>

      {/* Pier deck and posts */}
      <mesh position={[centre, deckY, 0]} castShadow receiveShadow>
        <boxGeometry args={[length, 0.22, PIER.width]} />
        <meshStandardMaterial color="#c8a27a" flatShading />
      </mesh>
      {posts.map(([px, pz], i) => (
        <mesh key={i} position={[px, (deckY + postBottom) / 2, pz]} castShadow>
          <cylinderGeometry args={[0.13, 0.13, deckY - postBottom, 5]} />
          <meshStandardMaterial color="#7f5539" flatShading />
        </mesh>
      ))}
      {/* Lamps at the end of the pier */}
      {[-1, 1].map((side) => (
        <group key={side} position={[PIER.end + HUT_OFFSET - 0.4, deckY, side * (PIER.width / 2 - 0.2)]}>
          <mesh position-y={0.7} castShadow>
            <cylinderGeometry args={[0.05, 0.05, 1.4, 4]} />
            <meshStandardMaterial color="#444" />
          </mesh>
          <mesh position-y={1.45}>
            <icosahedronGeometry args={[0.16, 0]} />
            <meshStandardMaterial color="#ffe8a3" emissive="#ffd166" emissiveIntensity={1.2} />
          </mesh>
        </group>
      ))}
    </>
  )
}

BUILDINGS.dock = {
  top: 3.6,
  noBase: true,
  render: (color, ctx) => <Dock color={color} y={ctx.y} />,
}

export function Station({ station }) {
  const { id, name, color, kind, position, rotation = 0 } = station
  const [x, z] = position
  const y = useMemo(() => heightAt(x, z), [x, z])
  const building = BUILDINGS[kind]
  const baseTop = building.noBase ? 0 : BASE_TOP
  const crystalY = baseTop + building.top

  const hovered = useWorld((s) => isThing(s.hovered, 'station', id))
  const selected = useWorld((s) => isThing(s.selected, 'station', id))
  const setHovered = useWorld((s) => s.setHovered)
  const select = useWorld((s) => s.select)
  const active = hovered || selected

  const crystal = useRef()
  useFrame(({ clock }, dt) => {
    const c = crystal.current
    c.rotation.y += dt * (active ? 2 : 0.8)
    c.position.y = crystalY + Math.sin(clock.elapsedTime * 1.5 + x) * 0.25
    c.scale.lerp(tmp.setScalar(active ? 1.4 : 1), 0.15)
  })

  return (
    <group
      position={[x, y, z]}
      rotation-y={rotation}
      onPointerOver={(e) => {
        e.stopPropagation()
        setHovered({ type: 'station', id })
        document.body.style.cursor = 'pointer'
      }}
      onPointerOut={() => {
        if (isThing(useWorld.getState().hovered, 'station', id)) setHovered(null)
        document.body.style.cursor = 'auto'
      }}
      onClick={(e) => {
        e.stopPropagation()
        select({ type: 'station', id })
      }}
    >
      {/* Stone base, sunk into the ground so it sits well on slopes. */}
      {!building.noBase && (
        <mesh position-y={BASE_TOP - 0.9} castShadow receiveShadow>
          <cylinderGeometry args={[2.6, 2.9, 1.8, 6]} />
          <meshStandardMaterial color={STONE} flatShading />
        </mesh>
      )}

      <group position-y={baseTop}>{building.render(color, { y: y + baseTop })}</group>

      {/* Glowing crystal: this is the "AI slot". */}
      <mesh ref={crystal} position-y={crystalY} castShadow>
        <octahedronGeometry args={[0.55, 0]} />
        <meshStandardMaterial color={color} emissive={color} emissiveIntensity={active ? 1.4 : 0.6} flatShading />
      </mesh>

      {/* Highlight ring on the base when hovered or selected. */}
      <mesh rotation-x={-Math.PI / 2} position-y={baseTop + 0.02} visible={active}>
        <ringGeometry args={[2.15, 2.5, 6]} />
        <meshBasicMaterial color={color} toneMapped={false} />
      </mesh>

      <Html position={[0, crystalY + 1.1, 0]} center zIndexRange={[5, 0]} style={{ pointerEvents: 'none' }}>
        <div className={`label ${active ? 'active' : ''}`} style={{ '--accent': color }}>
          {name}
        </div>
      </Html>
    </group>
  )
}
