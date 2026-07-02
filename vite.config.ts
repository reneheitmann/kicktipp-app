import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// Version kommt direkt aus package.json statt einer eigenen Umgebungsvariable
// – die Datei liegt in jedem Build-Kontext (lokal wie im Docker-Image) bereits
// vor, im Gegensatz zu .git (per .dockerignore aus dem Image ausgeschlossen),
// über das sich Commit/Build-Datum daher nicht ermitteln lassen (siehe
// VITE_APP_COMMIT_SHA/VITE_APP_BUILD_DATE in .env.example bzw. Dockerfile).
const pkg = JSON.parse(readFileSync(fileURLToPath(new URL('./package.json', import.meta.url)), 'utf-8'))

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    host: true,
  },
  define: {
    __APP_VERSION__: JSON.stringify(pkg.version),
  },
})
