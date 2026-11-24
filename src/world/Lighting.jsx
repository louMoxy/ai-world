import { useEffect } from 'react'
import { useThree } from '@react-three/fiber'
import { useMood } from '../looks/useMood'
import { cloudMaterial } from './Clouds'

/** Lights, fog and cloud colour, all taken from the current look's mood. */
export function Lighting() {
  const mood = useMood()
  const scene = useThree((s) => s.scene)

  useEffect(() => {
    if (scene.fog) {
      scene.fog.color.set(mood.fog)
      scene.fog.near = mood.fogNear
      scene.fog.far = mood.fogFar
    }
    cloudMaterial.color.set(mood.clouds)
  }, [scene, mood])

  return (
    <>
      <hemisphereLight color={mood.hemiSky} groundColor={mood.hemiGround} intensity={mood.hemiIntensity} />
      <directionalLight
        position={mood.sunPosition}
        intensity={mood.sunIntensity}
        color={mood.sunColor}
        castShadow
        shadow-mapSize={[2048, 2048]}
        shadow-camera-left={-45}
        shadow-camera-right={45}
        shadow-camera-top={45}
        shadow-camera-bottom={-45}
        shadow-camera-near={1}
        shadow-camera-far={140}
        shadow-bias={-0.0005}
        shadow-normalBias={0.04}
      />
    </>
  )
}
