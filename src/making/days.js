import { SAMPLE_DAYS } from './samples'
import { validateDesign, THEMES } from './designs'
import { AGENTS, RETIRED_NAMES } from '../agents/agents'
import { SHIPS } from '../ships/ships'

/**
 * The rules of a making day, as pure functions. The server uses them (server/makingApi.js),
 * and so does the browser when there's no server. Nothing here touches files, the network
 * or the page.
 *
 * State: { day, history, seq }
 *   day      today's challenge (or null)
 *   history  every earlier day, oldest first
 *   seq      how many days have been created
 *
 * Each finished job adds one to day.done. The first SKETCH_SHARE of the work draws the
 * sketch; the rest builds the thing. When done reaches needed, it's finished.
 */

export const NEEDED = 30
export const SKETCH_SHARE = 0.3
const FALLBACK_FABRIC = { kind: 'fabric', name: 'Plain Canvas', pattern: 'weave', colors: ['#e9dcc3', '#d6c4a5', '#f4ecdc'], scale: 4 }

export const EMPTY_STATE = { day: null, history: [], seq: 0 }

/** Everyone who can be credited with work ('dev' is the testing buttons). */
export const CAST_IDS = [...AGENTS.map((a) => a.id), ...SHIPS.map((s) => s.id)]

export const nameOf = (id) =>
  AGENTS.find((a) => a.id === id)?.name ?? SHIPS.find((s) => s.id === id)?.name ?? RETIRED_NAMES[id] ?? id

/** A date as YYYY-MM-DD in local time. */
export function dateKey(date = new Date()) {
  const p = (n) => String(n).padStart(2, '0')
  return `${date.getFullYear()}-${p(date.getMonth() + 1)}-${p(date.getDate())}`
}

export function addDays(key, n) {
  const [y, m, d] = key.split('-').map(Number)
  return dateKey(new Date(y, m - 1, d + n))
}

const latest = (days, test) => [...days].reverse().find(test)
const lower = (text) => text.charAt(0).toLowerCase() + text.slice(1)

/** The hand-written plan for a given day number (used when there's no AI, or it fails). */
export const samplePlan = (seq) => SAMPLE_DAYS[seq % SAMPLE_DAYS.length]

/** True when it's time for a new day: there's none yet, or today's date has moved on. */
export const needsNewDay = (state, today = dateKey()) => !state.day || state.day.date < today

/** Build a day from a plan, linking it to earlier work where the plan asks. */
export function createDay(date, history, seq, plan) {
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
    plannedBy: plan.plannedBy ?? 'sample',
    thoughts: plan.thoughts ?? null,
    addition: plan.addition ?? null,
    done: 0,
    needed: NEEDED,
    credits: {},
    status: 'active',
    finishedAt: null,
    report: null,
  }
}

/** The end-of-day report. Stage 3 will have the AI write this instead. */
export function writeReport(day) {
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
  if (make) parts.push(`${nameOf(make.who)} did the ${THEMES[kind].making.toLowerCase()}${gather ? '' : '.'}`)
  if (gather) parts.push(`and ${nameOf(gather.who)} helped by ${lower(gather.activity)}.`)
  parts.push(`The ships made ${deliveries} ${deliveries === 1 ? 'delivery' : 'deliveries'}.`)
  if (kind === 'print') parts.push('It now stands in the Gallery.')
  if (kind === 'fabric') parts.push('The cloth hangs in the Gallery, ready for a future outfit.')
  if (kind === 'outfit') parts.push(`${nameOf(day.design.wearer)} is wearing it around the island.`)
  return parts.join(' ')
}

/** End a day. An active day is kept as unfinished. */
export function closeDay(day) {
  if (day.status !== 'active') return day
  const closed = { ...day, status: 'unfinished' }
  return { ...closed, report: writeReport(closed) }
}

/** Start a new day on `date` from `plan`, closing the current one into the history. */
export function startDay(state, date, plan) {
  const history = state.day ? [...state.history, closeDay(state.day)] : state.history
  return { day: createDay(date, history, state.seq, plan), history, seq: state.seq + 1 }
}

/** Someone finished a job for today's challenge. Returns the new state (or the same one). */
export function addWork(state, who, amount = 1, now = Date.now()) {
  const { day } = state
  if (!day || day.status !== 'active') return state
  const done = Math.min(day.needed, day.done + amount)
  let next = { ...day, done, credits: { ...day.credits, [who]: (day.credits[who] ?? 0) + 1 } }
  if (done >= day.needed) {
    next = { ...next, status: 'finished', finishedAt: now }
    next.report = writeReport(next)
  }
  return { ...state, day: next }
}

/** Kinds of visit to a place, and how many are kept per day. */
export const VISIT_KINDS = ['break', 'visit']
const MAX_VISITS = 40

/**
 * Someone arrived at a place (a break, or wandering when off duty). Kept in day.visits,
 * newest last, so each place can show who came by and what was on their mind.
 */
export function addVisit(state, { who, place, kind, note }, now = Date.now()) {
  const { day } = state
  if (!day) return state
  const visit = { t: now, who, place, kind, ...(note ? { note: String(note).slice(0, 120) } : {}) }
  return { ...state, day: { ...day, visits: [...(day.visits ?? []), visit].slice(-MAX_VISITS) } }
}

/** Basic shape check for a saved state (from a file or the browser). */
export const isState = (s) =>
  !!s && typeof s === 'object' && Array.isArray(s.history) && Number.isInteger(s.seq) && (s.day === null || typeof s.day === 'object')
