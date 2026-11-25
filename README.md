# AI World

A low-poly 3D island in the browser, built with React Three Fiber. Two characters, Nova and Pip, and a ship, the Gull, work together on a making challenge each day, planned by Claude. What they make stays, and the island grows over time.

## Run it

```powershell
npm install
npm run dev
```

Then open http://localhost:5173. This also starts the island's small server (see "The server" below).

**Controls:** drag to rotate, scroll to zoom, right-drag to pan. Click a character or ship (or their name on the challenge card or in the Island Log) to zoom in and follow them; the panel shows what they are doing. Click a building to see its history: what was made there and who came by. The **i** button in the corner explains the project and the tech. Press Esc to stop following or close a panel. Press 1–6 (or the 🎨 button in the corner) to change the look.

## Project layout

```
src/
  App.jsx               Canvas and scene setup
  store.js              Shared state: hover, selection (who is followed), speech bubbles, status
  world/                Island terrain, water, sky, trees, rocks, clouds, camera
    terrain.js          heightAt(x, z), used by everything that stands on the ground
    layout.js           Where trees and rocks go; obstacles for characters
    growth.js           How the island grows: where finished things and additions go
    IslandGrowth.jsx    Prints on the pier, bunting, the Gull's sail and the additions
  stations/
    stations.js         Station list: edit names, colours and positions here
    Station.jsx         Station building, hover highlight and label
    history.js          A place's history: what was made there and who came by
    dock.js             Harbour position and pier measurements
  agents/
    agents.js           Characters: names, colours, personalities, behaviour, voices and thoughts
    Agent.jsx           Movement, obstacle avoidance and look
  ships/
    ships.js            Ships: names, colours, berths, personality, voice and thoughts
    navigation.js       Sea waypoints, berths and route planning
    Ship.jsx            Sailing, mooring, bobbing on the waves, and the boat models
  brains/
    scriptedBrain.js    Placeholder character brain for off-duty time, and the brain interface
    shipBrain.js        Placeholder ship brain for when the Gull is off duty
    aiBrain.js          Example of where a real AI model plugs in (not used yet)
    index.js            Picks which brain each character and ship uses
  minds/
    mind.js             Picks a thought for a situation and fills in the details
    Minds.jsx           Thoughts about the day's events, and reading thoughts aloud
    Bubble.jsx          Speech and thought bubbles
  looks/
    looks.js            Look presets: mood colours, materials and filters for each
    LookEffects.jsx     Full-screen filters; all built at load so switching is instant
    effects.js          Custom filters: ink outlines, posterize, blueprint, AI vision
    MaterialSwap.jsx    Swaps every surface to cartoon shading for the Toon look
  making/
    aiPlans.js          Checks for the plans and reports the daily AI writes
    designs.js          Design formats (print, fabric, outfit) and the limits every design is checked against
    samples.js          Hand-written days, used until the AI writes them
    days.js             The rules of a day (shared by the server and the browser)
    store.js            The day in the browser: talks to the server, shows progress
    storage.js          Saving in the browser, only used when there is no server
    makerBrain.js       Makes the characters and ships work on the day's jobs
    sketch.js           Draws each day's sketch, stroke by stroke
    fabric.js           Paints fabric patterns (sketches and 3D cloth)
    workstations.js     Where the easel, printer, mannequin, loom and gallery displays are
    MakingWorld.jsx     The easel, 3D printer, mannequin, loom and Gallery in the world
  ui/                   Overlay, follow and place panels, corner buttons (looks, About), challenge card, Island Log, loading screen
server/
  makingApi.js          The island's server: saves the days, starts new ones, takes in work
  planner.js            Plans each new day: the daily AI's plan, or a sample
  inbox.js              Reads what the daily AI left in data/ai/
  budget.js             Daily AI spending ledger (data/spend.json)
  jsonFile.js           Safe saving of JSON files
data/
  making.json           Every day the island has had (kept in git)
  ai/plans/             The daily AI's plans, one per date
  ai/reports/           The daily AI's end-of-day reports, one per day
scripts/
  ai-day.js             The daily AI's helper: npm run ai:brief and npm run ai:check
.env.example            Settings for the server; copy to .env (never committed)
```

