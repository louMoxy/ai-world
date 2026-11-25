/**
 * Helper for the daily AI task (a scheduled Claude Code task, see README "The daily AI").
 *
 *   npm run ai:brief                  what to write today: which date to plan, which days
 *                                     need a report, recent history, the rules and an example
 *   npm run ai:check -- <file>        check a plan or report file the way the server will
 *
 * The AI only writes files in data/ai/. The island's server picks them up; it never runs
 * anything the AI wrote, and anything that fails the checks is ignored.
 */
import fs from 'node:fs'
import path from 'node:path'
import { runnerImport } from 'vite'

const root = path.resolve(import.meta.dirname, '..')
const load = async (file) => (await runnerImport(path.join(root, file))).module
const [{ dateKey, addDays, nameOf, NEEDED }, { checkPlan, checkReport, WAYPOINT_IDS }, designs, { SAMPLE_DAYS }, { AGENTS }, { SHIPS }] =
  await Promise.all([
    load('src/making/days.js'),
    load('src/making/aiPlans.js'),
    load('src/making/designs.js'),
    load('src/making/samples.js'),
    load('src/agents/agents.js'),
    load('src/ships/ships.js'),
  ])

const plansDir = path.join(root, 'data', 'ai', 'plans')
const reportsDir = path.join(root, 'data', 'ai', 'reports')
const readJson = (file) => {
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8'))
  } catch {
    return null
  }
}

const [command, file] = process.argv.slice(2)
if (command === 'check') check(file)
else if (command === 'brief') brief()
else {
  console.log('Usage: npm run ai:brief  |  npm run ai:check -- <file>')
  process.exit(1)
}

function check(file) {
  if (!file) return fail(['Give the file to check'])
  const raw = readJson(path.resolve(file))
  if (!raw) return fail([`${file} is missing or not valid JSON`])
  const isReport = path.resolve(file).startsWith(reportsDir)
  const result = isReport ? checkReport(raw) : checkPlan(raw)
  if (!result.ok) return fail(result.errors)
  if (!isReport && !/^\d{4}-\d{2}-\d{2}\.json$/.test(path.basename(file))) return fail(['Plan files are named YYYY-MM-DD.json'])
  console.log(`OK: ${path.relative(root, path.resolve(file))} will be used.`)
}

function fail(errors) {
  console.log('NOT OK. Fix these and check again:')
  for (const e of errors) console.log(`  - ${e}`)
  process.exitCode = 1
}

