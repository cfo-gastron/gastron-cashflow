import { useState, useMemo, useEffect, useCallback } from 'react'
import { useApp } from '../context/AppContext'
import { rp, MONTHS_SHORT } from '../lib/utils'
import { getBudgets, upsertBudget } from '../lib/db'
import Layout from '../components/Layout'
import styles from './BudgetPage.module.css'

const OPEX_ORDER = ['d_cogs','d_opex','d_sal','d_off','d_corp','d_capex','d_liab']

export default function BudgetPage({ page, setPage }) {
  const { allItems, transactions, categories } = useApp()
  const [period,   setPeriod]   = useState('monthly')
  const [month,    setMonth]    = useState(new Date().getMonth())
  const [budgets,  setBudgets]  = useState({})
  const [loading,  setLoading]  = useState(true)
  const [editing,  setEditing]  = useState({})
  const [saving,   setSaving]   = useState({})

  // Load budgets from Supabase
  const loadBudgets = useCallback(async () => {
    try {
      setLoading(true)
      const data = await getBudgets()
      setBudgets(data)
    } catch(e) {
      console.error('Load budgets error:', e)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { loadBudgets() }, [loadBudgets])

  const spending = useMemo(() => {
    const items = [...transactions.filter(z => !z.is_kemb), ...allItems.filter(z => z.is_rec)]
    const result = {}
    for (const z of items) {
      if (!z.date || z.type !== 'out') continue
      const m = new Date(z.date).getMonth()
      if (period === 'monthly' && m !== month) continue
      const cid = z.cat_id || '__uncategorized'
      result[cid] = (result[cid] || 0) + Number(z.amount)
    }
    return result
  }, [allItems, transactions, period, month])

  const outCats = useMemo(() => {
    const cats = categories.filter(c => c.type === 'out')
    return [
      ...OPEX_ORDER.filter(id => cats.find(c => c.id === id)).map(id => cats.find(c => c.id === id)),
      ...cats.filter(c => !OPEX_ORDER.includes(c.id))
    ]
  }, [categories])

  const budgetKey = (catId) => `${catId}_${period}`
  const getBudget = (catId) => budgets[budgetKey(catId)] || 0

  async function saveBudget(catId, val) {
    const v = parseFloat(val)
    if (isNaN(v) || v < 0) return
    setSaving(prev => ({ ...prev, [catId]: true }))
    try {
      await upsertBudget(catId, period, v)
      setBudgets(prev => ({ ...prev, [budgetKey(catId)]: v }))
      setEditing(prev => { const n = {...prev}; delete n[catId]; return n })
    } catch(e) {
      alert('Gagal simpan: ' + e.message)
    } finally {
      setSaving(prev => { const n = {...prev}; delete n[catId]; return n })
    }
  }

  function getStatus(pct) { return pct >= 100 ? 'over' : pct >= 70 ? 'warn' : 'ok' }

  const totalSpent    = Object.values(spending).reduce((a,b) => a+b, 0)
  const totalBudgeted = outCats.reduce((s,c) => s + getBudget(c.id), 0)
  const totalSisa     = totalBudgeted - totalSpent
  const catsOver      = outCats.filter(c => { const b=getBudget(c.id); return b>0 && (spending[c.id]||0) > b }).length

  return (
    <Layout page={page} setPage={setPage}>
      {{ content: (
        <div className={styles.wrap}>
          <div className={styles.toolbar}>
            <div>
              <div className={styles.toolbarTitle}>Budget Monitor</div>
              <div className={styles.toolbarSub}>Set limit per kategori, pantau realisasi</div>
            </div>
            <div className={styles.toolbarRight}>
              <div className={styles.periodToggle}>
                <button className={`${styles.periodBtn} ${period==='monthly'?styles.periodBtnOn:''}`} onClick={()=>setPeriod('monthly')}>Per Bulan</button>
                <button className={`${styles.periodBtn} ${period==='yearly'?styles.periodBtnOn:''}`}  onClick={()=>setPeriod('yearly')}>Per Tahun</button>
              </div>
              {period === 'monthly' && (
                <select className={styles.monthSelect} value={month} onChange={e=>setMonth(parseInt(e.target.value))}>
                  {MONTHS_SHORT.map((m,i) => <option key={i} value={i}>{m} 2026</option>)}
                </select>
              )}
            </div>
          </div>

          <div className={styles.summary}>
            <div className={styles.sumCard}>
              <div className={styles.sumLabel}>Total Pengeluaran</div>
              <div className={styles.sumVal}>{rp(totalSpent)}</div>
              <div className={styles.sumSub}>{period==='monthly'?MONTHS_SHORT[month]:'Jan–Des'} 2026</div>
            </div>
            <div className={styles.sumCard}>
              <div className={styles.sumLabel}>Total Budget</div>
              <div className={styles.sumVal}>{totalBudgeted?rp(totalBudgeted):'—'}</div>
              <div className={styles.sumSub}>{outCats.filter(c=>getBudget(c.id)>0).length} kategori diset</div>
            </div>
            <div className={styles.sumCard}>
              <div className={styles.sumLabel}>Sisa Budget</div>
              <div className={`${styles.sumVal} ${totalSisa<0?styles.red:styles.green}`}>{totalBudgeted?rp(Math.abs(totalSisa)):'—'}</div>
              <div className={styles.sumSub}>{catsOver>0?`⚠ ${catsOver} kategori over budget`:totalBudgeted?'✓ Semua dalam batas':'Belum ada budget diset'}</div>
            </div>
          </div>

          <div className={styles.grid}>
            {loading ? (
              <div className="empty-state"><div className="spinner" /></div>
            ) : outCats.map(cat => {
              const spent  = spending[cat.id] || 0
              const budget = getBudget(cat.id)
              const pct    = budget > 0 ? Math.min((spent/budget)*100, 100) : 0
              const rawPct = budget > 0 ? (spent/budget)*100 : 0
              const status = budget > 0 ? getStatus(rawPct) : 'ok'
              const isEdit = cat.id in editing
              const isSaving = saving[cat.id]
              const barCls = status==='over'?styles.barOver:status==='warn'?styles.barWarn:styles.barOk
              const pctCls = status==='over'?styles.pctOver:status==='warn'?styles.pctWarn:styles.pctOk

              return (
                <div key={cat.id} className={styles.card}>
                  <div className={styles.cardTop}>
                    <div className={styles.cardLeft}>
                      <span className={styles.catName}>{cat.name}</span>
                      {spent > 0 ? (
                        <div className={styles.amounts}>
                          <span className={`${styles.spent} ${status!=='ok'?styles[status]:''}`}>{rp(spent)}</span>
                          {budget > 0 && <><span className={styles.sep}>/</span><span className={styles.budget}>{rp(budget)}</span></>}
                        </div>
                      ) : <span className={styles.catSub}>Belum ada pengeluaran</span>}
                    </div>
                    <div className={styles.cardRight}>
                      {budget > 0 && <span className={`${styles.pctBadge} ${pctCls}`}>{rawPct.toFixed(0)}%</span>}
                      {!isEdit && (
                        <button className={styles.editBtn} onClick={()=>setEditing(p=>({...p,[cat.id]:getBudget(cat.id)||''}))}>
                          {budget>0?'Edit':'+ Set'}
                        </button>
                      )}
                    </div>
                  </div>

                  {budget > 0 && (
                    <div className={styles.barWrap}>
                      <div className={`${styles.bar} ${barCls}`} style={{width:`${pct}%`}} />
                    </div>
                  )}

                  {isEdit && (
                    <div className={styles.setBudget}>
                      <input
                        type="number"
                        className={styles.budgetInput}
                        value={editing[cat.id]}
                        onChange={e=>setEditing(p=>({...p,[cat.id]:e.target.value}))}
                        placeholder="Contoh: 50000000"
                        autoFocus
                        onKeyDown={e=>e.key==='Enter'&&saveBudget(cat.id,editing[cat.id])}
                      />
                      <button className={styles.saveBtn} onClick={()=>saveBudget(cat.id,editing[cat.id])} disabled={isSaving}>
                        {isSaving?'...':'Simpan'}
                      </button>
                      <button className={styles.editBtn} onClick={()=>setEditing(p=>{const n={...p};delete n[cat.id];return n})}>Batal</button>
                    </div>
                  )}

                  {!budget && !isEdit && (
                    <div className={styles.noBudget}>
                      <span className={styles.noBudgetText}>Belum ada budget limit</span>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      )}}
    </Layout>
  )
}