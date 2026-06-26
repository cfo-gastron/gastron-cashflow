import { useState, useMemo } from 'react'
import { useApp } from '../context/AppContext'
import { addTransaction, deleteTransaction, updateTransaction, uploadFile } from '../lib/db'
import { rp, fmtDateShort, MONTHS_SHORT, ACCOUNT_LABELS, today } from '../lib/utils'
import AddTransactionForm from '../components/AddTransactionForm'
import TransactionList from '../components/TransactionList'
import styles from './ForecastPage.module.css'

const YEAR = 2026

// Generate semua minggu Apr-Des 2026
function generateWeeks() {
  const weeks = []
  let cur = new Date(2026, 3, 6) // 6 April
  const end = new Date(2026, 11, 28)
  while (cur <= end) {
    const wEnd = new Date(cur)
    wEnd.setDate(wEnd.getDate() + 6)
    weeks.push({
      start: cur.toISOString().split('T')[0],
      end: wEnd.toISOString().split('T')[0],
      month: cur.getMonth(),
      label: `${cur.getDate()} ${MONTHS_SHORT[cur.getMonth()]}`,
    })
    cur = new Date(cur)
    cur.setDate(cur.getDate() + 7)
  }
  return weeks
}

// Generate minggu historis Jan-Mar 2026
function generateHistWeeks() {
  const dates = [
    [0, 5], [0, 12], [0, 19], [0, 26],   // Jan
    [1, 2], [1, 9],  [1, 16], [1, 23],   // Feb
    [2, 2], [2, 9],  [2, 16], [2, 23], [2, 30], // Mar
  ]
  return dates.map(([mo, day]) => {
    const d = new Date(2026, mo, day)
    const e = new Date(2026, mo, day + 6)
    return {
      start: d.toISOString().split('T')[0],
      end: e.toISOString().split('T')[0],
      month: mo,
      label: `${day} ${MONTHS_SHORT[mo]}`,
      isHist: true,
    }
  })
}

const WEEKS = generateWeeks()
const HIST_WEEKS = generateHistWeeks()
const ALL_WEEKS = [...HIST_WEEKS, ...WEEKS]

const TODAY_STR = today()

function getWeekForDate(dateStr) {
  return ALL_WEEKS.find(w => dateStr >= w.start && dateStr <= w.end) || null
}

