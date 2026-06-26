import { useState, useMemo } from 'react'
import { useApp } from '../context/AppContext'
import { rp, MONTHS_SHORT } from '../lib/utils'
import styles from './MonthlyPage.module.css'

const COGS_IDS = ['d_cogs']
const OPEX_ORDER = ['d_cogs', 'd_opex', 'd_sal', 'd_off', 'd_corp', 'd_capex', 'd_liab']

export default function MonthlyPage() {
  const { allItems, transactions } = useApp()
  const [inclEst, setInclEst] = useState(true)
  const [fullYear, setFullYear] = useState(false)
  const [modal, setModal] = useState(null) // { items, label, total }

  const months = fullYear
    ? [0,1,2,3,4,5,6,7,8,9,10,11]
    : [3,4,5,6,7,8,9,10,11]

  const data = useMemo(() => {
    const items = [
      ...transactions.filter(z => !z.is_kemb && (inclEst || !z.is_est)),
      ...allItems.filter(z => z.is_rec),
    ]
    const d = {}
    for (const m of months) d[m] = { in: {}, out: {} }

    for (const z of items) {
      if (!z.date) continue
      const m = new Date(z.date).getMonth()
      if (!months.includes(m)) continue
      const bucket = z.type === 'in' ? d[m].in : d[m].out
      const cid = z.cat_id || '__uncategorized'
      const cname = z.cat_name || 'Lainnya'
      const sname = z.subcat_name || z.name
      if (!bucket[cid]) bucket[cid] = { catName: cname, subs: {}, items: {} }
      bucket[cid].subs[sname] = (bucket[cid].subs[sname] || 0) + Number(z.amount)
      if (!bucket[cid].items[sname]) bucket[cid].items[sname] = []
      bucket[cid].items[sname].push(z)
    }
    return d
  }, [allItems, transactions, inclEst, fullYear, months])

  // Monthly totals
  const mRev = {}, mCOGS = {}, mGP = {}, mOpex = {}, mNet = {}
  for (const m of months) {
    mRev[m] = Object.values(data[m].in).reduce((s, c) => s + Object.values(c.subs).reduce((a, b) => a + b, 0), 0)
    mCOGS[m] = Object.entries(data[m].out).filter(([id]) => COGS_IDS.includes(id)).reduce((s, [, c]) => s + Object.values(c.subs).reduce((a, b) => a + b, 0), 0)
    mGP[m] = mRev[m] - mCOGS[m]
    mOpex[m] = Object.values(data[m].out).reduce((s, c) => s + Object.values(c.subs).reduce((a, b) => a + b, 0), 0)
    mNet[m] = mRev[m] - mOpex[m]
  }
  const totRev = months.reduce((s, m) => s + mRev[m], 0)
  const totCOGS = months.reduce((s, m) => s + mCOGS[m], 0)
  const totGP = months.reduce((s, m) => s + mGP[m], 0)
  const totOpex = months.reduce((s, m) => s + mOpex[m], 0)
  const totNet = months.reduce((s, m) => s + mNet[m], 0)

  // All out cats
  const allOutCats = {}
  for (const m of months) for (const [cid, cv] of Object.entries(data[m].out)) { if (!allOutCats[cid]) allOutCats[cid] = cv.catName }
  const sortedCats = [...OPEX_ORDER.filter(id => allOutCats[id]), ...Object.keys(allOutCats).filter(id => !OPEX_ORDER.includes(id))]

  function numCell(v, neg = false, clickItems = null, label = '') {
    if (!v) return <td className={styles.zero}>—</td>
    const cls = neg ? styles.neg : v > 0 ? styles.pos : styles.neg
    if (clickItems) {
      return (
        <td>
          <span className={`${cls} ${styles.clickable}`} onClick={() => setModal({ items: clickItems, label, total: v })}>
            {neg || v < 0 ? '-' : ''}{rp(Math.abs(v))}
          </span>
        </td>
      )
    }
    return <td><span className={cls}>{neg || v < 0 ? '-' : ''}{rp(Math.abs(v))}</span></td>
  }

  function pct(v, rev) { return rev ? (v / rev * 100).toFixed(1) + '%' : '—' }

  // Export CSV
  function exportCSV() {
    const rows = [['Kategori', ...months.map(m => MONTHS_SHORT[m]), 'TOTAL']]
    // bisa ditambahkan rows sesuai kebutuhan
    const csv = 'data:text/csv;charset=utf-8,\uFEFF' + rows.map(r => r.join(',')).join('\n')
    const a = document.createElement('a')
    a.href = encodeURI(csv)
    a.download = `Gastron_Monthly_2026_${new Date().toISOString().slice(0,10)}.csv`
    a.click()
  }

  return (
    <div className={styles.wrap}>
      <div className={styles.toolbar}>
        <div>
          <div className={styles.toolbarTitle}>Monthly Cashflow Summary 2026</div>
          <div className={styles.toolbarSub}>Otomatis dari Forecast & Recurring</div>
        </div>
        <div className={styles.toolbarRight}>
          <label className={styles.checkLabel}>
            <input type="checkbox" checked={inclEst} onChange={e => setInclEst(e.target.checked)} />
            Termasuk estimasi
          </label>
          <label className={styles.checkLabel}>
            <input type="checkbox" checked={fullYear} onChange={e => setFullYear(e.target.checked)} />
            Full Year (Jan–Des)
          </label>
          <button className={styles.exportBtn} onClick={exportCSV}>⬇ Export CSV</button>
        </div>
      </div>

      <div className={styles.tableWrap}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Kategori</th>
              {months.map(m => <th key={m}>{MONTHS_SHORT[m]}</th>)}
              <th className={styles.totalCol}>Total</th>
            </tr>
          </thead>
          <tbody>
            {/* PENDAPATAN */}
            <tr className={styles.sectionHdr}><td colSpan={months.length + 2}>💰 PENDAPATAN</td></tr>
            {Object.entries(Object.assign({}, ...months.map(m => data[m].in))).map(([cid, cv]) => {
              const catTotal = months.reduce((s, m) => s + Object.values(data[m].in[cid]?.subs || {}).reduce((a, b) => a + b, 0), 0)
              const allSubs = Object.keys(Object.assign({}, ...months.map(m => data[m].in[cid]?.subs || {})))
              return [
                <tr key={`in-cat-${cid}`} className={styles.catHdr}>
                  <td style={{ paddingLeft: 12 }}>{cv.catName}</td>
                  {months.map(m => numCell(Object.values(data[m].in[cid]?.subs || {}).reduce((a, b) => a + b, 0)))}
                  <td className={styles.totalCol}>{numCell(catTotal)}</td>
                </tr>,
                ...allSubs.map(sname => {
                  const sTotal = months.reduce((s, m) => s + (data[m].in[cid]?.subs[sname] || 0), 0)
                  return (
                    <tr key={`in-sub-${cid}-${sname}`} className={styles.subRow}>
                      <td style={{ paddingLeft: 24 }}>{sname}</td>
                      {months.map(m => {
                        const items = data[m].in[cid]?.items?.[sname] || []
                        const v = data[m].in[cid]?.subs[sname] || 0
                        return items.length ? numCell(v, false, items, `${sname} · ${MONTHS_SHORT[m]}`) : numCell(v)
                      })}
                      <td className={styles.totalCol}><span className={styles.pos}>{rp(sTotal) || '—'}</span></td>
                    </tr>
                  )
                })
              ]
            })}
            <tr className={styles.totalRow}>
              <td>TOTAL PENDAPATAN</td>
              {months.map(m => <td key={m}><span className={styles.pos}>{rp(mRev[m]) || '—'}</span></td>)}
              <td className={styles.totalCol}><span className={styles.pos}>{rp(totRev)}</span></td>
            </tr>

            <tr className={styles.gap}><td colSpan={months.length + 2} /></tr>

            {/* COGS */}
            <tr className={styles.sectionHdr}><td colSpan={months.length + 2}>🏭 COST OF GOODS SOLD</td></tr>
            {sortedCats.filter(id => COGS_IDS.includes(id)).map(cid => {
              const allSubs = Object.keys(Object.assign({}, ...months.map(m => data[m].out[cid]?.subs || {})))
              const catTotal = months.reduce((s, m) => s + Object.values(data[m].out[cid]?.subs || {}).reduce((a, b) => a + b, 0), 0)
              return [
                <tr key={`cogs-cat-${cid}`} className={styles.catHdr}>
                  <td style={{ paddingLeft: 12 }}>{allOutCats[cid]}</td>
                  {months.map(m => numCell(Object.values(data[m].out[cid]?.subs || {}).reduce((a, b) => a + b, 0), true))}
                  <td className={styles.totalCol}><span className={styles.neg}>{rp(catTotal)}</span></td>
                </tr>,
                ...allSubs.map(sname => {
                  const sTotal = months.reduce((s, m) => s + (data[m].out[cid]?.subs[sname] || 0), 0)
                  return (
                    <tr key={`cogs-sub-${cid}-${sname}`} className={styles.subRow}>
                      <td style={{ paddingLeft: 24 }}>{sname}</td>
                      {months.map(m => {
                        const items = data[m].out[cid]?.items?.[sname] || []
                        const v = data[m].out[cid]?.subs[sname] || 0
                        return items.length ? numCell(v, true, items, `${sname} · ${MONTHS_SHORT[m]}`) : numCell(v, true)
                      })}
                      <td className={styles.totalCol}><span className={styles.neg}>{rp(sTotal)}</span></td>
                    </tr>
                  )
                })
              ]
            })}
            <tr className={`${styles.totalRow} ${styles.highlight}`}>
              <td>GROSS PROFIT</td>
              {months.map(m => <td key={m}><span className={mGP[m] >= 0 ? styles.pos : styles.neg}>{rp(Math.abs(mGP[m]))}</span></td>)}
              <td className={styles.totalCol}><span className={totGP >= 0 ? styles.pos : styles.neg}>{rp(Math.abs(totGP))}</span></td>
            </tr>
            <tr className={styles.marginRow}>
              <td>Gross Margin</td>
              {months.map(m => <td key={m}>{pct(mGP[m], mRev[m])}</td>)}
              <td className={styles.totalCol}>{pct(totGP, totRev)}</td>
            </tr>

            <tr className={styles.gap}><td colSpan={months.length + 2} /></tr>

            {/* OPEX */}
            <tr className={styles.sectionHdr}><td colSpan={months.length + 2}>💸 OPERATING EXPENSES</td></tr>
            {sortedCats.filter(id => !COGS_IDS.includes(id)).map(cid => {
              const allSubs = Object.keys(Object.assign({}, ...months.map(m => data[m].out[cid]?.subs || {})))
              if (!allSubs.length) return null
              const catTotal = months.reduce((s, m) => s + Object.values(data[m].out[cid]?.subs || {}).reduce((a, b) => a + b, 0), 0)
              return [
                <tr key={`opex-cat-${cid}`} className={styles.catHdr}>
                  <td style={{ paddingLeft: 12 }}>{allOutCats[cid]}</td>
                  {months.map(m => numCell(Object.values(data[m].out[cid]?.subs || {}).reduce((a, b) => a + b, 0), true))}
                  <td className={styles.totalCol}><span className={styles.neg}>{rp(catTotal)}</span></td>
                </tr>,
                ...allSubs.map(sname => {
                  const sTotal = months.reduce((s, m) => s + (data[m].out[cid]?.subs[sname] || 0), 0)
                  return (
                    <tr key={`opex-sub-${cid}-${sname}`} className={styles.subRow}>
                      <td style={{ paddingLeft: 24 }}>{sname}</td>
                      {months.map(m => {
                        const items = data[m].out[cid]?.items?.[sname] || []
                        const v = data[m].out[cid]?.subs[sname] || 0
                        return items.length ? numCell(v, true, items, `${sname} · ${MONTHS_SHORT[m]}`) : numCell(v, true)
                      })}
                      <td className={styles.totalCol}><span className={styles.neg}>{rp(sTotal)}</span></td>
                    </tr>
                  )
                })
              ]
            })}

            <tr className={styles.gap}><td colSpan={months.length + 2} /></tr>

            {/* NET */}
            <tr className={`${styles.totalRow} ${totNet >= 0 ? styles.highlight : styles.highlightNeg}`}>
              <td>NET CASHFLOW</td>
              {months.map(m => <td key={m}><span className={mNet[m] >= 0 ? styles.pos : styles.neg}>{rp(Math.abs(mNet[m]))}</span></td>)}
              <td className={styles.totalCol}><span className={totNet >= 0 ? styles.pos : styles.neg}>{rp(Math.abs(totNet))}</span></td>
            </tr>
            <tr className={styles.marginRow}>
              <td>Net Margin</td>
              {months.map(m => <td key={m}>{pct(mNet[m], mRev[m])}</td>)}
              <td className={styles.totalCol}>{pct(totNet, totRev)}</td>
            </tr>
            <tr className={styles.marginRow}>
              <td>Total Pengeluaran</td>
              {months.map(m => <td key={m}><span className={styles.neg}>{mOpex[m] ? rp(mOpex[m]) : '—'}</span></td>)}
              <td className={styles.totalCol}><span className={styles.neg}>{rp(totOpex)}</span></td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* MODAL DRILLDOWN */}
      {modal && (
        <div className={styles.modalOverlay} onClick={() => setModal(null)}>
          <div className={styles.modal} onClick={e => e.stopPropagation()}>
            <div className={styles.modalHdr}>
              <div>
                <div className={styles.modalTitle}>{modal.label}</div>
                <div className={styles.modalSub}>{modal.items.length} transaksi</div>
              </div>
              <button className={styles.modalClose} onClick={() => setModal(null)}>×</button>
            </div>
            <div className={styles.modalBody}>
              {modal.items.map((z, i) => (
                <div key={i} className={styles.modalItem}>
                  <div className={styles.modalItemInfo}>
                    <div className={styles.modalItemName}>{z.name}</div>
                    <div className={styles.modalItemMeta}>
                      <span>{z.account}</span>
                      <span>{z.date}</span>
                      {z.is_est && <span className="badge badge-est">Est</span>}
                      {z.file_url && <a href={z.file_url} target="_blank" rel="noreferrer">📎</a>}
                    </div>
                  </div>
                  <span className={z.type === 'in' ? styles.pos : styles.neg}>{rp(z.amount)}</span>
                </div>
              ))}
            </div>
            {modal.items.length > 1 && (
              <div className={styles.modalFooter}>
                <span>Total</span>
                <span className={styles.modalTotal}>{rp(modal.total)}</span>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
