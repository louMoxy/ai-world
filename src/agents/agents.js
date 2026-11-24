/**
 * The characters who live on the island. Each one has a "brain" (see ../brains)
 * that decides what they do. For now the brains are simple scripts; later each
 * can be swapped for one backed by a real AI model.
 */
export const AGENTS = [
  {
    id: 'nova',
    name: 'Nova',
    role: 'Designer · loves colour',
    color: '#ff7a59',
    start: [4, 4],
    lines: [
      'Ooh, what is the {station} for?',
      'I love the view from here.',
      'Did that crystal just flicker?',
      'I have SO many ideas today.',
    ],
  },
  {
    id: 'pip',
    name: 'Pip',
    role: 'Maker · loves machines',
    color: '#3fb8e6',
    start: [-4, 3],
    lines: [
      'The {station} needs a few tweaks.',
      'Hmm, where did I leave my wrench?',
      'Someday a real model will live in this crystal.',
      'Beep boop. Just kidding.',
    ],
  },
]

export const getAgent = (id) => AGENTS.find((a) => a.id === id)

/** Retired characters, so old log entries still show their names. */
export const RETIRED_NAMES = { sage: 'Sage', marlin: 'Marlin', drifter: 'Drifter' }