## Looks

A look changes how the whole world is drawn. There are six: Default, Toon, Night, Pixel, Blueprint and AI Vision. Each one has three parts, set in `src/looks/looks.js`:

- **mood**: sky, fog, light, water and cloud colours.
- **materials**: `standard`, `toon` for cartoon shading on every surface, or `vision`, which turns everything black except the characters and ships so the AI Vision filter can light them up. A group marks itself as an AI entity with `userData={{ aiEntity: colour }}`.
- **effects**: full-screen filters (`outline`, `bloom`, `pixel`, `blueprint`, `vision`, `glow`). New filters go in `LookEffects.jsx`.

Every look is compiled behind the loading screen, so switching never pauses. The labels and speech bubbles are HTML, so each look restyles them in `styles.css` (`body[data-look=...]`).

## Personalities and thoughts

Each character and ship has its own personality in `src/agents/agents.js` and `src/ships/ships.js`. It changes what they do as well as what they think:

- **Nova** is bubbly and easily distracted: she walks fast, works in short bursts, takes more breaks (at the Gallery, Observatory or Garden Gate) and thinks in colours.
- **Pip** is practical and focused: slower, longer working turns, hardly any breaks (and those at the Workshop), counts things and wants tea.
- **The Gull** is a cheerful old sailboat who talks to seagulls and takes every delivery seriously.

Their **thoughts** appear in lavender thought bubbles, separate from things they say out loud. Thoughts depend on the situation (walking to work, sketching, building, helping, on a break, arriving somewhere, off duty) and on the day's events (a new day, the sketch being finished, the creation being done), and they mention real details like today's project and who is building it.

Follow someone to see what has been on their mind lately. Turn on **🔈 Hear thoughts** to have their thoughts and sayings read aloud while you follow them. It uses your browser's built-in voices (free, nothing is sent anywhere), so how they sound depends on the voices your computer has.

To change a personality, edit its `behaviour` numbers or add lines to its `thoughts`.

## Making things

Every day the island takes on one making challenge: a **3D print**, a **fabric** or an **outfit**.

1. One character draws the design at the **easel** next to the Library. The sketch appears stroke by stroke.
2. Another builds it: the **3D printer** by the Workshop prints it layer by layer, the **loom** by Garden Gate weaves it, or the **mannequin** shows the outfit being sewn.
3. The third character helps at a station, and the ships fetch materials and bring them to the harbour.
4. When it's finished it goes to the **Gallery**. Fabrics hang as banners, prints stand on plinths, and outfits are worn by the character they were made for.

Later days build on earlier ones: an outfit uses the newest fabric, and a print can improve an earlier one.

### The island grows

Finished things don't only go to the Gallery; they change the island:

- every **print** gets a small copy on the pier (newest first, 8 spots);
- every **fabric** strings a line of **bunting** between two places (8 routes, filled in order), and the newest fabric becomes the **Gull's sail**;
- about once a week a day also has an **addition**: a bench, flower bed, lamp post, signpost, bird bath or beehive near one of the stations, built when the day is finished. The daily AI chooses it (the brief tells it when one is due).

Additions go on fixed plots around the stations (`growth.js`), so they never land in a tree or in someone's path. Everything is worked out again from the saved days each time, so nothing extra needs saving. Click any of it to open its day in the Island Log.

The **Island Log** (on the challenge card, or click any workstation or Gallery piece) keeps every day: its sketch (click to download it as a PNG), the design, who did what, and the end-of-day report.

A new day starts the first time you open the world on a new date. In the dev server, the challenge card has **+25%** and **Next day** buttons for testing.

Designs are plain data, never code. `validateDesign` in `src/making/designs.js` checks every one against strict limits (parts, sizes, colours, the print area), so an AI-written design can never break the world. For now the days come from `samples.js`. Stage 3 has an AI write the daily challenge and report.

