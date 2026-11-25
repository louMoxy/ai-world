import { pick } from '../brains/scriptedBrain'
import { thoughtFor } from '../minds/mind'
import { getStation } from '../stations/stations'
import { WAYPOINT_INFO } from '../ships/navigation'
import { getWorkstation } from './workstations'
import { jobNow, useMaking, galleryPieces, nameOf } from './store'

/**
 * Wraps a character's or ship's own brain so it works on today's challenge, in its own way.
 *
 * While there's a job, a character goes to its place and works in turns (each finished turn
 * counts towards the day), says a line now and then, and sometimes takes a break at one of
 * its favourite places. How long a turn takes, how often they break and how much they talk
 * and think all come from their personality (src/agents/agents.js). Once the sketch is done,
 * the sketcher goes to help the builder. Ships fetch materials and bring them back to the
 * harbour; each delivery counts. With no job, the character's own brain decides.
 *
 * Actions can carry a `thought`, which the world shows in a thought bubble.
 */
const BREAK_PLACES = ['hub', 'gallery', 'observatory', 'library', 'garden', 'harbour', 'workshop']

/** How the themes sound in a sentence ("a 3D printing kind of day"). */
const THEME_WORDS = { print: '3D printing', fabric: 'textiles', outfit: 'fashion' }

const placeName = (id) => getWorkstation(id)?.name ?? getStation(id)?.name ?? WAYPOINT_INFO.find((w) => w.id === id)?.name ?? id
const between = ([min, max]) => min + Math.random() * (max - min)

/** Details thoughts can mention: today's project, who's making it, the newest creation… */
export function thoughtContext(job, extra = {}) {
  const state = useMaking.getState()
  const day = state.day
  const maker = day?.tasks.find((t) => t.job === 'make')
  return {
    project: day?.title,
    theme: day ? THEME_WORDS[day.design.kind] : undefined,
    maker: maker ? nameOf(maker.who) : undefined,
    last: galleryPieces(state, 1)[0]?.title,
    place: job ? placeName(job.at) : undefined,
    cargo: job?.activity?.split(' ').slice(1).join(' '),
    ...extra,
  }
}

export function withMaking(base, entity, kind) {
  const { id } = entity
  const b = entity.behaviour ?? {}
  const contribute = () => useMaking.getState().contribute(id)

  function characterTurn(job, { currentStationId, lastAction }) {
    // Arrived somewhere for a break: look around (and think about it) before going back.
    if (lastAction?.onBreak) {
      return {
        type: 'idle',
        seconds: 3 + Math.random() * 3,
        status: `Having a little break at the ${placeName(currentStationId)}`,
        thought: thoughtFor(id, 'arrive', thoughtContext(job, { stationId: currentStationId, place: placeName(currentStationId) })),
      }
    }
    if (lastAction?.type === 'work') {
      contribute()
      if (Math.random() < (b.breakChance ?? 0.12)) return takeBreak(job, currentStationId)
    }
    if (currentStationId !== job.at) {
      return {
        type: 'walkTo',
        stationId: job.at,
        side: job.job === 'help' ? 1.4 : 0, // helpers stand beside the builder
        status: `Off to work: ${lower(job.activity)}`,
        thought: thoughtFor(id, 'walkToWork', thoughtContext(job)),
      }
    }
    if (lastAction?.type === 'work' && Math.random() < (b.chatty ?? 0.3)) return { type: 'say', text: pick(job.lines), seconds: 3.5 }
    const situation = job.job === 'gather' ? 'make' : job.job
    return {
      type: 'work',
      seconds: between(b.workSeconds ?? [7, 11]),
      status: job.activity,
      thought: thoughtFor(id, situation, thoughtContext(job)),
    }
  }

  function takeBreak(job, currentStationId) {
    const favourites = (b.favourites ?? BREAK_PLACES).filter((s) => s !== currentStationId)
    const stationId = pick(favourites.length ? favourites : BREAK_PLACES)
    return {
      type: 'walkTo',
      stationId,
      onBreak: true,
      status: 'Taking a short break',
      thought: thoughtFor(id, 'break', thoughtContext(job, { place: placeName(stationId) })),
    }
  }

  function shipTurn(job, { atDock, currentWaypointId, lastAction }) {
    const ctx = thoughtContext(job, { place: placeName(job.at) })
    const sailOut = () => ({ type: 'sailTo', waypointId: job.at, status: job.activity, thought: thoughtFor(id, 'sailOut', ctx) })
    if (lastAction?.type === 'dock') {
      if (!lastAction.moored) contribute() // a delivery!
      return sailOut()
    }
    if (!atDock && currentWaypointId === job.at) {
      if (lastAction?.type === 'sailTo') {
        return Math.random() < (b.chatty ?? 0.35)
          ? { type: 'say', text: pick(job.lines), seconds: 3 }
          : { type: 'idle', seconds: 3 + Math.random() * 2, status: 'Loading cargo', thought: thoughtFor(id, 'loading', ctx) }
      }
      return {
        type: 'dock',
        seconds: 5,
        status: 'Bringing the cargo home',
        arrivedStatus: 'Unloading at the harbour',
        thought: thoughtFor(id, 'delivering', ctx),
      }
    }
    return sailOut()
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
