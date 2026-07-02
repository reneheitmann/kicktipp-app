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

// Auf beta hängt Docker (siehe Dockerfile/docker-publish.yml) die
// Gesamtzahl der Commits auf dem Branch als VITE_APP_BETA_BUILD_NUMBER an –
// package.json selbst bumpt dort nie (würde bei jedem Merge mit main zu
// Versions-Konflikten führen), sonst bliebe die angezeigte Version dauerhaft
// bei der zuletzt von main gemergten Zahl stehen.
const betaBuildNumber = process.env.VITE_APP_BETA_BUILD_NUMBER
const displayVersion =
  process.env.VITE_APP_CHANNEL === 'beta' && betaBuildNumber ? `${pkg.version}_beta.${betaBuildNumber}` : pkg.version

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    host: true,
  },
  define: {
    __APP_VERSION__: JSON.stringify(displayVersion),
  },
})
