import { useState } from 'react'
import { rp, fmtDateShort, ACCOUNT_LABELS } from '../lib/utils'
import { updateTransaction } from '../lib/db'
import styles from './TransactionList.module.css'

export default function TransactionList({ transactions, onDelete, onUpdate, categories }) {
  const [search, setSearch] = useState('')
  const [updatingId, setUpdatingId] = useState(null)
  const [updAmt, setUpdAmt] = useState('')

  const filtered = [...transactions]
    .filter(t => !search || t.name.toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => b.date.localeCompare(a.date))

  function startUpdate(t) {
    setUpdatingId(t.id)
    setUpdAmt(t.amount)
  }

  async function confirmUpdate(t) {
    const amount = parseFloat(updAmt)
    if (!amount || amount <= 0) return
    await onUpdate(t.id, { amount, is_est: false })
    setUpdatingId(null)
  }

  return (
    <div className={styles.wrap}>
      <div className={styles.header}>
        <span className={styles.title}>Transaksi <span className={styles.count}>({transactions.length})</span></span>
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
            <span>Belum ada transaksi</span>
          </div>
        )}
        {filtered.map(t => (
          <div
            key={t.id}
            className={`${styles.item} ${t.is_est ? styles.itemEst : t.type === 'in' ? styles.itemIn : styles.itemOut}`}
          >
            {updatingId === t.id ? (
              <div className={styles.updForm}>
                <span className={styles.updName}>{t.name}</span>
                <div className={styles.updRow}>
                  <input
                    type="number"
                    value={updAmt}
                    onChange={e => setUpdAmt(e.target.value)}
                    autoFocus
                  />
                </div>
                <div className={styles.updBtns}>
                  <button className={styles.confBtn} onClick={() => confirmUpdate(t)}>✓ Konfirmasi</button>
                  <button className={styles.cancBtn} onClick={() => setUpdatingId(null)}>Batal</button>
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
                  {t.file_url && (
                    <a href={t.file_url} target="_blank" rel="noreferrer" className={styles.iconBtn} title={t.file_name}>📎</a>
                  )}
                  {t.is_est && (
                    <button className={styles.updBtn} onClick={() => startUpdate(t)}>Update</button>
                  )}
                  <button className={styles.iconBtn} onClick={() => onDelete(t.id)} title="Hapus">×</button>
                </div>
              </>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
