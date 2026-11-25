import { useEffect, useState } from 'react'
import { useWorld } from '../store'
import { getLook } from '../looks/looks'
import { LookSwitcher } from './LookSwitcher'
import { About } from './About'

/** The two round buttons in the bottom-right corner: About, and the list of looks. */
export function CornerTools() {
  const [looksOpen, setLooksOpen] = useState(false)
  const [aboutOpen, setAboutOpen] = useState(false)
  const look = useWorld((s) => getLook(s.look))
  const panelOpen = useWorld((s) => s.selected?.type === 'station' || s.selected?.type === 'log')

  useEffect(() => {
    const onKey = (e) => {
      if (e.key !== 'Escape') return
      setLooksOpen(false)
      setAboutOpen(false)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  return (
    <>
      <div className={`corner-tools ${panelOpen ? 'beside-panel' : ''}`}>
        <LookSwitcher open={looksOpen} />
        <div className="tool-buttons">
          <button className="tool" onClick={() => setAboutOpen(true)} title="About this project" aria-label="About this project">
            i
          </button>
          <button
            className={`tool ${looksOpen ? 'on' : ''}`}
            onClick={() => setLooksOpen((o) => !o)}
            title={`Change the look (now: ${look.name})`}
            aria-label="Change the look"
            aria-expanded={looksOpen}
            aria-controls="look-list"
          >
            🎨
          </button>
        </div>
      </div>
      {aboutOpen && <About onClose={() => setAboutOpen(false)} />}
    </>
  )
}
