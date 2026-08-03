import { useState } from 'react'
import { useApp } from '../context/AppContext'
import { upsertCategory, deleteCategory } from '../lib/db'

export default function CategoriesPage({ page, setPage }) {
  const { categories, setCategories } = useApp()
  const [newId,     setNewId]     = useState('')
  const [newName,   setNewName]   = useState('')
  const [newType,   setNewType]   = useState('out')
  const [saving,    setSaving]    = useState(false)
  const [subInputs, setSubInputs] = useState({})

  async function handleAdd() {
    if (!newId.trim()||!newName.trim()) { alert('ID dan Nama harus diisi'); return }
    setSaving(true)
    try {
      const cat = await upsertCategory({ id:newId.trim(), name:newName.trim(), type:newType, subcats:[] })
      setCategories(prev=>[...prev.filter(c=>c.id!==cat.id),cat])
      setNewId(''); setNewName('')
    } catch(e){alert('Gagal: '+e.message)} finally{setSaving(false)}
  }

  async function handleAddSub(catId) {
    const name = subInputs[catId]?.trim(); if (!name) return
    const cat = categories.find(c=>c.id===catId); if (!cat) return
    const subId = catId+'_'+Date.now().toString(36)
    const updated = await upsertCategory({...cat, subcats:[...(cat.subcats||[]),{id:subId,name}]})
    setCategories(prev=>prev.map(c=>c.id===catId?updated:c))
    setSubInputs(prev=>({...prev,[catId]:''}))
  }

  async function handleDelSub(catId, subId) {
    const cat = categories.find(c=>c.id===catId); if (!cat) return
    const updated = await upsertCategory({...cat, subcats:(cat.subcats||[]).filter(s=>s.id!==subId)})
    setCategories(prev=>prev.map(c=>c.id===catId?updated:c))
  }

  async function handleDelCat(id) {
    if (!confirm('Hapus kategori ini?')) return
    await deleteCategory(id); setCategories(prev=>prev.filter(c=>c.id!==id))
  }

  const inCats  = categories.filter(c=>c.type==='in')
  const outCats = categories.filter(c=>c.type==='out')

  const inputStyle={background:'var(--input-bg)',border:'0.5px solid var(--glass-bd)',borderRadius:'var(--r)',padding:'8px 10px',fontSize:11,color:'var(--text)',fontFamily:'var(--font)',outline:'none',transition:'border-color .18s'}

  return (
    <div className="main">
      <div className="main-hdr">
        <span className="page-title">Kategori</span>
      </div>
      <div style={{flex:1,overflow:'auto',padding:'16px 20px',display:'flex',flexDirection:'column',gap:16}}>

        {/* ADD FORM */}
        <div style={{background:'var(--glass)',border:'0.5px solid var(--glass-bd)',borderRadius:12,backdropFilter:'blur(14px)',padding:'13px 15px',boxShadow:'var(--shadow)'}}>
          <div style={{fontFamily:'var(--sora)',fontSize:10,fontWeight:700,color:'var(--navy)',textTransform:'uppercase',letterSpacing:'.06em',marginBottom:10}}>Tambah Kategori</div>
          <div style={{display:'flex',gap:8,flexWrap:'wrap',alignItems:'flex-end'}}>
            <input value={newId} onChange={e=>setNewId(e.target.value)} placeholder="ID (cth: d_opex)" style={{...inputStyle,width:120}}/>
            <input value={newName} onChange={e=>setNewName(e.target.value)} placeholder="Nama kategori" style={{...inputStyle,flex:1,minWidth:150}}/>
            <select value={newType} onChange={e=>setNewType(e.target.value)} style={{...inputStyle,width:100,WebkitAppearance:'none'}}>
              <option value="out">Keluar</option>
              <option value="in">Masuk</option>
            </select>
            <button onClick={handleAdd} disabled={saving}
              style={{background:'var(--red)',border:'none',borderRadius:'var(--r)',padding:'8px 16px',fontSize:11,fontWeight:600,color:'#fff',cursor:'pointer',fontFamily:'var(--font)',whiteSpace:'nowrap'}}>
              {saving?'...':'+ Tambah'}
            </button>
          </div>
        </div>

        {/* CATEGORY GROUPS */}
        {[['💰 Pendapatan', inCats], ['💸 Pengeluaran', outCats]].map(([label, cats])=>(
          <div key={label}>
            <div style={{fontFamily:'var(--sora)',fontSize:10,fontWeight:700,color:'var(--text3)',textTransform:'uppercase',letterSpacing:'.07em',marginBottom:8,display:'flex',alignItems:'center',gap:8}}>
              <span>{label}</span>
              <div style={{flex:1,height:'0.5px',background:'var(--glass-bd)'}}/>
            </div>
            {!cats.length ? (
              <div style={{fontSize:11,color:'var(--text3)',padding:'12px 0'}}>Belum ada kategori</div>
            ) : (
              <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(220px,1fr))',gap:10}}>
                {cats.map(cat=>(
                  <div key={cat.id} style={{background:'var(--glass)',border:'0.5px solid var(--glass-bd)',borderRadius:12,backdropFilter:'blur(14px)',overflow:'hidden',boxShadow:'var(--shadow)'}}>
                    <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',padding:'10px 12px',borderBottom:'0.5px solid var(--divider)'}}>
                      <div>
                        <div style={{fontSize:12,fontWeight:600,color:'var(--navy)'}}>{cat.name}</div>
                        <div style={{fontSize:9,color:'var(--text3)',marginTop:1,fontFamily:'var(--mono)'}}>{cat.id}</div>
                      </div>
                      <button onClick={()=>handleDelCat(cat.id)}
                        style={{background:'none',border:'none',color:'var(--text3)',fontSize:16,cursor:'pointer',padding:'2px 4px',borderRadius:5,lineHeight:1,transition:'all .15s'}}
                        onMouseOver={e=>e.target.style.color='var(--red)'} onMouseOut={e=>e.target.style.color='var(--text3)'}>
                        ×
                      </button>
                    </div>
                    <div style={{padding:'8px 12px',display:'flex',flexDirection:'column',gap:4}}>
                      {(cat.subcats||[]).map(s=>(
                        <div key={s.id} style={{display:'flex',alignItems:'center',justifyContent:'space-between',gap:6}}>
                          <span style={{fontSize:11,color:'var(--text2)'}}>{s.name}</span>
                          <button onClick={()=>handleDelSub(cat.id,s.id)}
                            style={{background:'none',border:'none',color:'var(--text3)',fontSize:13,cursor:'pointer',padding:'1px 3px',lineHeight:1,borderRadius:4,transition:'all .15s'}}
                            onMouseOver={e=>e.target.style.color='var(--red)'} onMouseOut={e=>e.target.style.color='var(--text3)'}>
                            ×
                          </button>
                        </div>
                      ))}
                      <div style={{display:'flex',gap:5,marginTop:4}}>
                        <input value={subInputs[cat.id]||''} onChange={e=>setSubInputs(p=>({...p,[cat.id]:e.target.value}))}
                          placeholder="+ Tambah subkategori..." onKeyDown={e=>e.key==='Enter'&&handleAddSub(cat.id)}
                          style={{...inputStyle,flex:1,fontSize:10,padding:'5px 8px'}}/>
                        <button onClick={()=>handleAddSub(cat.id)}
                          style={{background:'var(--glass)',border:'0.5px solid var(--glass-bd)',borderRadius:'var(--r)',padding:'5px 10px',fontSize:11,color:'var(--text2)',cursor:'pointer',fontFamily:'var(--font)'}}>
                          +
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}