## The server

`npm run dev` (and `npm run preview`) also run a small server inside Vite (`server/makingApi.js`). It:

- saves every day in `data/making.json`, so the log and Gallery are the same in any browser and are kept in git;
- starts a new day the first time the world is opened on a new date, closing the old one with its report;
- takes in each finished job (it only accepts the real characters and ship, one turn at a time);
- will hold the API key and the daily AI budget in stage 3.

Settings go in a `.env` file: copy `.env.example` to `.env`. It's never committed. The server reads it; the browser never sees it.

If the site is ever hosted as plain files with no server, it still works: the same day rules run in the browser and days are saved there instead. Days that were saved in a browser before the server existed are moved to the server automatically, once.

## The island clock

A day's work follows the island's clock (UK time, `ISLAND_TIME_ZONE` in `src/making/days.js`): sketching starts at 8am and the creation is finished by 6pm, even if nobody has the world open. Keeping the world open speeds it up, because every job the characters finish counts on top of the clock. A day is never left unfinished: when a new day starts, the old one is finished first.

## Online

The online copy is a plain static site on GitHub Pages, so it needs no server and costs nothing:

1. Each morning the daily AI task writes the plan and reports, then runs `npm run island:publish`. That starts today's day in `data/making.json` (with the same rules as the server, in `server/island.js`), commits the `data` folder and pushes it to GitHub.
2. The push runs `.github/workflows/publish-site.yml`, which builds the site with `npm run build:online` and publishes it. The build includes a copy of the days as `island.json`.
3. Visitors' browsers load `island.json` and follow the island clock, so everyone sees the same island. Nothing a visitor does is saved.

To try the online version locally: `npm run build:online`, then `npx vite preview --mode online`.

## The daily AI

Once a day a **scheduled Claude Code task** ("AI World: plan the day and write the report", in the Scheduled section of the Claude app) plans the island's next making challenge and writes the reports for days that have ended. It runs on your Claude plan, so there's no API key and no extra bill. It runs at about 7:00 while the Claude app is open, or the next time the app opens.

It never changes the code or the saved days. It only writes small files:

- `data/ai/plans/<date>.json`: the plan for that date, in the same shape as `samples.js`, plus a few `thoughts` for each character about the project (mixed into their usual thoughts while they work on it).
- `data/ai/reports/<day id>.json`: `{ "report": "…" }`, shown in the Island Log above the automatic report.

The server reads them and checks them (`src/making/aiPlans.js`) the same way every time. A plan that fails the checks is ignored and a hand-written sample day is used instead, so the island always has a day. If today started with a sample because the plan arrived late, the server switches to the AI's plan as long as nobody has started work yet.

To see what the task sees, or to check a file by hand:

```powershell
npm run ai:brief
```

```powershell
npm run ai:check -- data/ai/plans/2026-11-27.json
```

## Adding AI later

Each character's and ship's behaviour comes from a **brain** with one method, `decide(context)`, which returns the next action. Characters can `walkTo` a station or workstation, `work`, `idle`, or `say` something. Ships can `sailTo` a waypoint, `dock` at the harbour, `idle`, or `say` something. Any action can carry a `status`, which is what the follow panel and challenge card show.

`src/making/makerBrain.js` wraps each brain so it works on the day's challenge. When a character has no job, its own brain decides.

There is no chat: the daily AI (above) writes the challenge and the report once a day, which keeps the cost very low. If you'd rather not depend on the Claude app being open, `server/planner.js` is where a direct API call would go instead (an API key in `.env`, with the daily budget in `server/budget.js`).

Ships sail between 8 compass waypoints around the island (North, North-East, …), and each ship has its own berth at the pier.

To connect a model, make a small server endpoint that calls the model, keeping the API key on the server. For live AI decisions (more expensive), switch a character to `createAIBrain` in `src/brains/index.js`. Never put API keys in browser code.
