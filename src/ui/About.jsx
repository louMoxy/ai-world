/** "About this project": what the island is, how a day works, and the tech behind it. */
export function About({ onClose }) {
  return (
    <div className="about-backdrop" onClick={onClose}>
      <article className="about" role="dialog" aria-modal="true" aria-labelledby="about-title" onClick={(e) => e.stopPropagation()}>
        <button className="close" onClick={onClose} aria-label="Close">
          ×
        </button>
        <h2 id="about-title">About AI World</h2>
        <p>
          A little island in your browser where two makers, <strong>Nova</strong> and <strong>Pip</strong>, and an old sailboat, the{' '}
          <strong>Gull</strong>, take on one making challenge a day: a 3D print, a piece of fabric, or an outfit. What they make stays,
          and the island slowly grows.
        </p>

        <h3>How a day works</h3>
        <ol>
          <li>Each morning Claude plans the challenge: what to make, who sketches and who builds, and a few thoughts for each of them.</li>
          <li>One maker sketches it at the easel, stroke by stroke. The other builds it at the printer, loom or mannequin, and the Gull fetches materials.</li>
          <li>When it's finished it goes in the Gallery, and it changes the island: prints stand on the pier, fabrics become bunting and the Gull's sail, and about once a week something new is built.</li>
          <li>Claude writes a report of the day for the Island Log.</li>
        </ol>
        <p className="muted small">
          The work follows the island's clock (UK time): sketching starts at 8am and it's finished by 6pm, whether anyone is watching
          or not. Each morning the island's owner publishes the new day to this site.
        </p>

        <h3>The AI part</h3>
        <p>
          The AI runs once a day, not all the time, which keeps it almost free. A scheduled Claude Code task writes the day's plan and
          report as small JSON files. The island's server checks every file against strict rules before using it, so the AI can never
          break the world, and a hand-written sample day is used if anything is missing. Between those daily plans, the characters'
          minute-to-minute behaviour comes from simple scripted "brains" shaped by their personalities.
        </p>

        <h3>The tech</h3>
        <ul className="tech">
          <li><strong>React 19</strong> for the page and the panels</li>
          <li><strong>three.js</strong> with <strong>React Three Fiber</strong> and <strong>drei</strong> for the 3D world</li>
          <li><strong>postprocessing</strong> and custom shaders for the six looks (toon outlines, pixel, blueprint, AI vision…)</li>
          <li><strong>zustand</strong> for shared state</li>
          <li><strong>Vite</strong> to build and serve it, with a small <strong>Node</strong> server inside it that saves every day to <code>data/making.json</code> while developing</li>
          <li><strong>GitHub Pages</strong> for this online copy: plain files, rebuilt by <strong>GitHub Actions</strong> each time the day is published</li>
          <li><strong>Canvas 2D</strong> for the sketches and fabric patterns</li>
          <li>The browser's <strong>Web Speech API</strong> for reading thoughts aloud (nothing is sent anywhere)</li>
          <li><strong>Claude Code</strong> scheduled tasks for the daily plan and report</li>
        </ul>
        <p className="muted small">
          Everything is low-poly shapes made in code, with no 3D model files. Every design the AI writes is plain data (shapes,
          colours, patterns), never code.
        </p>

        <h3>Things to try</h3>
        <ul>
          <li>Click Nova, Pip or the Gull to follow them and see what's on their mind. Turn on 🔈 to hear their thoughts.</li>
          <li>Click a building to see its history: what was made there and who came by.</li>
          <li>Open the Island Log to see every day's sketch, design and report.</li>
          <li>Press 🎨 (or keys 1–6) to change how the whole world looks.</li>
        </ul>
      </article>
    </div>
  )
}
