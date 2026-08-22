import { test, expect } from '@playwright/test'
import { login, testRunId } from './helpers'

// Der Pfad mit dem höchsten Schadenspotenzial bei einer Regression (echtes
// Geld): Saison -> Teilnehmer -> Spieltag -> Platzierung -> automatische
// Gewinnberechnung (calculate_matchday_payout) -> sichtbar in der
// Konten-Übersicht. Bisher nur auf DB-Ebene (pgTAP) abgedeckt, nicht End-to-
// End. Prüft bewusst nur, dass ein Gewinn > 0 durchgängig ankommt, nicht die
// exakte Verteilungsformel (die ist bereits durch pgTAP verifiziert).
test('Spieltags-Gewinn wird berechnet und erscheint in der Konten-Übersicht', async ({ page }) => {
  const runId = testRunId()
  const playerName = `E2E Spieler ${runId}`
  const seasonName = `E2E Test ${runId}`

  await login(page)

  // 1. Testspieler anlegen
  await page.goto('/players')
  await page.getByRole('button', { name: '+ Spieler' }).click()
  const playerDialog = page.getByRole('dialog')
  await playerDialog.locator('#player-name').fill(playerName)
  await playerDialog.getByRole('button', { name: 'Speichern' }).click()
  await expect(playerDialog).toBeHidden()

  // 2. Saison mit Standard-Spieltags-Einsatz anlegen (> 0, sonst kein Gewinn-Topf)
  await page.goto('/seasons')
  await page.getByRole('button', { name: '+ Saison' }).click()
  const seasonDialog = page.getByRole('dialog')
  await seasonDialog.locator('#season-name').fill(seasonName)
  const today = new Date().toISOString().slice(0, 10)
  const inAWeek = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10)
  await seasonDialog.locator('#season-start').fill(today)
  await seasonDialog.locator('#season-end').fill(inAWeek)
  await seasonDialog.locator('#season-kicktipp-link').fill('https://www.kicktipp.de/e2e-test/')
  await seasonDialog.locator('#season-default-spieltag').fill('10')
  await seasonDialog.getByRole('button', { name: 'Speichern' }).click()
  await expect(seasonDialog).toBeHidden()

  await page.getByRole('link', { name: new RegExp(seasonName) }).click()
  await expect(page.getByRole('heading', { name: seasonName })).toBeVisible()

  // 3. Gewinnverteilung Spieltag: Platz 1 bekommt 100 %
  await page.getByRole('button', { name: /Gewinnverteilung/ }).click()
  // PayoutRulesEditor lädt seine Daten (Regeln + Topf) asynchron nach dem
  // Aufklappen nach – ohne diesen Wait interagiert der xpath=..-Locator
  // unten teils mit dem noch nicht gemounteten "Lade..."-Zwischenzustand.
  await expect(page.getByRole('heading', { name: 'Spieltag', exact: true })).toBeVisible()
  // React StrictMode (main.tsx) mountet Effects im Dev-Modus zweimal – der
  // useEffect-Reload in PayoutRulesEditor läuft dadurch als zwei echte,
  // unabhängig auflösende Fetches. Löst der zweite später auf als unsere
  // Eingabe, überschreibt er sie wieder mit dem (noch leeren) Serverstand.
  // Kurzer Puffer, damit beide Fetches sicher durch sind, bevor wir tippen.
  await page.waitForTimeout(500)
  const spieltagPayoutCard = page.getByRole('heading', { name: 'Spieltag', exact: true }).locator('xpath=..')
  await spieltagPayoutCard.getByRole('button', { name: '+ Platz hinzufügen' }).click()
  await spieltagPayoutCard.getByPlaceholder('0').fill('100')
  // Client-seitig immer als "X.XX %" formatiert (siehe PayoutRulesEditor.tsx),
  // unabhängig davon, wie die DB numeric(5,2)-Spalte prozent_anteil beim
  // Zurücklesen formatiert – daher robuster als der Wert der Zeile selbst.
  await expect(spieltagPayoutCard.getByText('Summe: 100.00 % ✓')).toBeVisible()
  await spieltagPayoutCard.getByRole('button', { name: 'Speichern' }).click()
  await expect(spieltagPayoutCard.getByRole('button', { name: 'Verwerfen' })).toHaveCount(0)

  // 4. Testspieler als Teilnehmer hinzufügen (übernimmt den Standard-Spieltags-Einsatz)
  await page.getByRole('button', { name: /Teilnehmer & Einsätze/ }).click()
  await page.getByRole('button', { name: '+ Spieler' }).click()
  const participantDialog = page.getByRole('dialog')
  await participantDialog.locator('#participant-player').selectOption({ label: playerName })
  await participantDialog.getByRole('button', { name: 'Speichern' }).click()
  await expect(participantDialog).toBeHidden()

  // 5. Spieltag 1 anlegen
  await page.getByRole('button', { name: '+ Spieltag' }).click()
  const matchdayDialog = page.getByRole('dialog')
  await matchdayDialog.getByRole('button', { name: 'Speichern' }).click()
  await expect(matchdayDialog).toBeHidden()

  // Default-Filter der Spieltage-Liste ist "Nur abgerechnete" – ein frisch
  // angelegter Spieltag ist "offen" und wäre sonst unsichtbar.
  await page.locator('select:has(option[value="abgerechnet"])').selectOption('alle')

  await page.getByRole('link', { name: /Spieltag 1/ }).click()
  await expect(page.getByRole('heading', { name: 'Spieltag 1' })).toBeVisible()

  // Der Spieltags-Einsatz des Teilnehmers wird beim Anlegen eines neuen
  // Spieltags automatisch als matchday_entry übernommen (siehe Kommentar in
  // SeasonDetailPage.tsx) – kein manuelles Nachtragen nötig.

  // 6. Platzierung 1 setzen und Gewinne berechnen (bestätigt den nativen confirm()-Dialog)
  const rankingRow = page.locator('li').filter({ hasText: playerName })
  await rankingRow.getByRole('spinbutton').fill('1')
  await rankingRow.getByRole('spinbutton').press('Tab')

  page.once('dialog', (dialog) => dialog.accept())
  await page.getByRole('button', { name: 'Gewinne berechnen' }).click()

  // calculateMatchdayPayout() ist ein echter RPC-Roundtrip (RPC + reload()
  // aller Saison-Daten) – großzügigerer Timeout als das UI-Standard-Timeout.
  await expect(rankingRow.getByText('€', { exact: false })).toBeVisible({ timeout: 10_000 })

  // 8. Gewinn erscheint in der Konten-Übersicht
  await page.goto('/konten')
  await page.getByPlaceholder('Spieler suchen...').first().fill(playerName)
  const accountRow = page.locator('tr').filter({ hasText: playerName })
  // Spalten: Spieler, Beiträge gesamt, Eingezahlt, Ausgezahlt, Gewinne, Status.
  // Eingezahlt/Ausgezahlt sind hier zu Recht 0,00 € (keine Zahlung erfasst) –
  // nur die Gewinne-Spalte darf nicht 0,00 € sein.
  await expect(accountRow.locator('td').nth(4)).not.toHaveText('0,00 €')

  // Aufräumen: Testdaten nicht im gemeinsamen Dev-Projekt liegen lassen.
  await page.goto('/seasons')
  await page.getByRole('link', { name: new RegExp(seasonName) }).click()
  await page.getByRole('button', { name: 'Löschen' }).click()
  const deleteDialog = page.getByRole('dialog')
  await deleteDialog.locator('#confirm-season-name').fill(seasonName)
  await deleteDialog.getByRole('button', { name: 'Endgültig löschen' }).click()
  await expect(deleteDialog).toBeHidden()

  await page.goto('/players')
  await page.getByPlaceholder('Spieler suchen...').fill(playerName)
  page.once('dialog', (dialog) => dialog.accept())
  await page.locator('li').filter({ hasText: playerName }).getByRole('button', { name: 'Löschen' }).click()
})
