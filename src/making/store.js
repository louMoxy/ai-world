import { create } from 'zustand'
import { THEMES } from './designs'
import { loadMaking, saveMaking, forgetMaking } from './storage'
import { SKETCH_SHARE, EMPTY_STATE, nameOf, dateKey, addDays, samplePlan, needsNewDay, startDay, addWork, addVisit, catchUp, isState } from './days'

export { NEEDED, SKETCH_SHARE, nameOf } from './days'

/**
 * The making day in the browser: today's challenge, how far along it is, and the log.
 *
 * The server (server/makingApi.js) owns the days and saves them in data/making.json.
 * This store asks it for the day, shows each finished job straight away, and tells the
 * server about it. If there's no server (the site hosted as plain files), the same
 * rules from days.js run here and the days are saved in this browser instead.
 *
 * ONLINE (the published site, built with `npm run build:online`): there's no server. The
 * page reads island.json, a copy of data/making.json published each morning, and follows
 * the island clock (catchUp in days.js), so every visitor sees the same island. Nothing a
 * visitor's browser does is saved.
 */

export const ONLINE = import.meta.env.MODE === 'online'
const REFETCH_EVERY_MS = 10 * 60_000 // online: look for a newly published day

const SYNC_EVERY_MS = 60_000 // picks up a new day at midnight, and work from other tabs

