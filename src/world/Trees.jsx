import { useLayoutEffect, useRef } from 'react'
import * as THREE from 'three'
import { TREES } from './layout'

const trunkGeo = new THREE.CylinderGeometry(0.12, 0.18, 1, 5).translate(0, 0.5, 0)
const coneGeo = new THREE.ConeGeometry(0.9, 1.8, 6).translate(0, 0.9, 0)
const roundGeo = new THREE.IcosahedronGeometry(0.95, 0)

const PINES = TREES.filter((t) => t.kind === 'pine')
const ROUNDS = TREES.filter((t) => t.kind === 'round')

export function Trees() {
  const trunks = useRef()
  const pineLow = useRef()
  const pineTop = useRef()
  const rounds = useRef()

  useLayoutEffect(() => {
    const o = new THREE.Object3D()
    const c = new THREE.Color()

    TREES.forEach((t, i) => {
      o.position.set(t.x, t.y - 0.1, t.z)
      o.rotation.set(0, t.rotation, 0)
      o.scale.set(t.scale, t.scale * 1.3, t.scale)
      o.updateMatrix()
      trunks.current.setMatrixAt(i, o.matrix)
    })

    PINES.forEach((t, i) => {
      c.set('#3f8f4a').offsetHSL((t.variant - 0.3) * 0.08, 0, (t.variant - 0.3) * 0.12)
      o.rotation.set(0, t.rotation, 0)
      o.position.set(t.x, t.y + 0.6 * t.scale, t.z)
      o.scale.setScalar(t.scale)
      o.updateMatrix()
      pineLow.current.setMatrixAt(i, o.matrix)
      pineLow.current.setColorAt(i, c)
      o.position.set(t.x, t.y + 1.6 * t.scale, t.z)
      o.scale.setScalar(t.scale * 0.7)
      o.updateMatrix()
      pineTop.current.setMatrixAt(i, o.matrix)
      pineTop.current.setColorAt(i, c)
    })

    ROUNDS.forEach((t, i) => {
      c.set('#6cbf4f').offsetHSL((t.variant - 0.8) * 0.3, 0, (t.variant - 0.8) * 0.3)
      o.rotation.set(t.rotation, t.rotation, 0)
      o.position.set(t.x, t.y + 1.7 * t.scale, t.z)
      o.scale.setScalar(t.scale)
      o.updateMatrix()
      rounds.current.setMatrixAt(i, o.matrix)
      rounds.current.setColorAt(i, c)
    })

    for (const m of [trunks, pineLow, pineTop, rounds]) {
      m.current.instanceMatrix.needsUpdate = true
      if (m.current.instanceColor) m.current.instanceColor.needsUpdate = true
    }
  }, [])

  return (
    <group>
      <instancedMesh ref={trunks} args={[trunkGeo, undefined, TREES.length]} castShadow frustumCulled={false}>
        <meshStandardMaterial color="#8a5a3b" flatShading />
      </instancedMesh>
      <instancedMesh ref={pineLow} args={[coneGeo, undefined, PINES.length]} castShadow frustumCulled={false}>
        <meshStandardMaterial flatShading />
      </instancedMesh>
      <instancedMesh ref={pineTop} args={[coneGeo, undefined, PINES.length]} castShadow frustumCulled={false}>
        <meshStandardMaterial flatShading />
      </instancedMesh>
      <instancedMesh ref={rounds} args={[roundGeo, undefined, ROUNDS.length]} castShadow frustumCulled={false}>
        <meshStandardMaterial flatShading />
      </instancedMesh>
    </group>
  )
}
