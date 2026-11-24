import { pick } from './scriptedBrain'

/**
 * Placeholder brain for ships when they're off work (see the interface in scriptedBrain.js).
 * It sails between waypoints and now and then returns to the harbour.
 */
export function createScriptedShipBrain(ship, waypoints) {
  return {
    decide({ currentWaypointId, atDock, lastAction }) {
      if (lastAction?.type === 'sailTo' && Math.random() < 0.35) {
        return { type: 'say', text: pick(ship.lines), seconds: 3.5 }
      }
      if (!atDock && lastAction?.type !== 'dock' && Math.random() < 0.25) {
        return { type: 'dock', seconds: 6 + Math.random() * 6 }
      }
      const options = waypoints.filter((w) => w.id !== currentWaypointId)
      return { type: 'sailTo', waypointId: pick(options).id }
    },
  }
}
