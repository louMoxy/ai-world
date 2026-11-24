# AI World

A low-poly 3D island in the browser, built with React Three Fiber. Characters walk between stations. Each station and each character is a slot where an AI model will plug in later.

## Run it

```powershell
npm install
npm run dev
```

Then open http://localhost:5173.

**Controls:** drag to rotate, scroll to zoom, right-drag to pan. Click a station or a character to open its panel. Press Esc to close the panel. Press 1–6 (or use the list in the corner) to change the look.

## Project layout

```
src/
  App.jsx               Canvas and scene setup
  store.js              Shared state: hover, selection, chats, speech bubbles
  world/                Island terrain, water, sky, trees, rocks, clouds, camera
    terrain.js          heightAt(x, z), used by everything that stands on the ground
    layout.js           Where trees and rocks go; obstacles for characters
  stations/
    stations.js         Station list: edit names, colours and positions here
    Station.jsx         Station building, hover highlight and label
    dock.js             Harbour position and pier measurements
  agents/
    agents.js           Character list: names, colours and personalities
    Agent.jsx           Movement, obstacle avoidance and look
  ships/
    ships.js            Ship list: names, colours, berths and personalities
    navigation.js       Sea waypoints, berths and route planning
    Ship.jsx            Sailing, mooring, bobbing on the waves, and the boat models
  brains/
    scriptedBrain.js    Placeholder character brain, and the description of the brain interface
    shipBrain.js        Placeholder ship brain: understands "sail north", "go to the dock", "stop"
    aiBrain.js          Example of where a real AI model plugs in (not used yet)
    index.js            Picks which brain each character and ship uses
  looks/
    looks.js            Look presets: mood colours, materials and filters for each
    LookEffects.jsx     Full-screen filters; all built at load so switching is instant
    effects.js          Custom filters: ink outlines, posterize, blueprint, AI vision
    MaterialSwap.jsx    Swaps every surface to cartoon shading for the Toon look
  ui/                   Overlay, info and chat panel, look switcher, loading screen
```

## Looks

A look changes how the whole world is drawn. There are six: Default, Toon, Night, Pixel, Blueprint and AI Vision. Each one has three parts, set in `src/looks/looks.js`:

- **mood**: sky, fog, light, water and cloud colours.
- **materials**: `standard`, `toon` for cartoon shading on every surface, or `vision`, which turns everything black except the characters and ships so the AI Vision filter can light them up. A group marks itself as an AI entity with `userData={{ aiEntity: colour }}`.
- **effects**: full-screen filters (`outline`, `bloom`, `pixel`, `blueprint`, `vision`, `glow`). New filters go in `LookEffects.jsx`.

Every look is compiled behind the loading screen, so switching never pauses. The labels and speech bubbles are HTML, so each look restyles them in `styles.css` (`body[data-look=...]`).

## Adding AI later

Each character's and ship's behaviour comes from a **brain** with two methods:

- `decide(context)` returns the next action. Characters can `walkTo` a station, `idle`, or `say` something. Ships can `sailTo` a waypoint, `dock` at the harbour, `idle`, or `say` something.
- `respond(message, context)` returns a chat reply.
- A brain can set `interrupt = true` to drop the current action and decide again. That's how chat orders like "sail north" take effect straight away.

Ships sail between 8 compass waypoints around the island (North, North-East, …), and each ship has its own berth at the pier.

To connect a model, make a small server endpoint that calls the model, keeping the API key on the server. Then switch that character to `createAIBrain` in `src/brains/index.js`. Never put API keys in browser code.
