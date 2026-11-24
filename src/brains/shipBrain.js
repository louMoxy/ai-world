import { pick, wait } from './scriptedBrain'

/**
 * Placeholder brain for ships (see the interface in scriptedBrain.js).
 * It sails between waypoints and now and then returns to the harbour.
 * In chat it understands simple orders like "sail north", "go to the dock" or "stop".
 * A real AI brain would understand anything, and could reply with an action of its own.
 */
const normalise = (text) => text.toLowerCase().replace(/[\s-]/g, '')

export function createScriptedShipBrain(ship, waypoints) {
  let order = null
  // Longest names first, so "south-east" is matched before "south".
  const byName = [...waypoints].sort((a, b) => b.name.length - a.name.length)

  const giveOrder = (action) => {
    order = action
    brain.interrupt = true
  }

  const brain = {
    interrupt: false,

    /** True while an order from chat is waiting to be carried out. */
    hasOrder: () => order !== null,

    decide({ currentWaypointId, atDock, lastAction }) {
      if (order) {
        const o = order
        order = null
        return o
      }
      if (lastAction?.type === 'sailTo' && Math.random() < 0.35) {
        return { type: 'say', text: pick(ship.lines), seconds: 3.5 }
      }
      if (!atDock && lastAction?.type !== 'dock' && Math.random() < 0.25) {
        return { type: 'dock', seconds: 6 + Math.random() * 6 }
      }
      const options = waypoints.filter((w) => w.id !== currentWaypointId)
      return { type: 'sailTo', waypointId: pick(options).id }
    },

    async respond(message) {
      await wait(400 + Math.random() * 400)
      const m = normalise(message)

      if (/dock|harbou?r|home|moor|port/.test(m)) {
        giveOrder({ type: 'dock', seconds: 15 })
        return 'Aye! Heading back to the harbour.'
      }
      const wp = byName.find((w) => m.includes(normalise(w.name)))
      if (wp) {
        giveOrder({ type: 'sailTo', waypointId: wp.id })
        return `Aye aye! Setting a course ${wp.name.toLowerCase()}.`
      }
      if (/stop|wait|hold|anchor/.test(m)) {
        giveOrder({ type: 'idle', seconds: 10 })
        return 'Dropping anchor. Holding position.'
      }
      return `Not sure what you mean. Try "sail north", "go to the dock" or "stop". (Placeholder brain: a real AI will understand anything later.)`
    },
  }
  return brain
}
