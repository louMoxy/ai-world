import { AGENTS } from '../agents/agents'
import { SHIPS } from '../ships/ships'
import { WAYPOINT_INFO } from '../ships/navigation'
import { createScriptedBrain } from './scriptedBrain'
import { createScriptedShipBrain } from './shipBrain'
// import { createAIBrain } from './aiBrain'

/**
 * One brain per character and per ship. To give one a real AI model later, swap
 * its scripted brain for createAIBrain, e.g.
 *   createAIBrain(ship, { kind: 'ship' })
 */
const brains = new Map([
  ...AGENTS.map((agent) => [agent.id, createScriptedBrain(agent)]),
  ...SHIPS.map((ship) => [ship.id, createScriptedShipBrain(ship, WAYPOINT_INFO)]),
])

export const getBrain = (id) => brains.get(id)
