import { useState, useRef } from 'react'
import { rp, ACCOUNT_LABELS, MONTHS_SHORT, today } from '../lib/utils'
import { uploadFile } from '../lib/db'
import styles from './AddTransactionForm.module.css'

const ACCOUNTS = ['utama', 'buffer', 'petty', 'procurement']

export default function AddTransactionForm({ categories, onAdd, allWeeks }) {
  const [mode, setMode] = useState('ai') // 'ai' | 'manual'
  const [mType, setMType] = useState('out')

  // AI state
  const [aiText, setAiText] = useState('')
  const [aiImage, setAiImage] = useState(null)
  const [aiLoading, setAiLoading] = useState(false)
  const [aiParsed, setAiParsed] = useState(null)
  const fileRef = useRef()

  // Manual state
  const [mName, setMName] = useState('')
  const [mAmount, setMAmount] = useState('')
  const [mDate, setMDate] = useState(today())
  const [mAccount, setMAccount] = useState('utama')
  const [mCatId, setMCatId] = useState('')
  const [mSubcatId, setMSubcatId] = useState('')
  const [mFile, setMFile] = useState(null)
  const [mEst, setMEst] = useState(false)
  const [saving, setSaving] = useState(false)

  const filteredCats = categories.filter(c => c.type === mType)
  const selectedCat = filteredCats.find(c => c.id === mCatId)
  const subcats = selectedCat?.subcats || []

  function buildTxFromManual() {
    const cat = filteredCats.find(c => c.id === mCatId)
    const subcat = subcats.find(s => s.id === mSubcatId)
    return {
      name: mName,
      amount: parseFloat(mAmount),
      date: mDate,
      type: mType,
      account: mAccount,
      cat_id: mCatId || null,
      cat_name: cat?.name || null,
      subcat_id: mSubcatId || null,
      subcat_name: subcat?.name || null,
      is_est: mEst,
      is_kemb: false,
      linked_id: null,
    }
  }

  function resetManual() {
    setMName(''); setMAmount(''); setMDate(today())
    setMAccount('utama'); setMCatId(''); setMSubcatId('')
    setMFile(null); setMEst(false)
  }

  async function handleManualSubmit() {
    if (!mName.trim()) { alert('Nama harus diisi'); return }
    if (!mAmount || parseFloat(mAmount) <= 0) { alert('Jumlah harus lebih dari 0'); return }
    setSaving(true)
    try {
      const tx = buildTxFromManual()
      if (mFile) {
        const f = await uploadFile(mFile)
        tx.file_name = f.name; tx.file_url = f.url
      }
      await onAdd(tx)
      resetManual()
    } catch (e) { alert('Gagal simpan: ' + e.message) }
    finally { setSaving(false) }
  }

  // AI Parse
  async function handleParse() {
    if (!aiText.trim() && !aiImage) return
    setAiLoading(true)
    setAiParsed(null)
    try {
      const catCtx = categories.map(c =>
        `[${c.type}] ${c.name} (id: ${c.id}) → subcats: ${(c.subcats||[]).map(s=>`${s.name}(${s.id})`).join(', ')}`
      ).join('\n')
      const todayStr = today()

      const userContent = []
      if (aiImage) {
        userContent.push({ type: 'image', source: { type: 'base64', media_type: aiImage.mediaType, data: aiImage.base64 } })
      }
      userContent.push({ type: 'text', text: aiText || 'Parse transaksi dari gambar.' })

      const resp = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'claude-sonnet-4-6',
          max_tokens: 500,
          system: `Kamu asisten keuangan Gastron (distribusi gas CNG). Parse input transaksi dan kembalikan JSON.

KATEGORI:\n${catCtx}

REKENING: utama, buffer, petty, procurement
HARI INI: ${todayStr}

RULES:
- date format: YYYY-MM-DD. Kalau tidak ada tanggal, pakai hari ini.
- type: "in" pemasukan, "out" pengeluaran
- isEst: true kalau jumlah perkiraan
- amount: angka murni (tanpa titik/koma)

Kembalikan HANYA JSON valid:
{"name":"...","amount":0,"date":"2026-06-01","type":"out","account":"utama","catId":"","catName":"","subcatId":"","subcatName":"","isEst":false}`,
          messages: [{ role: 'user', content: userContent }]
        })
      })
      const data = await resp.json()
      const raw = data.content?.[0]?.text || ''
      const clean = raw.replace(/```json|```/g, '').trim()
      setAiParsed(JSON.parse(clean))
    } catch (e) {
      alert('Gagal parse: ' + e.message)
    } finally {
      setAiLoading(false)
    }
  }

  async function confirmAI() {
    if (!aiParsed) return
    setSaving(true)
    try {
      await onAdd({
        name: aiParsed.name,
        amount: parseFloat(aiParsed.amount),
        date: aiParsed.date || today(),
        type: aiParsed.type || 'out',
        account: aiParsed.account || 'utama',
        cat_id: aiParsed.catId || null,
        cat_name: aiParsed.catName || null,
        subcat_id: aiParsed.subcatId || null,
        subcat_name: aiParsed.subcatName || null,
        is_est: !!aiParsed.isEst,
        is_kemb: false,
      })
      setAiText(''); setAiImage(null); setAiParsed(null)
    } catch (e) { alert('Gagal simpan: ' + e.message) }
    finally { setSaving(false) }
  }

  function onImgSelect(e) {
    const f = e.target.files[0]
    if (!f) return
    const reader = new FileReader()
    reader.onload = ev => {
      setAiImage({ base64: ev.target.result.split(',')[1], mediaType: f.type, name: f.name })
    }
    reader.readAsDataURL(f)
  }

  return (
    <div className={styles.wrap}>
      <div className={styles.header}>
        <span className={styles.title}>+ Tambah Transaksi</span>
        <div className={styles.modeTabs}>
          <button className={`${styles.modeBtn} ${mode==='ai'?styles.modeOn:''}`} onClick={()=>setMode('ai')}>✦ AI</button>
          <button className={`${styles.modeBtn} ${mode==='manual'?styles.modeOn:''}`} onClick={()=>setMode('manual')}>✏ Manual</button>
        </div>
      </div>

      <div className={styles.body}>
        {mode === 'ai' ? (
          <div className={styles.aiMode}>
            <textarea
              className={styles.aiInput}
              rows={3}
              placeholder={"cth: bayar gaji driver 5jt minggu ini\natau: top up gas 50 juta dari procurement"}
              value={aiText}
              onChange={e => setAiText(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleParse() } }}
            />
            <span className={styles.hint}>Enter untuk parse · Shift+Enter baris baru</span>

            {aiImage ? (
              <div className={styles.imgSel}>
                <span>📸 {aiImage.name}</span>
                <button onClick={() => setAiImage(null)}>×</button>
              </div>
            ) : (
              <button className={styles.imgBtn} onClick={() => fileRef.current.click()}>📷 Upload foto struk</button>
            )}
            <input type="file" ref={fileRef} style={{display:'none'}} accept="image/*" onChange={onImgSelect} />

            <button
              className={styles.parseBtn}
              onClick={handleParse}
              disabled={aiLoading || (!aiText.trim() && !aiImage)}
            >
              {aiLoading ? '⏳ Parsing...' : '✦ Parse dengan AI'}
            </button>

            {aiParsed && (
              <div className={styles.preview}>
                <div className={styles.previewHdr}>
                  <span>Hasil Parse AI</span>
                  <button onClick={() => setAiParsed(null)}>×</button>
                </div>
                <div className={styles.previewBody}>
                  <Row label="Tipe" val={<span className={aiParsed.type==='in'?styles.valIn:styles.valOut}>{aiParsed.type==='in'?'● Masuk':'● Keluar'}</span>} />
                  <Row label="Nama" val={aiParsed.name} />
                  <Row label="Jumlah" val={<b>{rp(aiParsed.amount)}</b>} />
                  <Row label="Tanggal" val={aiParsed.date} />
                  <Row label="Rekening" val={ACCOUNT_LABELS[aiParsed.account]||aiParsed.account} />
                  {aiParsed.catName && <Row label="Kategori" val={`${aiParsed.catName}${aiParsed.subcatName?' › '+aiParsed.subcatName:''}`} />}
                  {aiParsed.isEst && <Row label="Status" val={<span className={styles.valEst}>⚠ Estimasi</span>} />}
                </div>
                <div className={styles.previewFoot}>
                  <button className={styles.confBtn} onClick={confirmAI} disabled={saving}>✓ Simpan</button>
                  <button className={styles.cancBtn} onClick={() => setAiParsed(null)}>Batal</button>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className={styles.manualMode}>
            <div className={styles.typeRow}>
              <button className={`${styles.typeBtn} ${mType==='in'?styles.typeBtnIn:''}`} onClick={()=>{setMType('in');setMCatId('');setMSubcatId('')}}>Masuk</button>
              <button className={`${styles.typeBtn} ${mType==='out'?styles.typeBtnOut:''}`} onClick={()=>{setMType('out');setMCatId('');setMSubcatId('')}}>Keluar</button>
            </div>
            <div className="fg">
              <label>Nama / Keterangan</label>
              <input value={mName} onChange={e=>setMName(e.target.value)} placeholder="cth: Gaji Tim" />
            </div>
            <div className="fg">
              <label>Jumlah (Rp)</label>
              <input type="number" value={mAmount} onChange={e=>setMAmount(e.target.value)} placeholder="0" />
            </div>
            <div className="fg">
              <label>Tanggal</label>
              <input type="date" value={mDate} onChange={e=>setMDate(e.target.value)} />
            </div>
            <div className="fg">
              <label>Rekening</label>
              <select value={mAccount} onChange={e=>setMAccount(e.target.value)}>
                {ACCOUNTS.map(a => <option key={a} value={a}>{ACCOUNT_LABELS[a]}</option>)}
              </select>
            </div>
            <div className="fg">
              <label>Kategori</label>
              <select value={mCatId} onChange={e=>{setMCatId(e.target.value);setMSubcatId('')}}>
                <option value="">— Pilih kategori —</option>
                {filteredCats.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            {subcats.length > 0 && (
              <div className="fg">
                <label>Subkategori</label>
                <select value={mSubcatId} onChange={e=>setMSubcatId(e.target.value)}>
                  <option value="">—</option>
                  {subcats.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </div>
            )}
            <label className={styles.estRow}>
              <input type="checkbox" checked={mEst} onChange={e=>setMEst(e.target.checked)} />
              <span>Tandai sebagai Estimasi</span>
            </label>
            <button className={styles.addBtn} onClick={handleManualSubmit} disabled={saving}>
              {saving ? 'Menyimpan...' : '+ Tambah'}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

function Row({ label, val }) {
  return (
    <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
      <span style={{ fontSize: 10, color: 'var(--text2)', minWidth: 64, flexShrink: 0, textTransform: 'uppercase', letterSpacing: '.04em', fontWeight: 600 }}>{label}</span>
      <span style={{ fontSize: 12 }}>{val}</span>
    </div>
  )
}
