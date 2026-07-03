import { useCallback, useEffect, useState } from 'react'
import { Button } from '../../components/ui/Button'
import { currencyFormatter } from '../../lib/format'
import { getPayoutPool, hasPayouts, listPayoutRules, setPayoutRules } from './payoutRulesApi'
import type { PayoutTyp } from '../../types/database'

interface PayoutRulesEditorProps {
  seasonId: string
  typ: PayoutTyp
  title: string
  canManage: boolean
}

const SUM_TOLERANCE = 0.01

function parsePercent(value: string): number {
  return Number(value.replace(',', '.'))
}

function roundCents(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100
}

/**
 * Euro-Beträge je Platz aus den (ggf. noch in Bearbeitung befindlichen)
 * Prozentsätzen, gegen den Gesamttopf gerechnet. Da jeder Platz einzeln
 * kaufmännisch gerundet wird, könnte die Summe der gerundeten Beträge den
 * Topf (100 %) um Rundungscents über- oder unterschreiten – der unterste
 * Gewinnrang bekommt daher den exakten Rest, sodass die angezeigte Summe nie
 * über dem Topf liegt.
 */
function computeAmounts(percents: number[], pool: number): number[] {
  const naive = percents.map((pct) => roundCents((pool * pct) / 100))
  return naive.map((amount, i) => {
    if (i < naive.length - 1) return amount
    const sumOthers = naive.slice(0, -1).reduce((s, a) => s + a, 0)
    return roundCents(pool - sumOthers)
  })
}

export function PayoutRulesEditor({ seasonId, typ, title, canManage }: PayoutRulesEditorProps) {
  const [savedPercents, setSavedPercents] = useState<number[]>([])
  const [draftPercents, setDraftPercents] = useState<string[]>([])
  const [paidOut, setPaidOut] = useState(false)
  const [pool, setPool] = useState(0)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const reload = useCallback(async () => {
    setLoading(true)
    try {
      const [rules, payoutsExist, poolAmount] = await Promise.all([
        listPayoutRules(seasonId, typ),
        hasPayouts(seasonId, typ),
        getPayoutPool(seasonId, typ),
      ])
      const percents = rules.map((r) => r.prozent_anteil)
      setSavedPercents(percents)
      setDraftPercents(percents.map((p) => String(p)))
      setPaidOut(payoutsExist)
      setPool(poolAmount)
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gewinnverteilung konnte nicht geladen werden.')
    } finally {
      setLoading(false)
    }
  }, [seasonId, typ])

  useEffect(() => {
    reload()
  }, [reload])

  const sum = draftPercents.reduce((acc, value) => acc + (parsePercent(value) || 0), 0)
  const allValid = draftPercents.every((value) => {
    const n = parsePercent(value)
    return Number.isFinite(n) && n > 0 && n <= 100
  })
  const sumIsValid = Math.abs(sum - 100) < SUM_TOLERANCE
  const isDirty = JSON.stringify(draftPercents.map((v) => String(parsePercent(v)))) !== JSON.stringify(savedPercents.map(String))
  const canSave = draftPercents.length > 0 && allValid && sumIsValid
  const amounts = computeAmounts(
    draftPercents.map((v) => parsePercent(v) || 0),
    pool,
  )

  function addRow() {
    setDraftPercents((prev) => [...prev, ''])
  }

  function removeRow(index: number) {
    setDraftPercents((prev) => prev.filter((_, i) => i !== index))
  }

  function updateRow(index: number, value: string) {
    setDraftPercents((prev) => prev.map((v, i) => (i === index ? value : v)))
  }

  function resetDraft() {
    setDraftPercents(savedPercents.map((p) => String(p)))
  }

  async function handleSave() {
    if (!canSave) return
    setSaving(true)
    setError(null)
    try {
      await setPayoutRules(
        seasonId,
        typ,
        draftPercents.map((value, index) => ({ rang: index + 1, prozent_anteil: parsePercent(value) })),
      )
      await reload()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Speichern fehlgeschlagen.')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return <p className="text-sm text-slate-500">Lade...</p>
  }

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4">
      <h3 className="mb-1 text-sm font-semibold text-slate-900">{title}</h3>
      <p className="mb-3 text-sm text-slate-500">
        Gesamtgewinn: <span className="font-medium text-emerald-700">{currencyFormatter.format(pool)}</span>
      </p>

      {paidOut && canManage && (
        <p className="mb-3 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800">
          Für diese Saison wurden für diesen Verteilungstyp bereits Gewinne verbucht. Änderungen wirken sich nur
          auf künftige Berechnungen aus, nicht rückwirkend.
        </p>
      )}

      {error && <p role="alert" className="mb-3 text-sm text-red-600">{error}</p>}

      {draftPercents.length === 0 && !canManage ? (
        <p className="text-sm text-slate-500">Noch keine Verteilung konfiguriert.</p>
      ) : (
        <ul className="mb-3 space-y-2">
          {draftPercents.map((value, index) => (
            <li key={index} className="flex items-center gap-2">
              <span className="w-16 shrink-0 text-sm text-slate-600">Platz {index + 1}</span>
              {canManage ? (
                <>
                  <input
                    type="text"
                    inputMode="decimal"
                    value={value}
                    onChange={(e) => updateRow(index, e.target.value)}
                    placeholder="0"
                    className="w-24 rounded-lg border border-slate-300 px-3 py-2 text-base focus:border-slate-900 focus:outline-none"
                  />
                  <span className="text-sm text-slate-500">%</span>
                  <span className="text-sm text-slate-500">≈ {currencyFormatter.format(amounts[index])}</span>
                  <Button variant="danger" className="ml-auto" onClick={() => removeRow(index)}>
                    Entfernen
                  </Button>
                </>
              ) : (
                <>
                  <span className="text-sm text-slate-900">{value} %</span>
                  <span className="text-sm text-slate-500">≈ {currencyFormatter.format(amounts[index])}</span>
                </>
              )}
            </li>
          ))}
        </ul>
      )}

      {canManage && (
        <>
          <Button variant="secondary" onClick={addRow}>
            + Platz hinzufügen
          </Button>

          <div className="mt-3 flex items-center justify-between">
            <span className={`text-sm font-medium ${sumIsValid ? 'text-emerald-700' : 'text-red-600'}`}>
              Summe: {sum.toFixed(2)} % {sumIsValid ? '✓' : '(muss 100 % ergeben)'}
            </span>
            <div className="flex gap-2">
              {isDirty && (
                <Button variant="secondary" onClick={resetDraft}>
                  Verwerfen
                </Button>
              )}
              <Button onClick={handleSave} disabled={!canSave || saving || !isDirty}>
                {saving ? 'Speichern...' : 'Speichern'}
              </Button>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
