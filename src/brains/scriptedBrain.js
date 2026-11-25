/**
 * BRAIN INTERFACE
 * ---------------
 * Every character and ship is driven by a brain: an object with
 *
 *   decide(context) -> Action          (may be async)
 *     Called whenever the character or ship has finished what it was doing.
 *
 * CHARACTER context:  { agent, position, currentStationId, stations, lastAction }
 * CHARACTER actions:  { type: 'walkTo', stationId, side? } | { type: 'work', seconds }
 *                     | { type: 'idle', seconds } | { type: 'say', text, seconds }
 *
 * SHIP context:       { ship, position, atDock, currentWaypointId, waypoints, lastAction }
 * SHIP actions:       { type: 'sailTo', waypointId } | { type: 'dock', seconds }
 *                     | { type: 'idle', seconds } | { type: 'say', text, seconds }
 *
 * Any action can carry a `status` text, shown as what they're doing right now, and a
 * `thought`, shown in a thought bubble (see src/minds/mind.js for where thoughts come from).
 *
 * This file is the placeholder brain for characters when they're off work. shipBrain.js
 * is the one for ships. src/making/makerBrain.js wraps both so they work on the day's
 * making challenge.
 */

import { thoughtFor } from '../minds/mind'

export const pick = (list) => list[Math.floor(Math.random() * list.length)]

/** Off duty: wander between stations (favourite ones more often), chat and think. */
export function createScriptedBrain(agent) {
  const b = agent.behaviour ?? {}
  return {
    decide({ stations, currentStationId, lastAction }) {
      const here = stations.find((s) => s.id === currentStationId)
      // After arriving somewhere, think about it, or say something, before moving on.
      if (lastAction?.type === 'walkTo') {
        if (Math.random() < (b.chatty ?? 0.5)) {
          const text = pick(agent.lines).replace('{station}', here?.name ?? 'island')
          return { type: 'say', text, seconds: 3.5 }
        }
        return {
          type: 'idle',
          seconds: 2 + Math.random() * 3,
          thought: thoughtFor(agent.id, 'arrive', { stationId: currentStationId, place: here?.name }),
        }
      }
      const others = stations.filter((s) => s.id !== currentStationId)
      const favourites = others.filter((s) => b.favourites?.includes(s.id))
      const next = favourites.length && Math.random() < 0.5 ? pick(favourites) : pick(others)
      return { type: 'walkTo', stationId: next.id, thought: thoughtFor(agent.id, 'offDuty') }
    },
  }
}
