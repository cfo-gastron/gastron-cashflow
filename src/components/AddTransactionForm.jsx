import { useState, useRef } from 'react'
import { rp, ACCOUNT_LABELS, today } from '../lib/utils'
import { uploadFile } from '../lib/db'

const ACCOUNTS = ['utama','buffer','petty','procurement']

export default function AddTransactionForm({ categories, onAdd, allWeeks, transactions=[] }) {
  const [mode,      setMode]      = useState('ai')
  const [mType,     setMType]     = useState('out')
  const [aiText,    setAiText]    = useState('')
  const [aiImage,   setAiImage]   = useState(null)
  const [aiLoading, setAiLoading] = useState(false)
  const [aiParsed,  setAiParsed]  = useState(null)
  const fileRef = useRef()
  const [mName,     setMName]     = useState('')
  const [mAmount,   setMAmount]   = useState('')
  const [mDate,     setMDate]     = useState(today())
  const [mAccount,  setMAccount]  = useState('utama')
  const [mCatId,    setMCatId]    = useState('')
  const [mSubcatId, setMSubcatId] = useState('')
  const [mEst,      setMEst]      = useState(false)
  const [saving,    setSaving]    = useState(false)

  const filteredCats = categories.filter(c=>c.type===mType)
  const selectedCat  = filteredCats.find(c=>c.id===mCatId)
  const subcats      = selectedCat?.subcats||[]

  function resetManual() { setMName('');setMAmount('');setMDate(today());setMAccount('utama');setMCatId('');setMSubcatId('');setMEst(false) }

  async function handleManualSubmit() {
    if (!mName.trim()) { alert('Nama harus diisi'); return }
    if (!mAmount||parseFloat(mAmount)<=0) { alert('Jumlah harus lebih dari 0'); return }
    const amt = parseFloat(mAmount)
    const dup = transactions.find(t=>t.name.toLowerCase()===mName.trim().toLowerCase()&&t.date===mDate&&Number(t.amount)===amt&&t.type===mType)
    if (dup && !confirm(`Transaksi serupa sudah ada:\n"${dup.name}" — ${dup.date}\n\nTetap tambahkan?`)) return
    setSaving(true)
    try {
      const cat = filteredCats.find(c=>c.id===mCatId)
      const sub = subcats.find(s=>s.id===mSubcatId)
      await onAdd({ name:mName.trim(), amount:amt, date:mDate, type:mType, account:mAccount, cat_id:mCatId||null, cat_name:cat?.name||null, subcat_id:mSubcatId||null, subcat_name:sub?.name||null, is_est:mEst, is_kemb:false })
      resetManual()
    } catch(e){alert('Gagal: '+e.message)} finally{setSaving(false)}
  }

  async function handleParse() {
    if (!aiText.trim()&&!aiImage) return
    setAiLoading(true); setAiParsed(null)
    try {
      const catCtx = categories.map(c=>`[${c.type}] ${c.name} (id:${c.id}) → ${(c.subcats||[]).map(s=>`${s.name}(${s.id})`).join(',')}`).join('\n')
      const userContent = []
      if (aiImage) userContent.push({ type:'image', source:{ type:'base64', media_type:aiImage.mediaType, data:aiImage.base64 }})
      userContent.push({ type:'text', text:aiText||'Parse transaksi dari gambar.' })
      const resp = await fetch('/api/claude', {
        method:'POST', headers:{'Content-Type':'application/json'},
        body: JSON.stringify({
          model:'claude-sonnet-4-6', max_tokens:500,
          system:`Kamu asisten keuangan Gastron. Parse input dan kembalikan JSON.\nKATEGORI:\n${catCtx}\nREKENING: utama,buffer,petty,procurement\nHARI INI: ${today()}\nKembalikan HANYA JSON: {"name":"...","amount":0,"date":"2026-06-01","type":"out","account":"utama","catId":"","catName":"","subcatId":"","subcatName":"","isEst":false}`,
          messages:[{ role:'user', content:userContent }]
        })
      })
      const data = await resp.json()
      const raw = data.content?.[0]?.text||''
      setAiParsed(JSON.parse(raw.replace(/```json|```/g,'').trim()))
    } catch(e){alert('Gagal parse: '+e.message)} finally{setAiLoading(false)}
  }

  async function confirmAI() {
    if (!aiParsed) return
    setSaving(true)
    try {
      await onAdd({ name:aiParsed.name, amount:parseFloat(aiParsed.amount), date:aiParsed.date||today(), type:aiParsed.type||'out', account:aiParsed.account||'utama', cat_id:aiParsed.catId||null, cat_name:aiParsed.catName||null, subcat_id:aiParsed.subcatId||null, subcat_name:aiParsed.subcatName||null, is_est:!!aiParsed.isEst, is_kemb:false })
      setAiText(''); setAiImage(null); setAiParsed(null)
    } catch(e){alert('Gagal: '+e.message)} finally{setSaving(false)}
  }

  function onImgSelect(e) {
    const f = e.target.files[0]; if (!f) return
    const r = new FileReader()
    r.onload = ev => setAiImage({ base64:ev.target.result.split(',')[1], mediaType:f.type, name:f.name })
    r.readAsDataURL(f)
  }

  return (
    <div style={{display:'flex',flexDirection:'column',flex:1,overflow:'hidden'}}>
      {/* MODE TABS */}
      <div style={{padding:'10px 13px 0',flexShrink:0}}>
        <div style={{display:'flex',gap:3}}>
          {[['ai','✦ AI'],['manual','✏ Manual']].map(([m,label])=>(
            <button key={m} onClick={()=>setMode(m)} style={{flex:1,padding:'6px 8px',borderRadius:'var(--r)',border:`0.5px solid ${mode===m?'var(--red-bd)':'var(--glass-bd)'}`,background:mode===m?'var(--red-bg)':'none',fontSize:10,fontWeight:500,color:mode===m?'var(--red)':'var(--text2)',cursor:'pointer',fontFamily:'var(--font)',transition:'all .18s'}}>
              {label}
            </button>
          ))}
        </div>
      </div>

      <div style={{flex:1,overflow:'auto',padding:'10px 13px 13px',display:'flex',flexDirection:'column',gap:8}}>
        {mode === 'ai' ? (
          <>
            <div style={{display:'flex',alignItems:'center',gap:5,fontSize:10,color:'var(--text2)'}}>
              <span style={{width:5,height:5,borderRadius:'50%',background:'var(--red)',boxShadow:'0 0 5px rgba(201,64,64,.45)',animation:'pulse 2s infinite',display:'inline-block'}}/>
              Parse dengan AI
            </div>
            <textarea
              rows={3}
              value={aiText}
              onChange={e=>setAiText(e.target.value)}
              onKeyDown={e=>{if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();handleParse()}}}
              placeholder={'cth: bayar gaji driver 5jt minggu ini\natau: top up gas 50 juta dari procurement'}
              style={{width:'100%',background:'var(--input-bg)',border:'0.5px solid var(--glass-bd)',borderRadius:'var(--r)',padding:'9px 10px',fontSize:11,color:'var(--text)',fontFamily:'var(--font)',resize:'none',outline:'none',minHeight:52,lineHeight:1.5}}
            />
            <span style={{fontSize:9,color:'var(--text3)',marginTop:-4}}>Enter untuk parse · Shift+Enter baris baru</span>

            {aiImage ? (
              <div style={{display:'flex',alignItems:'center',gap:7,padding:'7px 10px',background:'var(--glass)',border:'0.5px solid var(--glass-bd)',borderRadius:'var(--r)',fontSize:11,color:'var(--text2)'}}>
                <span style={{flex:1,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>📸 {aiImage.name}</span>
                <button onClick={()=>setAiImage(null)} style={{background:'none',border:'none',color:'var(--text3)',cursor:'pointer',fontSize:14,lineHeight:1}}>×</button>
              </div>
            ) : (
              <button onClick={()=>fileRef.current.click()} style={{background:'var(--glass)',border:'0.5px dashed var(--glass-bd)',borderRadius:'var(--r)',padding:'8px',fontSize:11,color:'var(--text3)',cursor:'pointer',fontFamily:'var(--font)',transition:'all .18s',textAlign:'center'}}>
                📷 Upload foto struk
              </button>
            )}
            <input type="file" ref={fileRef} style={{display:'none'}} accept="image/*" onChange={onImgSelect}/>

            <button onClick={handleParse} disabled={aiLoading||(!aiText.trim()&&!aiImage)}
              style={{background:'var(--red)',border:'none',borderRadius:'var(--r)',padding:10,fontSize:11,fontWeight:600,color:'#fff',cursor:'pointer',fontFamily:'var(--font)',boxShadow:'0 2px 8px rgba(201,64,64,.28)',opacity:(aiLoading||(!aiText.trim()&&!aiImage))?.6:1,transition:'background .18s'}}>
              {aiLoading?'⏳ Parsing...':'✦ Parse dengan AI'}
            </button>

            {aiParsed && (
              <div style={{background:'var(--glass)',border:'0.5px solid var(--glass-bd)',borderRadius:'var(--r)',overflow:'hidden'}}>
                <div style={{padding:'9px 11px',borderBottom:'0.5px solid var(--divider)',display:'flex',alignItems:'center',justifyContent:'space-between'}}>
                  <span style={{fontSize:10,fontWeight:700,color:'var(--navy)',fontFamily:'var(--sora)',textTransform:'uppercase',letterSpacing:'.06em'}}>Hasil Parse AI</span>
                  <button onClick={()=>setAiParsed(null)} style={{background:'none',border:'none',color:'var(--text3)',cursor:'pointer',fontSize:14,lineHeight:1}}>×</button>
                </div>
                <div style={{padding:'9px 11px',display:'flex',flexDirection:'column',gap:5}}>
                  {[
                    ['Tipe', <span style={{color:aiParsed.type==='in'?'var(--green)':'var(--red)',fontWeight:600}}>{aiParsed.type==='in'?'↑ Masuk':'↓ Keluar'}</span>],
                    ['Nama', aiParsed.name],
                    ['Jumlah', <span style={{fontFamily:'var(--mono)',fontWeight:500}}>{rp(aiParsed.amount)}</span>],
                    ['Tanggal', aiParsed.date],
                    ['Rekening', ACCOUNT_LABELS[aiParsed.account]||aiParsed.account],
                    aiParsed.catName && ['Kategori', `${aiParsed.catName}${aiParsed.subcatName?' › '+aiParsed.subcatName:''}`],
                    aiParsed.isEst && ['Status', <span style={{color:'var(--amber)',fontWeight:600}}>⚠ Estimasi</span>],
                  ].filter(Boolean).map(([label,val],i)=>(
                    <div key={i} style={{display:'flex',alignItems:'baseline',gap:8}}>
                      <span style={{fontSize:9,color:'var(--text3)',minWidth:56,flexShrink:0,textTransform:'uppercase',letterSpacing:'.05em',fontWeight:600,fontFamily:'var(--sora)'}}>{label}</span>
                      <span style={{fontSize:11,color:'var(--text)'}}>{val}</span>
                    </div>
                  ))}
                </div>
                <div style={{padding:'8px 11px',borderTop:'0.5px solid var(--divider)',display:'flex',gap:6}}>
                  <button onClick={confirmAI} disabled={saving} style={{flex:1,padding:'7px',background:'var(--red)',border:'none',borderRadius:7,fontSize:11,fontWeight:600,color:'#fff',cursor:'pointer',fontFamily:'var(--font)'}}>
                    {saving?'Menyimpan...':'✓ Simpan'}
                  </button>
                  <button onClick={()=>setAiParsed(null)} style={{padding:'7px 11px',background:'var(--glass)',border:'0.5px solid var(--glass-bd)',borderRadius:7,fontSize:11,color:'var(--text2)',cursor:'pointer',fontFamily:'var(--font)'}}>
                    Batal
                  </button>
                </div>
              </div>
            )}
          </>
        ) : (
          <>
            <div style={{display:'flex',gap:4}}>
              {['in','out'].map(t=>(
                <button key={t} onClick={()=>{setMType(t);setMCatId('');setMSubcatId('')}}
                  style={{flex:1,padding:'7px',borderRadius:'var(--r)',border:`0.5px solid ${mType===t?(t==='in'?'var(--green-bd)':'var(--red-bd)'):'var(--glass-bd)'}`,background:mType===t?(t==='in'?'var(--green-bg)':'var(--red-bg)'):'none',fontSize:11,fontWeight:600,color:mType===t?(t==='in'?'var(--green)':'var(--red)'):'var(--text3)',cursor:'pointer',fontFamily:'var(--font)',transition:'all .15s'}}>
                  {t==='in'?'Masuk':'Keluar'}
                </button>
              ))}
            </div>
            <input value={mName} onChange={e=>setMName(e.target.value)} placeholder="Nama / keterangan" className="form-input" style={{marginBottom:0}}/>
            <div style={{position:'relative'}}>
              <span style={{position:'absolute',left:10,top:'50%',transform:'translateY(-50%)',fontSize:11,color:'var(--text3)',pointerEvents:'none'}}>Rp</span>
              <input type="number" value={mAmount} onChange={e=>setMAmount(e.target.value)} placeholder="0" className="form-input" style={{paddingLeft:28,marginBottom:0}}/>
            </div>
            {mAmount>0 && <div style={{fontSize:10,color:'var(--text3)',marginTop:-4}}>{Number(mAmount).toLocaleString('id-ID',{style:'currency',currency:'IDR',maximumFractionDigits:0})}</div>}
            <input type="date" value={mDate} onChange={e=>setMDate(e.target.value)} className="form-input" style={{marginBottom:0}}/>
            <select value={mAccount} onChange={e=>setMAccount(e.target.value)} className="form-select" style={{marginBottom:0}}>
              {ACCOUNTS.map(a=><option key={a} value={a}>{ACCOUNT_LABELS[a]}</option>)}
            </select>
            <select value={mCatId} onChange={e=>{setMCatId(e.target.value);setMSubcatId('')}} className="form-select" style={{marginBottom:0}}>
              <option value="">— Kategori —</option>
              {filteredCats.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
            {subcats.length>0 && (
              <select value={mSubcatId} onChange={e=>setMSubcatId(e.target.value)} className="form-select" style={{marginBottom:0}}>
                <option value="">— Subkategori —</option>
                {subcats.map(s=><option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            )}
            <label style={{display:'flex',alignItems:'center',gap:7,fontSize:11,color:'var(--text2)',cursor:'pointer'}}>
              <input type="checkbox" checked={mEst} onChange={e=>setMEst(e.target.checked)} style={{accentColor:'var(--red)',width:'auto'}}/>
              Tandai sebagai estimasi
            </label>
            <button onClick={handleManualSubmit} disabled={saving}
              style={{width:'100%',background:'var(--red)',border:'none',borderRadius:'var(--r)',padding:9,fontSize:11,fontWeight:600,color:'#fff',cursor:'pointer',fontFamily:'var(--font)',boxShadow:'0 2px 8px rgba(201,64,64,.28)',opacity:saving?.6:1,transition:'background .18s'}}>
              {saving?'Menyimpan...':'+ Tambah'}
            </button>
          </>
        )}
      </div>
    </div>
  )
}