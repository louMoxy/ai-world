import path from 'node:path'
import { jsonFile } from './jsonFile.js'
import { createBudget } from './budget.js'
import { planDay } from './planner.js'
import { EMPTY_STATE, CAST_IDS, dateKey, addDays, needsNewDay, startDay, addWork, isState } from '../src/making/days.js'

const MAX_BODY = 2_000_000 // bytes

/**
 * The island's small server. It runs inside the Vite dev server (see vite.config.js), so
 * `npm run dev` starts everything. It owns the making days: they're saved in
 * data/making.json, and the server decides when a new day starts.
 *
 *   GET  /api/making           today's state (starts a new day first if the date changed)
 *   POST /api/making/work      { who, amount? }  someone finished a job
 *   POST /api/making/import    { state }  one-time move of days saved in a browser
 *   POST /api/making/next-day  testing only: end today, start the next day
 *   GET  /api/status           where days are saved, and the AI connection and budget
 *
 * The API key (stage 3) is read from .env here, on the server. It never reaches the browser.
 */
export function makingApi({ dataDir, env = {}, dev = false }) {
  const store = jsonFile(path.join(dataDir, 'making.json'), null)
  const budget = createBudget(path.join(dataDir, 'spend.json'), Number(env.DAILY_AI_BUDGET_USD ?? 0.5))
  let state = null
  let rolling = null // a new day being planned (so two requests don't start two days)

  const save = (next) => {
    state = next
    store.write(state)
    return state
  }

  /** Today's state, starting a new day first when it's needed. */
  async function current() {
    if (!state) {
      const saved = store.read()
      state = isState(saved) ? saved : null
    }
    if (state && !needsNewDay(state)) return state
    rolling ??= (async () => {
      const base = state ?? EMPTY_STATE
      const date = dateKey()
      const plan = await planDay({ seq: base.seq, history: base.history, date }, { budget, env })
      save(startDay(base, date, plan))
    })().finally(() => (rolling = null))
    await rolling
    return state
  }

  const routes = {
    'GET /api/making': async () => [200, { ...(await current()), storage: 'server' }],

    'POST /api/making/work': async (body) => {
      const { who, amount = 1 } = body
      const testing = dev && who === 'dev'
      if (!CAST_IDS.includes(who) && !testing) return [400, { error: `Unknown worker "${who}"` }]
      if (!Number.isInteger(amount) || amount < 1 || amount > (testing ? 30 : 1)) return [400, { error: 'Bad amount' }]
      return [200, save(addWork(await current(), who, amount))]
    },

    'POST /api/making/import': async (body) => {
      const now = await current()
      const untouched = now.history.length === 0 && now.day?.done === 0
      if (!untouched) return [409, { error: 'The server already has days; nothing was imported.' }]
      if (!isState(body.state) || !body.state.day) return [400, { error: 'Not a saved island' }]
      save(body.state)
      return [200, await current()] // rolls over if the imported day is from an earlier date
    },

    'POST /api/making/next-day': async () => {
      if (!dev) return [403, { error: 'Only available while developing' }]
      const base = await current()
      const date = base.day ? addDays(base.day.date, 1) : dateKey()
      const plan = await planDay({ seq: base.seq, history: base.history, date }, { budget, env })
      return [200, save(startDay(base, date, plan))]
    },

    'GET /api/status': async () => [
      200,
      {
        storage: path.relative(process.cwd(), store.file),
        ai: {
          connected: false, // stage 3
          keySet: Boolean(env.ANTHROPIC_API_KEY),
          dailyBudgetUsd: budget.dailyLimitUsd,
          spentTodayUsd: budget.spentOn(dateKey()),
        },
      },
    ],
  }

  return async function handle(req, res, next) {
    if (!req.url.startsWith('/api/')) return next()
    const { pathname } = new URL(req.url, 'http://island')
    const route = routes[`${req.method} ${pathname}`]
    try {
      if (!route) return send(res, 404, { error: 'Not found' })
      const body = req.method === 'POST' ? await readJson(req) : {}
      const [status, data] = await route(body)
      send(res, status, data)
    } catch (e) {
      console.error('[island]', e)
      send(res, e.status ?? 500, { error: e.status ? e.message : 'Server error' })
    }
  }
}

function send(res, status, data) {
  res.statusCode = status
  res.setHeader('Content-Type', 'application/json')
  res.setHeader('Cache-Control', 'no-store')
  res.end(JSON.stringify(data))
}

function readJson(req) {
  return new Promise((resolve, reject) => {
    let size = 0
    const chunks = []
    req.on('data', (c) => {
      size += c.length
      if (size > MAX_BODY) {
        reject(Object.assign(new Error('Request too large'), { status: 413 }))
        req.destroy()
      } else chunks.push(c)
    })
    req.on('end', () => {
      try {
        resolve(chunks.length ? JSON.parse(Buffer.concat(chunks).toString('utf8')) : {})
      } catch {
        reject(Object.assign(new Error('Invalid JSON'), { status: 400 }))
      }
    })
    req.on('error', reject)
  })
}
