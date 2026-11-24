/**
 * BRAIN INTERFACE
 * ---------------
 * Every character and ship is driven by a brain: an object with
 *
 *   decide(context) -> Action          (may be async)
 *     Called whenever the character or ship has finished what it was doing.
 *
 *   respond(message, context) -> string (may be async)
 *     Called when the user chats with it. context = { self: { id, name, role }, history }
 *
 *   interrupt: boolean (optional)
 *     Set to true to make it drop what it's doing and call decide() again
 *     right away, e.g. after being given an order in chat.
 *
 * CHARACTER context:  { agent, position, currentStationId, stations, lastAction }
 * CHARACTER actions:  { type: 'walkTo', stationId } | { type: 'idle', seconds } | { type: 'say', text, seconds }
 *
 * SHIP context:       { ship, position, atDock, currentWaypointId, waypoints, lastAction }
 * SHIP actions:       { type: 'sailTo', waypointId } | { type: 'dock', seconds }
 *                     | { type: 'idle', seconds } | { type: 'say', text, seconds }
 *
 * This file is the placeholder brain for characters. shipBrain.js is the one for ships.
 * aiBrain.js shows where a real model would plug in.
 */

export const pick = (list) => list[Math.floor(Math.random() * list.length)]
export const wait = (ms) => new Promise((r) => setTimeout(r, ms))

const REPLIES = [
  "That's interesting! Tell me more.",
  'Hmm, I will have to think about that.',
  "I'd love to help with that one day.",
  'Good question!',
]

export function createScriptedBrain(agent) {
  return {
    interrupt: false,

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

    async respond() {
      await wait(500 + Math.random() * 500) // pretend to think
      return `${pick(REPLIES)} (I'm running on a placeholder brain for now. A real AI model will answer here later.)`
    },
  }
}
