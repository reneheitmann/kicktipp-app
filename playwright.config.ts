import { defineConfig } from '@playwright/test'

// Zugangsdaten (E2E_EMAIL/E2E_PASSWORD, siehe e2e/helpers.ts) kommen aus der
// lokalen .env (bereits per .gitignore ausgeschlossen) statt hartcodiert im
// Testcode zu stehen – das Repo ist öffentlich. process.loadEnvFile ist seit
// Node 20.6 vorhanden, daher keine zusätzliche dotenv-Abhängigkeit nötig.
try {
  process.loadEnvFile('.env')
} catch {
  // .env optional, z. B. wenn die Werte bereits über die Shell exportiert sind.
}

export default defineConfig({
  testDir: './e2e',
  // Die Tests legen echte Daten im "Kicktipp Dev"-Projekt an (Saison,
  // Spieler, Spieltag) statt gegen Mocks zu laufen – sequenziell statt
  // parallel, damit sich nichts gegenseitig ins Gehege kommt.
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: 'list',
  use: {
    baseURL: 'http://localhost:5173',
    trace: 'retain-on-failure',
  },
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:5173',
    reuseExistingServer: true,
    timeout: 30_000,
  },
})
