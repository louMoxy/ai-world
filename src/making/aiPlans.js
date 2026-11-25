import { THEMES, validateDesign } from './designs'
import { AGENTS } from '../agents/agents'
import { SHIPS } from '../ships/ships'

/**
 * Checks for what the daily AI writes (stage 3). The AI never changes the world directly:
 * it leaves a plan and a report as files in data/ai/, and these checks decide whether
 * they're used. Anything that fails is ignored and a hand-written sample is used instead.
 *
 *   data/ai/plans/<YYYY-MM-DD>.json   a day plan (same shape as src/making/samples.js),
 *                                     plus optional `thoughts`: { nova: [..], pip: [..], gull: [..] }
 *   data/ai/reports/<day id>.json     { report: "…" } the end-of-day report for a day
 */

export const WAYPOINT_IDS = ['e', 'se', 's', 'sw', 'w', 'nw', 'n', 'ne']
const MAKERS = AGENTS.map((a) => a.id)
const SHIP_IDS = SHIPS.map((s) => s.id)
const PLACEHOLDER_FABRIC = { kind: 'fabric', name: 'x', pattern: 'weave', colors: ['#000000', '#ffffff'], scale: 4 }

const text = (v, max) => typeof v === 'string' && v.trim().length > 0 && v.trim().length <= max
const textList = (v, maxItems, maxLen) => Array.isArray(v) && v.length <= maxItems && v.every((t) => text(t, maxLen))

/** Check a plan. Returns { ok, plan, errors }; `plan` is a clean copy with only known fields. */
export function checkPlan(p) {
  const errors = []
  if (!p || typeof p !== 'object') return { ok: false, errors: ['Not a plan'] }

  if (!THEMES[p.theme]) errors.push(`theme must be one of ${Object.keys(THEMES).join(', ')}`)
  if (!text(p.title, 60)) errors.push('title: 1–60 characters')
  if (!text(p.brief, 300)) errors.push('brief: 1–300 characters')
  if (!textList(p.notes, 3, 60) || !p.notes.length) errors.push('notes: 1–3 short notes (60 characters each)')

  // The design. An outfit may use 'latest-fabric' for its neck piece (yesterday's cloth).
  const d = p.design
  if (!d || d.kind !== p.theme) errors.push('design.kind must match theme')
  const usesLatest = d?.kind === 'outfit' && d.neck?.fabric === 'latest-fabric'
  const check = validateDesign(usesLatest ? { ...d, neck: { ...d.neck, fabric: PLACEHOLDER_FABRIC } } : d)
  if (!check.ok || check.errors.length) errors.push(...check.errors.map((e) => `design: ${e}`))
  if (check.ok && d.kind === 'outfit' && d.neck && d.neck.style !== 'none' && check.design.neck.style === 'none')
    errors.push('design: neck piece is invalid (check style and fabric)')
  if (check.ok && d.kind === 'outfit' && d.hat && d.hat.style !== 'none' && check.design.hat.style === 'none')
    errors.push('design: hat is invalid (check style and colour)')
  if (p.basedOn !== undefined && p.basedOn !== 'latest-print') errors.push("basedOn may only be 'latest-print'")
  if (p.basedOn && p.theme !== 'print') errors.push('basedOn is only for prints')

  // Jobs: one maker sketches at the easel, the other makes it, and the Gull fetches.
  const tasks = Array.isArray(p.tasks) ? p.tasks : []
  const sketch = tasks.filter((t) => t?.job === 'sketch')
  const make = tasks.filter((t) => t?.job === 'make')
  const fetch = tasks.filter((t) => t?.job === 'fetch')
  if (tasks.length !== 3 || sketch.length !== 1 || make.length !== 1 || fetch.length !== 1)
    errors.push('tasks: exactly one sketch, one make and one fetch')
  else {
    const place = THEMES[p.theme]?.place
    if (!MAKERS.includes(sketch[0].who) || !MAKERS.includes(make[0].who) || sketch[0].who === make[0].who)
      errors.push(`tasks: sketch and make are done by two different makers (${MAKERS.join(', ')})`)
    if (sketch[0].at !== 'easel') errors.push("tasks: the sketch is at 'easel'")
    if (make[0].at !== place) errors.push(`tasks: a ${p.theme} is made at '${place}'`)
    if (!SHIP_IDS.includes(fetch[0].who)) errors.push(`tasks: fetch is done by ${SHIP_IDS.join(', ')}`)
    if (!WAYPOINT_IDS.includes(fetch[0].at)) errors.push(`tasks: fetch.at is a waypoint (${WAYPOINT_IDS.join(', ')})`)
    for (const t of tasks) {
      if (!text(t.activity, 50)) errors.push(`tasks: ${t.who} needs an activity (1–50 characters)`)
      if (t.prep !== undefined && !text(t.prep, 50)) errors.push(`tasks: ${t.who} prep is 1–50 characters`)
      if (!textList(t.lines, 4, 60)) errors.push(`tasks: ${t.who} lines: up to 4, 60 characters each`)
    }
  }

  let thoughts
  if (p.thoughts !== undefined) {
    const ok =
      p.thoughts && typeof p.thoughts === 'object' &&
      Object.entries(p.thoughts).every(([id, list]) => [...MAKERS, ...SHIP_IDS].includes(id) && textList(list, 4, 90))
    if (!ok) errors.push('thoughts: { nova|pip|gull: up to 4 thoughts, 90 characters each }')
    else thoughts = p.thoughts
  }

  if (errors.length) return { ok: false, errors }
  const clean = (t) => ({
    who: t.who, job: t.job, at: t.at, activity: t.activity.trim(),
    ...(t.prep ? { prep: t.prep.trim() } : {}),
    lines: (t.lines ?? []).map((l) => l.trim()),
  })
  const design = usesLatest ? { ...check.design, neck: { ...check.design.neck, fabric: 'latest-fabric' } } : check.design
  return {
    ok: true,
    errors: [],
    plan: {
      theme: p.theme,
      title: p.title.trim(),
      brief: p.brief.trim(),
      notes: p.notes.map((n) => n.trim()),
      design,
      ...(p.basedOn ? { basedOn: p.basedOn } : {}),
      tasks: tasks.map(clean),
      ...(thoughts ? { thoughts } : {}),
    },
  }
}

/** Check a report file: { report: text }. */
export function checkReport(r) {
  if (!r || !text(r.report, 1200)) return { ok: false, errors: ['report: 1–1200 characters of text'] }
  return { ok: true, errors: [], report: r.report.trim() }
}
