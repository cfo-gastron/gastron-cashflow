import { useState, useEffect } from 'react'
import { AppProvider, useApp } from './context/AppContext'
import ForecastPage   from './pages/ForecastPage'
import MonthlyPage    from './pages/MonthlyPage'
import BudgetPage     from './pages/BudgetPage'
import RecurringPage  from './pages/RecurringPage'
import CategoriesPage from './pages/CategoriesPage'
import './index.css'

const TABS = [
  { id:'forecast',   icon:'▤', label:'Forecast' },
  { id:'monthly',    icon:'▦', label:'Monthly' },
  { id:'budget',     icon:'◎', label:'Budget' },
  { id:'recurring',  icon:'↻', label:'Recurring' },
  { id:'categories', icon:'⊞', label:'Kategori' },
]

function AppContent() {
  const [page, setPage] = useState('forecast')
  const { loading, error, reload } = useApp()
  const [theme, setTheme] = useState(()=>localStorage.getItem('gastron-theme')||'light')

  useEffect(()=>{
    document.documentElement.setAttribute('data-theme', theme)
    localStorage.setItem('gastron-theme', theme)
  }, [theme])

  if (loading) return (
    <div style={{height:'100vh',display:'flex',alignItems:'center',justifyContent:'center',flexDirection:'column',gap:16,background:'var(--bg-base)'}}>
      <div className="bg-layer"><div className="bg-blob"/><div className="bg-blob"/><div className="bg-blob"/></div>
      <div className="nav-logo" style={{width:40,height:40,fontSize:18,zIndex:1}}>G</div>
      <div className="spinner" style={{zIndex:1}}/>
      <span style={{fontSize:12,color:'var(--text3)',zIndex:1}}>Memuat data...</span>
    </div>
  )

  if (error) return (
    <div style={{height:'100vh',display:'flex',alignItems:'center',justifyContent:'center',flexDirection:'column',gap:12,background:'var(--bg-base)'}}>
      <div className="bg-layer"><div className="bg-blob"/><div className="bg-blob"/><div className="bg-blob"/></div>
      <div style={{fontSize:13,color:'var(--red)',fontWeight:600,zIndex:1}}>Gagal memuat data</div>
      <button onClick={reload} className="btn-save" style={{width:'auto',padding:'8px 20px',zIndex:1}}>Coba Lagi</button>
    </div>
  )

  return (
    <div className="app">
      <div className="bg-layer"><div className="bg-blob"/><div className="bg-blob"/><div className="bg-blob"/></div>

      <nav className="nav">
        <div className="nav-logo">G</div>
        {TABS.map((t,i)=>(
          <div key={t.id}>
            {i===3 && <div className="nav-sep"/>}
            <button className={`nav-item ${page===t.id?'on':''}`} onClick={()=>setPage(t.id)} title={t.label}>
              {t.icon}
            </button>
          </div>
        ))}
        <div className="nav-bot">
          <div className="nav-sep"/>
          <button className="theme-btn" onClick={()=>setTheme(t=>t==='light'?'dark':'light')} title="Toggle dark mode">
            {theme==='light'?'🌙':'☀️'}
          </button>
        </div>
      </nav>

      {page==='forecast'   && <ForecastPage   page={page} setPage={setPage}/>}
      {page==='monthly'    && <MonthlyPage    page={page} setPage={setPage}/>}
      {page==='budget'     && <BudgetPage     page={page} setPage={setPage}/>}
      {page==='recurring'  && <RecurringPage  page={page} setPage={setPage}/>}
      {page==='categories' && <CategoriesPage page={page} setPage={setPage}/>}
    </div>
  )
}

export default function App() {
  return <AppProvider><AppContent/></AppProvider>
}