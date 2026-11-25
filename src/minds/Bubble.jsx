const MAX = 110

const clip = (text) => (text.length > MAX ? text.slice(0, MAX - 3) + '…' : text)

/**
 * The bubble above a character or ship: speech (with a pointer) or a thought (a cloud
 * with little circles). Speech wins if both happen at once.
 */
export function Bubble({ speech, thought }) {
  if (speech) return <div className="bubble">{clip(speech)}</div>
  if (thought) {
    return (
      <div className="bubble thought" key={thought}>
        {clip(thought)}
        <span className="thought-dot big" />
        <span className="thought-dot small" />
      </div>
    )
  }
  return null
}
