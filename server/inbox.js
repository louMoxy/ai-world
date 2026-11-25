import fs from 'node:fs'
import path from 'node:path'
import { checkPlan, checkReport } from '../src/making/aiPlans.js'

/**
 * The AI's inbox: data/ai/plans/<date>.json and data/ai/reports/<day id>.json.
 * A scheduled Claude Code task writes these once a day (see README, "The daily AI").
 * Files are only read, never changed, so they also serve as a record of what the AI wrote.
 */
export function aiInbox(dataDir) {
  const plansDir = path.join(dataDir, 'ai', 'plans')
  const reportsDir = path.join(dataDir, 'ai', 'reports')
  const warned = new Set()

  function readJson(file) {
    try {
      return JSON.parse(fs.readFileSync(file, 'utf8'))
    } catch (e) {
      if (e.code !== 'ENOENT' && !warned.has(file)) {
        warned.add(file)
        console.warn(`[island] ${path.relative(process.cwd(), file)} could not be read:`, e.message)
      }
      return null
    }
  }

  return {
    /** The AI's plan for a date, if there is a valid one. */
    planFor(date) {
      const file = path.join(plansDir, `${date}.json`)
      const raw = readJson(file)
      if (!raw) return null
      const { ok, plan, errors } = checkPlan(raw)
      if (!ok) {
        if (!warned.has(file + ':plan')) console.warn(`[island] AI plan for ${date} was not used:`, errors)
        warned.add(file + ':plan')
        return null
      }
      return { ...plan, plannedBy: typeof raw.plannedBy === 'string' ? raw.plannedBy.slice(0, 40) : 'Claude' }
    },

    /** Add the AI's reports to any days that have one waiting. Returns the same state if nothing changed. */
    addReports(state) {
      let names
      try {
        names = fs.readdirSync(reportsDir).filter((n) => n.endsWith('.json'))
      } catch {
        return state
      }
      if (!names.length) return state
      const waiting = new Map(names.map((n) => [n.slice(0, -5), n]))
      let changed = false
      const attach = (day) => {
        if (!day || day.aiReport || !waiting.has(day.id)) return day
        const { ok, report } = checkReport(readJson(path.join(reportsDir, waiting.get(day.id))))
        if (!ok) return day
        changed = true
        return { ...day, aiReport: report }
      }
      const next = { ...state, day: attach(state.day), history: state.history.map(attach) }
      return changed ? next : state
    },
  }
}
