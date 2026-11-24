/**
 * The ships around the island. Each has its own brain (see src/brains) and its
 * own berth at the harbour. start is a waypoint id, or 'dock' to begin moored.
 */
export const SHIPS = [
  {
    id: 'gull',
    name: 'Gull',
    role: 'Sailboat',
    variant: 'sail',
    color: '#e63946',
    berth: 0,
    start: 'dock',
    greeting: 'Ahoy! The Gull at your service. Tell me where to sail: north, south-west, back to the dock…',
    lines: ['Fair winds today!', 'Land ho!', 'The island looks lovely from out here.', 'Trimming the sails…'],
  },
  {
    id: 'marlin',
    name: 'Marlin',
    role: 'Fishing boat',
    variant: 'motor',
    color: '#f4a261',
    berth: 1,
    start: 's',
    greeting: "Marlin here. Fishing's good today. Want me to head somewhere?",
    lines: ['Nets are full!', 'Smells like rain.', 'Spotted a big one!', 'Chug chug chug…'],
  },
  {
    id: 'drifter',
    name: 'Drifter',
    role: 'Explorer ship',
    variant: 'sail',
    color: '#2a9d8f',
    berth: 2,
    start: 'nw',
    greeting: "I'm the Drifter. I map the waters around the island. Where shall we go?",
    lines: ['Charting the coast…', 'Deep water here.', 'I wonder what lies beyond the fog.', 'Noting this spot on the map.'],
  },
]

export const getShip = (id) => SHIPS.find((s) => s.id === id)
