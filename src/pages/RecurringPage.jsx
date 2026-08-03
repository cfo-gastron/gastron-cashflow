import { useState } from 'react'
import { useApp } from '../context/AppContext'
import { addRecurring, deleteRecurring } from '../lib/db'
import { rp, ACCOUNT_LABELS, MONTHS_SHORT } from '../lib/utils'

const ACCOUNTS   = ['utama','buffer','petty','procurement']
const ALL_MONTHS = Array.from({length:12},(_,i)=>i)
const WOM_LABELS = ['','Minggu 1 — awal bulan','Minggu 2 — ~tgl 8–14','Minggu 3 — ~tgl 15–21','Minggu 4 — akhir bulan']

export default function RecurringPage({ page, setPage }) {
  const { recurring, setRecurring, categories } = useApp()
  const [rType,     setRType]     = useState('out')
  const [rName,     setRName]     = useState('')
  const [rAmount,   setRAmount]   = useState('')
  const [rAccount,  setRAccount]  = useState('utama')
  const [rCatId,    setRCatId]    = useState('')
  const [rSubcatId, setRSubcatId] = useState('')
  const [rWom,      setRWom]      = useState(4)
  const [rStart,    setRStart]    = useState(3)
  const [rEnd,      setREnd]      = useState(11)
  const [saving,    setSaving]    = useState(false)

  const filteredCats = categories.filter(c=>c.type===rType)
  const selectedCat  = filteredCats.find(c=>c.id===rCatId)
  const subcats      = selectedCat?.subcats||[]

  async function handleAdd() {
    if (!rName.trim()) { alert('Nama harus diisi'); return }
    if (!rAmount||parseFloat(rAmount)<=0) { alert('Jumlah harus lebih dari 0'); return }
    setSaving(true)
    try {
      const cat    = filteredCats.find(c=>c.id===rCatId)
      const subcat = subcats.find(s=>s.id===rSubcatId)
      const rec = await addRecurring({ name:rName, amount:parseFloat(rAmount), type:rType, account:rAccount, cat_id:rCatId||null, cat_name:cat?.name||null, subcat_id:rSubcatId||null, subcat_name:subcat?.name||null, week_of_month:parseInt(rWom), start_month:parseInt(rStart), end_month:parseInt(rEnd) })
      setRecurring(prev=>[...prev,rec])
      setRName(''); setRAmount('')
    } catch(e){alert('Gagal: '+e.message)} finally{setSaving(false)}
  }

  async function handleDelete(id) {
    if (!confirm('Hapus recurring ini?')) return
    await deleteRecurring(id)
    setRecurring(prev=>prev.filter(r=>r.id!==id))
  }

  const inputStyle={background:'var(--input-bg)',border:'0.5px solid var(--glass-bd)',borderRadius:'var(--r)',padding:'8px 10px',fontSize:11,color:'var(--text)',fontFamily:'var(--font)',outline:'none',transition:'border-color .18s',width:'100%',WebkitAppearance:'none',appearance:'none'}

  return (
    <>
      {/* SIDEBAR */}
      <div className="sidebar">
        <div className="sb-hdr">
          <div className="sb-title">Tambah Recurring</div>
        </div>
        <div style={{flex:1,overflow:'auto',padding:'11px 13px',display:'flex',flexDirection:'column',gap:8}}>
          <div style={{display:'flex',gap:4}}>
            {['in','out'].map(t=>(
              <button key={t} onClick={()=>{setRType(t);setRCatId('');setRSubcatId('')}}
                style={{flex:1,padding:'7px',borderRadius:'var(--r)',border:`0.5px solid ${rType===t?(t==='in'?'var(--green-bd)':'var(--red-bd)'):'var(--glass-bd)'}`,background:rType===t?(t==='in'?'var(--green-bg)':'var(--red-bg)'):'none',fontSize:11,fontWeight:600,color:rType===t?(t==='in'?'var(--green)':'var(--red)'):'var(--text3)',cursor:'pointer',fontFamily:'var(--font)',transition:'all .15s'}}>
                {t==='in'?'Masuk':'Keluar'}
              </button>
            ))}
          </div>
          <input value={rName} onChange={e=>setRName(e.target.value)} placeholder="Gaji tim / Top Up Gas" style={inputStyle}/>
          <div style={{position:'relative'}}>
            <span style={{position:'absolute',left:10,top:'50%',transform:'translateY(-50%)',fontSize:11,color:'var(--text3)',pointerEvents:'none'}}>Rp</span>
            <input type="number" value={rAmount} onChange={e=>setRAmount(e.target.value)} style={{...inputStyle,paddingLeft:28}}/>
          </div>
          <select value={rAccount} onChange={e=>setRAccount(e.target.value)} style={inputStyle}>
            {ACCOUNTS.map(a=><option key={a} value={a}>{ACCOUNT_LABELS[a]}</option>)}
          </select>
          <select value={rCatId} onChange={e=>{setRCatId(e.target.value);setRSubcatId('')}} style={inputStyle}>
            <option value="">— Kategori —</option>
            {filteredCats.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
          {subcats.length>0 && (
            <select value={rSubcatId} onChange={e=>setRSubcatId(e.target.value)} style={inputStyle}>
              <option value="">— Subkategori —</option>
              {subcats.map(s=><option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          )}
          <select value={rWom} onChange={e=>setRWom(e.target.value)} style={inputStyle}>
            {[1,2,3,4].map(w=><option key={w} value={w}>{WOM_LABELS[w]}</option>)}
          </select>
          <div style={{display:'flex',gap:6}}>
            <select value={rStart} onChange={e=>setRStart(e.target.value)} style={{...inputStyle,flex:1}}>
              {ALL_MONTHS.map(m=><option key={m} value={m}>{MONTHS_SHORT[m]}</option>)}
            </select>
            <span style={{display:'flex',alignItems:'center',fontSize:11,color:'var(--text3)',flexShrink:0}}>→</span>
            <select value={rEnd} onChange={e=>setREnd(e.target.value)} style={{...inputStyle,flex:1}}>
              {ALL_MONTHS.map(m=><option key={m} value={m}>{MONTHS_SHORT[m]}</option>)}
            </select>
          </div>
          <button onClick={handleAdd} disabled={saving}
            style={{background:'var(--red)',border:'none',borderRadius:'var(--r)',padding:9,fontSize:11,fontWeight:600,color:'#fff',cursor:'pointer',fontFamily:'var(--font)',boxShadow:'0 2px 8px rgba(201,64,64,.28)',opacity:saving?.6:1}}>
            {saving?'Menyimpan...':'+ Tambah Recurring'}
          </button>
          <div style={{fontSize:10,color:'var(--text3)',lineHeight:1.5}}>Recurring muncul otomatis tiap bulan di tabel dengan tanda ↻</div>
        </div>
      </div>

      {/* MAIN */}
      <div className="main">
        <div className="main-hdr">
          <span className="page-title">Recurring ({recurring.length})</span>
        </div>
        <div style={{flex:1,overflow:'auto',padding:'14px 16px',display:'flex',flexDirection:'column',gap:8}}>
          {!recurring.length ? (
            <div className="empty-state">
              <div style={{fontSize:28}}>↻</div>
              <div style={{fontFamily:'var(--sora)',fontSize:12,fontWeight:600,color:'var(--text2)'}}>Belum ada recurring</div>
              <div style={{fontSize:11,color:'var(--text3)'}}>Tambah di sidebar kiri</div>
            </div>
          ) : recurring.map(r=>{
            const months = []
            for (let m=r.start_month;m<=r.end_month;m++) months.push(m)
            return (
              <div key={r.id} style={{display:'flex',alignItems:'center',gap:10,padding:'11px 14px',background:'var(--glass)',border:`0.5px solid ${r.type==='in'?'var(--green-bd)':'var(--glass-bd)'}`,borderLeft:`2px solid ${r.type==='in'?'var(--green)':'var(--red)'}`,borderRadius:12,backdropFilter:'blur(14px)',transition:'all .18s',boxShadow:'var(--shadow)'}}>
                <div style={{flex:1,minWidth:0}}>
                  <div style={{fontSize:12,fontWeight:500,color:'var(--navy)',marginBottom:3,display:'flex',alignItems:'center',gap:6}}>
                    {r.name}
                    <span style={{background:'var(--blue-bg)',color:'var(--blue)',border:'0.5px solid var(--blue-bd)',fontSize:8,fontWeight:700,padding:'1px 5px',borderRadius:100}}>↻</span>
                    {r.account && <span style={{background:'var(--red-bg)',color:'var(--red)',fontSize:9,fontWeight:600,padding:'1px 5px',borderRadius:4}}>{ACCOUNT_LABELS[r.account]}</span>}
                    {(r.subcat_name||r.cat_name) && <span style={{fontSize:10,color:'var(--text3)'}}>{r.subcat_name||r.cat_name}</span>}
                  </div>
                  <div style={{fontSize:10,color:'var(--text3)',marginBottom:5}}>{WOM_LABELS[r.week_of_month]} · {MONTHS_SHORT[r.start_month]} – {MONTHS_SHORT[r.end_month]}</div>
                  <div style={{display:'flex',gap:3,flexWrap:'wrap'}}>
                    {months.map(m=>(
                      <span key={m} style={{fontSize:9,padding:'1px 6px',background:'var(--glass)',border:'0.5px solid var(--glass-bd)',borderRadius:4,color:'var(--text2)'}}>{MONTHS_SHORT[m]}</span>
                    ))}
                  </div>
                </div>
                <div style={{display:'flex',flexDirection:'column',alignItems:'flex-end',gap:6,flexShrink:0}}>
                  <span style={{fontFamily:'var(--mono)',fontSize:13,fontWeight:600,color:r.type==='in'?'var(--green)':'var(--red)'}}>
                    {r.type==='in'?'+':'-'}{rp(r.amount)}
                  </span>
                  <button onClick={()=>handleDelete(r.id)}
                    style={{background:'var(--red-bg)',border:'0.5px solid var(--red-bd)',borderRadius:6,padding:'3px 8px',fontSize:10,color:'var(--red)',cursor:'pointer',fontFamily:'var(--font)',transition:'all .15s'}}>
                    Hapus
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </>
  )
}