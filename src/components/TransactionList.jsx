import { useState } from 'react'
import { rp, fmtDateShort, ACCOUNT_LABELS } from '../lib/utils'
import styles from './TransactionList.module.css'

const ACCOUNTS = ['utama', 'buffer', 'petty', 'procurement']

export default function TransactionList({ transactions, onDelete, onUpdate, categories }) {
  const [search,   setSearch]   = useState('')
  const [estOnly,  setEstOnly]  = useState(false)
  const [editId,   setEditId]   = useState(null)
  const [editData, setEditData] = useState({})

  const filtered = [...transactions]
    .filter(t => {
      if (estOnly && !t.is_est) return false
      if (search && !t.name.toLowerCase().includes(search.toLowerCase())) return false
      return true
    })
    .sort((a, b) => b.date.localeCompare(a.date))

  const estCount = transactions.filter(t => t.is_est).length

  function startEdit(t) {
    setEditId(t.id)
    setEditData({
      name:        t.name,
      amount:      t.amount,
      date:        t.date,
      type:        t.type,
      account:     t.account,
      cat_id:      t.cat_id      || '',
      subcat_id:   t.subcat_id   || '',
      is_est:      t.is_est,
    })
  }

  function cancelEdit() { setEditId(null); setEditData({}) }

  async function confirmEdit(t) {
    if (!editData.name?.trim()) return
    const amount = parseFloat(editData.amount)
    if (!amount || amount <= 0) return
    const filteredCats = categories.filter(c => c.type === editData.type)
    const cat    = filteredCats.find(c => c.id === editData.cat_id)
    const subcat = (cat?.subcats || []).find(s => s.id === editData.subcat_id)
    await onUpdate(t.id, {
      name:        editData.name.trim(),
      amount,
      date:        editData.date,
      type:        editData.type,
      account:     editData.account,
      cat_id:      editData.cat_id    || null,
      cat_name:    cat?.name          || null,
      subcat_id:   editData.subcat_id || null,
      subcat_name: subcat?.name       || null,
      is_est:      editData.is_est,
    })
    setEditId(null)
    setEditData({})
  }

  const filteredCats = categories.filter(c => c.type === editData.type)
  const selectedCat  = filteredCats.find(c => c.id === editData.cat_id)
  const subcats      = selectedCat?.subcats || []

  return (
    <div className={styles.wrap}>
      <div className={styles.header}>
        <span className={styles.title}>Transaksi <span className={styles.count}>({transactions.length})</span></span>
        {estCount > 0 && (
          <button
            className={`${styles.estFilter} ${estOnly ? styles.estFilterOn : ''}`}
            onClick={() => setEstOnly(o => !o)}
          >
            Est {estCount}
          </button>
        )}
      </div>

      <div className={styles.searchWrap}>
        <input
          className={styles.search}
          placeholder="Cari transaksi..."
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
      </div>

      <div className={styles.list}>
        {!filtered.length && (
          <div className="empty-state" style={{ padding: '24px 0' }}>
            <span>{estOnly ? 'Tidak ada estimasi' : 'Belum ada transaksi'}</span>
          </div>
        )}

        {filtered.map(t => (
          <div
            key={t.id}
            className={`${styles.item} ${t.is_est ? styles.itemEst : t.type === 'in' ? styles.itemIn : styles.itemOut}`}
          >
            {editId === t.id ? (
              <div className={styles.editForm}>
                <div className={styles.editTypeRow}>
                  <button className={`${styles.typeBtn} ${editData.type==='in'?styles.typeBtnIn:''}`} onClick={()=>setEditData(p=>({...p,type:'in',cat_id:'',subcat_id:''}))}>Masuk</button>
                  <button className={`${styles.typeBtn} ${editData.type==='out'?styles.typeBtnOut:''}`} onClick={()=>setEditData(p=>({...p,type:'out',cat_id:'',subcat_id:''}))}>Keluar</button>
                </div>
                <input value={editData.name} onChange={e=>setEditData(p=>({...p,name:e.target.value}))} placeholder="Nama transaksi" className={styles.editInput} />
                <input type="number" value={editData.amount} onChange={e=>setEditData(p=>({...p,amount:e.target.value}))} placeholder="Jumlah" className={styles.editInput} />
                <input type="date" value={editData.date} onChange={e=>setEditData(p=>({...p,date:e.target.value}))} className={styles.editInput} />
                <select value={editData.account} onChange={e=>setEditData(p=>({...p,account:e.target.value}))} className={styles.editInput}>
                  {ACCOUNTS.map(a=><option key={a} value={a}>{ACCOUNT_LABELS[a]}</option>)}
                </select>
                <select value={editData.cat_id} onChange={e=>setEditData(p=>({...p,cat_id:e.target.value,subcat_id:''}))} className={styles.editInput}>
                  <option value="">— Kategori —</option>
                  {filteredCats.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
                {subcats.length > 0 && (
                  <select value={editData.subcat_id} onChange={e=>setEditData(p=>({...p,subcat_id:e.target.value}))} className={styles.editInput}>
                    <option value="">— Subkategori —</option>
                    {subcats.map(s=><option key={s.id} value={s.id}>{s.name}</option>)}
                  </select>
                )}
                <label className={styles.estCheck}>
                  <input type="checkbox" checked={editData.is_est} onChange={e=>setEditData(p=>({...p,is_est:e.target.checked}))} />
                  <span>Estimasi</span>
                </label>
                <div className={styles.editBtns}>
                  <button className={styles.confBtn} onClick={()=>confirmEdit(t)}>✓ Simpan</button>
                  <button className={styles.cancBtn} onClick={cancelEdit}>Batal</button>
                </div>
              </div>
            ) : (
              <>
                <div className={styles.itemInfo}>
                  <div className={styles.itemName}>
                    {t.name}
                    {t.is_est && <span className="badge badge-est">Est</span>}
                  </div>
                  <div className={styles.itemMeta}>
                    <span className={styles.acctBadge}>{ACCOUNT_LABELS[t.account] || t.account}</span>
                    {t.subcat_name || t.cat_name ? <span>{t.subcat_name || t.cat_name}</span> : null}
                    <span>{fmtDateShort(t.date)}</span>
                    <span className={t.type === 'in' ? styles.amtIn : styles.amtOut}>
                      {t.type === 'in' ? '+' : '-'}{rp(t.amount)}
                    </span>
                  </div>
                </div>
                <div className={styles.itemActions}>
                  {t.file_url && <a href={t.file_url} target="_blank" rel="noreferrer" className={styles.iconBtn}>📎</a>}
                  <button className={styles.editBtn} onClick={()=>startEdit(t)} title="Edit">✎</button>
                  <button className={styles.iconBtn} onClick={()=>onDelete(t.id)} title="Hapus">×</button>
                </div>
              </>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}