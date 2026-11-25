import { HARBOUR_HUT, DOCK_ROTATION } from '../world/dock'

/**
 * The places on the island. Clicking one shows its history: what was made there and who
 * came by (see src/stations/history.js).
 * position is [x, z]; the height comes from the terrain.
 */
export const STATIONS = [
  {
    id: 'hub',
    name: 'The Spire',
    kind: 'spire',
    color: '#ffb703',
    position: [0, 0],
    description: 'The heart of the island. Everyone passes through on the way to somewhere else, and most of the bunting starts here.',
  },
  {
    id: 'observatory',
    name: 'Observatory',
    kind: 'dome',
    color: '#4cc9f0',
    position: [-12, 10],
    description: 'Up on the hill, looking out over everything. The best view on the island, and the quietest spot for a break.',
  },
  {
    id: 'library',
    name: 'Library',
    kind: 'house',
    color: '#e76f51',
    position: [14, 7],
    description: 'Shelves of books and a sunny porch. The easel stands outside, where every design starts as a sketch.',
  },
  {
    id: 'workshop',
    name: 'Workshop',
    kind: 'tower',
    color: '#90be6d',
    position: [9, -13],
    description: 'Where things get built. The 3D printer and the mannequin live here, and so does Pip, most days.',
  },
  {
    id: 'garden',
    name: 'Garden Gate',
    kind: 'arch',
    color: '#c77dff',
    position: [-12, -10],
    description: 'A calm spot by the shore, with the loom beside it. Every fabric on the island was woven here.',
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
    description: 'Where the Gull comes home to moor and unload. Printed pieces stand along the pier.',
  },
]

export const getStation = (id) => STATIONS.find((s) => s.id === id)
