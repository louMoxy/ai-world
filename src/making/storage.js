/**
 * Where the making days are saved. Stage 1 keeps them in this browser's localStorage, so
 * they survive reloads but live only in this browser. Stage 2 moves them to a file on the
 * server, behind these same two functions.
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
