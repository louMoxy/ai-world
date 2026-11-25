import { useShallow } from 'zustand/react/shallow'
import { useWorld } from '../store'
import { useMaking, allDays, sketchProgress, progressOf, nameOf } from '../making/store'
import { THEMES } from '../making/designs'
import { sketchStrokes, sketchImage } from '../making/sketch'
import { AGENTS } from '../agents/agents'
import { SHIPS } from '../ships/ships'
import { follow } from './ChallengeCard'
import { describeAddition } from '../world/growth'

const isCast = (id) => AGENTS.some((a) => a.id === id) || SHIPS.some((s) => s.id === id)

const STATUS = { active: 'In progress', finished: 'Finished', unfinished: 'Unfinished' }

function formatDate(key) {
  const [y, m, d] = key.split('-').map(Number)
  return new Date(y, m - 1, d).toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short' })
}

/** The sketch as drawn so far (all of it once the sketching is done). */
function currentSketch(day) {
  const total = sketchStrokes(day).length
  const count = day.status === 'active' ? Math.round(sketchProgress(day) * total) : total
  return sketchImage(day, count)
}

/** The Island Log: every day, newest first, with its sketch, design and report. */
export function IslandLog({ openId }) {
  const days = useMaking(useShallow(allDays))
  const newestFirst = [...days].reverse()
  const open = newestFirst.find((d) => d.id === openId) ?? newestFirst[0]
  const made = days.filter((d) => d.status === 'finished').length
  const storage = useMaking((s) => s.storage)
  const select = (id) => useWorld.getState().select({ type: 'log', id })

  return (
    <div className="panel-body log">
      <div className="panel-head">
        <span className="dot" style={{ background: '#f72585' }} />
        <div>
          <h2>Island Log</h2>
          <p className="muted">
            {days.length} {days.length === 1 ? 'day' : 'days'} · {made} {made === 1 ? 'creation' : 'creations'} ·{' '}
            {storage === 'server' ? 'saved on the server' : storage === 'online' ? 'updated every morning' : 'saved in this browser'}
          </p>
        </div>
      </div>

      <div className="log-scroll">
        {open && <LogEntry day={open} onOpen={select} />}

        <h4 className="log-heading">All days</h4>
        <ul className="log-list">
          {newestFirst.map((d) => (
            <li key={d.id}>
              <button className={`log-item ${d.id === open?.id ? 'on' : ''}`} onClick={() => select(d.id)}>
                <img src={currentSketch(d)} alt="" />
                <span>
                  <span className="muted">
                    Day {d.number} · {formatDate(d.date)}
                  </span>
                  <strong>{d.title}</strong>
                  <span className={`badge ${d.status}`}>
                    {THEMES[d.design.kind].icon} {STATUS[d.status]}
                  </span>
                </span>
              </button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}

function LogEntry({ day, onOpen }) {
  const theme = THEMES[day.design.kind]
  const image = currentSketch(day)
  const team = Object.entries(day.credits).filter(([who]) => who !== 'dev')

  return (
    <article className="log-entry">
      <p className="muted">
        Day {day.number} · {formatDate(day.date)} · {theme.icon} {theme.label}
      </p>
      <h3>{day.title}</h3>
      <a href={image} download={`${day.date} ${day.title}.png`} title="Download the sketch">
        <img className="sketch" src={image} alt={`Sketch of ${day.title}`} />
      </a>
      <p className="muted small">
        Sketch by {day.sketcher}. Click it to download. Planned by{' '}
        {!day.plannedBy || day.plannedBy === 'sample' ? 'a hand-written sample' : day.plannedBy}.
      </p>
      <p>{day.brief}</p>
      {day.basedOn && (
        <p className="muted">
          Based on{' '}
          <button className="link" onClick={() => onOpen(day.basedOn.id)}>
            {day.basedOn.title}
          </button>
        </p>
      )}

      <h4>What was made</h4>
      <DesignSummary design={day.design} />
      {day.addition && (
        <p className="addition">
          🌱 {day.status === 'finished' ? 'Also added to the island' : 'When it’s finished, the island gets'}: {describeAddition(day.addition)}.
        </p>
      )}

      <h4>{day.status === 'active' ? 'Progress' : 'Report'}</h4>
      {day.aiReport && (
        <p className="ai-report">
          {day.aiReport}
          <span className="muted small"> (written by {day.plannedBy && day.plannedBy !== 'sample' ? day.plannedBy : 'Claude'})</span>
        </p>
      )}
      <p className={day.aiReport ? 'muted small' : undefined}>
        {day.report ??
          `${Math.round(progressOf(day) * 100)}% done. ${sketchProgress(day) < 1 ? 'The sketch is still being drawn.' : `${theme.making} is under way.`}`}
      </p>

      {team.length > 0 && (
        <>
          <h4>Team</h4>
          <ul className="team">
            {team.map(([who, n]) => (
              <li key={who}>
                {isCast(who) ? (
                  <button className="link" onClick={() => follow(who)} title={`Follow ${nameOf(who)}`}>
                    {nameOf(who)}
                  </button>
                ) : (
                  nameOf(who)
                )}{' '}
                <span className="muted">· {n} {n === 1 ? 'turn' : 'turns'}</span>
              </li>
            ))}
          </ul>
        </>
      )}
    </article>
  )
}

function Chips({ colors }) {
  return (
    <span className="chips">
      {colors.map((c, i) => (
        <span key={i} style={{ background: c }} title={c} />
      ))}
    </span>
  )
}

function DesignSummary({ design }) {
  if (design.kind === 'print') {
    const height = Math.max(...design.parts.map((p) => p.at[1] + (p.size?.[1] ?? p.height ?? p.radius * 2) / 2))
    return (
      <p>
        A printed piece in {design.parts.length} parts, about {Math.round(height * 100)} cm tall.{' '}
        <Chips colors={[...new Set(design.parts.map((p) => p.color))]} />
      </p>
    )
  }
  if (design.kind === 'fabric') {
    return (
      <p>
        A {design.pattern} cloth in {design.colors.length} colours. <Chips colors={design.colors} />
      </p>
    )
  }
  const { hat, neck, wearer } = design
  return (
    <p>
      For {nameOf(wearer)}:{' '}
      {[hat.style !== 'none' && `a ${hat.style} hat`, neck.style !== 'none' && `a ${neck.style} made from “${neck.fabric.name}”`]
        .filter(Boolean)
        .join(' and ')}
      . <Chips colors={[hat.style !== 'none' && hat.color, ...(neck.fabric?.colors ?? [])].filter(Boolean)} />
    </p>
  )
}
