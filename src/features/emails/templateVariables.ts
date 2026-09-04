export interface TemplateVariable {
  token: string
  label: string
  description: string
}

// Einzige Quelle für die verfügbaren Variablen-Tokens – sowohl für die
// "Variable einfügen"-Buttons in SendEmailPage/EmailTemplatesPage als auch
// für renderTemplate() unten.
export const templateVariables: TemplateVariable[] = [
  { token: '{{Spielername}}', label: 'Spielername', description: 'Name des Spielers' },
  { token: '{{Vorname}}', label: 'Vorname', description: 'Vorname aus der Benutzerverwaltung (falls hinterlegt)' },
  { token: '{{Nachname}}', label: 'Nachname', description: 'Nachname aus der Benutzerverwaltung (falls hinterlegt)' },
  { token: '{{Kicktippname}}', label: 'Kicktippname', description: 'Anzeigename bei Kicktipp.de' },
  { token: '{{EMailadresse}}', label: 'E-Mailadresse', description: 'Hinterlegte E-Mailadresse' },
  { token: '{{OffenePosten}}', label: 'Offene Posten', description: 'Offener Betrag in der gewählten Bezugssaison' },
  { token: '{{Gewinne}}', label: 'Gewinne', description: 'Bereits verbuchte Gewinne in der gewählten Bezugssaison' },
]

// Variablen für die System-Vorlagen (Passwort-Reset/Neuanlage-Einladung/
// Abrechnungs-E-Mails, siehe 0061_email_system_templates.sql und
// 0072_settlement_notifications.sql) – andere Werte werden serverseitig erst
// beim jeweiligen Versand ermittelt (z. B. der Recovery-Link in
// send-password-reset/index.ts, Spielername/Gewinn in
// notify-matchday-settled/notify-season-settled). Gemeinsame Liste für alle
// System-Vorlagen (nicht pro system_key gefiltert) - harmlos, falls ein Token
// in einer Vorlage, in der es keine Wirkung hat, versehentlich eingefügt wird.
export const systemTemplateVariables: TemplateVariable[] = [
  { token: '{{Link}}', label: 'Link', description: 'Bestätigungs-/Passwort-Link (Passwort-Reset/Einladung)' },
  { token: '{{AppName}}', label: 'App-Name', description: 'Name der App (Erscheinungsbild-Einstellungen)' },
  { token: '{{Name}}', label: 'Name', description: 'Name des Empfängers (Passwort-Reset/Einladung)' },
  { token: '{{Spielername}}', label: 'Spielername', description: 'Name des Spielers (Abrechnungs-E-Mails)' },
  { token: '{{Kicktippname}}', label: 'Kicktippname', description: 'Anzeigename bei Kicktipp.de (Abrechnungs-E-Mails)' },
  { token: '{{SpieltagNummer}}', label: 'Spieltag-Nummer', description: 'Nummer des abgerechneten Spieltags' },
  { token: '{{SpieltagGewinn}}', label: 'Spieltag-Gewinn', description: 'Gewinn des Spielers für diesen Spieltag' },
  { token: '{{SaisonName}}', label: 'Saison-Name', description: 'Name der Saison (Gesamtwertung-Abrechnung)' },
  { token: '{{Gewinne}}', label: 'Gewinne', description: 'Gewinn des Spielers in der Gesamtwertung' },
]

export interface RecipientVariables {
  Spielername: string
  Vorname: string
  Nachname: string
  Kicktippname: string
  EMailadresse: string
  OffenePosten: string
  Gewinne: string
}

export function renderTemplate(text: string, vars: RecipientVariables): string {
  return text
    .replaceAll('{{Spielername}}', vars.Spielername)
    .replaceAll('{{Vorname}}', vars.Vorname)
    .replaceAll('{{Nachname}}', vars.Nachname)
    .replaceAll('{{Kicktippname}}', vars.Kicktippname)
    .replaceAll('{{EMailadresse}}', vars.EMailadresse)
    .replaceAll('{{OffenePosten}}', vars.OffenePosten)
    .replaceAll('{{Gewinne}}', vars.Gewinne)
}

/** Fügt ein Variablen-Token an der aktuellen Cursor-Position eines kontrollierten Input/Textarea-Felds ein. */
export function insertVariableAtCursor(
  el: HTMLInputElement | HTMLTextAreaElement | null,
  value: string,
  setValue: (next: string) => void,
  token: string,
): void {
  if (!el) {
    setValue(value + token)
    return
  }
  const start = el.selectionStart ?? value.length
  const end = el.selectionEnd ?? value.length
  setValue(value.slice(0, start) + token + value.slice(end))
  requestAnimationFrame(() => {
    el.focus()
    const pos = start + token.length
    el.setSelectionRange(pos, pos)
  })
}

// Body-Textarea ist reiner Text; Variablen werden zuerst textuell ersetzt und
// erst danach als Ganzes HTML-escaped – so werden weder Vorlagen-Text noch
// eingesetzte Spielernamen zu einem XSS-Vektor im E-Mail-HTML.
export function textToHtml(text: string): string {
  const escaped = text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  return `<p>${escaped.replace(/\n/g, '<br>')}</p>`
}
