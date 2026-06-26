import { useApp } from '../context/AppContext'
import { rp } from '../lib/utils'
import styles from './Layout.module.css'

const TABS = [
  { id: 'forecast', label: 'Forecast' },
  { id: 'monthly', label: 'Monthly Report' },
  { id: 'recurring', label: 'Recurring' },
  { id: 'categories', label: 'Kategori' },
]

export default function Layout({ page, setPage, children }) {
  const { saldoAwal, updateSaldo, loading } = useApp()
  const [editSaldo, setEditSaldo] = useState(false)
  const [saldoInput, setSaldoInput] = useState('')

  function startEditSaldo() {
    setSaldoInput(saldoAwal)
    setEditSaldo(true)
  }
  function saveSaldo() {
    const v = parseFloat(saldoInput)
    if (!isNaN(v)) updateSaldo(v)
    setEditSaldo(false)
  }

  return (
    <div className={styles.shell}>
      <header className={styles.hdr}>
        <div className={styles.logo}>
          <span className={styles.logoGastron}>Gastron</span>
          <span className={styles.logoDivider}>·</span>
          <span className={styles.logoSub}>Cashflow 2026</span>
        </div>

        <nav className={styles.tabs}>
          {TABS.map(t => (
            <button
              key={t.id}
              className={`${styles.tab} ${page === t.id ? styles.tabOn : ''}`}
              onClick={() => setPage(t.id)}
            >
              {t.label}
            </button>
          ))}
        </nav>

        <div className={styles.hdrRight}>
          {editSaldo ? (
            <div className={styles.saldoEdit}>
              <span className={styles.saldoLabel}>Saldo awal</span>
              <input
                type="number"
                value={saldoInput}
                onChange={e => setSaldoInput(e.target.value)}
                onBlur={saveSaldo}
                onKeyDown={e => e.key === 'Enter' && saveSaldo()}
                autoFocus
                className={styles.saldoInp}
              />
            </div>
          ) : (
            <button className={styles.saldoBtn} onClick={startEditSaldo} title="Edit saldo awal">
              <span className={styles.saldoLabel}>Saldo awal</span>
              <span className={styles.saldoVal}>{rp(saldoAwal)}</span>
            </button>
          )}
          {loading && <div className="spinner" style={{ width: 14, height: 14 }} />}
        </div>
      </header>

      <main className={styles.main}>
        {children}
      </main>
    </div>
  )
}

// Need useState import
import { useState } from 'react'
