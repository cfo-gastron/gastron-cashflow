import { useState } from 'react'
import { useApp } from '../context/AppContext'
import styles from './Layout.module.css'

const TABS = [
  { id: 'forecast',   label: 'Forecast',      icon: '▤' },
  { id: 'monthly',    label: 'Monthly Report', icon: '▦' },
  { id: 'budget',     label: 'Budget',         icon: '◎' },
  { id: 'recurring',  label: 'Recurring',      icon: '↻' },
  { id: 'categories', label: 'Kategori',       icon: '⊞' },
]

export default function Layout({ page, setPage, sidebar, children, content }) {
  const { loading } = useApp()
  const [sidebarOpen, setSidebarOpen] = useState(true)

  const hasSidebar = !!sidebar

  return (
    <div className={styles.shell}>
      <nav className={styles.nav}>
        <div className={styles.navLogo}>G</div>
        {TABS.map((t, i) => (
          <div key={t.id} style={{ display: 'contents' }}>
            {i === 3 && <div className={styles.navSep} />}
            <button
              className={`${styles.navItem} ${page === t.id ? styles.navItemOn : ''}`}
              onClick={() => setPage(t.id)}
              title={t.label}
              data-label={t.label}
            >
              {t.icon}
            </button>
          </div>
        ))}
        <div className={styles.navBottom}>
          <div className={styles.navSep} />
          {loading && <div className="spinner" />}
        </div>
      </nav>

      <div className={styles.body}>
        {hasSidebar && (
          <aside className={`${styles.sidebar} ${sidebarOpen ? '' : styles.sidebarHidden}`}>
            {sidebar}
          </aside>
        )}

        <div className={styles.main}>
          <header className={styles.mainHdr}>
            {hasSidebar && (
              <button className={styles.toggleBtn} onClick={() => setSidebarOpen(o => !o)}>
                {sidebarOpen ? '‹' : '›'}
              </button>
            )}
            <span className={styles.pageTitle}>{TABS.find(t => t.id === page)?.label}</span>
            <div className={styles.hdrRight}>
              {children?.headerActions}
            </div>
          </header>
          <div className={styles.content}>
            {content ?? children?.content ?? children}
          </div>
        </div>
      </div>
    </div>
  )
}