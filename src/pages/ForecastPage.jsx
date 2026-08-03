import { useState, useMemo, Fragment } from 'react'
import { useApp } from '../context/AppContext'
import { addTransaction, deleteTransaction, updateTransaction } from '../lib/db'
import { rp, MONTHS_SHORT, today, ACCOUNT_LABELS } from '../lib/utils'
import AddTransactionForm from '../components/AddTransactionForm'

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
  return dates.map(([mo,day]) => {
    const d = new Date(2026,mo,day), e = new Date(2026,mo,day+6)
    return { start:d.toISOString().split('T')[0], end:e.toISOString().split('T')[0], month:mo, label:`${day} ${MONTHS_SHORT[mo]}` }
  })
}

const WEEKS = generateWeeks()
const HIST_WEEKS = generateHistWeeks()
const ALL_WEEKS = [...HIST_WEEKS, ...WEEKS]
const TODAY_STR = today()
const ACCOUNTS = ['utama','buffer','petty','procurement']

// ── EXPAND ITEMS ─────────────────────────────────────────────
function ExpandItems({ items, type, onEdit }) {
  const [showAll, setShowAll] = useState(false)
  const cls  = type === 'in' ? 'n-in' : 'n-out'
  const sign = type === 'in' ? '+' : '-'
  const SHOW = 6
  const total   = items.reduce((s,z) => s+Number(z.amount), 0)
  const visible = showAll ? items : items.slice(0, SHOW)
  const rest    = items.length - SHOW

  return (
    <div className="expand-panel">
      {visible.map((z,i) => (
        <div key={i} className="exp-item" onClick={() => !z.is_rec && onEdit && onEdit(z)}>
          <span className={`exp-name${z.is_est?' est':''}`}>
            {z.name}
            {z.is_est && <span className="badge b-est" style={{marginLeft:4}}>Est</span>}
            {z.is_rec && <span className="badge b-rec" style={{marginLeft:4}}>↻</span>}
          </span>
          <span className="exp-cat">{z.subcat_name||z.cat_name||''}</span>
          <span className={`exp-amt ${cls}`}>{sign}{rp(z.amount)}</span>
          <span className="exp-edit">{!z.is_rec&&'✎'}</span>
        </div>
      ))}
      <div className="exp-footer">
        {rest > 0 && !showAll
          ? <button className="show-more" onClick={e=>{e.stopPropagation();setShowAll(true)}}>▾ +{rest} lainnya</button>
          : rest > 0 ? <button className="show-more" onClick={e=>{e.stopPropagation();setShowAll(false)}}>▴ Sembunyikan</button>
          : <span/>
        }
        <div className={`total-pill ${type==='out'?'pill-out':'pill-in'}`}>
          <span className="pill-lbl">Total {type==='out'?'keluar':'masuk'}</span>
          <span className={`pill-val ${cls}`}>{sign}{rp(total)}</span>
        </div>
      </div>
    </div>
  )
}

