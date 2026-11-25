import { Suspense, useRef } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { useWorld } from './store'
import { FOG_COLOR } from './world/terrain'
import { SkyDome } from './world/SkyDome'
import { Lighting } from './world/Lighting'
import { Island } from './world/Island'
import { Water } from './world/Water'
import { Trees } from './world/Trees'
import { Rocks } from './world/Rocks'
import { Clouds } from './world/Clouds'
import { CameraRig } from './world/CameraRig'
import { STATIONS } from './stations/stations'
import { Station } from './stations/Station'
import { AGENTS } from './agents/agents'
import { Agent } from './agents/Agent'
import { SHIPS } from './ships/ships'
import { Ship } from './ships/Ship'
import { Overlay } from './ui/Overlay'
import { InfoPanel } from './ui/InfoPanel'
import { LoadingScreen } from './ui/LoadingScreen'
import { LookSwitcher } from './ui/LookSwitcher'
import { MaterialSwap } from './looks/MaterialSwap'
import { LookEffects } from './looks/LookEffects'
import { MakingWorld } from './making/MakingWorld'
import { ChallengeCard } from './ui/ChallengeCard'
import { Minds } from './minds/Minds'

/** Tells the loading screen to fade once a couple of frames have been drawn. */
function ReadySignal() {
  const frames = useRef(0)
  useFrame(() => {
    if (++frames.current === 3) useWorld.getState().setReady()
  })
  return null
}

function World() {
  return (
    <>
      <fog attach="fog" args={[FOG_COLOR, 80, 220]} />
      <SkyDome />
      <Lighting />
      <Island />
      <Water />
      <Trees />
      <Rocks />
      <Clouds />
      {STATIONS.map((s) => (
        <Station key={s.id} station={s} />
      ))}
      {AGENTS.map((a) => (
        <Agent key={a.id} agent={a} />
      ))}
      {SHIPS.map((s) => (
        <Ship key={s.id} ship={s} />
      ))}
      <MakingWorld />
      <CameraRig />
      <ReadySignal />
      <MaterialSwap />
      <LookEffects />
    </>
  )
}

export default function App() {
  const clearSelection = useWorld((s) => s.clearSelection)
  return (
    <>
      <Canvas
        shadows
        flat
        dpr={[1, 2]}
        camera={{ position: [34, 26, 34], fov: 45, near: 0.5, far: 1000 }}
        onPointerMissed={clearSelection}
      >
        <Suspense fallback={null}>
          <World />
        </Suspense>
      </Canvas>
      <Overlay />
      <ChallengeCard />
      <Minds />
      <InfoPanel />
      <LookSwitcher />
      <LoadingScreen />
    </>
  )
}
