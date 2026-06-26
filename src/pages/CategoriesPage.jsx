import { useState } from 'react'
import { useApp } from '../context/AppContext'
import { upsertCategory, deleteCategory } from '../lib/db'
import styles from './CategoriesPage.module.css'

export default function CategoriesPage() {
  const { categories, setCategories } = useApp()
  const [newId, setNewId] = useState('')
  const [newName, setNewName] = useState('')
  const [newType, setNewType] = useState('out')
  const [saving, setSaving] = useState(false)
  const [subInputs, setSubInputs] = useState({})

  async function handleAdd() {
    if (!newId.trim() || !newName.trim()) { alert('ID dan Nama harus diisi'); return }
    setSaving(true)
    try {
      const cat = await upsertCategory({ id: newId.trim(), name: newName.trim(), type: newType, subcats: [] })
      setCategories(prev => [...prev.filter(c => c.id !== cat.id), cat])
      setNewId(''); setNewName('')
    } catch (e) { alert('Gagal: ' + e.message) }
    finally { setSaving(false) }
  }

  async function handleAddSub(catId) {
    const name = subInputs[catId]?.trim()
    if (!name) return
    const cat = categories.find(c => c.id === catId)
    if (!cat) return
    const subId = catId + '_' + Date.now().toString(36)
    const newSubcats = [...(cat.subcats || []), { id: subId, name }]
    const updated = await upsertCategory({ ...cat, subcats: newSubcats })
    setCategories(prev => prev.map(c => c.id === catId ? updated : c))
    setSubInputs(prev => ({ ...prev, [catId]: '' }))
  }

  async function handleDelSub(catId, subId) {
    const cat = categories.find(c => c.id === catId)
    if (!cat) return
    const newSubcats = (cat.subcats || []).filter(s => s.id !== subId)
    const updated = await upsertCategory({ ...cat, subcats: newSubcats })
    setCategories(prev => prev.map(c => c.id === catId ? updated : c))
  }

  async function handleDelCat(id) {
    if (!confirm('Hapus kategori ini?')) return
    await deleteCategory(id)
    setCategories(prev => prev.filter(c => c.id !== id))
  }

  const inCats = categories.filter(c => c.type === 'in')
  const outCats = categories.filter(c => c.type === 'out')

  return (
    <div className={styles.wrap}>
      <div className={styles.addForm}>
        <div className={styles.addTitle}>Tambah Kategori</div>
        <div className={styles.addRow}>
          <input value={newId} onChange={e=>setNewId(e.target.value)} placeholder="ID (cth: d_opex)" className={styles.idInp} />
          <input value={newName} onChange={e=>setNewName(e.target.value)} placeholder="Nama kategori" />
          <select value={newType} onChange={e=>setNewType(e.target.value)} className={styles.typeInp}>
            <option value="out">Keluar</option>
            <option value="in">Masuk</option>
          </select>
          <button className={styles.addBtn} onClick={handleAdd} disabled={saving}>+ Tambah</button>
        </div>
      </div>

      <div className={styles.grid}>
        {[['💰 Pendapatan', inCats], ['💸 Pengeluaran', outCats]].map(([label, cats]) => (
          <div key={label}>
            <div className={styles.groupLabel}>{label}</div>
            <div className={styles.cards}>
              {!cats.length && <div className={styles.empty}>Belum ada kategori</div>}
              {cats.map(cat => (
                <div key={cat.id} className={styles.card}>
                  <div className={styles.cardHdr}>
                    <div>
                      <span className={styles.catName}>{cat.name}</span>
                      <span className={styles.catId}>{cat.id}</span>
                    </div>
                    <button className={styles.delBtn} onClick={() => handleDelCat(cat.id)}>×</button>
                  </div>
                  <div className={styles.subcats}>
                    {(cat.subcats || []).map(s => (
                      <div key={s.id} className={styles.subRow}>
                        <span>{s.name}</span>
                        <button className={styles.subDel} onClick={() => handleDelSub(cat.id, s.id)}>×</button>
                      </div>
                    ))}
                    <div className={styles.addSubRow}>
                      <input
                        value={subInputs[cat.id] || ''}
                        onChange={e => setSubInputs(prev => ({ ...prev, [cat.id]: e.target.value }))}
                        placeholder="+ Tambah subkategori..."
                        onKeyDown={e => e.key === 'Enter' && handleAddSub(cat.id)}
                        className={styles.subInput}
                      />
                      <button className={styles.subAddBtn} onClick={() => handleAddSub(cat.id)}>+</button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