// ── WEEK ROW ─────────────────────────────────────────────────
function WeekRow({ r, onToggle, isExpIn, isExpOut, isHist, onEdit }) {
  const hasEst = [...r.ins,...r.outs].some(z=>z.is_est)
  const rowCls = r.isCur?'cur':r.status==='defisit'?'defisit':hasEst?'est':isHist?'hist':''

  return (
    <Fragment>
      <div className={`week-row ${rowCls}`}>
        <div className="date-cell">
          <span className="date-num">{r.week.label}</span>
          {r.isCur && <span className="tag tag-cur">minggu ini</span>}
          {isHist  && <span className="tag tag-hist">Hist</span>}
          {!isHist && hasEst && !r.isCur && <span className="tag tag-est">Est</span>}
        </div>
        <div>
          {r.ins.length
            ? <button className="cell-btn" onClick={()=>onToggle(isHist?`h_${r.week.start}`:r.week.start,'in')}>
                <span className={`cell-total n-in`}>+{rp(r.ins.reduce((s,z)=>s+Number(z.amount),0))}</span>
                <span className="cell-count">{isExpIn?'▲':'▾'} {r.ins.length} transaksi</span>
              </button>
            : <span className="n-dim" style={{textAlign:'right',display:'block'}}>—</span>}
        </div>
        <div>
          {r.outs.length
            ? <button className="cell-btn" onClick={()=>onToggle(isHist?`h_${r.week.start}`:r.week.start,'out')}>
                <span className={`cell-total n-out`}>-{rp(r.outs.reduce((s,z)=>s+Number(z.amount),0))}</span>
                <span className="cell-count">{isExpOut?'▲':'▾'} {r.outs.length} transaksi</span>
              </button>
            : <span className="n-dim" style={{textAlign:'right',display:'block'}}>—</span>}
        </div>
        <div><span className={isHist?'n-dim':r.close<0?'n-out num':'num'}>{isHist?'—':rp(r.close)}</span></div>
        <div className="s-cell">
          {isHist && null}
          {!isHist && r.status==='defisit' && <span className="chip chip-danger">Defisit!</span>}
          {!isHist && r.status==='mepet'   && <span className="chip chip-warn">Mepet</span>}
          {!isHist && r.status==='aman'    && <span className="chip chip-ok">Aman</span>}
          {!isHist && !r.status            && <span className="n-dim">—</span>}
        </div>
      </div>
      {isExpIn  && r.ins.length  >= 1 && <ExpandItems items={r.ins}  type="in"  onEdit={onEdit}/>}
      {isExpOut && r.outs.length >= 1 && <ExpandItems items={r.outs} type="out" onEdit={onEdit}/>}
    </Fragment>
  )
}

