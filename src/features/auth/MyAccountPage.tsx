import { useEffect, useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { Button } from '../../components/ui/Button'
import { useAuth } from './useAuth'
import { requestOwnEmailChange, updateOwnName, updateOwnPassword } from './myAccountApi'
import { getPasswordPolicy } from '../password-policy/passwordPolicyApi'
import { describePasswordPolicy, validatePasswordAgainstPolicy } from '../../lib/passwordValidation'
import { listPlayers } from '../players/playersApi'
import { listPlayerProfileLinks } from '../players/playerProfileLinksApi'
import { listZahlungen } from '../players/zahlungenApi'
import { listPlayerTransactions } from '../balances/balancesApi'
import { centsToEuros } from '../../lib/money'
import type { PasswordPolicy, Player, UserRole } from '../../types/database'
import { useMobileInstance } from '../../mobile/MobileInstanceContext'

const roleLabels = { admin: 'Administrator', spielleiter: 'Spielleiter', user: 'Spieler' } as const

export function MyAccountPage() {
  const { profile, refreshProfile, switchToRole, switchBackToBaseRole, can } = useAuth()
  const isBetaBuild = import.meta.env.VITE_APP_CHANNEL === 'beta'
  // Nur im mobile-Kanal gesetzt (siehe MobileApp.tsx) – auf main/beta bleibt
  // dies immer null, der Abschnitt unten wird dort also nie gerendert.
  const mobileInstance = useMobileInstance()

  const [name, setName] = useState(profile?.name ?? '')
  const [nameError, setNameError] = useState<string | null>(null)
  const [nameSuccess, setNameSuccess] = useState<string | null>(null)
  const [savingName, setSavingName] = useState(false)

  const [email, setEmail] = useState(profile?.email ?? '')
  const [emailError, setEmailError] = useState<string | null>(null)
  const [emailSuccess, setEmailSuccess] = useState<string | null>(null)
  const [savingEmail, setSavingEmail] = useState(false)

  const [switching, setSwitching] = useState(false)
  const [switchError, setSwitchError] = useState<string | null>(null)

  const [exportingData, setExportingData] = useState(false)
  const [exportError, setExportError] = useState<string | null>(null)

  async function handleSwitchTo(role: UserRole) {
    setSwitching(true)
    setSwitchError(null)
    const { error } = await switchToRole(role)
    if (error) setSwitchError(error)
    setSwitching(false)
  }

  async function handleSwitchBack() {
    setSwitching(true)
    setSwitchError(null)
    const { error } = await switchBackToBaseRole()
    if (error) setSwitchError(error)
    setSwitching(false)
  }

  const [passwordPolicy, setPasswordPolicy] = useState<PasswordPolicy | null>(null)
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [passwordError, setPasswordError] = useState<string | null>(null)
  const [passwordSuccess, setPasswordSuccess] = useState<string | null>(null)
  const [savingPassword, setSavingPassword] = useState(false)

  useEffect(() => {
    getPasswordPolicy()
      .then(setPasswordPolicy)
      .catch(() => {
        // Ohne geladene Richtlinie greift serverseitig trotzdem der
        // dortige Default (siehe update-own-password) – hier nur relevant
        // für die client-seitige Vorab-Prüfung/Anzeige.
      })
  }, [])

  const [linkedPlayers, setLinkedPlayers] = useState<Player[]>([])

  useEffect(() => {
    if (!profile) return
    Promise.all([listPlayers({ includeInactive: true }), listPlayerProfileLinks()])
      .then(([players, links]) => {
        const linkedPlayerIds = new Set(links.filter((l) => l.profile_id === profile.id).map((l) => l.player_id))
        setLinkedPlayers(players.filter((p) => linkedPlayerIds.has(p.id)))
      })
      .catch(() => setLinkedPlayers([]))
  }, [profile])

  // Selbstauskunft/Datenexport: nutzt ausschließlich Daten, die über
  // bestehende RLS-Policies für "eigene Daten" ohnehin schon lesbar sind
  // (siehe is_own_player() in 0041_player_profile_links.sql) – kein neuer
  // Berechtigungscode nötig, nur eine lesbare Zusammenstellung.
  async function handleDownloadData() {
    if (!profile) return
    setExportingData(true)
    setExportError(null)
    try {
      const [transactionsByPlayer, zahlungenByPlayer] = await Promise.all([
        Promise.all(linkedPlayers.map((p) => listPlayerTransactions(p.id))),
        Promise.all(linkedPlayers.map((p) => listZahlungen(p.id))),
      ])
      const data = {
        exportiert_am: new Date().toISOString(),
        profil: {
          name: profile.name,
          vorname: profile.vorname,
          nachname: profile.nachname,
          email: profile.email,
          rolle: profile.role,
        },
        spieler: linkedPlayers.map((player, i) => ({
          name: player.name,
          kicktipp_name: player.kicktipp_name,
          transaktionen: transactionsByPlayer[i].map((t) => ({ ...t, betrag: centsToEuros(t.betrag) })),
          zahlungen: zahlungenByPlayer[i].map((z) => ({ ...z, betrag: centsToEuros(z.betrag) })),
        })),
      }
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `meine-daten-${new Date().toISOString().slice(0, 10)}.json`
      a.click()
      URL.revokeObjectURL(url)
    } catch (err) {
      setExportError(err instanceof Error ? err.message : 'Export fehlgeschlagen.')
    } finally {
      setExportingData(false)
    }
  }

  async function handleNameSubmit(e: FormEvent) {
    e.preventDefault()
    if (!profile) return
    if (!name.trim()) {
      setNameError('Name darf nicht leer sein.')
      return
    }
    setSavingName(true)
    setNameError(null)
    setNameSuccess(null)
    try {
      await updateOwnName(profile.id, name.trim())
      await refreshProfile()
      setNameSuccess('Name gespeichert.')
    } catch (err) {
      setNameError(err instanceof Error ? err.message : 'Speichern fehlgeschlagen.')
    } finally {
      setSavingName(false)
    }
  }

  async function handleEmailSubmit(e: FormEvent) {
    e.preventDefault()
    if (!email.trim()) {
      setEmailError('E-Mail darf nicht leer sein.')
      return
    }
    setSavingEmail(true)
    setEmailError(null)
    setEmailSuccess(null)
    try {
      await requestOwnEmailChange(email.trim())
      setEmailSuccess('Bestätigungsmail verschickt. Bitte den Link in der Mail an die neue Adresse anklicken.')
    } catch (err) {
      setEmailError(err instanceof Error ? err.message : 'Speichern fehlgeschlagen.')
    } finally {
      setSavingEmail(false)
    }
  }

  async function handlePasswordSubmit(e: FormEvent) {
    e.preventDefault()
    if (passwordPolicy) {
      const policyError = validatePasswordAgainstPolicy(newPassword, passwordPolicy)
      if (policyError) {
        setPasswordError(policyError)
        return
      }
    }
    if (newPassword !== confirmPassword) {
      setPasswordError('Passwörter stimmen nicht überein.')
      return
    }
    setSavingPassword(true)
    setPasswordError(null)
    setPasswordSuccess(null)
    try {
      await updateOwnPassword(newPassword)
      setPasswordSuccess('Passwort geändert.')
      setNewPassword('')
      setConfirmPassword('')
    } catch (err) {
      setPasswordError(err instanceof Error ? err.message : 'Speichern fehlgeschlagen.')
    } finally {
      setSavingPassword(false)
    }
  }

  if (!profile) return null

  return (
    <div className="p-4 sm:p-6">
      <h1 className="mb-6 text-xl font-semibold text-slate-900">Mein Profil</h1>

      <div className="mb-6 rounded-xl border border-slate-200 bg-white p-4">
        <h2 className="mb-3 text-base font-semibold text-slate-900">Stammdaten</h2>
        <form className="space-y-4" onSubmit={handleNameSubmit}>
          <div>
            <label htmlFor="account-name" className="mb-1 block text-sm font-medium text-slate-700">
              Name
            </label>
            <input
              id="account-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-base focus:border-slate-900 focus:outline-none"
            />
          </div>
          <div>
            <p className="mb-1 text-sm font-medium text-slate-700">Rolle</p>
            <p className="rounded-lg bg-slate-50 px-3 py-2 text-base text-slate-500">
              {roleLabels[profile.role]}
              {profile.base_role && ` (eigentliche Rolle: ${roleLabels[profile.base_role]})`}
            </p>
          </div>

          {nameError && <p role="alert" className="text-sm text-red-600">{nameError}</p>}
          {nameSuccess && <p className="text-sm text-emerald-700">{nameSuccess}</p>}

          <Button type="submit" disabled={savingName}>
            {savingName ? 'Speichern...' : 'Name speichern'}
          </Button>
        </form>
      </div>

      <div className="mb-6 rounded-xl border border-slate-200 bg-white p-4">
        <h2 className="mb-3 text-base font-semibold text-slate-900">E-Mail-Adresse</h2>
        <form className="space-y-4" onSubmit={handleEmailSubmit}>
          <div>
            <label htmlFor="account-email" className="mb-1 block text-sm font-medium text-slate-700">
              E-Mail
            </label>
            <input
              id="account-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-base focus:border-slate-900 focus:outline-none"
            />
            <p className="mt-1 text-xs text-slate-500">
              Diese Adresse wird auch für die Anmeldung verwendet. Wird erst nach Bestätigung per E-Mail übernommen.
            </p>
          </div>

          {emailError && <p role="alert" className="text-sm text-red-600">{emailError}</p>}
          {emailSuccess && <p className="text-sm text-emerald-700">{emailSuccess}</p>}

          <Button type="submit" disabled={savingEmail}>
            {savingEmail ? 'Wird verschickt...' : 'Bestätigungsmail senden'}
          </Button>
        </form>
      </div>

      <div className="mb-6 rounded-xl border border-slate-200 bg-white p-4">
        <h2 className="mb-1 text-base font-semibold text-slate-900">Meine Daten</h2>
        <p className="mb-3 text-sm text-slate-500">
          Lade eine Übersicht deiner gespeicherten Daten (Profil, verknüpfte Spieler, eigene Transaktionen und
          Zahlungen) als Datei herunter – siehe auch{' '}
          <Link to="/datenschutz" className="underline">
            Datenschutzerklärung
          </Link>
          .
        </p>
        {exportError && <p role="alert" className="mb-3 text-sm text-red-600">{exportError}</p>}
        <Button variant="secondary" onClick={handleDownloadData} disabled={exportingData}>
          {exportingData ? 'Wird zusammengestellt...' : 'Meine Daten herunterladen'}
        </Button>
      </div>

      {linkedPlayers.length > 0 && (
        <div className="mb-6 rounded-xl border border-slate-200 bg-white p-4">
          <h2 className="mb-3 text-base font-semibold text-slate-900">Meine Spieler</h2>
          <ul className="divide-y divide-slate-200 overflow-hidden rounded-xl border border-slate-200">
            {linkedPlayers.map((player) => (
              <li key={player.id}>
                <Link to={`/players/${player.id}`} className="block px-4 py-3 hover:bg-slate-50">
                  <p className="font-medium text-slate-900">{player.name}</p>
                  <p className="text-sm text-slate-500">Kicktipp: {player.kicktipp_name || '—'}</p>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}

      {mobileInstance && (
        <div className="mb-6 rounded-xl border border-slate-200 bg-white p-4">
          <h2 className="mb-1 text-base font-semibold text-slate-900">Instanz</h2>
          <p className="mb-3 text-sm text-slate-500">
            Aktuell verbunden mit <span className="font-medium text-slate-700">{mobileInstance.activeInstance.name}</span> (
            {mobileInstance.activeInstance.url}).
          </p>
          <Button variant="secondary" onClick={mobileInstance.switchInstance}>
            Instanz wechseln
          </Button>
        </div>
      )}

      {(isBetaBuild || can('beta.access')) && (
        <div className="mb-6 rounded-xl border border-slate-200 bg-white p-4">
          <h2 className="mb-1 text-base font-semibold text-slate-900">Beta-Version</h2>
          {isBetaBuild ? (
            <>
              <p className="mb-3 text-sm text-slate-500">
                Du nutzt gerade die Beta-Version mit neueren, noch nicht final freigegebenen Funktionen – dieselbe
                Anmeldung, dieselben Daten wie die Produktivversion.
              </p>
              {/* Normaler Link statt React-Router-Link: /beta/ ist ein eigenes
                  Bundle, ein Wechsel braucht einen echten Seitenaufruf. */}
              <a
                href="/"
                className="inline-block rounded-lg bg-[var(--color-primary)] px-4 py-2.5 text-sm font-medium text-white transition hover:bg-[var(--color-primary-hover)]"
              >
                Zurück zur Produktivversion
              </a>
            </>
          ) : (
            <>
              <p className="mb-3 text-sm text-slate-500">
                Teste neue, noch nicht final freigegebene Funktionen – dieselbe Anmeldung, dieselben Daten wie die
                Produktivversion.
              </p>
              <a
                href="/beta/"
                className="inline-block rounded-lg bg-[var(--color-primary)] px-4 py-2.5 text-sm font-medium text-white transition hover:bg-[var(--color-primary-hover)]"
              >
                Beta-Version testen
              </a>
            </>
          )}
        </div>
      )}

      {(profile.role === 'admin' || profile.role === 'spielleiter') && !profile.base_role && (
        <div className="mb-6 rounded-xl border border-slate-200 bg-white p-4">
          <h2 className="mb-1 text-base font-semibold text-slate-900">Als andere Rolle agieren</h2>
          <p className="mb-3 text-sm text-slate-500">
            Wechselt deine Rolle tatsächlich – die Funktionen deiner jetzigen Rolle sind währenddessen wirklich
            nicht mehr nutzbar (kein Vorschau-Modus). Jederzeit über diese Seite rückgängig zu machen.
          </p>
          {switchError && <p role="alert" className="mb-3 text-sm text-red-600">{switchError}</p>}
          <div className="flex flex-wrap gap-2">
            {profile.role === 'admin' && (
              <Button variant="secondary" onClick={() => handleSwitchTo('spielleiter')} disabled={switching}>
                {switching ? 'Wechsle...' : 'Als Spielleiter agieren'}
              </Button>
            )}
            <Button variant="secondary" onClick={() => handleSwitchTo('user')} disabled={switching}>
              {switching ? 'Wechsle...' : 'Als Spieler agieren'}
            </Button>
          </div>
        </div>
      )}

      {profile.base_role && (
        <div className="mb-6 rounded-xl border border-amber-200 bg-amber-50 p-4">
          <h2 className="mb-1 text-base font-semibold text-amber-900">Du agierst als {roleLabels[profile.role]}</h2>
          <p className="mb-3 text-sm text-amber-800">
            Eigentliche Rolle: {roleLabels[profile.base_role]}. Funktionen der eigentlichen Rolle sind bis zum
            Zurückwechseln nicht sichtbar.
          </p>
          {switchError && <p role="alert" className="mb-3 text-sm text-red-600">{switchError}</p>}
          <Button onClick={handleSwitchBack} disabled={switching}>
            {switching ? 'Wechsle zurück...' : `Zurück zu ${roleLabels[profile.base_role]}`}
          </Button>
        </div>
      )}

      <div className="rounded-xl border border-slate-200 bg-white p-4">
        <h2 className="mb-1 text-base font-semibold text-slate-900">Passwort ändern</h2>
        {passwordPolicy && (
          <p className="mb-3 text-xs text-slate-500">{describePasswordPolicy(passwordPolicy)}</p>
        )}
        <form className="space-y-4" onSubmit={handlePasswordSubmit}>
          <div>
            <label htmlFor="account-new-password" className="mb-1 block text-sm font-medium text-slate-700">
              Neues Passwort
            </label>
            <input
              id="account-new-password"
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-base focus:border-slate-900 focus:outline-none"
            />
          </div>
          <div>
            <label htmlFor="account-confirm-password" className="mb-1 block text-sm font-medium text-slate-700">
              Neues Passwort bestätigen
            </label>
            <input
              id="account-confirm-password"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-base focus:border-slate-900 focus:outline-none"
            />
          </div>

          {passwordError && <p role="alert" className="text-sm text-red-600">{passwordError}</p>}
          {passwordSuccess && <p className="text-sm text-emerald-700">{passwordSuccess}</p>}

          <Button type="submit" disabled={savingPassword}>
            {savingPassword ? 'Speichern...' : 'Passwort ändern'}
          </Button>
        </form>
      </div>
    </div>
  )
}
