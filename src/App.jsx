import { useState } from 'react'
import { AppProvider, useApp } from './context/AppContext'
import ForecastPage   from './pages/ForecastPage'
import MonthlyPage    from './pages/MonthlyPage'
import BudgetPage     from './pages/BudgetPage'
import RecurringPage  from './pages/RecurringPage'
import CategoriesPage from './pages/CategoriesPage'
import './index.css'

function AppContent() {
  const [page, setPage] = useState('forecast')
  const { loading, error, reload } = useApp()

  if (loading) return (
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      height: '100vh', gap: 16, background: 'var(--bg)'
    }}>
      <div style={{
        width: 36, height: 36, borderRadius: 9, background: 'var(--red)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 16, fontWeight: 800, color: '#fff'
      }}>G</div>
      <div className="spinner" style={{ width: 20, height: 20 }} />
      <span style={{ fontSize: 12, color: 'var(--text3)' }}>Memuat data...</span>
    </div>
  )

  if (error) return (
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      height: '100vh', gap: 12, background: 'var(--bg)'
    }}>
      <div style={{ fontSize: 13, color: 'var(--red)', fontWeight: 600 }}>Gagal memuat data</div>
      <div style={{ fontSize: 11, color: 'var(--text3)', maxWidth: 300, textAlign: 'center' }}>{error}</div>
      <button
        onClick={reload}
        style={{
          padding: '7px 16px', borderRadius: 'var(--r)', border: 'none',
          background: 'var(--red)', color: '#fff', fontSize: 12, fontWeight: 700,
          cursor: 'pointer', fontFamily: 'var(--font)'
        }}
      >Coba Lagi</button>
    </div>
  )

  return (
    <>
      {page === 'forecast'   && <ForecastPage   page={page} setPage={setPage} />}
      {page === 'monthly'    && <MonthlyPage    page={page} setPage={setPage} />}
      {page === 'budget'     && <BudgetPage     page={page} setPage={setPage} />}
      {page === 'recurring'  && <RecurringPage  page={page} setPage={setPage} />}
      {page === 'categories' && <CategoriesPage page={page} setPage={setPage} />}
    </>
  )
}

export default function App() {
  return (
    <AppProvider>
      <AppContent />
    </AppProvider>
  )
}