// ── EDIT MODAL ────────────────────────────────────────────────
function EditModal({ tx, categories, onUpdate, onDelete, onClose }) {
  const [data, setData] = useState({
    name:tx.name, amount:tx.amount, date:tx.date,
    type:tx.type, account:tx.account,
    cat_id:tx.cat_id||'', subcat_id:tx.subcat_id||'', is_est:tx.is_est,
  })
  const [saving, setSaving] = useState(false)
  const filteredCats = categories.filter(c=>c.type===data.type)
  const selectedCat  = filteredCats.find(c=>c.id===data.cat_id)
  const subcats      = selectedCat?.subcats||[]

  async function save() {
    if (!data.name.trim()||!parseFloat(data.amount)) return
    setSaving(true)
    try {
      const cat    = filteredCats.find(c=>c.id===data.cat_id)
      const subcat = (cat?.subcats||[]).find(s=>s.id===data.subcat_id)
      await onUpdate(tx.id, { name:data.name.trim(), amount:parseFloat(data.amount), date:data.date, type:data.type, account:data.account, cat_id:data.cat_id||null, cat_name:cat?.name||null, subcat_id:data.subcat_id||null, subcat_name:subcat?.name||null, is_est:data.is_est })
      onClose()
    } catch(e){alert('Gagal: '+e.message)} finally{setSaving(false)}
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e=>e.stopPropagation()}>
        <div className="modal-hdr">
          <span className="modal-title">Edit Transaksi</span>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>
        <div className="modal-body">
          <div className="form-type-row">
            {['in','out'].map(t=>(
              <button key={t} className={`type-btn ${data.type===t?t:''}`} onClick={()=>setData(p=>({...p,type:t,cat_id:'',subcat_id:''}))}>
                {t==='in'?'Masuk':'Keluar'}
              </button>
            ))}
          </div>
          <input value={data.name} onChange={e=>setData(p=>({...p,name:e.target.value}))} placeholder="Nama transaksi" className="form-input"/>
          <div>
            <div style={{position:'relative'}}>
              <span style={{position:'absolute',left:10,top:'50%',transform:'translateY(-50%)',fontSize:11,color:'var(--text3)',pointerEvents:'none'}}>Rp</span>
              <input type="number" value={data.amount} onChange={e=>setData(p=>({...p,amount:e.target.value}))} placeholder="0" className="form-input" style={{paddingLeft:28}}/>
            </div>
            {data.amount>0 && <div className="rp-preview">{Number(data.amount).toLocaleString('id-ID',{style:'currency',currency:'IDR',maximumFractionDigits:0})}</div>}
          </div>
          <input type="date" value={data.date} onChange={e=>setData(p=>({...p,date:e.target.value}))} className="form-input"/>
          <select value={data.account} onChange={e=>setData(p=>({...p,account:e.target.value}))} className="form-select">
            {ACCOUNTS.map(a=><option key={a} value={a}>{ACCOUNT_LABELS[a]}</option>)}
          </select>
          <select value={data.cat_id} onChange={e=>setData(p=>({...p,cat_id:e.target.value,subcat_id:''}))} className="form-select">
            <option value="">— Kategori —</option>
            {filteredCats.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
          {subcats.length>0 && (
            <select value={data.subcat_id} onChange={e=>setData(p=>({...p,subcat_id:e.target.value}))} className="form-select">
              <option value="">— Subkategori —</option>
              {subcats.map(s=><option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          )}
          <label style={{display:'flex',alignItems:'center',gap:7,fontSize:11,color:'var(--text2)',cursor:'pointer'}}>
            <input type="checkbox" checked={data.is_est} onChange={e=>setData(p=>({...p,is_est:e.target.checked}))} style={{accentColor:'var(--red)',width:'auto'}}/>
            Estimasi
          </label>
        </div>
        <div className="modal-footer">
          <button className="btn-save" onClick={save} disabled={saving}>{saving?'Menyimpan...':'✓ Simpan'}</button>
          <button className="btn-cancel" onClick={onClose}>Batal</button>
          <button className="btn-delete" onClick={()=>{if(confirm('Hapus?')){onDelete(tx.id);onClose()}}}>🗑</button>
        </div>
      </div>
    </div>
  )
}

// ── EST POPUP ─────────────────────────────────────────────────
function EstPopup({ overdueEst, categories, onUpdate, onDelete, onClose }) {
  const [editingId,  setEditingId]  = useState(null)
  const [editData,   setEditData]   = useState({})
  const [savingId,   setSavingId]   = useState(null)

  // Group per minggu
  const groups = useMemo(() => {
    const map = {}
    for (const tx of overdueEst) {
      const d = new Date(tx.date)
      // Cari minggu mulai (Senin/Minggu terdekat)
      const weekStart = new Date(d)
      const day = d.getDay()
      weekStart.setDate(d.getDate() - day)
      const key = weekStart.toISOString().split('T')[0]
      if (!map[key]) map[key] = { weekStart: key, items: [] }
      map[key].items.push(tx)
    }
    return Object.values(map).sort((a,b)=>a.weekStart.localeCompare(b.weekStart))
  }, [overdueEst])

  function startEdit(tx) {
    setEditingId(tx.id)
    setEditData({ name:tx.name, amount:tx.amount, date:tx.date })
  }

  async function saveEdit(tx) {
    setSavingId(tx.id)
    try {
      await onUpdate(tx.id, { ...tx, name:editData.name.trim(), amount:parseFloat(editData.amount), date:editData.date, is_est:false })
      setEditingId(null)
    } catch(e){alert('Gagal: '+e.message)} finally{setSavingId(null)}
  }

  async function confirm(tx) {
    setSavingId(tx.id)
    try { await onUpdate(tx.id, {...tx, is_est:false}) }
    catch(e){alert('Gagal: '+e.message)} finally{setSavingId(null)}
  }

  async function del(tx) {
    if (!window.confirm('Hapus estimasi ini?')) return
    await onDelete(tx.id)
  }

  async function confirmAll() {
    if (!window.confirm(`Konfirmasi semua ${overdueEst.length} estimasi menjadi real?`)) return
    for (const tx of overdueEst) {
      try { await onUpdate(tx.id, {...tx, is_est:false}) } catch{}
    }
  }

  function fmtWeek(ws) {
    const d = new Date(ws)
    const e = new Date(ws); e.setDate(d.getDate()+6)
    const mo = MONTHS_SHORT
    return `${d.getDate()} ${mo[d.getMonth()]} – ${e.getDate()} ${mo[e.getMonth()]}`
  }

  return (
    <div className="est-popup-overlay" onClick={onClose}>
      <div className="est-popup" onClick={e=>e.stopPropagation()}>
        <div className="ep-hdr">
          <div>
            <div className="ep-title">Estimasi lewat tanggal</div>
            <div className="ep-sub">{overdueEst.length} transaksi perlu dikonfirmasi atau dihapus</div>
          </div>
          <button className="ep-close" onClick={onClose}>×</button>
        </div>

        <div className="ep-body">
          {groups.map(grp => (
            <div key={grp.weekStart} className="week-group">
              <div className="wk-label">
                <span className="wk-title">{fmtWeek(grp.weekStart)}</span>
                <div className="wk-line"/>
                <span className="wk-count">{grp.items.length} estimasi</span>
              </div>
              <div className="wk-items">
                {grp.items.map(tx => (
                  <div key={tx.id} className="est-card">
                    <div className="est-card-main">
                      <div className={`est-card-icon ${tx.type==='in'?'icon-in':'icon-out'}`}>
                        {tx.type==='in'?'↑':'↓'}
                      </div>
                      <div className="est-card-info">
                        <div className="est-card-name">{tx.name}</div>
                        <div className="est-card-meta">{tx.subcat_name||tx.cat_name||'—'} · {tx.date}</div>
                      </div>
                      <span className={`est-card-amt ${tx.type==='in'?'n-in':'n-out'}`}>
                        {tx.type==='in'?'+':'-'}{rp(tx.amount)}
                      </span>
                      <div className="est-card-acts">
                        {editingId===tx.id ? null : (
                          <>
                            <button className="btn-edit-est" onClick={()=>startEdit(tx)}>✎ Edit</button>
                            <button className="btn-confirm" disabled={savingId===tx.id} onClick={()=>confirm(tx)}>
                              {savingId===tx.id?'...':'✓'}
                            </button>
                            <button className="btn-del-est" onClick={()=>del(tx)}>✕</button>
                          </>
                        )}
                      </div>
                    </div>
                    {/* INLINE EDIT */}
                    {editingId===tx.id && (
                      <div className="est-inline-edit">
                        <div className="inline-row">
                          <input value={editData.name} onChange={e=>setEditData(p=>({...p,name:e.target.value}))} placeholder="Nama" className="inline-input"/>
                        </div>
                        <div className="inline-row">
                          <div style={{position:'relative',flex:1}}>
                            <span style={{position:'absolute',left:9,top:'50%',transform:'translateY(-50%)',fontSize:11,color:'var(--text3)',pointerEvents:'none'}}>Rp</span>
                            <input type="number" value={editData.amount} onChange={e=>setEditData(p=>({...p,amount:e.target.value}))} className="inline-input" style={{paddingLeft:27}}/>
                          </div>
                          <input type="date" value={editData.date} onChange={e=>setEditData(p=>({...p,date:e.target.value}))} className="inline-input"/>
                        </div>
                        <div className="inline-actions">
                          <button className="btn-inline-save" disabled={savingId===tx.id} onClick={()=>saveEdit(tx)}>
                            {savingId===tx.id?'Menyimpan...':'✓ Simpan & Konfirmasi'}
                          </button>
                          <button className="btn-inline-cancel" onClick={()=>setEditingId(null)}>Batal</button>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        <div className="ep-footer">
          <span className="ep-note">Konfirmasi = hapus tanda estimasi, data tetap</span>
          <button className="btn-confirm-all" onClick={confirmAll}>✓ Konfirmasi semua</button>
        </div>
      </div>
    </div>
  )
}

// ── MAIN PAGE ─────────────────────────────────────────────────
export default function ForecastPage({ page, setPage }) {
  const { transactions, setTransactions, saldoAwal, allItems, categories } = useApp()
  const [collapsedMonths, setCollapsedMonths] = useState(() => {
    const now = new Date(); const s = new Set()
    for (const w of WEEKS) { if (w.month < now.getMonth()) s.add(w.month) }
    return s
  })
  const [collapsedHist, setCollapsedHist] = useState(true)
  const [expandedRows,  setExpandedRows]  = useState({})
  const [editModal,     setEditModal]     = useState(null)
  const [showEstPopup,  setShowEstPopup]  = useState(false)

  function toggleExpand(key, type) {
    const k = `${key}_${type}`
    setExpandedRows(prev=>({...prev,[k]:!prev[k]}))
  }
  function isExp(key, type) { return !!expandedRows[`${key}_${type}`] }
  function toggleMonth(m) { setCollapsedMonths(prev=>{const s=new Set(prev);s.has(m)?s.delete(m):s.add(m);return s}) }

  const overdueEst = useMemo(() =>
    transactions.filter(t => t.is_est && t.date < TODAY_STR)
      .sort((a,b)=>a.date.localeCompare(b.date))
  , [transactions])

  const tableData = useMemo(() => {
    let bal = saldoAwal
    const histRows = []
    for (const w of HIST_WEEKS) {
      const ins  = transactions.filter(z=>z.date>=w.start&&z.date<=w.end&&z.type==='in')
      const outs = transactions.filter(z=>z.date>=w.start&&z.date<=w.end&&z.type==='out')
      if (!ins.length&&!outs.length) continue
      histRows.push({ week:w, ins, outs, open:0, close:0, isCur:false, status:'' })
    }
    const rows = []
    for (const w of WEEKS) {
      const ins  = allItems.filter(z=>z.date>=w.start&&z.date<=w.end&&z.type==='in')
      const outs = allItems.filter(z=>z.date>=w.start&&z.date<=w.end&&z.type==='out')
      const ti = ins.reduce((s,z)=>s+Number(z.amount),0)
      const to = outs.reduce((s,z)=>s+Number(z.amount),0)
      const open=bal; bal+=ti-to; const close=bal
      const isCur = TODAY_STR>=w.start&&TODAY_STR<=w.end
      let status=''
      if (close<0) status='defisit'
      else if (close<10_000_000&&(ti>0||to>0)) status='mepet'
      else if (ti>0||to>0) status='aman'
      rows.push({ week:w, ins, outs, open, close, isCur, status })
    }
    return { histRows, rows }
  }, [transactions, allItems, saldoAwal])

  const chips = useMemo(()=>({
    defisit: tableData.rows.filter(r=>r.status==='defisit').length,
    mepet:   tableData.rows.filter(r=>r.status==='mepet').length,
  }), [tableData])

  async function handleAdd(tx) {
    const newTx = await addTransaction(tx)
    setTransactions(prev=>[...prev,newTx].sort((a,b)=>a.date.localeCompare(b.date)))
  }
  async function handleDelete(id) {
    if (!confirm('Hapus transaksi ini?')) return
    await deleteTransaction(id)
    setTransactions(prev=>prev.filter(t=>t.id!==id))
  }
  async function handleUpdate(id, updates) {
    const updated = await updateTransaction(id, updates)
    setTransactions(prev=>prev.map(t=>t.id===id?updated:t))
  }

  return (
    <>
      {/* SIDEBAR */}
      <div className="sidebar">
        <div className="sb-hdr">
          <div className="sb-title">Tambah transaksi</div>
        </div>
        <AddTransactionForm categories={categories} onAdd={handleAdd} allWeeks={ALL_WEEKS} transactions={transactions}/>
      </div>

      {/* MAIN */}
      <div className="main">
        <div className="main-hdr">
          <span className="page-title">Forecast 2026</span>
          {(chips.defisit>0||chips.mepet>0) && (
            <div style={{display:'flex',gap:6,marginLeft:8}}>
              {chips.defisit>0 && <span className="chip chip-danger">⚠ {chips.defisit} minggu defisit</span>}
              {chips.mepet>0   && <span className="chip chip-warn">⚡ {chips.mepet} minggu mepet</span>}
            </div>
          )}
        </div>

        {/* REMINDER BAR */}
        {overdueEst.length > 0 && (
          <div className="reminder-bar" onClick={()=>setShowEstPopup(true)}>
            <span>⚠</span>
            <span><b>{overdueEst.length} estimasi</b> sudah lewat tanggal — perlu dikonfirmasi</span>
            <button className="reminder-btn" onClick={e=>{e.stopPropagation();setShowEstPopup(true)}}>
              Lihat estimasi ↗
            </button>
          </div>
        )}

        {/* TABLE */}
        <div className="table-wrap">
          <div className="t-head">
            <span className="th" style={{textAlign:'left'}}>Tanggal</span>
            <span className="th">Masuk</span>
            <span className="th">Keluar</span>
            <span className="th">Saldo akhir</span>
            <span className="th">Status</span>
          </div>

          {/* HISTORIS */}
          {tableData.histRows.length>0 && (
            <>
              <div className="hist-banner" onClick={()=>setCollapsedHist(o=>!o)}>
                <span>📂</span>
                <span>Data Historis Jan–Mar 2026 · tidak mempengaruhi saldo forecast</span>
                <span style={{marginLeft:'auto'}}>{collapsedHist?'▶':'▼'}</span>
              </div>
              {!collapsedHist && [0,1,2].map(mo=>{
                const moRows = tableData.histRows.filter(r=>r.week.month===mo)
                if (!moRows.length) return null
                return (
                  <Fragment key={`hm-${mo}`}>
                    <div className="mo-hdr" onClick={()=>setCollapsedHist(o=>!o)}>
                      <span className="mo-label">{MONTHS_SHORT[mo]} 2026</span>
                      <div className="mo-line"/>
                      <span className="mo-arr">▼</span>
                    </div>
                    {moRows.map((r,i)=>(
                      <div className="week-wrap" key={`hr-${mo}-${i}`}>
                        <WeekRow r={r} onToggle={toggleExpand}
                          isExpIn={isExp(`h_${r.week.start}`,'in')}
                          isExpOut={isExp(`h_${r.week.start}`,'out')}
                          isHist={true} onEdit={setEditModal}/>
                      </div>
                    ))}
                  </Fragment>
                )
              })}
              <div style={{height:8}}/>
            </>
          )}

          {/* FORECAST */}
          {(()=>{
            let lastMonth=-1
            return tableData.rows.map((r,i)=>{
              const isNew = r.week.month!==lastMonth
              if (isNew) lastMonth=r.week.month
              const collapsed = collapsedMonths.has(r.week.month)
              return (
                <Fragment key={`fr-${i}`}>
                  {isNew && (
                    <div className="mo-hdr" onClick={()=>toggleMonth(r.week.month)}>
                      <span className="mo-label">{MONTHS_SHORT[r.week.month]} 2026</span>
                      <div className="mo-line"/>
                      <span className="mo-arr">{collapsed?'▶':'▼'}</span>
                    </div>
                  )}
                  {!collapsed && (
                    <div className="week-wrap">
                      <WeekRow r={r} onToggle={toggleExpand}
                        isExpIn={isExp(r.week.start,'in')}
                        isExpOut={isExp(r.week.start,'out')}
                        isHist={false} onEdit={setEditModal} onEdit={e=>setEditModal(e)}/>
                    </div>
                  )}
                </Fragment>
              )
            })
          })()}
        </div>
      </div>

      {/* EDIT MODAL */}
      {editModal && (
        <EditModal tx={editModal} categories={categories}
          onUpdate={handleUpdate}
          onDelete={async(id)=>{await handleDelete(id);setEditModal(null)}}
          onClose={()=>setEditModal(null)}/>
      )}

      {/* EST POPUP */}
      {showEstPopup && (
        <EstPopup
          overdueEst={overdueEst}
          categories={categories}
          onUpdate={handleUpdate}
          onDelete={async(id)=>{await deleteTransaction(id);setTransactions(prev=>prev.filter(t=>t.id!==id))}}
          onClose={()=>setShowEstPopup(false)}/>
      )}
    </>
  )
}