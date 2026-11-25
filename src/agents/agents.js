/**
 * The characters who live on the island. Each one has a "brain" (see ../brains) that
 * decides what they do, and a personality that shapes how they do it.
 *
 *   personality  who they are, in a sentence (shown when you follow them)
 *   behaviour    how their personality shows in what they do:
 *                speed (walking), workSeconds [min, max] per turn, breakChance after a
 *                turn, chatty (chance to say something out loud), thinky (chance to have
 *                a thought), favourites (where they like to go on breaks)
 *   voice        how they sound when "Hear thoughts" is on (browser speech)
 *   lines        things they say out loud when off duty ({station} is filled in)
 *   thoughts     what goes through their head, by situation (see src/minds/mind.js)
 *
 * In stage 3 the AI can add a few thoughts each day about that day's project.
 */
export const AGENTS = [
  {
    id: 'nova',
    name: 'Nova',
    role: 'Designer · loves colour',
    color: '#ff7a59',
    start: [4, 4],
    personality: 'Bubbly, curious and easily distracted by anything pretty. Thinks in colours, hums while she works, and has strong opinions about beige.',
    likes: ['bright colours', 'sunsets', 'the Gallery'],
    dislikes: ['beige', 'waiting around'],
    behaviour: { speed: 2.6, workSeconds: [6, 9], breakChance: 0.2, chatty: 0.4, thinky: 0.6, favourites: ['gallery', 'observatory', 'garden'] },
    voice: { pitch: 1.35, rate: 1.08, prefer: ['hazel', 'libby', 'sonia', 'zira', 'aria', 'jenny', 'susan', 'samantha', 'karen', 'female'] },
    lines: [
      'Ooh, what is the {station} for?',
      'I love the view from here.',
      'Did that crystal just flicker?',
      'I have SO many ideas today.',
      'Is it just me, or does the {station} need more glitter?',
      'Don’t look now, but I’m having a genius moment.',
    ],
    thoughts: {
      walkToWork: [
        'Ooh, the {place}! I’ve had ideas about {project} all morning.',
        'If I skip, I get there faster. That’s just science.',
        'What colour is today? Today is definitely teal.',
        'Walking to work like it’s a catwalk. Because it is.',
        'Pip says I’m “easily distracted”. Ooh, a shiny pebble.',
      ],
      sketch: [
        'What if the whole thing was the colour of a sunset? …No. Maybe.',
        'Lines, lines, curvy line. Perfect.',
        'I should sign this with a little star.',
        'It needs one more swirl. They always need one more swirl.',
        'Pip will say this is “impractical”. Pip says that about joy.',
        'If this sketch were any better, it would need its own Gallery.',
      ],
      make: [
        'Careful, careful… this bit is fiddly.',
        'Pip makes this look so easy. It is not easy.',
        'I’m humming. Am I humming? I’m humming.',
        'The instructions say “simple”. The instructions lied.',
        'This machine and I have an understanding. It doesn’t understand me.',
      ],
      help: [
        '{maker} says “hold this”. I am an excellent holder of things.',
        'I’ll just suggest one teeny colour change…',
        'We make a good team, me and {maker}.',
        '{maker} is doing it wrong, but in a charming way.',
      ],
      break: [
        'Just a quick look at the {place}. Five minutes. Maybe ten.',
        'My eyes need a rest from all that detail.',
        'Ooh, a butterfly! …No, a leaf. Still pretty.',
        'This isn’t a break. It’s research. Into sitting down.',
      ],
      offDuty: [
        'What should we make tomorrow? Something sparkly?',
        'That cloud looks exactly like a hat.',
        'I wonder what the Gull sees out there.',
        'Someone painted that rock grey. On purpose. Unbelievable.',
      ],
      arrive: {
        gallery: ['Everything we’ve made, all in one place. I could stay all day.', 'Hello, {last}! You look lovely today.'],
        observatory: ['You can see the whole island from up here!', 'The sky is doing gradients again. Show-off.'],
        library: ['So many books. So few colourful covers.'],
        harbour: ['Waves are just the sea waving hello.'],
        default: ['The {place}! Hello, {place}.'],
      },
      sketchDone: ['The sketch is done! Over to you, {maker}.', 'Finished drawing! Now the fun part.'],
      finished: ['We MADE that. Us! Out of nothing!', '{project}… it’s even better than my sketch.', 'Iconic. Truly iconic. You’re welcome, island.'],
      newDay: ['New day, new thing to make! I wonder what it is…', 'Today feels like a {theme} kind of day.'],
    },
  },
  {
    id: 'pip',
    name: 'Pip',
    role: 'Maker · loves machines',
    color: '#3fb8e6',
    start: [-4, 3],
    personality: 'Practical, focused and quietly proud of good work. Counts things, talks to machines, needs tea, and has a very dry sense of humour.',
    likes: ['machines that work', 'tidy workshops', 'tea'],
    dislikes: ['clogged nozzles', 'fuss'],
    behaviour: { speed: 2.0, workSeconds: [9, 13], breakChance: 0.06, chatty: 0.2, thinky: 0.5, favourites: ['workshop', 'hub', 'harbour'] },
    voice: { pitch: 0.85, rate: 0.95, prefer: ['ryan', 'david', 'mark', 'daniel', 'guy', 'george', 'alex', 'male'] },
    lines: [
      'The {station} needs a few tweaks.',
      'Hmm, where did I leave my wrench?',
      'Someday a real model will live in this crystal.',
      'Beep boop. Just kidding.',
      'Ah, the {station}. Still standing. Low bar, but well done.',
      'I’m not grumpy. I’m accurately disappointed.',
    ],
    thoughts: {
      walkToWork: [
        'Right. The {place}. Let’s get on with it.',
        '{n} steps to the {place}. I’ve counted.',
        'If anything’s jammed again, I’m writing a strongly worded note.',
        'Nova’s already there. Or she’s chasing a butterfly. Fifty-fifty.',
      ],
      sketch: [
        'Measure twice. Draw once.',
        'A good drawing is just a plan with ambitions.',
        'That angle’s off by two degrees. Fixing it.',
        'Nova would add sparkles here. Nova is not holding the pencil.',
      ],
      make: [
        'Steady… steady… good.',
        'Step {n}. Only a few more. Probably.',
        'Nice and even. That’s how you do it.',
        'Come on, old girl. You can do it.',
        'If this works first time I’ll be suspicious.',
      ],
      help: [
        '{maker}’s holding the wrong end again. Fine. Fine.',
        'Two pairs of hands. Twice as fast. In theory.',
        '{maker} calls it “artistic”. I call it “wonky”. We’re both right.',
      ],
      break: [
        'Tea. Need tea. Do we have tea?',
        'Just checking the {place} is still standing.',
        'Five minutes. Then back to it.',
        'This is a scheduled break. I scheduled it just now.',
      ],
      offDuty: [
        'That printer would go faster with a bigger fan…',
        'Someone left a crate open at the harbour. Typical.',
        'Quiet day. I like quiet days.',
        'The Gull says it “basically flies”. It basically floats.',
      ],
      arrive: {
        workshop: ['Home sweet workshop.', 'Everything where I left it. Good.'],
        gallery: ['Is that roof a bit wonky? Nobody’s noticed. Good.'],
        harbour: ['Ropes need re-coiling. Again.'],
        default: ['The {place}. Hm.'],
      },
      sketchDone: ['Plans are done. Time to make it real.', 'Right, drawing’s finished. Now the proper work.'],
      finished: [
        'Done. And it actually works. Don’t tell anyone I’m pleased.',
        '{project}. Not bad. Not bad at all.',
        'Finished. Nova will want a celebration. I want a sit-down.',
      ],
      newDay: ['New project. Let’s see what we’re up against.', 'Tea first. Then {theme}.'],
    },
  },
]

export const getAgent = (id) => AGENTS.find((a) => a.id === id)

/** Retired characters, so old log entries still show their names. */
export const RETIRED_NAMES = { sage: 'Sage', marlin: 'Marlin', drifter: 'Drifter' }
