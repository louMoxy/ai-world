import { AGENTS } from '../agents/agents'
import { SHIPS } from '../ships/ships'
import { useWorld } from '../store'

/**
 * Thoughts: what goes through a character's (or ship's) head. Each one has thought lists
 * by situation in its personality (src/agents/agents.js, src/ships/ships.js).
 *
 * Situations:
 *   walkToWork, sketch, make, help, break, offDuty, arrive (by station id)  - characters
 *   sailOut, loading, delivering, offDuty                                   - ships
 *   sketchDone, finished, newDay                                            - everyone, on events
 *
 * Placeholders filled in from ctx: {place} {project} {maker} {theme} {cargo} {last} {n}
 */

const people = new Map([...AGENTS, ...SHIPS].map((p) => [p.id, p]))
const lastThought = new Map() // id -> text, so nobody thinks the same thing twice in a row

const pick = (list) => list[Math.floor(Math.random() * list.length)]

function fill(text, ctx) {
  return text.replace(/\{(\w+)\}/g, (match, key) => {
    if (key === 'n') return String(12 + Math.floor(Math.random() * 60))
    return ctx[key] ?? match
  })
}

/**
 * A thought for this situation, or null. Everyday situations only produce a thought some
 * of the time (how "thinky" they are); events always do.
 */
export function thoughtFor(id, situation, ctx = {}, { always = false } = {}) {
  const person = people.get(id)
  const bank = person?.thoughts?.[situation]
  if (!bank) return null
  const list = Array.isArray(bank) ? bank : (bank[ctx.stationId] ?? bank.default)
  if (!list?.length) return null
  if (!always && Math.random() > (person.behaviour?.thinky ?? 0.5)) return null

  const options = list.length > 1 ? list.filter((t) => t !== lastThought.get(id)) : list
  const raw = pick(options)
  const text = fill(raw, ctx)
  if (/\{\w+\}/.test(text)) return null // a placeholder we couldn't fill: better to stay quiet
  lastThought.set(id, raw)
  return text
}

/** Have a thought right now (shown in a thought bubble and kept in their recent thoughts). */
export function think(id, situation, ctx, options) {
  const text = thoughtFor(id, situation, ctx, options)
  if (text) useWorld.getState().think(id, text)
  return text
}

export const personOf = (id) => people.get(id)
