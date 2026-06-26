import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { getTransactions, getRecurring, getCategories, getConfig, setConfig } from '../lib/db'
import { expandRecurring } from '../lib/recurring'

const AppContext = createContext(null)

export function AppProvider({ children }) {
  const [transactions, setTransactions] = useState([])
  const [recurring, setRecurring] = useState([])
  const [categories, setCategories] = useState([])
  const [saldoAwal, setSaldoAwal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const load = useCallback(async () => {
    try {
      setLoading(true)
      const [txs, recs, cats, saldo] = await Promise.all([
        getTransactions({ year: 2026 }),
        getRecurring(),
        getCategories(),
        getConfig('saldo_awal'),
      ])
      setTransactions(txs || [])
      setRecurring(recs || [])
      setCategories(cats || [])
      setSaldoAwal(Number(saldo) || 0)
    } catch (e) {
      console.error('Load error:', e)
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  // Semua transaksi + recurring yang di-expand
  const allItems = [
    ...transactions,
    ...expandRecurring(recurring),
  ]

  // Update saldo awal
  const updateSaldo = async (val) => {
    setSaldoAwal(val)
    await setConfig('saldo_awal', val)
  }

  return (
    <AppContext.Provider value={{
      transactions, setTransactions,
      recurring, setRecurring,
      categories, setCategories,
      saldoAwal, updateSaldo,
      allItems,
      loading, error,
      reload: load,
    }}>
      {children}
    </AppContext.Provider>
  )
}

export const useApp = () => {
  const ctx = useContext(AppContext)
  if (!ctx) throw new Error('useApp must be inside AppProvider')
  return ctx
}
