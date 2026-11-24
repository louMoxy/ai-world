/**
 * The ships around the island. Each has its own brain (see src/brains) and its
 * own berth at the harbour (0–2). start is a waypoint id, or 'dock' to begin moored.
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
    lines: ['Fair winds today!', 'Land ho!', 'The island looks lovely from out here.', 'Trimming the sails…'],
  },
]

export const getShip = (id) => SHIPS.find((s) => s.id === id)
