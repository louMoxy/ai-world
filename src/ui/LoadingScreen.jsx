import { useEffect, useState } from 'react'
import { useWorld } from '../store'

export function LoadingScreen() {
  const ready = useWorld((s) => s.ready)
  const [gone, setGone] = useState(false)

  useEffect(() => {
    if (!ready) return
    const t = setTimeout(() => setGone(true), 900)
    return () => clearTimeout(t)
  }, [ready])

  if (gone) return null

  return (
    <div className={`loading ${ready ? 'done' : ''}`}>
      <div className="loading-inner">
        <div className="spinner" />
        <h1>AI World</h1>
        <p>Building the island…</p>
      </div>
    </div>
  )
}
