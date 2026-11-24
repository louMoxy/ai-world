import { useEffect } from 'react'
import { useWorld } from '../store'
import { getStation } from '../stations/stations'
import { AGENTS, getAgent } from '../agents/agents'
import { SHIPS, getShip } from '../ships/ships'
import { WAYPOINT_INFO } from '../ships/navigation'
import { getWorkstation } from '../making/workstations'
import { useMaking, jobNow, wornOutfit, allDays, progressOf } from '../making/store'
import { IslandLog } from './IslandLog'

/** Everyone you can follow, in order. */
const CAST = [...AGENTS.map((a) => ({ type: 'agent', id: a.id })), ...SHIPS.map((s) => ({ type: 'ship', id: s.id }))]

export function InfoPanel() {
  const selected = useWorld((s) => s.selected)
  const clearSelection = useWorld((s) => s.clearSelection)

  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && clearSelection()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [clearSelection])

  if (!selected) return null
  const following = selected.type === 'agent' || selected.type === 'ship'

  return (
    <aside className={`panel ${following ? 'follow' : ''}`} key={following ? 'follow' : `${selected.type}-${selected.id}`}>
      <button className="close" onClick={clearSelection} aria-label={following ? 'Stop following' : 'Close'}>
        ×
      </button>
      {selected.type === 'station' && <StationInfo id={selected.id} />}
      {selected.type === 'log' && <IslandLog openId={selected.id} />}
      {following && <FollowPanel type={selected.type} id={selected.id} />}
    </aside>
  )
}

function StationInfo({ id }) {
  const station = getStation(id)
  return (
    <div className="panel-body">
      <div className="panel-head">
        <span className="dot" style={{ background: station.color }} />
        <div>
          <h2>{station.name}</h2>
          <p className="muted">Station</p>
        </div>
      </div>
      <p>{station.description}</p>
      <div className="slot">
        <div className="slot-row">
          <span className="status off" /> <strong>AI model slot</strong>
        </div>
        <p className="muted">Not connected yet. This is where a model will run.</p>
      </div>
    </div>
  )
}

/** Where a job happens, in words. */
function placeName(at) {
  return getWorkstation(at)?.name ?? getStation(at)?.name ?? WAYPOINT_INFO.find((w) => w.id === at)?.name ?? at
}

/** The camera follows this character or ship; the card says what they're up to. */
function FollowPanel({ type, id }) {
  const entity = type === 'agent' ? getAgent(id) : getShip(id)
  const status = useWorld((s) => s.status[id])
  const day = useMaking((s) => s.day)
  const outfit = useMaking((s) => (type === 'agent' ? wornOutfit(s, id) : null))
  const helpedMake = useMaking((s) => allDays(s).filter((d) => d.status === 'finished' && d.credits[id]).length)
  if (!entity) return null

  const job = jobNow(id)
  const turns = day?.credits[id] ?? 0
  const index = CAST.findIndex((c) => c.id === id)
  const next = CAST[(index + 1) % CAST.length]
  const follow = (c) => useWorld.getState().select(c)

  return (
    <div className="panel-body">
      <div className="panel-head">
        <span className="dot" style={{ background: entity.color }} />
        <div>
          <h2>{entity.name}</h2>
          <p className="muted">{entity.role}</p>
        </div>
      </div>

      <div className="status-line">
        <span className="status on" /> {status ?? 'Looking around'}
      </div>

      {day && (
        <div className="follow-today">
          <h4>Today · {day.title}</h4>
          {job ? (
            <p>
              <strong>{job.activity}</strong>
              <span className="muted">
                {' '}
                {type === 'ship' ? `from the ${placeName(job.at).toLowerCase()}` : `at the ${placeName(job.at)}`} · {turns} {type === 'ship' ? (turns === 1 ? 'delivery' : 'deliveries') : turns === 1 ? 'turn' : 'turns'} so far
              </span>
            </p>
          ) : (
            <p className="muted">
              {day.status === 'finished' ? 'The challenge is finished, so they’re off duty.' : 'No job today.'}
            </p>
          )}
          <div className="progress thin">
            <div style={{ width: `${Math.round(progressOf(day) * 100)}%` }} />
          </div>
        </div>
      )}

      <p className="muted small">
        {outfit && <>Wearing {outfit.name}. </>}
        Has helped make {helpedMake} {helpedMake === 1 ? 'creation' : 'creations'}.
      </p>

      <div className="follow-actions">
        <button onClick={() => follow(next)}>Follow {(getAgent(next.id) ?? getShip(next.id)).name} ›</button>
        <button className="secondary" onClick={() => useWorld.getState().clearSelection()}>
          Stop following
        </button>
      </div>
      <p className="muted small">Drag to look around them, scroll to zoom. Esc stops following.</p>
    </div>
  )
}
