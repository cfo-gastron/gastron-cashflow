import { useState, useMemo } from 'react'
import { useApp } from '../context/AppContext'
import { addTransaction, deleteTransaction, updateTransaction } from '../lib/db'
import { rp, MONTHS_SHORT, today } from '../lib/utils'
import AddTransactionForm from '../components/AddTransactionForm'
import TransactionList from '../components/TransactionList'
import Layout from '../components/Layout'
import styles from './ForecastPage.module.css'

function generateWeeks() {
  const weeks = []
  let cur = new Date(2026, 3, 6)
  const end = new Date(2026, 11, 28)
  while (cur <= end) {
    const wEnd = new Date(cur); wEnd.setDate(wEnd.getDate() + 6)
    weeks.push({ start: cur.toISOString().split('T')[0], end: wEnd.toISOString().split('T')[0], month: cur.getMonth(), label: `${cur.getDate()} ${MONTHS_SHORT[cur.getMonth()]}` })
    cur = new Date(cur); cur.setDate(cur.getDate() + 7)
  }
  return weeks
}

function generateHistWeeks() {
  const dates = [[0,5],[0,12],[0,19],[0,26],[1,2],[1,9],[1,16],[1,23],[2,2],[2,9],[2,16],[2,23],[2,30]]
  return dates.map(([mo, day]) => {
    const d = new Date(2026, mo, day), e = new Date(2026, mo, day + 6)
    return { start: d.toISOString().split('T')[0], end: e.toISOString().split('T')[0], month: mo, label: `${day} ${MONTHS_SHORT[mo]}`, isHist: true }
  })
}

const WEEKS = generateWeeks()
const HIST_WEEKS = generateHistWeeks()
const ALL_WEEKS = [...HIST_WEEKS, ...WEEKS]
const TODAY_STR = today()

