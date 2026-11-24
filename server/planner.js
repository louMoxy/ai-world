import { samplePlan } from '../src/making/days.js'

/**
 * Plans the next making day. This is where the AI will plug in (stage 3):
 *
 *   1. If an API key is set and today's budget allows, ask the model for a plan.
 *   2. Check the plan with validateDesign and the job rules.
 *   3. If anything goes wrong (no key, over budget, an error, an invalid plan), use the
 *      hand-written sample plan instead, so a day always starts.
 *
 * A plan has the same shape as the entries in src/making/samples.js, plus `plannedBy`
 * ('sample' or the model's name), which the Island Log shows.
 */
export async function planDay({ seq }) {
  return { ...samplePlan(seq), plannedBy: 'sample' }
}
