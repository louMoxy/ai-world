import { create } from 'zustand'

const speechTimers = {}

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
  speech: {}, // id -> text shown in a bubble above their head
  status: {}, // id -> what they're doing now, e.g. "Sailing to North"
  look: savedLook(), // id of the current look, see src/looks/looks.js

  setLook: (look) => {
    try {
      localStorage.setItem(LOOK_KEY, look)
    } catch {}
    set({ look })
  },

  setReady: () => set({ ready: true }),
  setStatus: (id, text) => set((s) => (s.status[id] === text ? s : { status: { ...s.status, [id]: text } })),
  setHovered: (hovered) => set({ hovered }),
  select: (selected) => set({ selected }),
  clearSelection: () => set({ selected: null }),

  say: (agentId, text, seconds = 4) => {
    clearTimeout(speechTimers[agentId])
    set((s) => ({ speech: { ...s.speech, [agentId]: text } }))
    speechTimers[agentId] = setTimeout(() => {
      set((s) => {
        const speech = { ...s.speech }
        delete speech[agentId]
        return { speech }
      })
    }, seconds * 1000)
  },
}))

// Handy for poking at the world from the browser console while developing.
if (import.meta.env.DEV) window.__world = useWorld

export const isThing = (thing, type, id) => thing?.type === type && thing.id === id
