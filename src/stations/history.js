import { WORKSTATIONS } from '../making/workstations'
import { THEMES } from '../making/designs'
import { nameOf } from '../making/days'
import { placedAdditions, describeAddition } from '../world/growth'

/**
 * A place's history, worked out from the saved days:
 *   made      what was made or done here, newest first (sketches at the easel, printing,
 *             weaving, deliveries at the harbour, pieces joining the Gallery, additions)
 *   visits    who came by on a break or off duty, newest first, with what was on their mind
 *   regulars  who comes here most: days they worked here, plus visits
 */
export function placeHistory(days, stationId) {
  const benches = WORKSTATIONS.filter((w) => w.station === stationId).map((w) => w.id)
  const made = []
  const regulars = {}
  const count = (who, n = 1) => who !== 'dev' && (regulars[who] = (regulars[who] ?? 0) + n)

  for (const day of days) {
    const base = { dayId: day.id, date: day.date, title: day.title, status: day.status }
    const sketch = day.tasks.find((t) => t.job === 'sketch')
    const make = day.tasks.find((t) => t.job === 'make')
    const making = THEMES[day.design.kind].making.toLowerCase()

    if (sketch && benches.includes(sketch.at)) {
      made.push({ ...base, who: [sketch.who], text: `${nameOf(sketch.who)} drew the plans at the Easel` })
      count(sketch.who)
    }
    if (make && benches.includes(make.at)) {
      const turns = day.credits[make.who] ?? 0
      const helper = sketch && day.credits[sketch.who] ? ` with ${nameOf(sketch.who)} helping` : ''
      const where = WORKSTATIONS.find((w) => w.id === make.at)?.name
      made.push({
        ...base,
        who: [make.who, ...(helper ? [sketch.who] : [])],
        text: `${nameOf(make.who)} did the ${making} at the ${where}${helper} · ${turns} ${turns === 1 ? 'turn' : 'turns'}`,
      })
      count(make.who)
    }
    for (const fetch of day.tasks.filter((t) => t.job === 'fetch')) {
      const n = day.credits[fetch.who] ?? 0
      if (stationId === 'harbour' && n) {
        made.push({ ...base, who: [fetch.who], text: `${nameOf(fetch.who)} brought in ${n} ${n === 1 ? 'load' : 'loads'}: ${fetch.activity.replace(/^Fetching /, '')}` })
        count(fetch.who)
      }
    }
    if (stationId === 'gallery' && day.status === 'finished') made.push({ ...base, who: [], text: `${day.title} went on show` })
    if (stationId === 'harbour' && day.status === 'finished' && day.design.kind === 'print')
      made.push({ ...base, who: [], text: `A small ${day.title} went up on the pier` })
    for (const v of day.visits ?? []) if (v.place === stationId) count(v.who)
  }

  for (const { day, addition, plot } of placedAdditions(days))
    if (plot.stationId === stationId)
      made.push({ dayId: day.id, date: day.date, title: day.title, who: [], text: `New here: ${describeAddition(addition)}` })

  const visits = days
    .flatMap((d) => (d.visits ?? []).filter((v) => v.place === stationId))
    .sort((a, b) => b.t - a.t)

  return {
    made: made.sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0)),
    visits,
    regulars: Object.entries(regulars).sort((a, b) => b[1] - a[1]),
  }
}
