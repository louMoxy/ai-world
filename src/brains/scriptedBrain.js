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
 * Any action can carry a `status` text, shown as what they're doing right now.
 *
 * This file is the placeholder brain for characters when they're off work. shipBrain.js
 * is the one for ships. src/making/makerBrain.js wraps both so they work on the day's
 * making challenge.
 */

export const pick = (list) => list[Math.floor(Math.random() * list.length)]

export function createScriptedBrain(agent) {
  return {
    decide({ stations, currentStationId, lastAction }) {
      // After arriving somewhere, pause or say something before moving on.
      if (lastAction?.type === 'walkTo') {
        if (Math.random() < 0.55) {
          const here = stations.find((s) => s.id === currentStationId)
          const text = pick(agent.lines).replace('{station}', here?.name ?? 'island')
          return { type: 'say', text, seconds: 3.5 }
        }
        return { type: 'idle', seconds: 2 + Math.random() * 3 }
      }
      const options = stations.filter((s) => s.id !== currentStationId)
      return { type: 'walkTo', stationId: pick(options).id }
    },
  }
}
