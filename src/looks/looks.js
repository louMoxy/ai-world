/**
 * Looks: presets that change how the whole world is drawn.
 *
 * A look has three parts:
 * - mood:      sky, fog, light and water colours (cheap, just numbers)
 * - materials: 'standard' (as built), 'toon' (cartoon shading on every surface) or
 *              'vision' (everything black except AI entities), see MaterialSwap.jsx
 * - effects:   full-screen filters drawn after the scene (see LookEffects.jsx)
 *
 * To add a look, add an entry here. If it needs a new filter, add it to LookEffects.jsx.
 */

const DAY_MOOD = {
  skyTop: '#4fa9ea',
  skyBottom: '#cfe9f7',
  stars: 0,
  fog: '#cfe9f7',
  fogNear: 80,
  fogFar: 220,
  hemiSky: '#eaf6ff',
  hemiGround: '#6b5a3e',
  hemiIntensity: 1.15,
  sunColor: '#fff2dc',
  sunIntensity: 2.4,
  sunPosition: [30, 45, 20],
  water: '#3aa6d8',
  clouds: '#ffffff',
}

export const LOOKS = [
  {
    id: 'default',
    name: 'Default',
    description: 'Bright low-poly daylight',
    mood: DAY_MOOD,
    materials: 'standard',
    effects: [],
  },
  {
    id: 'toon',
    name: 'Toon',
    description: 'Cartoon shading with ink outlines',
    mood: { ...DAY_MOOD, skyTop: '#3d9be9', hemiIntensity: 1.4, sunIntensity: 2.2, water: '#2f9fe0' },
    materials: 'toon',
    effects: ['outline'],
  },
  {
    id: 'night',
    name: 'Night',
    description: 'Moonlight, stars and glowing lamps',
    mood: {
      skyTop: '#060b1f',
      skyBottom: '#1b2a4a',
      stars: 1,
      fog: '#1b2a4a',
      fogNear: 60,
      fogFar: 190,
      hemiSky: '#5a72b0',
      hemiGround: '#1a1626',
      hemiIntensity: 0.7,
      sunColor: '#a9c1ff',
      sunIntensity: 1.2,
      sunPosition: [-30, 40, -25],
      water: '#14365a',
      clouds: '#4a5878',
    },
    materials: 'standard',
    effects: ['bloom'],
  },
  {
    id: 'pixel',
    name: 'Pixel',
    description: 'Chunky pixels and a retro palette',
    mood: { ...DAY_MOOD, skyTop: '#3b8fe0' },
    materials: 'standard',
    effects: ['pixel'],
  },
  {
    id: 'blueprint',
    name: 'Blueprint',
    description: 'A technical drawing of the island',
    // The filter repaints everything, so the mood just needs even, shadow-light lighting.
    mood: { ...DAY_MOOD, fogNear: 200, fogFar: 400, hemiIntensity: 1.6, sunIntensity: 1.4 },
    materials: 'standard',
    effects: ['blueprint'],
  },
  {
    id: 'vision',
    name: 'AI Vision',
    description: 'The world as the AI sees it: heat, contours and glowing AI',
    // Black sky, so only the AI entities feed the glow.
    mood: { ...DAY_MOOD, skyTop: '#000000', skyBottom: '#000000', fog: '#000000' },
    materials: 'vision',
    effects: ['vision', 'glow'],
  },
]

export const getLook = (id) => LOOKS.find((l) => l.id === id) ?? LOOKS[0]
