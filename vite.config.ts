import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { defineConfig, configDefaults } from 'vitest/config'
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
//
// Als Basis-Version dabei bewusst NICHT das lokale package.json verwenden
// (das ist auf beta dauerhaft veraltet, siehe oben) – docker-publish.yml
// liest stattdessen origin/mains package.json aus und reicht das als
// VITE_APP_BETA_BASE_VERSION durch, damit hier immer die zuletzt tatsächlich
// veröffentlichte Versionsnummer als Präfix steht.
const betaBuildNumber = process.env.VITE_APP_BETA_BUILD_NUMBER
const betaBaseVersion = process.env.VITE_APP_BETA_BASE_VERSION || pkg.version
const displayVersion =
  process.env.VITE_APP_CHANNEL === 'beta' && betaBuildNumber ? `${betaBaseVersion}_beta.${betaBuildNumber}` : pkg.version

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    host: true,
  },
  // Beta läuft im selben Container/derselben Origin wie Prod, nur unter dem
  // Unterpfad /beta/ (siehe nginx.conf.template) – dafür müssen Asset-URLs
  // relativ zu diesem Pfad aufgelöst werden. Vite rewritet dafür sowohl
  // index.html-Referenzen (z. B. <link href="/icon.png">) als auch alle
  // Bundle-Assets automatisch und setzt import.meta.env.BASE_URL passend,
  // das App.tsx wiederum als React-Router-basename verwendet. Dev (siehe
  // Dockerfile.dev) läuft dagegen als GANZ EIGENER Container an dessen
  // eigener Wurzel "/" - kein Unterpfad, daher hier kein eigener Fall.
  //
  // mobile (Capacitor, siehe mobile/) serviert das gebündelte App-Paket
  // intern über einen lokalen Webserver unter capacitor://localhost bzw.
  // https://localhost (nicht als rohes file://) – absolute Pfade ab "/"
  // funktionieren dort genauso wie bei production, daher kein eigener Fall
  // nötig (fällt unten auf denselben Default wie main).
  base: process.env.VITE_APP_CHANNEL === 'beta' ? '/beta/' : '/',
  define: {
    __APP_VERSION__: JSON.stringify(displayVersion),
  },
  test: {
    // e2e/ läuft über Playwright (npm run test:e2e), nicht über Vitest –
    // ohne diesen Ausschluss versucht Vitest, die *.spec.ts-Dateien dort
    // ebenfalls einzusammeln und am fehlenden @playwright/test-Testrunner-
    // Kontext zu scheitern.
    exclude: [...configDefaults.exclude, 'e2e/**'],
  },
})
