/**
 * Saving days in this browser (localStorage). Only used when there's no server, for
 * example if the site is hosted as plain files. Normally the server saves the days in
 * data/making.json. Days saved here before the server existed are moved to it once.
 */
const KEY = 'ai-world-making-v1'

export function loadMaking() {
  try {
    const raw = localStorage.getItem(KEY)
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

export function saveMaking(state) {
  try {
    localStorage.setItem(KEY, JSON.stringify(state))
  } catch {
    // Storage can be full or blocked (private windows). The day still runs, it just won't be kept.
  }
}

export function forgetMaking() {
  try {
    localStorage.removeItem(KEY)
  } catch {
    // Nothing to do.
  }
}
