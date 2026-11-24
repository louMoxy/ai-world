/**
 * The characters who live on the island. Each one has a "brain" (see ./brains)
 * that decides what they do. For now the brains are simple scripts; later each
 * can be swapped for one backed by a real AI model.
 */
export const AGENTS = [
  {
    id: 'nova',
    name: 'Nova',
    role: 'Curious explorer',
    color: '#ff7a59',
    start: [4, 4],
    greeting: "Hi! I'm Nova. I wander the island looking at everything.",
    lines: [
      'Ooh, what is the {station} for?',
      'I love the view from here.',
      'Did that crystal just flicker?',
      'Race you to the next station!',
    ],
  },
  {
    id: 'pip',
    name: 'Pip',
    role: 'Tinkerer',
    color: '#3fb8e6',
    start: [-4, 3],
    greeting: "Pip here. I like fixing things. Got something that needs building?",
    lines: [
      'The {station} needs a few tweaks.',
      'Hmm, where did I leave my wrench?',
      'Someday a real model will live in this crystal.',
      'Beep boop. Just kidding.',
    ],
  },
  {
    id: 'sage',
    name: 'Sage',
    role: 'Quiet thinker',
    color: '#9b6bdf',
    start: [3, -5],
    greeting: 'Hello. I am Sage. I mostly sit and think.',
    lines: [
      'The {station} is peaceful today.',
      'Every station is a question waiting for an answer.',
      'Listen... the waves.',
      'Thinking...',
    ],
  },
]

export const getAgent = (id) => AGENTS.find((a) => a.id === id)
