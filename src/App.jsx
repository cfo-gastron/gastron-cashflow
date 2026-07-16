import { useState } from 'react'
import { AppProvider } from './context/AppContext'
import ForecastPage   from './pages/ForecastPage'
import MonthlyPage    from './pages/MonthlyPage'
import BudgetPage     from './pages/BudgetPage'
import RecurringPage  from './pages/RecurringPage'
import CategoriesPage from './pages/CategoriesPage'
import './index.css'

export default function App() {
  const [page, setPage] = useState('forecast')

  return (
    <AppProvider>
      {page === 'forecast'   && <ForecastPage   page={page} setPage={setPage} />}
      {page === 'monthly'    && <MonthlyPage    page={page} setPage={setPage} />}
      {page === 'budget'     && <BudgetPage     page={page} setPage={setPage} />}
      {page === 'recurring'  && <RecurringPage  page={page} setPage={setPage} />}
      {page === 'categories' && <CategoriesPage page={page} setPage={setPage} />}
    </AppProvider>
  )
}