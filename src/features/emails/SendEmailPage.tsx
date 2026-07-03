import { useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { Button } from '../../components/ui/Button'
import { currencyFormatter } from '../../lib/format'
import { listEmailTemplates } from './emailTemplatesApi'
import { sendBulkEmail, type BulkEmailResult } from './emailSendApi'
import {
  computeSeasonBalancesByPlayerId,
  listPlayersWithProfiles,
  resolveMatchdayWinnerIds,
  resolveSeasonWinnerIds,
  type PlayerSeasonBalance,
  type PlayerWithProfile,
} from './recipientsApi'
import {
  insertVariableAtCursor,
  renderTemplate,
  templateVariables,
  textToHtml,
  type RecipientVariables,
} from './templateVariables'
import { listMatchdays } from '../seasons/matchdaysApi'
import { listSeasons } from '../seasons/seasonsApi'
import type { EmailTemplate, Matchday, Season } from '../../types/database'

type RecipientMode = 'players' | 'matchday_winners' | 'season_winners' | 'outstanding'

const modeLabels: Record<RecipientMode, string> = {
  players: 'Einzelner / mehrere Spieler',
  matchday_winners: 'Spieltagsgewinner',
  season_winners: 'Gesamtgewinner',
  outstanding: 'Spieler mit offenen Posten',
}

function recipientVariablesFor(player: PlayerWithProfile, balance: PlayerSeasonBalance): RecipientVariables {
  return {
    Spielername: player.name,
    Vorname: player.profile?.vorname ?? '',
    Nachname: player.profile?.nachname ?? '',
    Kicktippname: player.kicktipp_name ?? '',
    EMailadresse: player.profile?.email ?? '',
    OffenePosten: currencyFormatter.format(balance.offen),
    Gewinne: currencyFormatter.format(balance.gewinneGesamt),
  }
}

export function SendEmailPage() {
  const [seasons, setSeasons] = useState<Season[]>([])
  const [players, setPlayers] = useState<PlayerWithProfile[]>([])
  const [templates, setTemplates] = useState<EmailTemplate[]>([])
  const [matchdays, setMatchdays] = useState<Matchday[]>([])
  const [balances, setBalances] = useState<Map<string, PlayerSeasonBalance>>(new Map())

  const [selectedSeasonId, setSelectedSeasonId] = useState('')
  const [selectedMatchdayId, setSelectedMatchdayId] = useState('')
  const [recipientMode, setRecipientMode] = useState<RecipientMode>('players')
  const [selectedPlayerIds, setSelectedPlayerIds] = useState<Set<string>>(new Set())
  const [playerSearch, setPlayerSearch] = useState('')
  const [modeResolvedIds, setModeResolvedIds] = useState<Set<string>>(new Set())
  const [excludedIds, setExcludedIds] = useState<Set<string>>(new Set())

  const [selectedTemplateId, setSelectedTemplateId] = useState('')
  const [subject, setSubject] = useState('')
  const [bodyText, setBodyText] = useState('')
  const subjectRef = useRef<HTMLInputElement>(null)
  const bodyRef = useRef<HTMLTextAreaElement>(null)
  const [lastFocused, setLastFocused] = useState<'subject' | 'body'>('body')

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [sending, setSending] = useState(false)
  const [results, setResults] = useState<BulkEmailResult[] | null>(null)

  useEffect(() => {
    Promise.all([listSeasons(), listPlayersWithProfiles(), listEmailTemplates()])
      .then(([seasonData, playerData, templateData]) => {
        setSeasons(seasonData)
        setPlayers(playerData)
        setTemplates(templateData)
        if (seasonData.length > 0) setSelectedSeasonId(seasonData[0].id)
        setError(null)
      })
      .catch((err) => setError(err instanceof Error ? err.message : 'Daten konnten nicht geladen werden.'))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    if (!selectedSeasonId) return
    listMatchdays(selectedSeasonId)
      .then(setMatchdays)
      .catch((err) => setError(err instanceof Error ? err.message : 'Spieltage konnten nicht geladen werden.'))
    computeSeasonBalancesByPlayerId(selectedSeasonId)
      .then(setBalances)
      .catch((err) => setError(err instanceof Error ? err.message : 'Kontostände konnten nicht geladen werden.'))
  }, [selectedSeasonId])

  useEffect(() => {
    setSelectedMatchdayId((prev) =>
      matchdays.length === 0 ? '' : matchdays.some((m) => m.id === prev) ? prev : matchdays[matchdays.length - 1].id,
    )
  }, [matchdays])

  useEffect(() => {
    setExcludedIds(new Set())
  }, [recipientMode, selectedSeasonId, selectedMatchdayId])

  useEffect(() => {
    let cancelled = false
    if (recipientMode === 'matchday_winners') {
      if (!selectedMatchdayId) {
        setModeResolvedIds(new Set())
        return
      }
      resolveMatchdayWinnerIds(selectedMatchdayId).then((ids) => {
        if (!cancelled) setModeResolvedIds(ids)
      })
    } else if (recipientMode === 'season_winners') {
      if (!selectedSeasonId) {
        setModeResolvedIds(new Set())
        return
      }
      resolveSeasonWinnerIds(selectedSeasonId).then((ids) => {
        if (!cancelled) setModeResolvedIds(ids)
      })
    } else if (recipientMode === 'outstanding') {
      setModeResolvedIds(new Set([...balances.entries()].filter(([, b]) => b.offen > 0).map(([id]) => id)))
    }
    return () => {
      cancelled = true
    }
  }, [recipientMode, selectedMatchdayId, selectedSeasonId, balances])

  const baseRecipientIds = recipientMode === 'players' ? selectedPlayerIds : modeResolvedIds

  const resolvedRecipients = useMemo(() => {
    return players
      .filter((p) => baseRecipientIds.has(p.id))
      .map((player) => ({
        player,
        balance: balances.get(player.id) ?? { offen: 0, gewinneGesamt: 0 },
        contactable: !!player.profile?.email && player.profile.is_active,
        excluded: excludedIds.has(player.id),
      }))
      .sort((a, b) => a.player.name.localeCompare(b.player.name))
  }, [players, baseRecipientIds, balances, excludedIds])

  const contactableRecipients = resolvedRecipients.filter((r) => r.contactable && !r.excluded)

  const filteredPlayers = useMemo(() => {
    const term = playerSearch.trim().toLowerCase()
    if (!term) return players
    return players.filter((p) => p.name.toLowerCase().includes(term))
  }, [players, playerSearch])

  function togglePlayer(playerId: string) {
    setSelectedPlayerIds((prev) => {
      const next = new Set(prev)
      if (next.has(playerId)) next.delete(playerId)
      else next.add(playerId)
      return next
    })
  }

  function toggleExcluded(playerId: string) {
    setExcludedIds((prev) => {
      const next = new Set(prev)
      if (next.has(playerId)) next.delete(playerId)
      else next.add(playerId)
      return next
    })
  }

  function applyTemplate(templateId: string) {
    setSelectedTemplateId(templateId)
    const template = templates.find((t) => t.id === templateId)
    if (template) {
      setSubject(template.subject)
      setBodyText(template.body_text)
    }
  }

  function insertToken(token: string) {
    if (lastFocused === 'subject') {
      insertVariableAtCursor(subjectRef.current, subject, setSubject, token)
    } else {
      insertVariableAtCursor(bodyRef.current, bodyText, setBodyText, token)
    }
  }

  const previewRecipient = contactableRecipients[0]
  const previewVars = previewRecipient ? recipientVariablesFor(previewRecipient.player, previewRecipient.balance) : null

  async function handleSend() {
    if (contactableRecipients.length === 0) return
    if (!subject.trim() || !bodyText.trim()) {
      setError('Betreff und Text sind erforderlich.')
      return
    }
    if (!confirm(`E-Mail an ${contactableRecipients.length} Empfänger senden?`)) return

    setSending(true)
    setError(null)
    setResults(null)
    try {
      const recipients = contactableRecipients.map(({ player, balance }) => {
        const vars = recipientVariablesFor(player, balance)
        return {
          to: player.profile!.email!,
          subject: renderTemplate(subject, vars),
          html: textToHtml(renderTemplate(bodyText, vars)),
        }
      })
      setResults(await sendBulkEmail(recipients))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Versand fehlgeschlagen.')
    } finally {
      setSending(false)
    }
  }

  if (loading) {
    return <p className="p-4 text-sm text-slate-500 sm:p-6">Lade...</p>
  }

  return (
    <div className="p-4 sm:p-6">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-xl font-semibold text-slate-900">E-Mail versenden</h1>
        <Link to="/emails/vorlagen" className="text-sm font-medium text-slate-600 hover:underline">
          Vorlagen verwalten →
        </Link>
      </div>

      {error && <p className="mb-4 text-sm text-red-600">{error}</p>}

      {seasons.length === 0 ? (
        <p className="text-sm text-slate-500">Noch keine Saisons vorhanden.</p>
      ) : (
        <div className="space-y-6">
          <section className="rounded-xl border border-slate-200 bg-white p-4">
            <h2 className="mb-3 text-sm font-semibold text-slate-900">1. Bezugssaison</h2>
            <p className="mb-2 text-xs text-slate-500">
              Bestimmt, für welche Saison offene Posten und Gewinne (Variablen) berechnet werden – unabhängig vom
              gewählten Empfänger-Modus.
            </p>
            <select
              value={selectedSeasonId}
              onChange={(e) => setSelectedSeasonId(e.target.value)}
              className="w-full max-w-sm rounded-lg border border-slate-300 px-3 py-2 text-base focus:border-slate-900 focus:outline-none"
            >
              {seasons.map((season) => (
                <option key={season.id} value={season.id}>
                  {season.name}
                </option>
              ))}
            </select>
          </section>

          <section className="rounded-xl border border-slate-200 bg-white p-4">
            <h2 className="mb-3 text-sm font-semibold text-slate-900">2. Empfänger</h2>
            <div className="mb-3 flex flex-wrap gap-2">
              {(Object.keys(modeLabels) as RecipientMode[]).map((mode) => (
                <button
                  key={mode}
                  type="button"
                  onClick={() => setRecipientMode(mode)}
                  className={`rounded-full px-3 py-1.5 text-xs font-medium ${
                    recipientMode === mode
                      ? 'bg-[var(--color-primary)] text-white'
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  {modeLabels[mode]}
                </button>
              ))}
            </div>

            {recipientMode === 'matchday_winners' && (
              <div className="mb-3">
                <select
                  value={selectedMatchdayId}
                  onChange={(e) => setSelectedMatchdayId(e.target.value)}
                  className="w-full max-w-sm rounded-lg border border-slate-300 px-3 py-2 text-base focus:border-slate-900 focus:outline-none"
                >
                  {matchdays.length === 0 && <option value="">Keine Spieltage vorhanden</option>}
                  {matchdays.map((m) => (
                    <option key={m.id} value={m.id}>
                      Spieltag {m.nummer}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {recipientMode === 'players' && (
              <div className="mb-3">
                <input
                  type="text"
                  value={playerSearch}
                  onChange={(e) => setPlayerSearch(e.target.value)}
                  placeholder="Spieler suchen..."
                  className="mb-2 w-full max-w-sm rounded-lg border border-slate-300 px-2 py-1.5 text-sm focus:border-slate-900 focus:outline-none"
                />
                <div className="max-h-48 max-w-sm overflow-y-auto rounded-lg border border-slate-200 p-2">
                  {filteredPlayers.length === 0 ? (
                    <p className="px-1 py-2 text-sm text-slate-500">Keine Treffer.</p>
                  ) : (
                    filteredPlayers.map((player) => (
                      <label key={player.id} className="flex items-center gap-2 px-1 py-1.5 text-sm">
                        <input
                          type="checkbox"
                          checked={selectedPlayerIds.has(player.id)}
                          onChange={() => togglePlayer(player.id)}
                          className="h-4 w-4 shrink-0"
                        />
                        <span className="truncate text-slate-700">{player.name}</span>
                      </label>
                    ))
                  )}
                </div>
              </div>
            )}

            <p className="mb-2 text-xs text-slate-500">
              {resolvedRecipients.length} Spieler gefunden, davon {contactableRecipients.length} kontaktierbar
              (verknüpftes aktives Profil mit E-Mailadresse).
            </p>

            {resolvedRecipients.length > 0 && (
              <div className="overflow-x-auto rounded-lg border border-slate-200">
                <table className="w-full min-w-[520px] text-sm">
                  <thead>
                    <tr className="border-b border-slate-200 text-left text-slate-500">
                      <th className="w-8 px-3 py-2"></th>
                      <th className="px-3 py-2 font-medium">Spieler</th>
                      <th className="px-3 py-2 font-medium">Kicktippname</th>
                      <th className="px-3 py-2 font-medium">E-Mail</th>
                      <th className="px-3 py-2 text-right font-medium">Offen</th>
                      <th className="px-3 py-2 text-right font-medium">Gewinne</th>
                    </tr>
                  </thead>
                  <tbody>
                    {resolvedRecipients.map(({ player, balance, contactable, excluded }) => (
                      <tr
                        key={player.id}
                        className={`border-b border-slate-100 last:border-0 ${!contactable ? 'opacity-50' : ''}`}
                      >
                        <td className="px-3 py-2">
                          <input
                            type="checkbox"
                            checked={!excluded}
                            disabled={!contactable}
                            onChange={() => toggleExcluded(player.id)}
                            className="h-4 w-4"
                          />
                        </td>
                        <td className="px-3 py-2 font-medium text-slate-900">{player.name}</td>
                        <td className="px-3 py-2 text-slate-600">{player.kicktipp_name || '—'}</td>
                        <td className="px-3 py-2 text-slate-600">
                          {contactable ? player.profile?.email : 'kann nicht kontaktiert werden'}
                        </td>
                        <td className="px-3 py-2 text-right text-slate-700">{currencyFormatter.format(balance.offen)}</td>
                        <td className="px-3 py-2 text-right text-slate-700">
                          {currencyFormatter.format(balance.gewinneGesamt)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          <section className="rounded-xl border border-slate-200 bg-white p-4">
            <h2 className="mb-3 text-sm font-semibold text-slate-900">3. Inhalt</h2>

            <div className="mb-3">
              <label htmlFor="template-select" className="mb-1 block text-sm font-medium text-slate-700">
                Vorlage
              </label>
              <select
                id="template-select"
                value={selectedTemplateId}
                onChange={(e) => applyTemplate(e.target.value)}
                className="w-full max-w-sm rounded-lg border border-slate-300 px-3 py-2 text-base focus:border-slate-900 focus:outline-none"
              >
                <option value="">Eigener Text</option>
                {templates.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="mb-3">
              <label htmlFor="send-subject" className="mb-1 block text-sm font-medium text-slate-700">
                Betreff
              </label>
              <input
                id="send-subject"
                ref={subjectRef}
                value={subject}
                onFocus={() => setLastFocused('subject')}
                onChange={(e) => setSubject(e.target.value)}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-base focus:border-slate-900 focus:outline-none"
              />
            </div>

            <div className="mb-3">
              <label htmlFor="send-body" className="mb-1 block text-sm font-medium text-slate-700">
                Text
              </label>
              <textarea
                id="send-body"
                ref={bodyRef}
                value={bodyText}
                onFocus={() => setLastFocused('body')}
                onChange={(e) => setBodyText(e.target.value)}
                rows={8}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-base focus:border-slate-900 focus:outline-none"
              />
            </div>

            <div className="mb-4">
              <p className="mb-1 text-xs font-medium text-slate-500">
                Variable einfügen (an der Cursor-Position in Betreff oder Text):
              </p>
              <div className="flex flex-wrap gap-1.5">
                {templateVariables.map((v) => (
                  <button
                    key={v.token}
                    type="button"
                    title={v.description}
                    onClick={() => insertToken(v.token)}
                    className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-700 hover:bg-slate-200"
                  >
                    {v.label}
                  </button>
                ))}
              </div>
            </div>

            {previewRecipient && previewVars && (
              <div className="rounded-lg bg-slate-50 p-3">
                <p className="mb-1 text-xs font-medium text-slate-500">
                  Vorschau für {previewRecipient.player.name}:
                </p>
                <p className="text-sm font-medium text-slate-900">{renderTemplate(subject, previewVars)}</p>
                <p className="mt-1 whitespace-pre-wrap text-sm text-slate-700">
                  {renderTemplate(bodyText, previewVars)}
                </p>
              </div>
            )}
          </section>

          <section className="rounded-xl border border-slate-200 bg-white p-4">
            <h2 className="mb-3 text-sm font-semibold text-slate-900">4. Versand</h2>
            <Button onClick={handleSend} disabled={sending || contactableRecipients.length === 0}>
              {sending ? 'Sende...' : `An ${contactableRecipients.length} Empfänger senden`}
            </Button>

            {results && (
              <ul className="mt-4 divide-y divide-slate-100 rounded-lg border border-slate-200">
                {results.map((r) => (
                  <li key={r.to} className="flex items-center justify-between gap-3 px-3 py-2 text-sm">
                    <span className="text-slate-700">{r.to}</span>
                    {r.ok ? (
                      <span className="text-emerald-700">✓ Gesendet</span>
                    ) : (
                      <span className="text-red-600">✗ {r.error}</span>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      )}
    </div>
  )
}
