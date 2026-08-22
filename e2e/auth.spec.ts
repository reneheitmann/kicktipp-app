import { test, expect } from '@playwright/test'
import { login } from './helpers'

test.describe('Login', () => {
  test('falsche Zugangsdaten zeigen eine Fehlermeldung', async ({ page }) => {
    await page.goto('/login')
    await page.getByLabel('E-Mail').fill('nicht-existent@example.invalid')
    await page.getByLabel('Passwort', { exact: true }).fill('falsches-passwort')
    await page.getByRole('button', { name: 'Anmelden' }).click()
    await expect(page.getByRole('alert')).toHaveText(/Anmeldung fehlgeschlagen/)
  })

  test('korrekte Zugangsdaten leiten in die App weiter', async ({ page }) => {
    await login(page)
  })
})
