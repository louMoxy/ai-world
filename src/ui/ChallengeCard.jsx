import { useEffect, useRef, useState } from 'react'
import { useWorld } from '../store'
import { useMaking, progressOf, sketchProgress, nameOf } from '../making/store'
import { THEMES } from '../making/designs'
import { AGENTS } from '../agents/agents'
import { SHIPS } from '../ships/ships'

const colorOf = (id) => AGENTS.find((a) => a.id === id)?.color ?? SHIPS.find((s) => s.id === id)?.color ?? '#999'

/** Today's challenge: what's being made, how far along it is, and who's doing what. */
export function ChallengeCard() {
  const day = useMaking((s) => s.day)
  const status = useWorld((s) => s.status)
  const [open, setOpen] = useState(true)
  useCelebration(day)

  if (!day) return null
  const theme = THEMES[day.design.kind]
  const pct = Math.round(progressOf(day) * 100)
  const phase =
    day.status === 'finished' ? 'Finished! Now in the Gallery' : sketchProgress(day) < 1 ? 'Sketching the design' : `${theme.making}…`

  return (
    <section className="challenge">
      <div className="challenge-top">
        <span className="chip">
          {theme.icon} {theme.label}
        </span>
        <span className="muted">Day {day.number}</span>
        <button className="link" onClick={() => setOpen(!open)} aria-expanded={open}>
          {open ? 'Hide' : 'Show'}
        </button>
      </div>
      <h3>{day.title}</h3>
      <div className="progress" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100}>
        <div style={{ width: `${pct}%` }} />
      </div>
      <div className="progress-label">
        <span>{phase}</span>
        <span>{pct}%</span>
      </div>

      {open && (
        <>
          <p className="brief">{day.brief}</p>
          <ul className="crew">
            {day.tasks.map((t) => (
              <li key={t.who}>
                <span className="dot small" style={{ background: colorOf(t.who) }} />
                <strong>{nameOf(t.who)}</strong>
                <span className="muted">{status[t.who] ?? t.activity}</span>
              </li>
            ))}
          </ul>
          <div className="challenge-actions">
            <button onClick={() => useWorld.getState().select({ type: 'log', id: day.id })}>📖 Island Log</button>
            {import.meta.env.DEV && <DevControls />}
          </div>
        </>
      )}
    </section>
  )
}

/** Testing shortcuts, only in the dev server. */
function DevControls() {
  const { contribute, nextDay } = useMaking.getState()
  return (
    <span className="dev" title="Only shown while developing">
      Dev:
      <button onClick={() => contribute('dev', 12)}>+25%</button>
      <button onClick={nextDay}>Next day ›</button>
    </span>
  )
}

/** When the day's creation is finished, everyone cheers. */
function useCelebration(day) {
  const last = useRef(day?.status)
  useEffect(() => {
    if (day && last.current === 'active' && day.status === 'finished') {
      const { say } = useWorld.getState()
      const cheers = [`${day.title} is done!`, 'We made it!', 'To the Gallery!']
      AGENTS.forEach((a, i) => say(a.id, cheers[i % cheers.length], 4))
    }
    last.current = day?.status
  }, [day])
}
