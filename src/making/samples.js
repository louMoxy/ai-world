/**
 * Hand-written days, used until the AI writes them (stage 3). They run in order and build
 * on each other: the fabric woven one day becomes the scarf sewn on a later day, and the
 * second lantern is an improved version of the first.
 *
 * A day plan: { theme, title, brief, notes, design, tasks }
 *   design may refer to earlier work with 'latest-fabric' or basedOn: 'latest-print'.
 *   tasks: one per character and ship. With two makers, one sketches and the other builds.
 *     job 'sketch' -> draws the design at the easel
 *     job 'make'   -> builds it at the printer, loom or mannequin
 *     job 'gather' -> works at a station (research, picking colours…), for a bigger crew
 *     job 'fetch'  -> a ship sails to a waypoint and brings materials back to the harbour
 *   activity is what they're shown doing; prep (optional) is shown while the sketch is drawn.
 *   addition (optional): something added to the island when the day is finished (see src/world/growth.js).
 */

const ship = (cargo) => ({
  who: 'gull',
  job: 'fetch',
  at: 'ne',
  activity: `Fetching ${cargo}`,
  lines: ['Cargo aboard!', 'Fair winds for deliveries.'],
})

export const SAMPLE_DAYS = [
  {
    theme: 'fabric',
    title: 'Sea-Glass Weave',
    brief: 'Weave a soft cloth in the colours of sea glass: greens and pale blues that look like the shallows at noon.',
    notes: ['Colours of the shallows at noon', 'Basket weave: soft but strong', 'Enough cloth for a scarf!'],
    design: { kind: 'fabric', name: 'Sea-Glass Weave', pattern: 'weave', colors: ['#2a9d8f', '#a8dadc', '#f1faee'], scale: 4 },
    tasks: [
      { who: 'nova', job: 'sketch', at: 'easel', activity: 'Sketching the weave pattern', lines: ['Over, under, over, under…', 'The sea has so many greens.'] },
      { who: 'pip', job: 'make', at: 'loom', activity: 'Weaving the cloth', prep: 'Threading the loom', lines: ['Clack, clack, clack!', 'Mind your fingers!'] },
      ship('sea-green dye'),
    ],
  },
  {
    theme: 'outfit',
    title: "Nova's Harbour Look",
    brief: 'Turn yesterday’s sea-glass cloth into a scarf for Nova, with a bright red beret for windy days at the harbour.',
    notes: ['Scarf from the Sea-Glass Weave', 'Red beret: easy to spot!', 'Tied loose for the sea breeze'],
    design: { kind: 'outfit', name: "Nova's Harbour Look", wearer: 'nova', hat: { style: 'beret', color: '#e63946' }, neck: { style: 'scarf', fabric: 'latest-fabric' } },
    tasks: [
      { who: 'nova', job: 'sketch', at: 'easel', activity: 'Designing her own outfit', lines: ['A little tilt on the beret…', 'Red and sea-green go well.'] },
      { who: 'pip', job: 'make', at: 'mannequin', activity: 'Sewing the scarf and beret', prep: 'Cutting the pattern', lines: ['Measure twice, cut once!', 'Nearly there…'] },
      ship('red felt'),
    ],
  },
  {
    theme: 'print',
    title: 'Harbour Lantern',
    brief: 'Print a lantern to light the harbour at night: a sturdy base, glass all round, and a red roof with a ring to hang it by.',
    notes: ['Glass on all four sides', 'Red roof, like the boats', 'Ring on top for hanging'],
    addition: { kind: 'lamp', near: 'gallery', color: '#ffd166' },
    design: {
      kind: 'print',
      name: 'Harbour Lantern',
      parts: [
        { shape: 'cylinder', radius: 0.7, height: 0.2, at: [0, 0.1, 0], color: '#3d405b' },
        { shape: 'torus', radius: 0.62, tube: 0.06, at: [0, 0.2, 0], rot: [90, 0, 0], color: '#e0a458' },
        { shape: 'box', size: [0.9, 1, 0.9], at: [0, 0.75, 0], color: '#ffe8a3' },
        { shape: 'box', size: [0.1, 1.05, 0.1], at: [0.45, 0.75, 0.45], color: '#3d405b' },
        { shape: 'box', size: [0.1, 1.05, 0.1], at: [-0.45, 0.75, 0.45], color: '#3d405b' },
        { shape: 'box', size: [0.1, 1.05, 0.1], at: [0.45, 0.75, -0.45], color: '#3d405b' },
        { shape: 'box', size: [0.1, 1.05, 0.1], at: [-0.45, 0.75, -0.45], color: '#3d405b' },
        { shape: 'box', size: [1.15, 0.12, 1.15], at: [0, 1.31, 0], color: '#3d405b' },
        { shape: 'cone', radius: 0.8, height: 0.6, at: [0, 1.67, 0], color: '#e63946' },
        { shape: 'sphere', radius: 0.1, at: [0, 1.98, 0], color: '#e0a458' },
        { shape: 'torus', radius: 0.25, tube: 0.05, at: [0, 2.3, 0], color: '#e0a458' },
      ],
    },
    tasks: [
      { who: 'nova', job: 'sketch', at: 'easel', activity: 'Sketching the lantern', lines: ['Should the roof be pointy? Yes.', 'A ring on top to hang it!'] },
      { who: 'pip', job: 'make', at: 'printer', activity: 'Printing the lantern', prep: 'Warming up the printer', lines: ['Layer by layer…', 'Nozzle is nice and hot.'] },
      ship('red filament'),
    ],
  },
  {
    theme: 'fabric',
    title: 'Sunset Stripes',
    brief: 'A bold striped cloth in sunset colours: orange, coral and gold, with a deep sea-blue stripe running through.',
    notes: ['Sunset over the west waypoint', 'Wide stripes, bold colours', 'Warm enough for a cape'],
    addition: { kind: 'bench', near: 'garden', color: '#e76f51' },
    design: { kind: 'fabric', name: 'Sunset Stripes', pattern: 'stripes', colors: ['#f4a261', '#e76f51', '#ffd166', '#264653'], scale: 3 },
    tasks: [
      { who: 'pip', job: 'sketch', at: 'easel', activity: 'Drawing the stripes', lines: ['More orange!', 'Rulers make straight stripes.'] },
      { who: 'nova', job: 'make', at: 'loom', activity: 'Weaving the stripes', prep: 'Winding the coloured thread', lines: ['Steady hands…', 'One stripe at a time.'] },
      ship('orange dye'),
    ],
  },
  {
    theme: 'outfit',
    title: "Pip's Workshop Cape",
    brief: 'A cape for Pip made from the sunset stripes, and a tall top hat to wear while inventing.',
    notes: ['Cape from the Sunset Stripes', 'Top hat for serious inventing', 'Short enough not to catch in the printer'],
    design: { kind: 'outfit', name: "Pip's Workshop Cape", wearer: 'pip', hat: { style: 'top', color: '#2b2d42' }, neck: { style: 'cape', fabric: 'latest-fabric' } },
    tasks: [
      { who: 'pip', job: 'sketch', at: 'easel', activity: 'Designing his own cape', lines: ['A swish of a cape…', 'Very inventive.'] },
      { who: 'nova', job: 'make', at: 'mannequin', activity: 'Sewing the cape', prep: 'Pinning the fabric', lines: ['Ouch, pins!', 'It flows so nicely.'] },
      ship('black felt'),
    ],
  },
  {
    theme: 'print',
    title: 'Lantern, Mark II',
    brief: 'Improve the Harbour Lantern: taller, with a second glass tier, a double roof and little golden feet.',
    notes: ['Based on the Harbour Lantern', 'Second glass tier for more light', 'Golden feet so it stands level'],
    basedOn: 'latest-print',
    design: {
      kind: 'print',
      name: 'Lantern, Mark II',
      parts: [
        { shape: 'sphere', radius: 0.12, at: [0.6, 0.12, 0], color: '#e9c46a' },
        { shape: 'sphere', radius: 0.12, at: [-0.3, 0.12, 0.52], color: '#e9c46a' },
        { shape: 'sphere', radius: 0.12, at: [-0.3, 0.12, -0.52], color: '#e9c46a' },
        { shape: 'cylinder', radius: 0.8, height: 0.2, at: [0, 0.3, 0], color: '#264653' },
        { shape: 'box', size: [1, 0.9, 1], at: [0, 0.85, 0], color: '#ffe8a3' },
        { shape: 'box', size: [0.1, 0.95, 0.1], at: [0.5, 0.85, 0.5], color: '#264653' },
        { shape: 'box', size: [0.1, 0.95, 0.1], at: [-0.5, 0.85, 0.5], color: '#264653' },
        { shape: 'box', size: [0.1, 0.95, 0.1], at: [0.5, 0.85, -0.5], color: '#264653' },
        { shape: 'box', size: [0.1, 0.95, 0.1], at: [-0.5, 0.85, -0.5], color: '#264653' },
        { shape: 'box', size: [1.2, 0.12, 1.2], at: [0, 1.36, 0], color: '#264653' },
        { shape: 'cylinder', radius: 0.35, height: 0.5, at: [0, 1.67, 0], color: '#ffd166' },
        { shape: 'cone', radius: 0.85, height: 0.45, at: [0, 2.12, 0], color: '#e76f51' },
        { shape: 'cone', radius: 0.45, height: 0.4, at: [0, 2.5, 0], color: '#e76f51' },
        { shape: 'sphere', radius: 0.1, at: [0, 2.75, 0], color: '#e9c46a' },
      ],
    },
    tasks: [
      { who: 'pip', job: 'sketch', at: 'easel', activity: 'Redesigning the lantern', lines: ['What if… two roofs?', 'Mark II will be brighter.'] },
      { who: 'nova', job: 'make', at: 'printer', activity: 'Printing Mark II', prep: 'Levelling the print bed', lines: ['Patience. Layer by layer.', 'It is taller than me!'] },
      ship('gold filament'),
    ],
  },
]
