import { pick } from '../brains/scriptedBrain'
import { jobNow, useMaking } from './store'

/**
 * Wraps a character's or ship's own brain so it works on today's challenge.
 *
 * While there's a job, a character goes to its place, works in turns (each finished turn
 * counts towards the day), says a line now and then, and sometimes takes a short break.
 * Once the sketch is done, the sketcher goes to help the builder. Ships sail out to fetch
 * materials and bring them back to the harbour; each delivery counts. With no job (no
 * challenge, or it's finished) the character's own brain decides.
 */
export function withMaking(base, id, kind) {
  const contribute = () => useMaking.getState().contribute(id)

  function characterTurn(job, { currentStationId, lastAction }) {
    if (lastAction?.type === 'work') {
      contribute()
      // Now and then, a short wander before coming back to work.
      if (Math.random() < 0.12) return breakWalk(currentStationId)
    }
    if (currentStationId !== job.at) {
      return {
        type: 'walkTo',
        stationId: job.at,
        side: job.job === 'help' ? 1.4 : 0, // helpers stand beside the builder
        status: `Off to work: ${lower(job.activity)}`,
      }
    }
    if (lastAction?.type === 'work' && Math.random() < 0.3) return { type: 'say', text: pick(job.lines), seconds: 3.5 }
    return { type: 'work', seconds: 7 + Math.random() * 4, status: job.activity }
  }

  function breakWalk(currentStationId) {
    const places = ['hub', 'gallery', 'observatory', 'library', 'garden', 'harbour'].filter((s) => s !== currentStationId)
    return { type: 'walkTo', stationId: pick(places), status: 'Taking a short break' }
  }

  function shipTurn(job, { atDock, currentWaypointId, lastAction }) {
    if (lastAction?.type === 'dock') {
      if (!lastAction.moored) contribute() // a delivery!
      return { type: 'sailTo', waypointId: job.at, status: job.activity }
    }
    if (!atDock && currentWaypointId === job.at) {
      if (lastAction?.type === 'sailTo') {
        return Math.random() < 0.35
          ? { type: 'say', text: pick(job.lines), seconds: 3 }
          : { type: 'idle', seconds: 3 + Math.random() * 2, status: 'Loading cargo' }
      }
      return { type: 'dock', seconds: 5, status: 'Bringing the cargo home', arrivedStatus: 'Unloading at the harbour' }
    }
    return { type: 'sailTo', waypointId: job.at, status: job.activity }
  }

  return {
    decide(ctx) {
      const job = jobNow(id)
      if (!job) return base.decide(ctx)
      return kind === 'ship' ? shipTurn(job, ctx) : characterTurn(job, ctx)
    },
  }
}

const lower = (text) => text.charAt(0).toLowerCase() + text.slice(1)
