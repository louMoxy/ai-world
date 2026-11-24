import path from 'node:path'
import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import { makingApi } from './server/makingApi.js'

/**
 * Runs the island's small server (server/makingApi.js) inside Vite, for both
 * `npm run dev` and `npm run preview`, so there's still just one command.
 * Settings and secrets come from .env (see .env.example). Only variables starting with
 * VITE_ ever reach the browser, so never give the API key that prefix.
 */
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const dataDir = path.resolve('data')

  const islandServer = {
    name: 'island-server',
    configureServer(server) {
      server.middlewares.use(makingApi({ dataDir, env, dev: true }))
    },
    configurePreviewServer(server) {
      server.middlewares.use(makingApi({ dataDir, env, dev: false }))
    },
  }

  return {
    plugins: [react(), islandServer],
    server: {
      port: 5173,
      watch: { ignored: ['**/data/**'] }, // saving the days shouldn't reload the page
    },
  }
})
