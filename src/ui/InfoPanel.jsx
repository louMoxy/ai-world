import { useEffect, useRef, useState } from 'react'
import { useWorld } from '../store'
import { getStation } from '../stations/stations'
import { getAgent } from '../agents/agents'
import { getShip } from '../ships/ships'
import { getBrain } from '../brains'

export function InfoPanel() {
  const selected = useWorld((s) => s.selected)
  const clearSelection = useWorld((s) => s.clearSelection)

  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && clearSelection()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [clearSelection])

  if (!selected) return null

  return (
    <aside className="panel" key={`${selected.type}-${selected.id}`}>
      <button className="close" onClick={clearSelection} aria-label="Close">
        ×
      </button>
      {selected.type === 'station' && <StationInfo id={selected.id} />}
      {selected.type === 'agent' && <Chat entity={getAgent(selected.id)} />}
      {selected.type === 'ship' && (
        <Chat entity={getShip(selected.id)} hint='Try "sail north", "go to the dock" or "stop".' />
      )}
    </aside>
  )
}

function StationInfo({ id }) {
  const station = getStation(id)
  return (
    <div className="panel-body">
      <div className="panel-head">
        <span className="dot" style={{ background: station.color }} />
        <div>
          <h2>{station.name}</h2>
          <p className="muted">Station</p>
        </div>
      </div>
      <p>{station.description}</p>
      <div className="slot">
        <div className="slot-row">
          <span className="status off" /> <strong>AI model slot</strong>
        </div>
        <p className="muted">Not connected yet. This is where a model will run.</p>
      </div>
    </div>
  )
}

/** Chat with a character or a ship. Messages go to its brain's respond(). */
function Chat({ entity: agent, hint }) {
  const id = agent.id
  const brain = getBrain(id)
  const messages = useWorld((s) => s.chats[id]) ?? []
  const status = useWorld((s) => s.status[id])
  const addMessage = useWorld((s) => s.addMessage)
  const say = useWorld((s) => s.say)
  const [text, setText] = useState('')
  const [thinking, setThinking] = useState(false)
  const listRef = useRef()
  const inputRef = useRef()

  useEffect(() => {
    if (!useWorld.getState().chats[id]?.length) {
      addMessage(id, { from: 'agent', text: agent.greeting })
      say(id, agent.greeting, 4)
    }
    inputRef.current?.focus()
  }, [id, agent, addMessage, say])

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: 'smooth' })
  }, [messages.length, thinking])

  const send = async (e) => {
    e.preventDefault()
    const message = text.trim()
    if (!message || thinking) return
    setText('')
    addMessage(id, { from: 'user', text: message })
    setThinking(true)
    try {
      const history = useWorld.getState().chats[id] ?? []
      const reply = await brain.respond(message, { self: { id, name: agent.name, role: agent.role }, history })
      addMessage(id, { from: 'agent', text: reply })
      say(id, reply, 5)
    } catch {
      addMessage(id, { from: 'agent', text: "Sorry, I couldn't think of a reply." })
    } finally {
      setThinking(false)
    }
  }

  return (
    <div className="panel-body chat">
      <div className="panel-head">
        <span className="dot" style={{ background: agent.color }} />
        <div>
          <h2>{agent.name}</h2>
          <p className="muted">{agent.role} · placeholder brain</p>
        </div>
      </div>
      {status && (
        <div className="status-line">
          <span className="status on" /> {status}
        </div>
      )}
      {hint && <p className="muted">{hint}</p>}
      <div className="messages" ref={listRef}>
        {messages.map((m, i) => (
          <div key={i} className={`msg ${m.from}`} style={m.from === 'agent' ? { '--accent': agent.color } : undefined}>
            {m.text}
          </div>
        ))}
        {thinking && <div className="msg agent thinking">…</div>}
      </div>
      <form className="composer" onSubmit={send}>
        <input
          ref={inputRef}
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={`Say something to ${agent.name}…`}
        />
        <button type="submit" disabled={!text.trim() || thinking}>
          Send
        </button>
      </form>
    </div>
  )
}
