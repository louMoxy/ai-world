import { pick } from '../brains/scriptedBrain'
import { getJob, useMaking, sketchProgress } from './store'

/**
 * Wraps a character's or ship's own brain so it works on today's challenge.
 *
 * While there's a job, the character goes to its place, works in turns (each finished turn
 * counts towards the day), says a line now and then, and sometimes takes a short break
 * using its own brain. Ships sail out to fetch materials and bring them back to the harbour;
 * each delivery counts. With no job (no challenge, or it's finished) the own brain decides.
 *
 * The world never knows the difference: it still just calls decide() and respond().
 */
export function withMaking(base, id, kind) {
  const contribute = () => useMaking.getState().contribute(id)

  const brain = {
    get interrupt() {
      return base.interrupt
    },
    set interrupt(value) {
      base.interrupt = value
    },

    respond: (...args) => base.respond(...args),

    decide(ctx) {
      const job = getJob(id)
      if (!job || base.hasOrder?.()) return base.decide(ctx)
      return kind === 'ship' ? shipTurn(job, ctx) : characterTurn(job, ctx)
    },
  }

  function characterTurn(job, { currentStationId, lastAction }) {
    if (lastAction?.type === 'work') {
      contribute()
      // Now and then, a short wander before coming back to work.
      if (Math.random() < 0.12) return breakWalk(currentStationId)
    }
    if (currentStationId !== job.at) return { type: 'walkTo', stationId: job.at, status: `Off to work: ${lower(activity(job))}` }
    if (lastAction?.type === 'work' && Math.random() < 0.3) return { type: 'say', text: pick(job.lines), seconds: 3.5 }
    return { type: 'work', seconds: 7 + Math.random() * 4, status: activity(job) }
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

  return brain
}

/** What a job is called right now: its prep step while the sketch is still being drawn. */
function activity(job) {
  const sketching = sketchProgress(useMaking.getState().day) < 1
  return sketching && job.prep ? job.prep : job.activity
}

const lower = (text) => text.charAt(0).toLowerCase() + text.slice(1)
