import { HARBOUR_HUT, DOCK_ROTATION } from '../world/dock'

/**
 * The places on the island. Each one is a slot where an AI model can run later.
 * position is [x, z]; the height comes from the terrain.
 */
export const STATIONS = [
  {
    id: 'hub',
    name: 'The Spire',
    kind: 'spire',
    color: '#ffb703',
    position: [0, 0],
    description: 'The heart of the island. Characters pass through here on their way between stations.',
  },
  {
    id: 'observatory',
    name: 'Observatory',
    kind: 'dome',
    color: '#4cc9f0',
    position: [-12, 10],
    description: 'Up on the hill, looking out over everything. A good home for a model that watches and summarises.',
  },
  {
    id: 'library',
    name: 'Library',
    kind: 'house',
    color: '#e76f51',
    position: [14, 7],
    description: 'Shelves of knowledge. A natural place for a model that answers questions from documents.',
  },
  {
    id: 'workshop',
    name: 'Workshop',
    kind: 'tower',
    color: '#90be6d',
    position: [9, -13],
    description: 'Where things get built. Could host a model that writes code or makes images.',
  },
  {
    id: 'garden',
    name: 'Garden Gate',
    kind: 'arch',
    color: '#c77dff',
    position: [-12, -10],
    description: 'A calm spot by the shore. Maybe a model for ideas, stories or conversation.',
  },
  {
    id: 'gallery',
    name: 'Gallery',
    kind: 'gallery',
    color: '#f72585',
    position: [4, 16],
    description: 'Everything the island has made is shown here, newest first. Click a piece to open its page in the Island Log.',
  },
  {
    id: 'harbour',
    name: 'Harbour',
    kind: 'dock',
    color: '#277da1',
    position: [HARBOUR_HUT.x, HARBOUR_HUT.z],
    rotation: DOCK_ROTATION,
    description: 'Where the ships come home to moor. A good place for a model that plans routes and runs the fleet.',
  },
]

export const getStation = (id) => STATIONS.find((s) => s.id === id)