export default function ForecastPage() {
  const { transactions, setTransactions, saldoAwal, allItems, reload, categories } = useApp()
  const [collapsedMonths, setCollapsedMonths] = useState(() => {
    // Auto collapse bulan yang sudah lewat
    const now = new Date()
    const collapsed = new Set()
    for (const w of WEEKS) {
      if (w.month < now.getMonth() || (w.month < 3)) collapsed.add(w.month)
    }
    return collapsed
  })
  const [collapsedHist, setCollapsedHist] = useState(true)
  const [sidebarOpen, setSidebarOpen] = useState(true)

  function toggleMonth(month) {
    setCollapsedMonths(prev => {
      const s = new Set(prev)
      s.has(month) ? s.delete(month) : s.add(month)
      return s
    })
  }

  // Build tabel data — group per minggu
  const tableData = useMemo(() => {
    let bal = saldoAwal
    const rows = []

    // Historis Jan-Mar
    const histRows = []
    for (const w of HIST_WEEKS) {
      const ins = transactions.filter(z => z.date >= w.start && z.date <= w.end && z.type === 'in')
      const outs = transactions.filter(z => z.date >= w.start && z.date <= w.end && z.type === 'out')
      if (!ins.length && !outs.length) continue
      histRows.push({ week: w, ins, outs, isHist: true })
    }

    // Forecast Apr-Des
    for (const w of WEEKS) {
      const ins = allItems.filter(z => z.date >= w.start && z.date <= w.end && z.type === 'in')
      const outs = allItems.filter(z => z.date >= w.start && z.date <= w.end && z.type === 'out')
      const ti = ins.reduce((s, z) => s + Number(z.amount), 0)
      const to = outs.reduce((s, z) => s + Number(z.amount), 0)
      const open = bal
      bal += ti - to
      const close = bal
      const isCur = TODAY_STR >= w.start && TODAY_STR <= w.end
      let status = ''
      if (close < 0) status = 'defisit'
      else if (close < 10_000_000 && (ti > 0 || to > 0)) status = 'mepet'
      else if (ti > 0 || to > 0) status = 'aman'
      rows.push({ week: w, ins, outs, open, close, isCur, status })
    }

    return { histRows, rows }
  }, [transactions, allItems, saldoAwal])

  // Summary chips
  const chips = useMemo(() => {
    const defisit = tableData.rows.filter(r => r.status === 'defisit').length
    const mepet = tableData.rows.filter(r => r.status === 'mepet').length
    return { defisit, mepet }
  }, [tableData])

  async function handleAdd(tx) {
    const newTx = await addTransaction(tx)
    setTransactions(prev => [...prev, newTx].sort((a, b) => a.date.localeCompare(b.date)))
  }

  async function handleDelete(id) {
    if (!confirm('Hapus transaksi ini?')) return
    await deleteTransaction(id)
    setTransactions(prev => prev.filter(t => t.id !== id))
  }

  async function handleUpdate(id, updates) {
    const updated = await updateTransaction(id, updates)
    setTransactions(prev => prev.map(t => t.id === id ? updated : t))
  }

  return (
    <div className={styles.layout}>
      {/* SIDEBAR */}
      {sidebarOpen && (
        <aside className={styles.sidebar}>
          <AddTransactionForm
            categories={categories}
            onAdd={handleAdd}
            allWeeks={ALL_WEEKS}
          />
          <div className={styles.sidebarDivider} />
          <TransactionList
            transactions={transactions}
            onDelete={handleDelete}
            onUpdate={handleUpdate}
            allWeeks={ALL_WEEKS}
            categories={categories}
          />
        </aside>
      )}

      {/* MAIN */}
      <div className={styles.main}>
        <button
          className={styles.sidebarToggle}
          onClick={() => setSidebarOpen(o => !o)}
          title={sidebarOpen ? 'Tutup sidebar' : 'Buka sidebar'}
        >
          {sidebarOpen ? '‹' : '›'}
        </button>

        {/* CHIPS */}
        <div className={styles.chips}>
          {chips.defisit > 0 && <span className="chip chip-danger">⚠ {chips.defisit} minggu defisit</span>}
          {chips.mepet > 0 && <span className="chip chip-warn">⚡ {chips.mepet} minggu mepet</span>}
          {!chips.defisit && !chips.mepet && <span className="chip chip-ok">✓ Aman sampai Desember</span>}
        </div>

        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Tanggal</th>
                <th>Saldo Awal</th>
                <th>Masuk</th>
                <th>Keluar</th>
                <th>Saldo Akhir</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {/* ── HISTORIS JAN-MAR ── */}
              {tableData.histRows.length > 0 && (
                <>
                  <tr className={styles.histBanner}>
                    <td colSpan={6}>
                      📂 Data Historis Jan–Mar 2026
                      <span className={styles.histNote}> · tidak mempengaruhi saldo forecast</span>
                    </td>
                  </tr>
                  {[0, 1, 2].map(mo => {
                    const moRows = tableData.histRows.filter(r => r.week.month === mo)
                    if (!moRows.length) return null
                    return (
                      <>
                        <tr
                          key={`hist-mh-${mo}`}
                          className={styles.monthHeader}
                          onClick={() => setCollapsedHist(o => !o)}
                        >
                          <td colSpan={6}>
                            {MONTHS_SHORT[mo]} 2026
                            <span className={styles.arrow}>{collapsedHist ? '►' : '▼'}</span>
                          </td>
                        </tr>
                        {!collapsedHist && moRows.map((r, i) => (
                          <tr key={`hist-${mo}-${i}`} className={styles.histRow}>
                            <td className={styles.dateCell}>{r.week.label}</td>
                            <td><span className={styles.numGray}>—</span></td>
                            <td>{r.ins.length ? <CellItems items={r.ins} type="in" /> : null}</td>
                            <td>{r.outs.length ? <CellItems items={r.outs} type="out" /> : null}</td>
                            <td><span className={styles.numGray}>—</span></td>
                            <td><span className="badge badge-hist">Hist</span></td>
                          </tr>
                        ))}
                      </>
                    )
                  })}
                  <tr className={styles.gapRow}><td colSpan={6} /></tr>
                </>
              )}

              {/* ── FORECAST APR-DES ── */}
              {(() => {
                let lastMonth = -1
                return tableData.rows.map((r, i) => {
                  const rows = []
                  if (r.week.month !== lastMonth) {
                    lastMonth = r.week.month
                    const collapsed = collapsedMonths.has(r.week.month)
                    rows.push(
                      <tr
                        key={`mh-${r.week.month}`}
                        className={`${styles.monthHeader} ${collapsed ? styles.collapsed : ''}`}
                        onClick={() => toggleMonth(r.week.month)}
                      >
                        <td colSpan={6}>
                          {MONTHS_SHORT[r.week.month]} 2026
                          <span className={styles.arrow}>{collapsed ? '►' : '▼'}</span>
                        </td>
                      </tr>
                    )
                  }
                  if (!collapsedMonths.has(r.week.month)) {
                    rows.push(
                      <tr
                        key={`w-${i}`}
                        className={`${styles.weekRow} ${r.isCur ? styles.curWeek : ''} ${r.status === 'defisit' ? styles.rowDanger : r.status === 'mepet' ? styles.rowWarn : ''}`}
                        data-month={r.week.month}
                      >
                        <td className={styles.dateCell}>
                          {r.week.label}
                          {r.isCur && <span className={styles.curTag}>minggu ini</span>}
                        </td>
                        <td><span className={styles.numMono}>{rp(r.open)}</span></td>
                        <td>{r.ins.length ? <CellItems items={r.ins} type="in" /> : null}</td>
                        <td>{r.outs.length ? <CellItems items={r.outs} type="out" /> : null}</td>
                        <td>
                          <span className={`${styles.numMono} ${r.close < 0 ? styles.numNeg : ''}`}>
                            {rp(r.close)}
                          </span>
                        </td>
                        <td>
                          {r.status === 'defisit' && <span className="chip chip-danger">Defisit!</span>}
                          {r.status === 'mepet' && <span className="chip chip-warn">Mepet</span>}
                          {r.status === 'aman' && <span className="chip chip-ok">Aman</span>}
                        </td>
                      </tr>
                    )
                  }
                  return rows
                })
              })()}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

function CellItems({ items, type }) {
  const [open, setOpen] = useState(false)
  const total = items.reduce((s, z) => s + Number(z.amount), 0)
  const cls = type === 'in' ? styles.numIn : styles.numOut

  if (items.length === 1) {
    const z = items[0]
    const cat = z.subcat_name || z.cat_name || ''
    return (
      <div className={styles.cellSingle}>
        <span className={cls}>{type === 'in' ? '+' : '-'}{rp(total)}</span>
        <span className={styles.cellName}>{z.name}{cat ? ` [${cat}]` : ''}</span>
        {z.is_rec && <span className="badge badge-rec">↻</span>}
        {z.is_est && <span className="badge badge-est">Est</span>}
      </div>
    )
  }

  return (
    <div className={styles.cellMulti}>
      <button className={styles.cellToggle} onClick={() => setOpen(o => !o)}>
        <span className={cls}>{type === 'in' ? '+' : '-'}{rp(total)}</span>
        <span className={styles.cellCount}>{open ? '▲' : '▼'} {items.length} transaksi</span>
      </button>
      {open && (
        <div className={styles.cellItems}>
          {items.map((z, i) => (
            <div key={i} className={styles.cellItem}>
              <span className={styles.cellItemName}>{z.name}</span>
              <span className={`${styles.cellItemAmt} ${cls}`}>{rp(z.amount)}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
