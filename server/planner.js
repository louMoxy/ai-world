import { samplePlan } from '../src/making/days.js'

/**
 * Plans a making day.
 *
 *   1. If the daily AI task has left a valid plan for this date in data/ai/plans/, use it.
 *   2. Otherwise use the hand-written sample plan, so a day always starts.
 *
 * The daily AI is a scheduled Claude Code task (see README, "The daily AI"), so it runs
 * on your Claude plan and needs no API key. A plan has the same shape as the entries in
 * src/making/samples.js, plus `plannedBy`, which the Island Log shows.
 */
export async function planDay({ seq, date }, { inbox }) {
  return inbox.planFor(date) ?? { ...samplePlan(seq), plannedBy: 'sample' }
}
