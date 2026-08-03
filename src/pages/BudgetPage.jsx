import { useState, useMemo, useEffect, useCallback } from 'react'
import { useApp } from '../context/AppContext'
import { rp, MONTHS_SHORT } from '../lib/utils'
import { getBudgets, upsertBudget } from '../lib/db'

const OPEX_ORDER = ['d_cogs','d_opex','d_sal','d_off','d_corp','d_capex','d_liab']

export default function BudgetPage({ page, setPage }) {
  const { allItems, transactions, categories } = useApp()
  const [period,  setPeriod]  = useState('monthly')
  const [month,   setMonth]   = useState(new Date().getMonth())
  const [budgets, setBudgets] = useState({})
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState({})
  const [saving,  setSaving]  = useState({})

  const loadBudgets = useCallback(async () => {
    try { setLoading(true); setBudgets(await getBudgets()) }
    catch(e){ console.error(e) } finally{ setLoading(false) }
  }, [])
  useEffect(()=>{loadBudgets()},[loadBudgets])

  const spending = useMemo(()=>{
    const items = [...transactions.filter(z=>!z.is_kemb), ...allItems.filter(z=>z.is_rec)]
    const result = {}
    for (const z of items) {
      if (!z.date||z.type!=='out') continue
      const m = new Date(z.date).getMonth()
      if (period==='monthly'&&m!==month) continue
      result[z.cat_id||'__unc'] = (result[z.cat_id||'__unc']||0) + Number(z.amount)
    }
    return result
  }, [allItems, transactions, period, month])

  const outCats = useMemo(()=>{
    const cats = categories.filter(c=>c.type==='out')
    return [...OPEX_ORDER.filter(id=>cats.find(c=>c.id===id)).map(id=>cats.find(c=>c.id===id)), ...cats.filter(c=>!OPEX_ORDER.includes(c.id))]
  }, [categories])

  const getBudget = (catId) => budgets[`${catId}_${period}`]||0

  async function saveBudget(catId, val) {
    const v = parseFloat(val); if (isNaN(v)||v<0) return
    setSaving(p=>({...p,[catId]:true}))
    try {
      await upsertBudget(catId, period, v)
      setBudgets(p=>({...p,[`${catId}_${period}`]:v}))
      setEditing(p=>{const n={...p};delete n[catId];return n})
    } catch(e){alert('Gagal: '+e.message)} finally{setSaving(p=>{const n={...p};delete n[catId];return n})}
  }

  const totalSpent    = Object.values(spending).reduce((a,b)=>a+b,0)
  const totalBudgeted = outCats.reduce((s,c)=>s+getBudget(c.id),0)
  const totalSisa     = totalBudgeted - totalSpent
  const catsOver      = outCats.filter(c=>{const b=getBudget(c.id);return b>0&&(spending[c.id]||0)>b}).length

  return (
    <div className="main">
      <div className="main-hdr">
        <span className="page-title">Budget</span>
        <div style={{marginLeft:'auto',display:'flex',gap:6,alignItems:'center'}}>
          <div style={{display:'flex',gap:3}}>
            {[['monthly','Per Bulan'],['yearly','Per Tahun']].map(([v,l])=>(
              <button key={v} onClick={()=>setPeriod(v)}
                style={{padding:'5px 10px',borderRadius:'var(--r)',border:`0.5px solid ${period===v?'var(--red-bd)':'var(--glass-bd)'}`,background:period===v?'var(--red-bg)':'none',fontSize:10,fontWeight:500,color:period===v?'var(--red)':'var(--text2)',cursor:'pointer',fontFamily:'var(--font)',transition:'all .18s'}}>
                {l}
              </button>
            ))}
          </div>
          {period==='monthly' && (
            <select value={month} onChange={e=>setMonth(parseInt(e.target.value))}
              style={{background:'var(--glass)',border:'0.5px solid var(--glass-bd)',borderRadius:'var(--r)',padding:'5px 9px',fontSize:10,color:'var(--text)',fontFamily:'var(--font)',outline:'none'}}>
              {MONTHS_SHORT.map((m,i)=><option key={i} value={i}>{m} 2026</option>)}
            </select>
          )}
        </div>
      </div>

      <div style={{flex:1,overflow:'auto',padding:'16px 20px',display:'flex',flexDirection:'column',gap:14}}>
        {/* SUMMARY CARDS */}
        <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:10}}>
          {[
            ['Total Pengeluaran', rp(totalSpent), period==='monthly'?MONTHS_SHORT[month]+' 2026':'Jan–Des 2026', 'var(--red)'],
            ['Total Budget', totalBudgeted?rp(totalBudgeted):'Belum diset', outCats.filter(c=>getBudget(c.id)>0).length+' kategori diset', 'var(--text)'],
            ['Sisa Budget', totalBudgeted?rp(Math.abs(totalSisa)):'—', catsOver>0?`⚠ ${catsOver} kategori over`:totalBudgeted?'✓ Dalam batas':'Belum ada budget', totalSisa<0?'var(--red)':'var(--green)'],
          ].map(([label,val,sub,color],i)=>(
            <div key={i} style={{background:'var(--glass)',border:'0.5px solid var(--glass-bd)',borderRadius:12,backdropFilter:'blur(14px)',padding:'12px 14px',boxShadow:'var(--shadow)'}}>
              <div style={{fontSize:9,fontWeight:700,color:'var(--text3)',textTransform:'uppercase',letterSpacing:'.07em',fontFamily:'var(--sora)',marginBottom:6}}>{label}</div>
              <div style={{fontFamily:'var(--mono)',fontSize:14,fontWeight:600,color,marginBottom:3}}>{val}</div>
              <div style={{fontSize:10,color:'var(--text3)'}}>{sub}</div>
            </div>
          ))}
        </div>

        {/* BUDGET CARDS */}
        {loading ? (
          <div className="empty-state"><div className="spinner"/></div>
        ) : (
          <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(280px,1fr))',gap:10}}>
            {outCats.map(cat=>{
              const spent  = spending[cat.id]||0
              const budget = getBudget(cat.id)
              const pct    = budget>0 ? Math.min((spent/budget)*100,100) : 0
              const rawPct = budget>0 ? (spent/budget)*100 : 0
              const over   = rawPct>=100
              const warn   = rawPct>=70&&rawPct<100
              const barColor = over?'var(--red)':warn?'var(--amber)':'var(--green)'
              const isEdit = cat.id in editing

              return (
                <div key={cat.id} style={{background:'var(--glass)',border:`0.5px solid ${over?'var(--red-bd)':warn?'var(--amber-bd)':'var(--glass-bd)'}`,borderRadius:12,backdropFilter:'blur(14px)',padding:'12px 14px',boxShadow:'var(--shadow)',display:'flex',flexDirection:'column',gap:8}}>
                  <div style={{display:'flex',alignItems:'flex-start',justifyContent:'space-between',gap:8}}>
                    <div style={{flex:1,minWidth:0}}>
                      <div style={{fontSize:12,fontWeight:600,color:'var(--navy)',fontFamily:'var(--font)',marginBottom:2}}>{cat.name}</div>
                      {spent>0 ? (
                        <div style={{fontSize:11,display:'flex',gap:4,alignItems:'baseline'}}>
                          <span style={{fontFamily:'var(--mono)',color:over?'var(--red)':warn?'var(--amber)':'var(--text)',fontWeight:500}}>{rp(spent)}</span>
                          {budget>0&&<><span style={{color:'var(--text3)'}}>/</span><span style={{fontFamily:'var(--mono)',color:'var(--text3)',fontSize:10}}>{rp(budget)}</span></>}
                        </div>
                      ) : <div style={{fontSize:10,color:'var(--text3)'}}>Belum ada pengeluaran</div>}
                    </div>
                    <div style={{display:'flex',gap:5,alignItems:'center',flexShrink:0}}>
                      {budget>0 && (
                        <span style={{fontSize:9,fontWeight:700,padding:'2px 7px',borderRadius:100,background:over?'var(--red-bg)':warn?'var(--amber-bg)':'var(--green-bg)',color:over?'var(--red)':warn?'var(--amber)':'var(--green)',border:`0.5px solid ${over?'var(--red-bd)':warn?'var(--amber-bd)':'var(--green-bd)'}`}}>
                          {rawPct.toFixed(0)}%
                        </span>
                      )}
                      {!isEdit && (
                        <button onClick={()=>setEditing(p=>({...p,[cat.id]:getBudget(cat.id)||''}))}
                          style={{fontSize:9,fontWeight:600,padding:'3px 9px',borderRadius:6,background:'none',border:'0.5px solid var(--glass-bd)',color:'var(--text2)',cursor:'pointer',fontFamily:'var(--font)',transition:'all .15s'}}>
                          {budget>0?'Edit':'+ Set'}
                        </button>
                      )}
                    </div>
                  </div>

                  {budget>0 && (
                    <div style={{height:4,background:'var(--divider)',borderRadius:100,overflow:'hidden'}}>
                      <div style={{height:'100%',width:`${pct}%`,background:barColor,borderRadius:100,transition:'width .3s'}}/>
                    </div>
                  )}

                  {isEdit && (
                    <div style={{display:'flex',gap:5}}>
                      <input type="number" value={editing[cat.id]} onChange={e=>setEditing(p=>({...p,[cat.id]:e.target.value}))}
                        placeholder="Contoh: 50000000" autoFocus
                        onKeyDown={e=>e.key==='Enter'&&saveBudget(cat.id,editing[cat.id])}
                        className="form-input" style={{flex:1,fontSize:11,marginBottom:0}}/>
                      <button onClick={()=>saveBudget(cat.id,editing[cat.id])} disabled={saving[cat.id]}
                        style={{padding:'6px 11px',background:'var(--red)',border:'none',borderRadius:'var(--r)',fontSize:11,fontWeight:600,color:'#fff',cursor:'pointer',fontFamily:'var(--font)',whiteSpace:'nowrap'}}>
                        {saving[cat.id]?'...':'Simpan'}
                      </button>
                      <button onClick={()=>setEditing(p=>{const n={...p};delete n[cat.id];return n})}
                        style={{padding:'6px 9px',background:'var(--glass)',border:'0.5px solid var(--glass-bd)',borderRadius:'var(--r)',fontSize:11,color:'var(--text2)',cursor:'pointer',fontFamily:'var(--font)'}}>
                        ✕
                      </button>
                    </div>
                  )}

                  {!budget && !isEdit && (
                    <div style={{fontSize:10,color:'var(--text3)',fontStyle:'italic'}}>Belum ada budget limit</div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}