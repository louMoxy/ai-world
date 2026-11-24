/**
 * EXAMPLE ONLY: not used yet.
 *
 * This shows where a real AI model would plug in, for a character or a ship.
 * It has the same shape as the scripted brains, but sends the context to your
 * own server, which calls the model.
 *
 * Never put an API key in this browser code: anyone could read it.
 * Keep the key on a small server (for example an `/api/brain` route) and call that.
 *
 * Server replies:
 *   kind 'decide'  -> an Action, e.g. { "type": "sailTo", "waypointId": "n" }
 *   kind 'respond' -> { "text": "...", "action": <optional Action to do now> }
 *
 * To try it, use createAIBrain for that character or ship in ./index.js.
 */
export function createAIBrain(entity, { kind = 'agent', endpoint = '/api/brain' } = {}) {
  let nextAction = null

  const post = async (body) => {
    const res = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: entity.id, kind, persona: entity.role, ...body }),
    })
    if (!res.ok) throw new Error(`Brain request failed: ${res.status}`)
    return res.json()
  }

  const brain = {
    interrupt: false,

    async decide(context) {
      if (nextAction) {
        const a = nextAction
        nextAction = null
        return a
      }
      return post({ type: 'decide', context })
    },

    async respond(message, context) {
      const reply = await post({ type: 'respond', message, context })
      // The model can give an order along with its reply, e.g. "Aye!" + sail north.
      if (reply.action) {
        nextAction = reply.action
        brain.interrupt = true
      }
      return reply.text
    },
  }
  return brain
}
