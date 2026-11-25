import fs from 'node:fs'
import path from 'node:path'

/**
 * A JSON file that's safe to write often: each write goes to a temporary file first and
 * then replaces the real one, so a crash mid-write never leaves a half-written file.
 * A file that can't be read is set aside (never deleted) and `fallback` is used instead.
 * changedOnDisk() says whether something else (like the publish script) has changed it
 * since we last read or wrote it.
 */
export function jsonFile(file, fallback) {
  let seen = null // modification time when we last read or wrote it
  const mtime = () => {
    try {
      return fs.statSync(file).mtimeMs
    } catch {
      return null
    }
  }
  return {
    file,

    changedOnDisk() {
      return seen !== null && mtime() !== seen
    },

    read() {
      seen = mtime()
      let text
      try {
        text = fs.readFileSync(file, 'utf8')
      } catch (e) {
        if (e.code === 'ENOENT') return structuredClone(fallback)
        throw e
      }
      try {
        return JSON.parse(text)
      } catch {
        const aside = `${file}.broken-${Date.now()}`
        fs.renameSync(file, aside)
        console.warn(`[island] ${path.basename(file)} could not be read, so it was moved to ${aside}. Starting fresh.`)
        return structuredClone(fallback)
      }
    },

    write(data) {
      fs.mkdirSync(path.dirname(file), { recursive: true })
      const tmp = `${file}.tmp`
      fs.writeFileSync(tmp, JSON.stringify(data, null, 2) + '\n')
      fs.renameSync(tmp, file)
      seen = mtime()
    },
  }
}
