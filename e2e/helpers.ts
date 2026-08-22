import { expect, type Page } from '@playwright/test'

/**
 * Login gegen das "Kicktipp Dev"-Supabase-Projekt (niemals main/beta/Prod –
 * die .env, gegen die `npm run dev` läuft, muss auf Dev zeigen, siehe
 * .env.example). Zugangsdaten aus der Umgebung, nicht hartcodiert:
 *
 *   E2E_EMAIL=...
 *   E2E_PASSWORD=...
 *
 * in der lokalen .env (nicht eingecheckt) oder als Shell-Export.
 */
export async function login(page: Page) {
  const email = process.env.E2E_EMAIL
  const password = process.env.E2E_PASSWORD
  if (!email || !password) {
    throw new Error('E2E_EMAIL/E2E_PASSWORD nicht gesetzt (siehe e2e/helpers.ts).')
  }
  await page.goto('/login')
  await page.getByLabel('E-Mail').fill(email)
  await page.getByLabel('Passwort', { exact: true }).fill(password)
  await page.getByRole('button', { name: 'Anmelden' }).click()
  await expect(page.getByRole('heading', { name: /Willkommen/ })).toBeVisible()
}

/** Eindeutiger Name pro Testlauf, damit wiederholte Läufe sich nicht mit alten Testdaten überschneiden. */
export function testRunId(): string {
  return `e2e-${Date.now()}`
}
