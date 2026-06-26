import './index.css'
import { AppProvider } from './context/AppContext'
import Layout from './components/Layout'
import ForecastPage from './pages/ForecastPage'
import MonthlyPage from './pages/MonthlyPage'
import RecurringPage from './pages/RecurringPage'
import CategoriesPage from './pages/CategoriesPage'
import { useState } from 'react'

export default function App() {
  const [page, setPage] = useState('forecast')

  const pages = {
    forecast: <ForecastPage />,
    monthly: <MonthlyPage />,
    recurring: <RecurringPage />,
    categories: <CategoriesPage />,
  }

  return (
    <AppProvider>
      <Layout page={page} setPage={setPage}>
        {pages[page]}
      </Layout>
    </AppProvider>
  )
}
