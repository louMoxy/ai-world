import { create } from 'zustand'
import { SAMPLE_DAYS } from './samples'
import { validateDesign, THEMES } from './designs'
import { loadMaking, saveMaking } from './storage'
import { AGENTS } from '../agents/agents'
import { SHIPS } from '../ships/ships'

/**
 * The making day: today's challenge, how far along it is, and the log of every past day.
 *
 * Each finished job (a turn at the easel, printer or loom, or a ship's delivery) adds one
 * to `done`. The first SKETCH_SHARE of the work draws the sketch; the rest builds the thing.
 * When `done` reaches `needed` the creation is finished and goes into the Gallery.
 *
 * A new day starts the first time the world is opened on a new date. Stage 1 takes days
 * from SAMPLE_DAYS; stage 3 will ask the AI for them instead.
 */

export const NEEDED = 48
export const SKETCH_SHARE = 0.3
const FALLBACK_FABRIC = { kind: 'fabric', name: 'Plain Canvas', pattern: 'weave', colors: ['#e9dcc3', '#d6c4a5', '#f4ecdc'], scale: 4 }

export const nameOf = (id) => AGENTS.find((a) => a.id === id)?.name ?? SHIPS.find((s) => s.id === id)?.name ?? id

/** Today's date as YYYY-MM-DD in local time. */
export function dateKey(date = new Date()) {
  const p = (n) => String(n).padStart(2, '0')
  return `${date.getFullYear()}-${p(date.getMonth() + 1)}-${p(date.getDate())}`
}

function addDays(key, n) {
  const [y, m, d] = key.split('-').map(Number)
  return dateKey(new Date(y, m - 1, d + n))
}

const latest = (days, test) => [...days].reverse().find(test)
const lower = (text) => text.charAt(0).toLowerCase() + text.slice(1)

/** Build a new day from the next plan, linking it to earlier work where the plan asks. */
function createDay(date, history, seq) {
  const plan = SAMPLE_DAYS[seq % SAMPLE_DAYS.length]
  const design = structuredClone(plan.design)
  const finished = history.filter((d) => d.status === 'finished')
  let basedOn = null

  if (design.kind === 'outfit' && design.neck?.fabric === 'latest-fabric') {
    const source = latest(finished, (d) => d.design.kind === 'fabric')
    design.neck.fabric = source ? source.design : FALLBACK_FABRIC
    if (source) basedOn = { id: source.id, title: source.title }
  }
  if (plan.basedOn === 'latest-print') {
    const source = latest(finished, (d) => d.design.kind === 'print')
    if (source) basedOn = { id: source.id, title: source.title }
  }

  const check = validateDesign(design)
  if (check.errors.length) console.warn(`Design "${plan.title}":`, check.errors)

  return {
    id: `${date}-${seq + 1}`,
    number: seq + 1,
    date,
    title: plan.title,
    brief: plan.brief,
    notes: plan.notes,
    design: check.ok ? check.design : FALLBACK_FABRIC,
    tasks: plan.tasks,
    basedOn,
    sketcher: nameOf(plan.tasks.find((t) => t.job === 'sketch')?.who),
    done: 0,
    needed: NEEDED,
    credits: {},
    status: 'active',
    finishedAt: null,
    report: null,
  }
}

/** The end-of-day report. Stage 3 will have the AI write this instead. */
function writeReport(day) {
  const by = (job) => day.tasks.find((t) => t.job === job)
  const sketch = by('sketch')
  const make = by('make')
  const gather = by('gather')
  const deliveries = day.tasks.filter((t) => t.job === 'fetch').reduce((n, t) => n + (day.credits[t.who] ?? 0), 0)
  const kind = day.design.kind

  if (day.status !== 'finished') {
    const pct = Math.round((day.done / day.needed) * 100)
    return `The island got ${pct}% of the way through ${day.title} before the day ended. It's kept in the log, unfinished.`
  }
  const parts = [`${day.title} is finished!`]
  if (sketch) parts.push(`${nameOf(sketch.who)} drew the plans,`)
  if (make) parts.push(`${nameOf(make.who)} did the ${THEMES[kind].making.toLowerCase()}`)
  if (gather) parts.push(`and ${nameOf(gather.who)} helped by ${lower(gather.activity)}.`)
  parts.push(`The ships made ${deliveries} ${deliveries === 1 ? 'delivery' : 'deliveries'}.`)
  if (kind === 'print') parts.push('It now stands in the Gallery.')
  if (kind === 'fabric') parts.push('The cloth hangs in the Gallery, ready for a future outfit.')
  if (kind === 'outfit') parts.push(`${nameOf(day.design.wearer)} is wearing it around the island.`)
  return parts.join(' ')
}

function close(day) {
  if (day.status === 'active') return { ...day, status: 'unfinished', report: writeReport({ ...day, status: 'unfinished' }) }
  return day
}

const persist = () => {
  const { day, history, seq } = useMaking.getState()
  saveMaking({ day, history, seq })
}

export const useMaking = create((set, get) => ({
  ready: false,
  day: null, // today's challenge
  history: [], // every earlier day, oldest first
  seq: 0, // how many days have been created

  /** Load the saved state and roll over to a new day if the date has changed. */
  start() {
    const saved = loadMaking() ?? {}
    let { day = null, history = [], seq = 0 } = saved
    if (day && day.date < dateKey()) {
      history = [...history, close(day)]
      day = null
    }
    if (!day) day = createDay(dateKey(), history, seq++)
    set({ ready: true, day, history, seq })
    persist()
  },

  /** Someone finished a job for today's challenge. */
  contribute(who, amount = 1) {
    const { day } = get()
    if (!day || day.status !== 'active') return
    const done = Math.min(day.needed, day.done + amount)
    let next = { ...day, done, credits: { ...day.credits, [who]: (day.credits[who] ?? 0) + 1 } }
    if (done >= day.needed) {
      next = { ...next, status: 'finished', finishedAt: Date.now() }
      next.report = writeReport(next)
    }
    set({ day: next })
    persist()
  },

  /** For testing: end today and start the next day straight away. */
  nextDay() {
    const { day, history, seq } = get()
    const closed = history.concat(day ? [close(day)] : [])
    const date = day ? addDays(day.date, 1) : dateKey()
    set({ day: createDay(date, closed, seq), history: closed, seq: seq + 1 })
    persist()
  },
}))

if (import.meta.env.DEV) window.__making = useMaking

// ---------- Selectors ----------

/** Today's job for a character or ship, or null when there's nothing to do. */
export function getJob(id) {
  const { day } = useMaking.getState()
  if (!day || day.status !== 'active') return null
  return day.tasks.find((t) => t.who === id) ?? null
}

export const progressOf = (day) => (day ? day.done / day.needed : 0)
export const sketchProgress = (day) => Math.min(1, progressOf(day) / SKETCH_SHARE)
export const makeProgress = (day) => Math.max(0, Math.min(1, (progressOf(day) - SKETCH_SHARE) / (1 - SKETCH_SHARE)))

/** Every day, oldest first (today last). */
export const allDays = (s) => (s.day ? [...s.history, s.day] : s.history)

/** The newest finished creations, for the Gallery. */
export const galleryPieces = (s, max = 8) =>
  allDays(s)
    .filter((d) => d.status === 'finished')
    .slice(-max)
    .reverse()

/** The outfit a character wears: the newest finished outfit made for them. */
export const wornOutfit = (s, agentId) =>
  latest(allDays(s), (d) => d.status === 'finished' && d.design.kind === 'outfit' && d.design.wearer === agentId)?.design ?? null