export default function ForecastPage({ page, setPage }) {
  const { transactions, setTransactions, saldoAwal, allItems, categories } = useApp()
  const [collapsedMonths, setCollapsedMonths] = useState(() => {
    const now = new Date(); const s = new Set()
    for (const w of WEEKS) { if (w.month < now.getMonth()) s.add(w.month) }
    return s
  })
  const [collapsedHist, setCollapsedHist] = useState(true)
  const [expandedRows, setExpandedRows] = useState({}) // key: `${weekStart}_${type}`

  function toggleExpand(weekStart, type) {
    const key = `${weekStart}_${type}`
    setExpandedRows(prev => ({ ...prev, [key]: !prev[key] }))
  }
  function isExpanded(weekStart, type) {
    return !!expandedRows[`${weekStart}_${type}`]
  }

  function toggleMonth(month) {
    setCollapsedMonths(prev => { const s = new Set(prev); s.has(month) ? s.delete(month) : s.add(month); return s })
  }

  const tableData = useMemo(() => {
    let bal = saldoAwal
    const histRows = []
    for (const w of HIST_WEEKS) {
      const ins  = transactions.filter(z => z.date >= w.start && z.date <= w.end && z.type === 'in')
      const outs = transactions.filter(z => z.date >= w.start && z.date <= w.end && z.type === 'out')
      if (!ins.length && !outs.length) continue
      histRows.push({ week: w, ins, outs })
    }
    const rows = []
    for (const w of WEEKS) {
      const ins  = allItems.filter(z => z.date >= w.start && z.date <= w.end && z.type === 'in')
      const outs = allItems.filter(z => z.date >= w.start && z.date <= w.end && z.type === 'out')
      const ti = ins.reduce((s,z) => s + Number(z.amount), 0)
      const to = outs.reduce((s,z) => s + Number(z.amount), 0)
      const open = bal; bal += ti - to; const close = bal
      const isCur = TODAY_STR >= w.start && TODAY_STR <= w.end
      let status = ''
      if (close < 0) status = 'defisit'
      else if (close < 10_000_000 && (ti > 0 || to > 0)) status = 'mepet'
      else if (ti > 0 || to > 0) status = 'aman'
      rows.push({ week: w, ins, outs, open, close, isCur, status })
    }
    return { histRows, rows }
  }, [transactions, allItems, saldoAwal])

  const summary = useMemo(() => {
    const curMonth = new Date().getMonth()
    const curRow = tableData.rows.find(r => r.isCur)
    const saldoNow = curRow?.close ?? saldoAwal
    const totalIn  = allItems.filter(z => z.type === 'in'  && new Date(z.date).getMonth() === curMonth).reduce((s,z) => s + Number(z.amount), 0)
    const totalOut = allItems.filter(z => z.type === 'out' && new Date(z.date).getMonth() === curMonth).reduce((s,z) => s + Number(z.amount), 0)
    const forecast = tableData.rows[tableData.rows.length - 1]?.close ?? 0
    return { saldoNow, totalIn, totalOut, forecast, curMonth }
  }, [tableData, allItems, saldoAwal])

  const chips = useMemo(() => ({
    defisit: tableData.rows.filter(r => r.status === 'defisit').length,
    mepet:   tableData.rows.filter(r => r.status === 'mepet').length,
  }), [tableData])

  async function handleAdd(tx) {
    const newTx = await addTransaction(tx)
    setTransactions(prev => [...prev, newTx].sort((a,b) => a.date.localeCompare(b.date)))
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

  const sidebarContent = (
    <>
      <AddTransactionForm categories={categories} onAdd={handleAdd} allWeeks={ALL_WEEKS} />
      <TransactionList transactions={transactions} onDelete={handleDelete} onUpdate={handleUpdate} allWeeks={ALL_WEEKS} categories={categories} />
    </>
  )

  return (
    <Layout page={page} setPage={setPage} sidebar={sidebarContent}>
      {{ content: (
        <div className={styles.wrap}>
          <div className={styles.cards}>
            <div className={styles.card}>
              <div className={styles.cardLabel}>Saldo Sekarang</div>
              <div className={`${styles.cardVal} ${styles.blue}`}>{rp(summary.saldoNow)}</div>
              <div className={styles.cardSub}>Minggu ini</div>
            </div>
            <div className={styles.card}>
              <div className={styles.cardLabel}>Masuk {MONTHS_SHORT[summary.curMonth]}</div>
              <div className={`${styles.cardVal} ${styles.green}`}>{rp(summary.totalIn)}</div>
              <div className={styles.cardSub}>Bulan berjalan</div>
            </div>
            <div className={styles.card}>
              <div className={styles.cardLabel}>Keluar {MONTHS_SHORT[summary.curMonth]}</div>
              <div className={`${styles.cardVal} ${styles.red}`}>{rp(summary.totalOut)}</div>
              <div className={styles.cardSub}>Bulan berjalan</div>
            </div>
            <div className={styles.card}>
              <div className={styles.cardLabel}>Proyeksi Des 2026</div>
              <div className={styles.cardVal}>{rp(summary.forecast)}</div>
              <div className={styles.cardSub}>Akhir tahun</div>
            </div>
          </div>

          <div className={styles.statusBar}>
            {chips.defisit > 0 && <span className="chip chip-danger">⚠ {chips.defisit} minggu defisit</span>}
            {chips.mepet   > 0 && <span className="chip chip-warn">⚡ {chips.mepet} minggu mepet</span>}
            {!chips.defisit && !chips.mepet && <span className="chip chip-ok">✓ Aman sampai Desember</span>}
          </div>

          <div className={styles.tableWrap}>
            <table>
              <thead>
                <tr>
                  <th>Tanggal</th><th>Saldo Awal</th><th>Masuk</th><th>Keluar</th><th>Saldo Akhir</th><th>Status</th>
                </tr>
              </thead>
              <tbody>
                {tableData.histRows.length > 0 && (
                  <>
                    <tr className={styles.histBanner}><td colSpan={6}>📂 Data Historis Jan–Mar 2026<span className={styles.histNote}> · tidak mempengaruhi saldo forecast</span></td></tr>
                    {[0,1,2].map(mo => {
                      const moRows = tableData.histRows.filter(r => r.week.month === mo)
                      if (!moRows.length) return null
                      return (
                        <tbody key={`hist-${mo}`}>
                          <tr className={styles.monthRow} onClick={() => setCollapsedHist(o => !o)}>
                            <td colSpan={6}>{MONTHS_SHORT[mo]} 2026 <span className={styles.arrow}>{collapsedHist ? '▶' : '▼'}</span></td>
                          </tr>
                          {!collapsedHist && moRows.map((r,i) => (
                            <>
                              <tr key={i} className={styles.histRow}>
                                <td><span className="num">{r.week.label}</span></td>
                                <td><span className="num-dim">—</span></td>
                                <td>{r.ins.length  ? <CellItems items={r.ins}  type="in"  onToggle={() => toggleExpand(`hist_${r.week.start}`, 'in')}  isOpen={isExpanded(`hist_${r.week.start}`, 'in')}  /> : null}</td>
                                <td>{r.outs.length ? <CellItems items={r.outs} type="out" onToggle={() => toggleExpand(`hist_${r.week.start}`, 'out')} isOpen={isExpanded(`hist_${r.week.start}`, 'out')} /> : null}</td>
                                <td><span className="num-dim">—</span></td>
                                <td><span className="badge badge-hist">Hist</span></td>
                              </tr>
                              {isExpanded(`hist_${r.week.start}`, 'in')  && r.ins.length  > 1 && <ExpandPanel key={`hexp-in-${i}`}  items={r.ins}  type="in"  />}
                              {isExpanded(`hist_${r.week.start}`, 'out') && r.outs.length > 1 && <ExpandPanel key={`hexp-out-${i}`} items={r.outs} type="out" />}
                            </>
                          ))}
                        </tbody>
                      )
                    })}
                    <tr className={styles.gapRow}><td colSpan={6} /></tr>
                  </>
                )}
                {(() => {
                  let lastMonth = -1
                  return tableData.rows.map((r, i) => {
                    const rows = []
                    if (r.week.month !== lastMonth) {
                      lastMonth = r.week.month
                      const collapsed = collapsedMonths.has(r.week.month)
                      rows.push(
                        <tr key={`mh-${r.week.month}`} className={styles.monthRow} onClick={() => toggleMonth(r.week.month)}>
                          <td colSpan={6}>{MONTHS_SHORT[r.week.month]} 2026 <span className={styles.arrow}>{collapsed ? '▶' : '▼'}</span></td>
                        </tr>
                      )
                    }
                    if (!collapsedMonths.has(r.week.month)) {
                      rows.push(
                        <tr key={`w-${i}`} className={`${styles.weekRow} ${r.isCur ? styles.curWeek : ''} ${r.status==='defisit' ? styles.rowDanger : ''} ${r.status==='mepet' ? styles.rowWarn : ''}`}>
                          <td>
                            <div className={styles.dateCell}>
                              <span className="num">{r.week.label}</span>
                              {r.isCur && <span className={styles.curTag}>minggu ini</span>}
                            </div>
                          </td>
                          <td><span className="num">{rp(r.open)}</span></td>
                          <td>{r.ins.length  ? <CellItems items={r.ins}  type="in"  onToggle={() => toggleExpand(r.week.start, 'in')}  isOpen={isExpanded(r.week.start, 'in')}  /> : <span className="num-dim">—</span>}</td>
                          <td>{r.outs.length ? <CellItems items={r.outs} type="out" onToggle={() => toggleExpand(r.week.start, 'out')} isOpen={isExpanded(r.week.start, 'out')} /> : <span className="num-dim">—</span>}</td>
                          <td><span className={r.close < 0 ? 'num-out' : 'num'}>{rp(r.close)}</span></td>
                          <td>
                            {r.status === 'defisit' && <span className="chip chip-danger">Defisit!</span>}
                            {r.status === 'mepet'   && <span className="chip chip-warn">Mepet</span>}
                            {r.status === 'aman'    && <span className="chip chip-ok">Aman</span>}
                          </td>
                        </tr>
                      )
                      if (isExpanded(r.week.start, 'in')  && r.ins.length  > 1) rows.push(<ExpandPanel key={`exp-in-${i}`}  items={r.ins}  type="in"  />)
                      if (isExpanded(r.week.start, 'out') && r.outs.length > 1) rows.push(<ExpandPanel key={`exp-out-${i}`} items={r.outs} type="out" />)
                    }
                    return rows
                  })
                })()}
              </tbody>
            </table>
          </div>
        </div>
      )}}
    </Layout>
  )
}

function CellItems({ items, type, onToggle, isOpen }) {
  const total = items.reduce((s,z) => s + Number(z.amount), 0)
  const cls = type === 'in' ? 'num-in' : 'num-out'
  const sign = type === 'in' ? '+' : '-'
  if (items.length === 1) {
    const z = items[0]; const cat = z.subcat_name || z.cat_name || ''
    return (
      <div className={styles.cellSingle}>
        <span className={cls}>{sign}{rp(total)}</span>
        <span className={styles.cellName}>{z.name}{cat ? ` · ${cat}` : ''}{z.is_rec && <span className="badge badge-rec" style={{marginLeft:4}}>↻</span>}{z.is_est && <span className="badge badge-est" style={{marginLeft:4}}>Est</span>}</span>
      </div>
    )
  }
  return (
    <div className={styles.cellMulti}>
      <button className={styles.cellToggle} onClick={onToggle}>
        <span className={cls}>{sign}{rp(total)}</span>
        <span className={styles.cellCount}>{isOpen ? '▲' : '▼'} {items.length} transaksi</span>
      </button>
    </div>
  )
}

function ExpandPanel({ items, type }) {
  const cls = type === 'in' ? 'num-in' : 'num-out'
  const total = items.reduce((s,z) => s + Number(z.amount), 0)
  const SHOW = 6
  const visible = items.slice(0, SHOW)
  const rest = items.length - SHOW
  return (
    <tr className={styles.expandRow}>
      <td colSpan={6}>
        <div className={styles.expandInner}>
          {visible.map((z,i) => (
            <div key={i} className={styles.expandItem}>
              <span className={styles.expandName}>{z.name}</span>
              <span className={styles.expandCat}>{z.subcat_name || z.cat_name || ''}</span>
              <span className={`${styles.expandAmt} ${cls}`}>{rp(z.amount)}</span>
            </div>
          ))}
          <div className={styles.expandFooter}>
            <span>{rest > 0 ? `+ ${rest} transaksi lainnya` : ''}</span>
            <span className={cls}>{type === 'in' ? '+' : '-'}{rp(total)} total</span>
          </div>
        </div>
      </td>
    </tr>
  )
}