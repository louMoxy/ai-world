/**
 * EXAMPLE ONLY: not used yet.
 *
 * This shows where a real AI model could drive a character or ship moment to moment.
 * It has the same shape as the scripted brains, but sends the context to your own server,
 * which calls the model. (The cheaper plan is one AI call a day for the making challenge;
 * see the README. This file is for if you ever want live AI decisions too.)
 *
 * Never put an API key in this browser code: anyone could read it.
 * Keep the key on a small server (for example an `/api/brain` route) and call that.
 *
 * The server replies with an Action, e.g. { "type": "sailTo", "waypointId": "n" }.
 */
export function createAIBrain(entity, { kind = 'agent', endpoint = '/api/brain' } = {}) {
  return {
    async decide(context) {
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: entity.id, kind, persona: entity.role, context }),
      })
      if (!res.ok) throw new Error(`Brain request failed: ${res.status}`)
      return res.json()
    },
  }
}