function brief() {
  const state = readJson(path.join(root, 'data', 'making.json')) ?? { day: null, history: [], seq: 0 }
  const today = dateKey()
  const days = [...state.history, ...(state.day ? [state.day] : [])]

  // Plan the next day the island will start. If the current day (today or later) is still an
  // untouched sample, the server swaps in a plan for its date, so plan that one instead.
  const current = state.day && state.day.date >= today ? state.day : null
  const swappable = current && current.status === 'active' && current.done === 0 && current.plannedBy === 'sample'
  const planDate = !current ? today : swappable ? current.date : addDays(current.date, 1)
  const planFile = path.join(plansDir, `${planDate}.json`)
  const planExists = checkPlan(readJson(planFile)).ok

  // Report on days that are over (finished, or from an earlier date) and have no AI report yet.
  const over = (d) => d.status === 'finished' || d.date < today || d.status === 'unfinished'
  const toReport = days
    .filter((d) => over(d) && !d.aiReport && !fs.existsSync(path.join(reportsDir, `${d.id}.json`)))
    .slice(-2)

  const summary = (d) => {
    const ds = d.design
    let what = ds.kind
    if (ds.kind === 'fabric') what = `fabric, ${ds.pattern}, colours ${ds.colors.join(' ')}`
    if (ds.kind === 'print') what = `3D print, ${ds.parts.length} parts`
    if (ds.kind === 'outfit') what = `outfit for ${nameOf(ds.wearer)}: ${ds.hat.style} hat ${ds.hat.color}, ${ds.neck.style}${ds.neck.fabric ? ` of ${ds.neck.fabric.name}` : ''}`
    const team = Object.entries(d.credits ?? {}).filter(([who]) => who !== 'dev').map(([who, n]) => `${nameOf(who)} ${n}`).join(', ')
    return `- ${d.id} · ${d.date} · "${d.title}" (${what}) · ${d.status}, ${Math.round((d.done / d.needed) * 100)}% · planned by ${d.plannedBy ?? 'sample'}${team ? ` · turns: ${team}` : ''}`
  }

  const out = []
  out.push(`# Daily AI brief for ${today}`, '')
  out.push('## Your jobs today', '')
  out.push(
    planExists
      ? `1. Plan: already done (${path.relative(root, planFile)} is valid). Skip it.`
      : `1. Plan the making challenge for ${planDate}. Write it to ${path.relative(root, planFile).replaceAll('\\', '/')}`,
  )
  if (toReport.length)
    toReport.forEach((d, i) =>
      out.push(`${i + 2}. Write the end-of-day report for day ${d.id} ("${d.title}"). Write it to data/ai/reports/${d.id}.json`),
    )
  else out.push('2. Reports: none needed.')
  out.push('', 'Check every file with: npm run ai:check -- <file>   and fix it until it says OK.', '')

  out.push('## Recent days (oldest first)', '')
  out.push(...days.slice(-8).map(summary), '')
  for (const d of toReport) {
    out.push(`### Details for the report on ${d.id}`, '')
    out.push('```json', JSON.stringify({ ...d, design: d.design }, null, 1), '```', '')
    out.push(`The automatic report says: ${d.report ?? '(none yet)'}`, '')
  }

  out.push('## The island and its cast', '')
  for (const p of [...AGENTS, ...SHIPS])
    out.push(`- ${p.id} (${p.name}, ${p.role}): ${p.personality} Likes: ${p.likes.join(', ')}. Dislikes: ${p.dislikes.join(', ')}.`)
  out.push('')

  out.push('## Plan rules', '')
  out.push(
    `- theme: ${Object.entries(designs.THEMES).map(([k, t]) => `${k} (${t.label}, made at '${t.place}')`).join(', ')}. design.kind must equal theme.`,
    '- title ≤ 60 chars, brief ≤ 300 chars, notes: 1–3 notes ≤ 60 chars each (they are written on the sketch).',
    `- tasks: exactly 3. One of nova/pip has job 'sketch' at 'easel'; the other has job 'make' at the theme's place (with an optional 'prep' shown while the sketch is drawn). gull has job 'fetch' at a waypoint (${WAYPOINT_IDS.join(', ')}). Each task: activity ≤ 50 chars, lines: up to 4 things they say, ≤ 60 chars.`,
    "- thoughts (optional, recommended): { nova: [...], pip: [...], gull: [...] }, up to 4 each, ≤ 90 chars, in each one's own voice, about today's project. Placeholders like {place} are allowed but not needed.",
    `- fabric: pattern one of ${designs.PATTERNS.join(', ')}; colors: 2–4 '#rrggbb'; scale 1–8.`,
    `- outfit: wearer one of ${designs.WEARERS.join(', ')}; hat.style one of ${designs.HATS.join(', ')} with hat.color '#rrggbb'; neck.style one of ${designs.NECKS.join(', ')}; neck.fabric is a fabric design, or 'latest-fabric' to use the newest finished fabric (good for building on earlier days).`,
    `- print: up to ${designs.MAX_PARTS} parts. Shapes: box {size:[w,h,d]}, cylinder {radius, height, radiusTop?}, cone {radius, height}, sphere {radius}, torus {radius, tube}. Each part: at [x,y,z] (its centre, metres), optional rot [x,y,z] degrees, color '#rrggbb'. y=0 is the print bed; the object must fit in ${designs.PRINT_BOUNDS.width} wide × ${designs.PRINT_BOUNDS.height} high × ${designs.PRINT_BOUNDS.depth} deep, centred on x=0,z=0. Parts must not go below the bed. Optional basedOn: 'latest-print' to improve the newest print.`,
    '- Optional plannedBy: a short name for who planned it (default "Claude").',
    `- A day takes ${NEEDED} turns of work; aim for something the cast can finish in a day.`,
    '',
    'Variety: change the theme from recent days, build on earlier work now and then (a scarf from a recent fabric, an improved print), and keep it cheerful and maker-focused. No news.',
    '',
    'Tone: funny. Give the cast some sass: Nova is dramatic and fabulous about colour (and beige is her nemesis), Pip is bone-dry and deadpan, the Gull is a show-off who wants credit for every delivery. Teasing each other is good; being mean is not. Their lines and thoughts should make someone smile, and the brief and notes can be playful too.',
    '',
  )
  out.push('## Example plans (from the hand-written samples)', '')
  out.push('```json', JSON.stringify(SAMPLE_DAYS[0]), '```', '', '```json', JSON.stringify(SAMPLE_DAYS[2]), '```', '')
  out.push('## Report rules', '')
  out.push(
    'A report file is { "report": "..." }: up to 1200 characters, 2–4 short paragraphs, warm, funny (a bit of sass, like a cheeky island gossip column) and specific: what was made, who did what (use the turn counts), how far it got, a moment from each character in keeping with their personality, and a hint of what could come next. If it was not finished, say so kindly.',
  )
  console.log(out.join('\n'))
}
