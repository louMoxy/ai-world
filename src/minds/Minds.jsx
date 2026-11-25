import { useEffect } from 'react'
import { useWorld } from '../store'
import { useMaking, sketchProgress } from '../making/store'
import { thoughtContext } from '../making/makerBrain'
import { AGENTS } from '../agents/agents'
import { SHIPS } from '../ships/ships'
import { think, personOf, setDayThoughts } from './mind'

const EVERYONE = [...AGENTS, ...SHIPS].map((p) => p.id)

/** Everyone has a thought about it, one after another rather than all at once. */
function everyoneThinks(situation, delay = 0) {
  EVERYONE.forEach((id, i) => {
    setTimeout(() => {
      const task = useMaking.getState().day?.tasks.find((t) => t.who === id) ?? null
      think(id, situation, thoughtContext(task), { always: true })
    }, delay + i * 1800)
  })
}

/**
 * Reactions to the day: a thought from everyone when a new challenge starts, when the
 * sketch is finished, and when the creation is done. Also reads thoughts out loud for
 * whoever you're following, when "Hear thoughts" is on.
 */
export function Minds() {
  useDayReactions()
  useDayThoughts()
  useVoice()
  return null
}

function useDayReactions() {
  useEffect(() => {
    let previous = useMaking.getState()
    const fresh = (s) => s.day?.status === 'active' && s.day.done === 0
    if (previous.ready && fresh(previous)) everyoneThinks('newDay', 3000)
    return useMaking.subscribe((now) => {
      const before = previous
      previous = now
      if (!now.day) return
      if (!before.ready && now.ready) return fresh(now) && everyoneThinks('newDay', 3000)
      if (before.day && before.day.id !== now.day.id) return everyoneThinks('newDay', 1000)
      if (before.day?.id === now.day.id) {
        if (sketchProgress(before.day) < 1 && sketchProgress(now.day) >= 1) everyoneThinks('sketchDone', 500)
        if (before.day.status === 'active' && now.day.status === 'finished') everyoneThinks('finished', 5000)
      }
    })
  }, [])
}

/** Keep today's AI-written thoughts (if any) in the thought engine. */
function useDayThoughts() {
  useEffect(() => {
    setDayThoughts(useMaking.getState().day?.thoughts)
    return useMaking.subscribe((s) => setDayThoughts(s.day?.thoughts))
  }, [])
}

// ---------- Voice ----------

const canSpeak = typeof window !== 'undefined' && 'speechSynthesis' in window

const chosenVoices = new Map() // id -> voice, so each keeps the same one

/**
 * Pick a browser voice that suits the character (by name hints), in English if possible,
 * and different from everyone else's while there are enough voices to go round.
 * Which voices exist depends on the computer and browser.
 */
function voiceFor(id, prefer = []) {
  if (chosenVoices.has(id)) return chosenVoices.get(id)
  const voices = window.speechSynthesis.getVoices()
  if (!voices.length) return null // not loaded yet; try again next time
  const english = voices.filter((v) => v.lang?.toLowerCase().startsWith('en'))
  const pool = english.length ? english : voices
  const taken = new Set(chosenVoices.values())
  const free = pool.filter((v) => !taken.has(v))
  const byHint = (list) => prefer.map((hint) => list.find((v) => v.name.toLowerCase().includes(hint))).find(Boolean)
  const voice = byHint(free) ?? byHint(pool) ?? free[0] ?? pool[0]
  chosenVoices.set(id, voice)
  return voice
}

export function speak(id, text) {
  if (!canSpeak || !text) return
  const person = personOf(id)
  const say = new SpeechSynthesisUtterance(text)
  say.pitch = person?.voice?.pitch ?? 1
  say.rate = person?.voice?.rate ?? 1
  say.voice = voiceFor(id, person?.voice?.prefer)
  window.speechSynthesis.cancel() // only the newest thought
  window.speechSynthesis.speak(say)
}

export const voiceAvailable = canSpeak

function useVoice() {
  useEffect(() => {
    if (!canSpeak) return
    window.speechSynthesis.getVoices() // starts loading the voice list
    let lastSpoken = null
    const stop = useWorld.subscribe((s) => {
      const sel = s.selected
      const following = sel && (sel.type === 'agent' || sel.type === 'ship') ? sel.id : null
      if (!s.voice || !following) {
        if (lastSpoken) window.speechSynthesis.cancel()
        lastSpoken = null
        return
      }
      const newest = s.mindLog[following]?.[0]
      if (newest && newest !== lastSpoken && Date.now() - newest.at < 2000) {
        lastSpoken = newest
        speak(following, newest.text)
      }
    })
    return () => {
      stop()
      window.speechSynthesis.cancel()
    }
  }, [])
}
