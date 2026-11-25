import { create } from 'zustand'

const speechTimers = {}

const VOICE_KEY = 'ai-world-voice'
const savedVoice = () => {
  try {
    return localStorage.getItem(VOICE_KEY) === 'on'
  } catch {
    return false
  }
}

const LOOK_KEY = 'ai-world-look'
const savedLook = () => {
  try {
    return localStorage.getItem(LOOK_KEY) || 'default'
  } catch {
    return 'default'
  }
}

/**
 * Shared app state: what's hovered or selected (followed), speech bubbles and status.
 * A thing is referred to as { type: 'station' | 'agent' | 'ship' | 'log', id }.
 * Selecting a character or ship makes the camera follow it.
 */
export const useWorld = create((set) => ({
  ready: false,
  hovered: null,
  selected: null,
  speech: {}, // id -> text shown in a speech bubble above their head
  thoughts: {}, // id -> text shown in a thought bubble
  mindLog: {}, // id -> their last few thoughts and sayings, newest first
  status: {}, // id -> what they're doing now, e.g. "Sailing to North"
  look: savedLook(), // id of the current look, see src/looks/looks.js
  voice: savedVoice(), // read out the followed character's thoughts (browser speech)

  setLook: (look) => {
    try {
      localStorage.setItem(LOOK_KEY, look)
    } catch {}
    set({ look })
  },

  setVoice: (voice) => {
    try {
      localStorage.setItem(VOICE_KEY, voice ? 'on' : 'off')
    } catch {}
    set({ voice })
  },

  setReady: () => set({ ready: true }),
  setStatus: (id, text) => set((s) => (s.status[id] === text ? s : { status: { ...s.status, [id]: text } })),
  setHovered: (hovered) => set({ hovered }),
  select: (selected) => set({ selected }),
  clearSelection: () => set({ selected: null }),

  say: (id, text, seconds = 4) => {
    clearTimeout(speechTimers[id])
    set((s) => ({ speech: { ...s.speech, [id]: text }, ...remember(s, id, 'said', text) }))
    speechTimers[id] = setTimeout(() => {
      set((s) => {
        const speech = { ...s.speech }
        delete speech[id]
        return { speech }
      })
    }, seconds * 1000)
  },

  /** A thought, shown in a thought bubble (speech takes priority if both happen). */
  think: (id, text, seconds = 5) => {
    clearTimeout(thoughtTimers[id])
    set((s) => ({ thoughts: { ...s.thoughts, [id]: text }, ...remember(s, id, 'thought', text) }))
    thoughtTimers[id] = setTimeout(() => {
      set((s) => {
        const thoughts = { ...s.thoughts }
        delete thoughts[id]
        return { thoughts }
      })
    }, seconds * 1000)
  },
}))

const thoughtTimers = {}
const MIND_LOG_SIZE = 12

/** Keep someone's last few thoughts and sayings, newest first. */
function remember(s, id, kind, text) {
  const list = [{ kind, text, at: Date.now() }, ...(s.mindLog[id] ?? [])].slice(0, MIND_LOG_SIZE)
  return { mindLog: { ...s.mindLog, [id]: list } }
}

// Handy for poking at the world from the browser console while developing.
if (import.meta.env.DEV) window.__world = useWorld

export const isThing = (thing, type, id) => thing?.type === type && thing.id === id
