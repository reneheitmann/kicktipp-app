import { test, expect } from '@playwright/test'
import { login } from './helpers'

// Echter Rollenwechsel (nicht nur Vorschau, siehe Migration 0036/0037/0051) –
// historisch der Pfad mit den meisten Regressionen.
test('Admin kann zur Rolle Spieler wechseln und wieder zurück', async ({ page }) => {
  await login(page)
  await page.goto('/profil')

  await page.getByRole('button', { name: 'Als Spieler agieren' }).click()
  await expect(page.getByRole('heading', { name: /Du agierst als Spieler/ })).toBeVisible()

  await page.getByRole('button', { name: /Zurück zu Administrator/ }).click()
  await expect(page.getByRole('heading', { name: /Du agierst als/ })).toHaveCount(0)
  await expect(page.getByRole('button', { name: 'Als Spieler agieren' })).toBeVisible()
})
