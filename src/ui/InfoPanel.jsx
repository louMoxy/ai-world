import { useEffect, useMemo, useState } from 'react'
import { useShallow } from 'zustand/react/shallow'
import { useWorld } from '../store'
import { getStation } from '../stations/stations'
import { AGENTS, getAgent } from '../agents/agents'
import { SHIPS, getShip } from '../ships/ships'
import { WAYPOINT_INFO } from '../ships/navigation'
import { getWorkstation } from '../making/workstations'
import { useMaking, jobNow, wornOutfit, allDays, progressOf } from '../making/store'
import { IslandLog } from './IslandLog'
import { voiceAvailable } from '../minds/Minds'
import { placeHistory } from '../stations/history'
import { nameOf } from '../making/days'

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

const VISIT_WORDS = { break: 'on a break', visit: 'popped by' }
const isCastId = (id) => CAST.some((c) => c.id === id)

/** A place: what happened there and who came by. */
function StationInfo({ id }) {
  const station = getStation(id)
  const days = useMaking(useShallow(allDays))
  const { made, visits, regulars } = useMemo(() => placeHistory(days, id), [days, id])
  const followPerson = (who) => useWorld.getState().select({ type: CAST.find((c) => c.id === who).type, id: who })
  const openDay = (dayId) => useWorld.getState().select({ type: 'log', id: dayId })
  const Who = ({ who }) =>
    isCastId(who) ? (
      <button className="link" onClick={() => followPerson(who)} title={`Follow ${nameOf(who)}`}>
        {nameOf(who)}
      </button>
    ) : (
      nameOf(who)
    )

  return (
    <div className="panel-body place">
      <div className="panel-head">
        <span className="dot" style={{ background: station.color }} />
        <div>
          <h2>{station.name}</h2>
          <p className="muted">
            {made.length} {made.length === 1 ? 'thing' : 'things'} happened here · {visits.length} {visits.length === 1 ? 'visit' : 'visits'}
          </p>
        </div>
      </div>
      <p>{station.description}</p>

      {regulars.length > 0 && (
        <>
          <h4>Regulars</h4>
          <div className="regulars">
            {regulars.slice(0, 3).map(([who, n]) => (
              <span key={who} className="regular">
                <Who who={who} /> <span className="muted">×{n}</span>
              </span>
            ))}
          </div>
        </>
      )}

      <h4>What happened here</h4>
      {made.length ? (
        <ul className="place-list">
          {made.slice(0, 8).map((m, i) => (
            <li key={i}>
              <span className="muted small">{formatDay(m.date)} · </span>
              <button className="link" onClick={() => openDay(m.dayId)}>
                {m.title}
              </button>
              <br />
              {m.text}
            </li>
          ))}
        </ul>
      ) : (
        <p className="muted">Nothing made here yet.</p>
      )}

      <h4>Who came by</h4>
      {visits.length ? (
        <ul className="place-list">
          {visits.slice(0, 6).map((v) => (
            <li key={`${v.t}-${v.who}`}>
              <Who who={v.who} /> {VISIT_WORDS[v.kind] ?? 'came by'} <span className="muted small">· {ago(v.t)}</span>
              {v.note && <span className="visit-note">“{v.note}”</span>}
            </li>
          ))}
        </ul>
      ) : (
        <p className="muted">No visitors yet. They'll come by on breaks and when they're off duty.</p>
      )}
    </div>
  )
}

function formatDay(key) {
  const [y, m, d] = key.split('-').map(Number)
  return new Date(y, m - 1, d).toLocaleDateString(undefined, { day: 'numeric', month: 'short' })
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

      {entity.personality && (
        <p className="personality">
          {entity.personality}
          {entity.likes && <span className="muted"> Likes {listOf(entity.likes)}.</span>}
        </p>
      )}

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

      <MindFeed id={id} />

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

const listOf = (items) => (items.length > 1 ? `${items.slice(0, -1).join(', ')} and ${items.at(-1)}` : items[0])

function ago(at) {
  const s = Math.round((Date.now() - at) / 1000)
  if (s < 20) return 'just now'
  if (s < 60) return `${s}s ago`
  const m = Math.round(s / 60)
  if (m < 60) return `${m} min ago`
  const h = Math.round(m / 60)
  if (h < 24) return `${h} h ago`
  return new Date(at).toLocaleDateString(undefined, { day: 'numeric', month: 'short' })
}

/** Their recent thoughts and sayings, newest first, and the switch to hear them. */
function MindFeed({ id }) {
  const log = useWorld((s) => s.mindLog[id])
  const voice = useWorld((s) => s.voice)
  const [, tick] = useState(0)
  useEffect(() => {
    const t = setInterval(() => tick((n) => n + 1), 15000) // keep "2 min ago" fresh
    return () => clearInterval(t)
  }, [])

  return (
    <div className="mind">
      <div className="mind-head">
        <h4>On their mind</h4>
        {voiceAvailable && (
          <button
            className={`voice ${voice ? 'on' : ''}`}
            aria-pressed={voice}
            onClick={() => useWorld.getState().setVoice(!voice)}
            title="Read their thoughts out loud while you follow them"
          >
            {voice ? '🔊 Hearing thoughts' : '🔈 Hear thoughts'}
          </button>
        )}
      </div>
      {log?.length ? (
        <ul>
          {log.slice(0, 5).map((m) => (
            <li key={m.at + m.text} className={m.kind}>
              <span aria-label={m.kind === 'thought' ? 'Thought' : 'Said'}>{m.kind === 'thought' ? '💭' : '💬'}</span>
              <span>
                {m.text} <span className="muted">· {ago(m.at)}</span>
              </span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="muted small">Nothing yet. Give them a moment…</p>
      )}
    </div>
  )
}
