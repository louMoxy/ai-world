import { useLayoutEffect, useRef } from 'react'
import * as THREE from 'three'
import { ROCKS } from './layout'

const rockGeo = new THREE.DodecahedronGeometry(0.6, 0)

export function Rocks() {
  const ref = useRef()

  useLayoutEffect(() => {
    const o = new THREE.Object3D()
    const c = new THREE.Color()
    ROCKS.forEach((r, i) => {
      o.position.set(r.x, r.y + 0.1 * r.scale, r.z)
      o.rotation.set(r.variant * 3, r.rotation, r.variant * 2)
      o.scale.set(r.scale * 1.2, r.scale * (0.6 + r.variant * 0.5), r.scale)
      o.updateMatrix()
      ref.current.setMatrixAt(i, o.matrix)
      ref.current.setColorAt(i, c.set('#a29d93').offsetHSL(0, 0, (r.variant - 0.5) * 0.15))
    })
    ref.current.instanceMatrix.needsUpdate = true
    if (ref.current.instanceColor) ref.current.instanceColor.needsUpdate = true
  }, [])

  return (
    <instancedMesh ref={ref} args={[rockGeo, undefined, ROCKS.length]} castShadow receiveShadow frustumCulled={false}>
      <meshStandardMaterial flatShading roughness={0.9} />
    </instancedMesh>
  )
}
