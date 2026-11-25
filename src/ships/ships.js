/**
 * The ships around the island. Each has its own brain (see src/brains), its own berth at
 * the harbour (0–2), and a personality like the characters (see src/agents/agents.js).
 * start is a waypoint id, or 'dock' to begin moored.
 */
export const SHIPS = [
  {
    id: 'gull',
    name: 'Gull',
    role: 'Sailboat · fetches materials',
    variant: 'sail',
    color: '#e63946',
    berth: 0,
    start: 'dock',
    personality: 'A cheerful, slightly dramatic old sailboat who loves the wind, chats to seagulls, and takes every delivery very seriously.',
    likes: ['a good breeze', 'seagulls', 'coming home'],
    dislikes: ['flat calm', 'soggy cargo'],
    behaviour: { thinky: 0.6 },
    voice: { pitch: 0.7, rate: 0.9, prefer: ['george', 'thomas', 'guy', 'fred', 'alex', 'male'] },
    lines: ['Fair winds today!', 'Land ho!', 'The island looks lovely from out here.', 'Trimming the sails…'],
    thoughts: {
      sailOut: [
        'Wind’s in my sails and the sea’s in a good mood!',
        'Off to the {place} waters, where the good {cargo} is.',
        'Hold on to your hats, little waves!',
        'Do they thank the boat? They do not thank the boat.',
      ],
      loading: [
        'Easy does it… don’t drop it overboard.',
        'That’s the lot! Heavier than it looks.',
        'More {cargo}? What are they doing with it all? Eating it?',
      ],
      delivering: [
        'Special delivery for the makers!',
        'Home to the harbour, nice and steady.',
        'Make way! Important boat coming through! The only boat, but still.',
      ],
      offDuty: [
        'Not a cloud worth worrying about.',
        'Those seagulls think I’m one of them. I don’t correct them.',
        'Just me, the sea and the sky.',
        'Pip says I “basically float”. Rude. Accurate, but rude.',
      ],
      sketchDone: ['Sounds like the drawing’s done. They’ll need more {cargo}!'],
      finished: ['They finished {project}! I carried some of that, you know.', 'Lovely work, everyone. Especially the boat. I’m the boat.'],
      newDay: ['A new day on the water. What shall I fetch today?', 'Morning, island! Morning, seagulls! Morning, sea!'],
    },
  },
]

export const getShip = (id) => SHIPS.find((s) => s.id === id)
