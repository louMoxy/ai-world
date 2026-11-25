/**
 * Publish the island: npm run island:publish
 *
 * The daily AI task runs this after writing its plan and reports. It
 *   1. brings data/making.json up to date (starts today's day with the AI's plan, adds
 *      reports, catches up with the clock) using the same rules as the server;
 *   2. commits the data folder;
 *   3. pushes to GitHub, where a workflow rebuilds the online site (.github/workflows).
 *
 *   --no-git   only update the file (for testing)
 */
import { execFileSync } from 'node:child_process'
import path from 'node:path'
import { runnerImport } from 'vite'

const root = path.resolve(import.meta.dirname, '..')
const load = async (file) => (await runnerImport(path.join(root, file))).module
const [{ bringUpToDate }, { aiInbox }, { jsonFile }, { isState, dateKey, EMPTY_STATE }] = await Promise.all([
  load('server/island.js'),
  load('server/inbox.js'),
  load('server/jsonFile.js'),
  load('src/making/days.js'),
])

const dataDir = path.join(root, 'data')
const store = jsonFile(path.join(dataDir, 'making.json'), null)
const saved = store.read()
const before = isState(saved) ? saved : EMPTY_STATE
const state = await bringUpToDate(isState(saved) ? saved : null, aiInbox(dataDir))
if (state !== before) store.write(state)

const day = state.day
console.log(`Island for ${dateKey()}: Day ${day.number}, "${day.title}" (planned by ${day.plannedBy ?? "a sample"}), ${Math.round((day.done / day.needed) * 100)}% done.`)

if (process.argv.includes('--no-git')) process.exit(0)

const git = (...args) => execFileSync('git', args, { cwd: root, encoding: 'utf8' }).trim()
git('add', 'data')
const staged = git('diff', '--cached', '--name-only')
if (staged) {
  git('commit', '-m', `Island update for ${dateKey()}: ${day.title}`)
  console.log('Committed the island data.')
} else {
  console.log('Nothing new to commit.')
}

const remote = git('remote')
if (!remote.split('\n').includes('origin')) {
  console.log('No GitHub remote ("origin") yet, so nothing was pushed. The online site will not update.')
  process.exit(0)
}
try {
  git('push', 'origin', 'HEAD')
  console.log('Pushed to GitHub. The online site updates in a minute or two.')
} catch (e) {
  console.error('Could not push to GitHub:', e.stderr || e.message)
  process.exit(1)
}
