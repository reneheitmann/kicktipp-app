import ExcelJS from 'exceljs'
import type { Matchday, Player, Season, Transaction } from '../../types/database'
import type { PlayerBalance } from './balanceCalculations'

const typLabels: Record<Transaction['typ'], string> = {
  einsatz_gesamt: 'Einsatz Gesamtsieg',
  einsatz_spieltag: 'Einsatz Spieltag',
  gewinn_gesamt: 'Gewinn Gesamtsieg',
  gewinn_spieltag: 'Gewinn Spieltag',
  korrektur: 'Korrektur',
}

export async function exportSeasonExcel(
  season: Season,
  balances: PlayerBalance[],
  transactions: Transaction[],
  players: Player[],
  matchdays: Matchday[],
): Promise<void> {
  const workbook = new ExcelJS.Workbook()
  workbook.creator = 'Kicktipp Spielrunde'
  workbook.created = new Date()

  const balanceSheet = workbook.addWorksheet('Guthabenübersicht')
  balanceSheet.columns = [
    { header: 'Spieler', key: 'name', width: 24 },
    { header: 'Gesamtsieg-Einsatz', key: 'gesamtsieg_einsatz', width: 18 },
    { header: 'Gesamtsieg-Gewinn', key: 'gesamtsieg_gewinn', width: 18 },
    { header: 'Gesamtsieg-Saldo', key: 'gesamtsieg_saldo', width: 18 },
    { header: 'Spieltag-Einsatz', key: 'spieltag_einsatz', width: 18 },
    { header: 'Spieltag-Gewinn', key: 'spieltag_gewinn', width: 18 },
    { header: 'Spieltag-Saldo', key: 'spieltag_saldo', width: 18 },
    { header: 'Gesamt-Saldo', key: 'gesamt_saldo', width: 18 },
  ]
  balanceSheet.getRow(1).font = { bold: true }
  for (const b of balances) {
    balanceSheet.addRow(b)
  }
  balanceSheet.getColumn('gesamtsieg_einsatz').numFmt = '#,##0.00 €'
  balanceSheet.getColumn('gesamtsieg_gewinn').numFmt = '#,##0.00 €'
  balanceSheet.getColumn('gesamtsieg_saldo').numFmt = '#,##0.00 €'
  balanceSheet.getColumn('spieltag_einsatz').numFmt = '#,##0.00 €'
  balanceSheet.getColumn('spieltag_gewinn').numFmt = '#,##0.00 €'
  balanceSheet.getColumn('spieltag_saldo').numFmt = '#,##0.00 €'
  balanceSheet.getColumn('gesamt_saldo').numFmt = '#,##0.00 €'

  const playersById = new Map(players.map((p) => [p.id, p.name]))
  const matchdaysById = new Map(matchdays.map((m) => [m.id, `Spieltag ${m.nummer}`]))

  const transactionSheet = workbook.addWorksheet('Transaktionen')
  transactionSheet.columns = [
    { header: 'Datum', key: 'datum', width: 14 },
    { header: 'Spieler', key: 'spieler', width: 24 },
    { header: 'Typ', key: 'typ', width: 20 },
    { header: 'Spieltag', key: 'spieltag', width: 14 },
    { header: 'Betrag', key: 'betrag', width: 14 },
    { header: 'Notiz', key: 'notiz', width: 32 },
  ]
  transactionSheet.getRow(1).font = { bold: true }
  for (const tx of [...transactions].sort((a, b) => a.datum.localeCompare(b.datum))) {
    transactionSheet.addRow({
      datum: tx.datum,
      spieler: playersById.get(tx.player_id) ?? tx.player_id,
      typ: typLabels[tx.typ],
      spieltag: tx.matchday_id ? (matchdaysById.get(tx.matchday_id) ?? '') : '',
      betrag: tx.betrag,
      notiz: tx.notiz ?? '',
    })
  }
  transactionSheet.getColumn('betrag').numFmt = '#,##0.00 €'

  const buffer = await workbook.xlsx.writeBuffer()
  const blob = new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = `Saisonabrechnung_${season.name.replace(/[^\w-]+/g, '_')}.xlsx`
  document.body.appendChild(link)
  link.click()
  link.remove()
  URL.revokeObjectURL(url)
}
