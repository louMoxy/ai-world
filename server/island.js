import { planDay } from './planner.js'
import { EMPTY_STATE, SKETCH_SHARE, dateKey, needsNewDay, startDay, createDay, catchUp } from '../src/making/days.js'

/**
 * Bring the island up to date. Used by the server on every request and by the publish
 * script each morning, so both always agree:
 *
 *   1. start a new day if the date has moved on (the old one is finished by the clock),
 *      using the daily AI's plan if there is one;
 *   2. if today started with a sample because the AI's plan was late, switch to the AI's
 *      plan as long as the sketch isn't finished yet;
 *   3. add any reports the AI has written;
 *   4. keep today's challenge up with the island clock.
 *
 * Returns the same object when nothing changed.
 */
export async function bringUpToDate(state, inbox, { date = dateKey(), now = Date.now() } = {}) {
  let next = state ?? EMPTY_STATE
  if (!state || needsNewDay(next, date)) {
    const plan = await planDay({ seq: next.seq, history: next.history, date }, { inbox })
    next = startDay(next, date, plan, now)
  }
  const { day } = next
  if (day?.status === 'active' && day.plannedBy === 'sample' && day.done < day.needed * SKETCH_SHARE) {
    const plan = inbox.planFor(day.date)
    if (plan) next = { ...next, day: createDay(day.date, next.history, next.seq - 1, plan) }
  }
  return catchUp(inbox.addReports(next), now)
}
