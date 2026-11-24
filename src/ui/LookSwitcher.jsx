import { useEffect } from 'react'
import { useWorld } from '../store'
import { LOOKS, getLook } from '../looks/looks'

/** A small list in the corner for switching looks. Number keys 1–9 also switch. */
export function LookSwitcher() {
  const look = useWorld((s) => s.look)
  const setLook = useWorld((s) => s.setLook)
  const panelOpen = useWorld((s) => s.selected?.type === 'station' || s.selected?.type === 'log')

  useEffect(() => {
    const onKey = (e) => {
      if (e.target.closest?.('input, textarea, [contenteditable="true"]')) return
      if (e.ctrlKey || e.metaKey || e.altKey) return
      const n = Number(e.key)
      if (n >= 1 && n <= LOOKS.length) setLook(LOOKS[n - 1].id)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [setLook])

  // Lets CSS restyle the HTML labels to match the look.
  useEffect(() => {
    document.body.dataset.look = getLook(look).id
  }, [look])

  return (
    <nav className={`looks ${panelOpen ? 'beside-panel' : ''}`} aria-label="Look">
      <div className="looks-title">Look</div>
      {LOOKS.map((l, i) => (
        <button
          key={l.id}
          className={l.id === look ? 'on' : ''}
          aria-pressed={l.id === look}
          title={l.description}
          onClick={() => setLook(l.id)}
        >
          <kbd>{i + 1}</kbd>
          {l.name}
        </button>
      ))}
    </nav>
  )
}
