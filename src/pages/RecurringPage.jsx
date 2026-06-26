import { useState } from 'react'
import { useApp } from '../context/AppContext'
import { addRecurring, deleteRecurring } from '../lib/db'
import { rp, ACCOUNT_LABELS, MONTHS_SHORT } from '../lib/utils'
import styles from './RecurringPage.module.css'

const ACCOUNTS = ['utama', 'buffer', 'petty', 'procurement']
const ALL_MONTHS = Array.from({ length: 12 }, (_, i) => i)

export default function RecurringPage() {
  const { recurring, setRecurring, categories } = useApp()
  const [rType, setRType] = useState('out')
  const [rName, setRName] = useState('')
  const [rAmount, setRAmount] = useState('')
  const [rAccount, setRAccount] = useState('utama')
  const [rCatId, setRCatId] = useState('')
  const [rSubcatId, setRSubcatId] = useState('')
  const [rWom, setRWom] = useState(4)
  const [rStart, setRStart] = useState(3)
  const [rEnd, setREnd] = useState(11)
  const [saving, setSaving] = useState(false)

  const filteredCats = categories.filter(c => c.type === rType)
  const selectedCat = filteredCats.find(c => c.id === rCatId)
  const subcats = selectedCat?.subcats || []

  async function handleAdd() {
    if (!rName.trim()) { alert('Nama harus diisi'); return }
    if (!rAmount || parseFloat(rAmount) <= 0) { alert('Jumlah harus lebih dari 0'); return }
    setSaving(true)
    try {
      const cat = filteredCats.find(c => c.id === rCatId)
      const subcat = subcats.find(s => s.id === rSubcatId)
      const rec = await addRecurring({
        name: rName,
        amount: parseFloat(rAmount),
        type: rType,
        account: rAccount,
        cat_id: rCatId || null,
        cat_name: cat?.name || null,
        subcat_id: rSubcatId || null,
        subcat_name: subcat?.name || null,
        week_of_month: parseInt(rWom),
        start_month: parseInt(rStart),
        end_month: parseInt(rEnd),
      })
      setRecurring(prev => [...prev, rec])
      setRName(''); setRAmount('')
    } catch (e) { alert('Gagal: ' + e.message) }
    finally { setSaving(false) }
  }

  async function handleDelete(id) {
    if (!confirm('Hapus recurring ini?')) return
    await deleteRecurring(id)
    setRecurring(prev => prev.filter(r => r.id !== id))
  }

  const womLabels = ['', 'Awal bulan (~tgl 1–7)', '~tgl 8–14', '~tgl 15–21', 'Akhir bulan (~tgl 22+)']

  return (
    <div className={styles.layout}>
      <aside className={styles.sidebar}>
        <div className={styles.sidebarTitle}>Tambah Recurring</div>

        <div className={styles.typeRow}>
          <button className={`${styles.typeBtn} ${rType==='in'?styles.typeBtnIn:''}`} onClick={()=>{setRType('in');setRCatId('');setRSubcatId('')}}>Masuk</button>
          <button className={`${styles.typeBtn} ${rType==='out'?styles.typeBtnOut:''}`} onClick={()=>{setRType('out');setRCatId('');setRSubcatId('')}}>Keluar</button>
        </div>

        <div className="fg"><label>Nama</label><input value={rName} onChange={e=>setRName(e.target.value)} placeholder="Gaji tim / Top Up Gas" /></div>
        <div className="fg"><label>Jumlah (Rp)</label><input type="number" value={rAmount} onChange={e=>setRAmount(e.target.value)} /></div>
        <div className="fg"><label>Rekening</label>
          <select value={rAccount} onChange={e=>setRAccount(e.target.value)}>
            {ACCOUNTS.map(a => <option key={a} value={a}>{ACCOUNT_LABELS[a]}</option>)}
          </select>
        </div>
        <div className="fg"><label>Kategori</label>
          <select value={rCatId} onChange={e=>{setRCatId(e.target.value);setRSubcatId('')}}>
            <option value="">—</option>
            {filteredCats.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>
        {subcats.length > 0 && (
          <div className="fg"><label>Subkategori</label>
            <select value={rSubcatId} onChange={e=>setRSubcatId(e.target.value)}>
              <option value="">—</option>
              {subcats.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </div>
        )}
        <div className="fg"><label>Minggu ke- tiap bulan</label>
          <select value={rWom} onChange={e=>setRWom(e.target.value)}>
            <option value={1}>Minggu 1 — awal bulan</option>
            <option value={2}>Minggu 2 — ~tgl 8–14</option>
            <option value={3}>Minggu 3 — ~tgl 15–21</option>
            <option value={4}>Minggu 4 — akhir bulan</option>
          </select>
        </div>
        <div className="fg"><label>Mulai bulan</label>
          <select value={rStart} onChange={e=>setRStart(e.target.value)}>
            {ALL_MONTHS.map(m => <option key={m} value={m}>{MONTHS_SHORT[m]}</option>)}
          </select>
        </div>
        <div className="fg"><label>Sampai bulan</label>
          <select value={rEnd} onChange={e=>setREnd(e.target.value)}>
            {ALL_MONTHS.map(m => <option key={m} value={m}>{MONTHS_SHORT[m]}</option>)}
          </select>
        </div>

        <button className={styles.addBtn} onClick={handleAdd} disabled={saving}>
          {saving ? 'Menyimpan...' : '+ Tambah Recurring'}
        </button>
        <div className={styles.hint}>Recurring muncul otomatis tiap bulan di tabel dengan tanda ↻</div>
      </aside>

      <div className={styles.main}>
        <div className={styles.mainTitle}>Recurring ({recurring.length})</div>
        <div className={styles.grid}>
          {!recurring.length && (
            <div className="empty-state">Belum ada recurring. Tambah di sebelah kiri.</div>
          )}
          {recurring.map(r => {
            const months = []
            for (let m = r.start_month; m <= r.end_month; m++) months.push(m)
            return (
              <div key={r.id} className={`${styles.card} ${r.type==='in'?styles.cardIn:styles.cardOut}`}>
                <div className={styles.cardInfo}>
                  <div className={styles.cardName}>
                    {r.name}
                    <span className={styles.acct}>{ACCOUNT_LABELS[r.account]}</span>
                    {(r.subcat_name||r.cat_name) && <span className={styles.cat}>{r.subcat_name||r.cat_name}</span>}
                  </div>
                  <div className={styles.cardSub}>{womLabels[r.week_of_month]} · {MONTHS_SHORT[r.start_month]} – {MONTHS_SHORT[r.end_month]}</div>
                  <div className={styles.pills}>{months.map(m => <span key={m} className={styles.pill}>{MONTHS_SHORT[m]}</span>)}</div>
                </div>
                <div className={styles.cardRight}>
                  <span className={r.type==='in'?styles.amtIn:styles.amtOut}>{r.type==='in'?'+':'-'}{rp(r.amount)}</span>
                  <button className={styles.delBtn} onClick={()=>handleDelete(r.id)}>×</button>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