async function api(path, body) {
  const res = await fetch(path, body === undefined ? undefined : { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw Object.assign(new Error(data.error ?? `Request failed (${res.status})`), { status: res.status })
  return data
}

const pick = ({ day, history, seq }) => ({ day, history, seq })

export const useMaking = create((set, get) => ({
  ready: false,
  storage: null, // 'server' or 'browser'
  day: null, // today's challenge
  history: [], // every earlier day, oldest first
  seq: 0, // how many days have been created

  async start() {
    if (ONLINE) {
      const state = await fetchPublished()
      set({ ...pick(catchUp(state ?? EMPTY_STATE)), storage: 'online', ready: true, fetchedAt: Date.now() })
      setInterval(() => get().sync(), SYNC_EVERY_MS)
      return
    }
    try {
      let state = await api('/api/making')
      state = await moveBrowserDaysToServer(state)
      set({ ...pick(state), storage: 'server', ready: true })
    } catch (e) {
      console.warn('[island] No server, so days are kept in this browser.', e.message)
      let state = loadMaking()
      if (!isState(state)) state = EMPTY_STATE
      if (needsNewDay(state)) state = startDay(state, dateKey(), samplePlan(state.seq))
      saveMaking(pick(state))
      set({ ...pick(state), storage: 'browser', ready: true })
    }
    setInterval(() => get().sync(), SYNC_EVERY_MS)
  },

  /** Catch up with the server (or roll over to a new day in browser mode). */
  async sync() {
    const { storage } = get()
    if (storage === 'online') {
      const before = pick(get())
      let state = before
      if (Date.now() - get().fetchedAt > REFETCH_EVERY_MS) {
        state = (await fetchPublished()) ?? before
        set({ fetchedAt: Date.now() })
      }
      const next = catchUp(state)
      if (next !== before) set(pick(next))
      return
    }
    if (storage === 'server') {
      try {
        set(pick(await api('/api/making')))
      } catch {
        // Try again next time.
      }
    } else if (storage === 'browser') {
      const state = needsNewDay(get()) ? startDay(get(), dateKey(), samplePlan(get().seq)) : catchUp(get())
      if (state === get()) return
      saveMaking(pick(state))
      set(pick(state))
    }
  },

  /** Someone finished a job for today's challenge. */
  contribute(who, amount = 1) {
    if (ONLINE) return // online, the clock does the work
    const before = get()
    const after = addWork(before, who, amount)
    if (after === before) return
    set({ day: after.day }) // show it straight away
    if (before.storage === 'server') {
      api('/api/making/work', { who, amount })
        .then((state) => set(pick(state)))
        .catch((e) => console.warn('[island] Could not save work:', e.message))
    } else {
      saveMaking(pick(get()))
    }
  },

  /** Someone came by a place (see addVisit in days.js). */
  visit(who, place, kind, note) {
    if (ONLINE) return
    const before = get()
    const after = addVisit(before, { who, place, kind, note })
    if (after === before) return
    set({ day: after.day })
    if (before.storage === 'server') {
      api('/api/making/visit', { who, place, kind, ...(note ? { note } : {}) }).catch((e) =>
        console.warn('[island] Could not save a visit:', e.message),
      )
    } else {
      saveMaking(pick(get()))
    }
  },

  /** For testing: end today and start the next day straight away. */
  async nextDay() {
    if (get().storage === 'server') {
      set(pick(await api('/api/making/next-day', {})))
    } else {
      const s = get()
      const state = startDay(s, s.day ? addDays(s.day.date, 1) : dateKey(), samplePlan(s.seq))
      saveMaking(pick(state))
      set(pick(state))
    }
  },
}))

/** The published island (online only). */
async function fetchPublished() {
  try {
    const res = await fetch(`${import.meta.env.BASE_URL}island.json`, { cache: 'no-cache' })
    const state = await res.json()
    return isState(state) ? pick(state) : null
  } catch (e) {
    console.warn('[island] Could not load the island:', e.message)
    return null
  }
}

/** Days saved in this browser before the server existed move to the server, once. */
async function moveBrowserDaysToServer(serverState) {
  const local = loadMaking()
  const serverIsNew = serverState.history.length === 0 && serverState.day?.done === 0
  const localHasWork = isState(local) && local.day && (local.history.length > 0 || local.day.done > 0)
  if (!serverIsNew || !localHasWork) return serverState
  try {
    const moved = await api('/api/making/import', { state: pick(local) })
    forgetMaking()
    console.info('[island] Moved the days saved in this browser to the server.')
    return moved
  } catch (e) {
    console.warn('[island] Could not move browser days to the server:', e.message)
    return serverState
  }
}

if (import.meta.env.DEV) window.__making = useMaking

// ---------- Selectors ----------

/** Today's job for a character or ship, or null when there's nothing to do. */
export function getJob(id) {
  const { day } = useMaking.getState()
  if (!day || day.status !== 'active') return null
  return day.tasks.find((t) => t.who === id) ?? null
}

export const progressOf = (day) => (day ? day.done / day.needed : 0)
export const sketchProgress = (day) => Math.min(1, progressOf(day) / SKETCH_SHARE)
export const makeProgress = (day) => Math.max(0, Math.min(1, (progressOf(day) - SKETCH_SHARE) / (1 - SKETCH_SHARE)))

/**
 * What someone is doing for today's challenge right now. While the sketch is being drawn,
 * builders show their prep step; once it's done, the sketcher goes to help the builder.
 */
export function jobNow(id) {
  const job = getJob(id)
  if (!job) return null
  const day = useMaking.getState().day
  const sketched = sketchProgress(day) >= 1
  if (job.job === 'sketch' && sketched) {
    const maker = day.tasks.find((t) => t.job === 'make')
    if (maker) {
      const making = THEMES[day.design.kind].making.toLowerCase()
      return { ...job, job: 'help', at: maker.at, activity: `Helping ${nameOf(maker.who)} with the ${making}`, lines: maker.lines }
    }
  }
  if (job.prep && !sketched) return { ...job, activity: job.prep }
  return job
}

/** Every day, oldest first (today last). */
export const allDays = (s) => (s.day ? [...s.history, s.day] : s.history)

/** The newest finished creations, for the Gallery. */
export const galleryPieces = (s, max = 8) =>
  allDays(s)
    .filter((d) => d.status === 'finished')
    .slice(-max)
    .reverse()

/** The outfit a character wears: the newest finished outfit made for them. */
export const wornOutfit = (s, agentId) =>
  [...allDays(s)].reverse().find((d) => d.status === 'finished' && d.design.kind === 'outfit' && d.design.wearer === agentId)?.design ??
  null
