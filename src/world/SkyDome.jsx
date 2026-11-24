import { useEffect, useMemo } from 'react'
import * as THREE from 'three'
import { useMood } from '../looks/useMood'

/** A gradient sky whose horizon matches the fog colour, with optional stars. */
export function SkyDome() {
  const mood = useMood()
  const material = useMemo(
    () =>
      new THREE.ShaderMaterial({
        side: THREE.BackSide,
        depthWrite: false,
        fog: false,
        uniforms: {
          top: { value: new THREE.Color() },
          bottom: { value: new THREE.Color() },
          stars: { value: 0 },
        },
        vertexShader: /* glsl */ `
          varying vec3 vDir;
          void main() {
            vDir = normalize(position);
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
          }
        `,
        fragmentShader: /* glsl */ `
          uniform vec3 top;
          uniform vec3 bottom;
          uniform float stars;
          varying vec3 vDir;

          float hash(vec3 p) {
            p = fract(p * 0.3183099 + 0.1);
            p *= 17.0;
            return fract(p.x * p.y * p.z * (p.x + p.y + p.z));
          }

          void main() {
            vec3 dir = normalize(vDir);
            float h = clamp(dir.y * 1.8 + 0.02, 0.0, 1.0);
            vec3 color = mix(bottom, top, h);

            if (stars > 0.0) {
              // Pick a few cells on a grid around the sky and light them up.
              vec3 cell = floor(dir * 180.0);
              float r = hash(cell);
              float star = step(0.985, r) * smoothstep(0.05, 0.35, dir.y);
              float twinkle = 0.6 + 0.4 * hash(cell + 7.0);
              color += vec3(star * twinkle * stars);

              // The moon, in the same direction as the night light.
              float m = dot(dir, normalize(vec3(-30.0, 40.0, -25.0)));
              color = mix(color, vec3(0.95, 0.96, 1.0), smoothstep(0.9993, 0.9995, m) * stars);
              color += vec3(0.25, 0.3, 0.45) * pow(max(m, 0.0), 300.0) * stars;
            }

            gl_FragColor = vec4(color, 1.0);
            #include <colorspace_fragment>
          }
        `,
      }),
    [],
  )

  useEffect(() => {
    material.uniforms.top.value.set(mood.skyTop)
    material.uniforms.bottom.value.set(mood.skyBottom)
    material.uniforms.stars.value = mood.stars
  }, [material, mood])

  return (
    <mesh material={material} scale={450} renderOrder={-1}>
      <sphereGeometry args={[1, 32, 16]} />
    </mesh>
  )
}
