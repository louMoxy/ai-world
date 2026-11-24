import { jsonFile } from './jsonFile.js'

/**
 * A daily spending ledger for AI calls, kept in data/spend.json.
 *
 * Before a call, ask canSpend(date, estimate). After it, record(date, actualCost, note).
 * When the day's limit is reached, the island falls back to hand-written days and
 * reports until tomorrow. This sits on top of the monthly spend limit you set in the
 * Anthropic Console, which is the hard cap.
 */
export function createBudget(file, dailyLimitUsd) {
  const store = jsonFile(file, { days: {} })

  return {
    dailyLimitUsd,

    spentOn(date) {
      return store.read().days[date]?.usd ?? 0
    },

    canSpend(date, estimateUsd) {
      return dailyLimitUsd > 0 && this.spentOn(date) + estimateUsd <= dailyLimitUsd
    },

    record(date, usd, note) {
      const data = store.read()
      const day = (data.days[date] ??= { usd: 0, calls: [] })
      day.usd = Math.round((day.usd + usd) * 1e6) / 1e6
      day.calls.push({ at: new Date().toISOString(), usd, note })
      store.write(data)
    },
  }
}
