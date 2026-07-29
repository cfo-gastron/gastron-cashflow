import { useState, useMemo, Fragment } from 'react'
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

function CellItems({ items, type, onToggle, isOpen, onEdit }) {
  const total = items.reduce((s,z) => s + Number(z.amount), 0)
  const cls = type === 'in' ? 'num-in' : 'num-out'
  const sign = type === 'in' ? '+' : '-'

  return (
    <div className={styles.cellMulti}>
      <button className={styles.cellToggle} onClick={onToggle}>
        <span className={cls}>{sign}{rp(total)}</span>
        <span className={styles.cellCount}>{isOpen ? '▲' : '▼'} {items.length} transaksi</span>
      </button>
    </div>
  )
}

function ExpandItems({ items, type, onEdit }) {
  const [showAll, setShowAll] = useState(false)
  const cls   = type === 'in' ? 'num-in' : 'num-out'
  const sign  = type === 'in' ? '+' : '-'
  const SHOW  = 6
  const total = items.reduce((s,z) => s+Number(z.amount), 0)
  const visible = showAll ? items : items.slice(0, SHOW)
  const rest  = items.length - SHOW

  return (
    <div className={styles.expandInner}>
      <table className={styles.expandTable}>
        <tbody>
          {visible.map((z,i) => (
            <tr
              key={i}
              className={styles.expandRow}
              onClick={() => { console.log('clicked', z); onEdit && onEdit(z) }}
              style={{cursor: 'pointer'}}
            >
              <td className={styles.expandName} style={z.is_est ? {color:'#d97706'} : {}}>
                {z.name}
                {z.is_est && <span style={{background:'#fef3c7',color:'#d97706',fontSize:9,padding:'1px 5px',borderRadius:3,border:'0.5px solid #fde68a',marginLeft:4}}>Est</span>}
              </td>
              <td className={styles.expandCat}>{z.subcat_name||z.cat_name||''}</td>
              <td className={styles.expandDate}>{z.date ? z.date.slice(5).replace('-',' ') : ''}</td>
              <td className={`${styles.expandAmt} ${z.is_est ? '' : cls}`} style={z.is_est ? {color:'#d97706',fontFamily:'monospace',fontSize:10,fontWeight:600,textAlign:'right'} : {}}>{sign}{rp(z.amount)}</td>
              <td className={styles.expandEdit}>
                {!z.is_rec && (
                  <span style={{display:'flex',gap:6,alignItems:'center',justifyContent:'flex-end'}}>
                    <span title="Edit" style={{fontSize:11,color:'var(--text3)'}}>✎</span>
                    <span title="Hapus" style={{fontSize:11,color:'var(--text3)',cursor:'pointer'}}
                      onClick={e=>{e.stopPropagation();if(confirm('Hapus?'))onEdit&&onEdit({...z,_delete:true})}}>🗑</span>
                  </span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <div className={styles.expandFooter}>
        {rest > 0 && !showAll
          ? <button className={styles.showAllBtn} onClick={e=>{e.stopPropagation();setShowAll(true)}}>▾ + {rest} lainnya</button>
          : rest > 0 && showAll
          ? <button className={styles.showAllBtn} onClick={e=>{e.stopPropagation();setShowAll(false)}}>▴ Sembunyikan</button>
          : <span />
        }
        <div className={`${styles.totalPill} ${type==='out'?styles.totalPillOut:styles.totalPillIn}`}>
          <span className={styles.totalLabel}>Total {type==='out'?'keluar':'masuk'}</span>
          <span className={`${styles.totalVal} ${cls}`}>{sign}{rp(total)}</span>
        </div>
      </div>
    </div>
  )
}

function WeekRow({ r, onToggle, isExpIn, isExpOut, isHist, onEdit }) {
  const hasEst = [...r.ins, ...r.outs].some(z => z.is_est)
  const cls = r.isCur
    ? styles.curWeek
    : r.status==='defisit' ? styles.rowDanger
    : r.status==='mepet'   ? styles.rowWarn
    : hasEst               ? styles.rowEst
    : ''
  return (
    <Fragment>
      <tr className={`${isHist ? styles.histRow : styles.weekRow} ${cls}`}>
        <td>
          <div className={styles.dateCell}>
            <span className="num">{r.week.label}</span>
            {r.isCur && <span className={styles.curTag}>minggu ini</span>}
          </div>
        </td>
        <td>{r.ins.length  ? <CellItems items={r.ins}  type="in"  onToggle={() => onToggle(r.week.start,'in')}  isOpen={isExpIn}  onEdit={onEdit} /> : <span className="num-dim">—</span>}</td>
        <td>{r.outs.length ? <CellItems items={r.outs} type="out" onToggle={() => onToggle(r.week.start,'out')} isOpen={isExpOut} onEdit={onEdit} /> : <span className="num-dim">—</span>}</td>
        <td><span className={isHist ? 'num-dim' : r.close < 0 ? 'num-out' : 'num'}>{isHist ? '—' : rp(r.close)}</span></td>
        <td>
          {isHist && <span className="badge badge-hist">Hist</span>}
          {!isHist && r.status === 'defisit' && <span className="chip chip-danger">Defisit!</span>}
          {!isHist && r.status === 'mepet'   && <span className="chip chip-warn">Mepet</span>}
          {!isHist && r.status === 'aman'    && <span className="chip chip-ok">Aman</span>}
        </td>
      </tr>
      {isExpIn && r.ins.length > 1 && (
        <tr className={styles.expandRow}>
          <td colSpan={5}><ExpandItems items={r.ins}  type="in"  onEdit={onEdit} /></td>
        </tr>
      )}
      {isExpOut && r.outs.length > 1 && (
        <tr className={styles.expandRow}>
          <td colSpan={5}><ExpandItems items={r.outs} type="out" onEdit={onEdit} /></td>
        </tr>
      )}
    </Fragment>
  )
}

export default function ForecastPage({ page, setPage }) {
  const { transactions, setTransactions, saldoAwal, allItems, categories } = useApp()
  const [collapsedMonths, setCollapsedMonths] = useState(() => {
    const now = new Date(); const s = new Set()
    for (const w of WEEKS) { if (w.month < now.getMonth()) s.add(w.month) }
    return s
  })
  const [collapsedHist, setCollapsedHist] = useState(true)
  const [expandedRows, setExpandedRows] = useState({})
  const [editModal,    setEditModal]    = useState(null) // transaksi yang lagi diedit
  async function openEdit(tx) {
    if (tx?._delete) {
      await handleDelete(tx.id)
      return
    }
    setEditModal(tx)
  }

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
      <AddTransactionForm categories={categories} onAdd={handleAdd} allWeeks={ALL_WEEKS} transactions={transactions} />
      <TransactionList transactions={transactions} onDelete={handleDelete} onUpdate={handleUpdate} allWeeks={ALL_WEEKS} categories={categories} />
    </>
  )

  return (
    <>
    <Layout page={page} setPage={setPage} sidebar={sidebarContent} content={
        <div className={styles.wrap}>
          {(chips.defisit > 0 || chips.mepet > 0) && (
            <div className={styles.statusBar}>
              {chips.defisit > 0 && <span className="chip chip-danger">⚠ {chips.defisit} minggu defisit</span>}
              {chips.mepet   > 0 && <span className="chip chip-warn">⚡ {chips.mepet} minggu mepet</span>}
            </div>
          )}
          <div className={styles.tableWrap}>
            <table>
              <thead>
                <tr>
                  <th>Tanggal</th><th>Masuk</th><th>Keluar</th><th>Saldo Akhir</th><th>Status</th>
                </tr>
              </thead>
              <tbody>
                {/* HISTORIS */}
                {tableData.histRows.length > 0 && (
                  <>
                    <tr className={styles.histBanner}>
                      <td colSpan={5}>📂 Data Historis Jan–Mar 2026<span className={styles.histNote}> · tidak mempengaruhi saldo forecast</span></td>
                    </tr>
                    {[0,1,2].map(mo => {
                      const moRows = tableData.histRows.filter(r => r.week.month === mo)
                      if (!moRows.length) return null
                      return (
                        <Fragment key={`hist-mo-${mo}`}>
                          <tr className={styles.monthRow} onClick={() => setCollapsedHist(o => !o)}>
                            <td colSpan={5}>{MONTHS_SHORT[mo]} 2026 <span className={styles.arrow}>{collapsedHist ? '▶' : '▼'}</span></td>
                          </tr>
                          {!collapsedHist && moRows.map((r,i) => (
                            <WeekRow
                              key={`hist-${mo}-${i}`}
                              r={r}
                              onToggle={(ws,t) => toggleExpand(`hist_${ws}`,t)}
                              isExpIn={isExpanded(`hist_${r.week.start}`,'in')}
                              isExpOut={isExpanded(`hist_${r.week.start}`,'out')}
                              isHist={true}
                              onEdit={openEdit}
                            />
                          ))}
                        </Fragment>
                      )
                    })}
                    <tr className={styles.gapRow}><td colSpan={5} /></tr>
                  </>
                )}

                {/* FORECAST */}
                {(() => {
                  let lastMonth = -1
                  return tableData.rows.map((r, i) => {
                    const isNewMonth = r.week.month !== lastMonth
                    if (isNewMonth) lastMonth = r.week.month
                    const collapsed = collapsedMonths.has(r.week.month)
                    return (
                      <Fragment key={`frag-${i}`}>
                        {isNewMonth && (
                          <tr className={styles.monthRow} onClick={() => toggleMonth(r.week.month)}>
                            <td colSpan={5}>{MONTHS_SHORT[r.week.month]} 2026 <span className={styles.arrow}>{collapsed ? '▶' : '▼'}</span></td>
                          </tr>
                        )}
                        {!collapsed && (
                          <WeekRow
                            r={r}
                            onToggle={toggleExpand}
                            isExpIn={isExpanded(r.week.start,'in')}
                            isExpOut={isExpanded(r.week.start,'out')}
                            onEdit={openEdit}
                          />
                        )}
                      </Fragment>
                    )
                  })
                })()}
              </tbody>
            </table>
          </div>
        </div>
    }>
    </Layout>
    {editModal && (
      <EditModal
        tx={editModal}
        categories={categories}
        onUpdate={handleUpdate}
        onDelete={async (id) => { await handleDelete(id); setEditModal(null) }}
        onClose={() => setEditModal(null)}
      />
    )}
  </>
  )
}

function EditModal({ tx, categories, onUpdate, onDelete, onClose }) {
  const [data, setData] = useState({
    name:      tx.name,
    amount:    tx.amount,
    date:      tx.date,
    type:      tx.type,
    account:   tx.account,
    cat_id:    tx.cat_id    || '',
    subcat_id: tx.subcat_id || '',
    is_est:    tx.is_est,
  })
  const [saving, setSaving] = useState(false)

  const filteredCats = categories.filter(c => c.type === data.type)
  const selectedCat  = filteredCats.find(c => c.id === data.cat_id)
  const subcats      = selectedCat?.subcats || []
  const ACCOUNTS     = ['utama','buffer','petty','procurement']
  const ACCT_LABELS  = { utama:'Utama', buffer:'Buffer', petty:'Petty Cash', procurement:'Procurement' }

  async function handleSave() {
    const amount = parseFloat(data.amount)
    if (!data.name.trim() || !amount || amount <= 0) return
    setSaving(true)
    try {
      const cat    = filteredCats.find(c => c.id === data.cat_id)
      const subcat = (cat?.subcats||[]).find(s => s.id === data.subcat_id)
      await onUpdate(tx.id, {
        name:        data.name.trim(),
        amount,
        date:        data.date,
        type:        data.type,
        account:     data.account,
        cat_id:      data.cat_id    || null,
        cat_name:    cat?.name      || null,
        subcat_id:   data.subcat_id || null,
        subcat_name: subcat?.name   || null,
        is_est:      data.is_est,
      })
      onClose()
    } catch(e) { alert('Gagal: ' + e.message) }
    finally { setSaving(false) }
  }

  return (
    <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,.2)',display:'flex',alignItems:'center',justifyContent:'center',zIndex:200,backdropFilter:'blur(2px)'}} onClick={onClose}>
      <div style={{background:'var(--white)',border:'1px solid var(--border)',borderRadius:'var(--r2)',width:360,maxWidth:'90vw',boxShadow:'var(--shadow-md)',display:'flex',flexDirection:'column'}} onClick={e=>e.stopPropagation()}>
        <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',padding:'12px 16px',borderBottom:'1px solid var(--border)'}}>
          <span style={{fontSize:13,fontWeight:700,color:'var(--text)'}}>Edit Transaksi</span>
          <button onClick={onClose} style={{background:'none',border:'none',fontSize:18,color:'var(--text3)',cursor:'pointer',padding:0}}>×</button>
        </div>
        <div style={{padding:'12px 16px',display:'flex',flexDirection:'column',gap:8}}>
          <div style={{display:'flex',gap:4}}>
            {['in','out'].map(t => (
              <button key={t} onClick={()=>setData(p=>({...p,type:t,cat_id:'',subcat_id:''}))}
                style={{flex:1,padding:'5px',borderRadius:'var(--r)',border:'1px solid',fontSize:11,fontWeight:600,cursor:'pointer',fontFamily:'var(--font)',
                  background: data.type===t ? (t==='in'?'var(--green-light)':'var(--red-light)') : 'none',
                  borderColor: data.type===t ? (t==='in'?'var(--green-border)':'var(--red-border)') : 'var(--border)',
                  color: data.type===t ? (t==='in'?'var(--green)':'var(--red)') : 'var(--text3)'
                }}>
                {t==='in'?'Masuk':'Keluar'}
              </button>
            ))}
          </div>
          <input value={data.name} onChange={e=>setData(p=>({...p,name:e.target.value}))} placeholder="Nama" style={{fontSize:12,padding:'6px 9px'}} />
          <div style={{position:'relative'}}>
            <span style={{position:'absolute',left:9,top:'50%',transform:'translateY(-50%)',fontSize:12,color:'var(--text3)',pointerEvents:'none'}}>Rp</span>
            <input
              type="number"
              value={data.amount}
              onChange={e=>setData(p=>({...p,amount:e.target.value}))}
              placeholder="0"
              style={{fontSize:12,padding:'6px 9px 6px 28px',width:'100%'}}
            />
          </div>
          {data.amount > 0 && <div style={{fontSize:10,color:'var(--text3)',marginTop:-4}}>= {Number(data.amount).toLocaleString('id-ID', {style:'currency',currency:'IDR',maximumFractionDigits:0})}</div>}
          <input type="date" value={data.date} onChange={e=>setData(p=>({...p,date:e.target.value}))} style={{fontSize:12,padding:'6px 9px'}} />
          <select value={data.account} onChange={e=>setData(p=>({...p,account:e.target.value}))} style={{fontSize:12,padding:'6px 9px'}}>
            {ACCOUNTS.map(a=><option key={a} value={a}>{ACCT_LABELS[a]}</option>)}
          </select>
          <select value={data.cat_id} onChange={e=>setData(p=>({...p,cat_id:e.target.value,subcat_id:''}))} style={{fontSize:12,padding:'6px 9px'}}>
            <option value="">— Kategori —</option>
            {filteredCats.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
          {subcats.length > 0 && (
            <select value={data.subcat_id} onChange={e=>setData(p=>({...p,subcat_id:e.target.value}))} style={{fontSize:12,padding:'6px 9px'}}>
              <option value="">— Subkategori —</option>
              {subcats.map(s=><option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          )}
          <label style={{display:'flex',alignItems:'center',gap:6,fontSize:11,color:'var(--text2)',cursor:'pointer'}}>
            <input type="checkbox" checked={data.is_est} onChange={e=>setData(p=>({...p,is_est:e.target.checked}))} style={{width:'auto'}} />
            Estimasi
          </label>
        </div>
        <div style={{display:'flex',gap:6,padding:'10px 16px',borderTop:'1px solid var(--border)'}}>
          <button onClick={handleSave} disabled={saving}
            style={{flex:1,padding:'7px',borderRadius:'var(--r)',border:'none',background:'var(--red)',color:'#fff',fontSize:12,fontWeight:700,cursor:'pointer',fontFamily:'var(--font)',opacity:saving?.5:1}}>
            {saving?'Menyimpan...':'✓ Simpan'}
          </button>
          <button onClick={onClose} style={{padding:'7px 12px',borderRadius:'var(--r)',border:'1px solid var(--border)',background:'none',color:'var(--text2)',fontSize:12,cursor:'pointer',fontFamily:'var(--font)'}}>Batal</button>
          <button onClick={() => { if(confirm('Hapus transaksi ini?')) { onDelete(tx.id); onClose() } }}
            style={{padding:'7px 10px',borderRadius:'var(--r)',border:'1px solid var(--red-border)',background:'var(--red-light)',color:'var(--red)',fontSize:12,cursor:'pointer',fontFamily:'var(--font)'}}>
            🗑
          </button>
        </div>
      </div>
    </div>
  )
}