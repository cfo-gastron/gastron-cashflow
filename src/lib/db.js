import { supabase } from './supabase'

// ── TRANSACTIONS ──────────────────────────────────────────────

export async function getTransactions({ year = 2026 } = {}) {
  const { data, error } = await supabase
    .from('cashflow_transactions')
    .select('*')
    .gte('date', `${year}-01-01`)
    .lte('date', `${year}-12-31`)
    .order('date', { ascending: true })
  if (error) throw error
  return data
}

export async function addTransaction(tx) {
  const { data, error } = await supabase
    .from('cashflow_transactions')
    .insert(tx)
    .select()
    .single()
  if (error) throw error
  return data
}

export async function updateTransaction(id, updates) {
  const { data, error } = await supabase
    .from('cashflow_transactions')
    .update(updates)
    .eq('id', id)
    .select()
    .single()
  if (error) throw error
  return data
}

export async function deleteTransaction(id) {
  const { error } = await supabase
    .from('cashflow_transactions')
    .delete()
    .eq('id', id)
  if (error) throw error
}

// ── RECURRING ────────────────────────────────────────────────

export async function getRecurring() {
  const { data, error } = await supabase
    .from('cashflow_recurring')
    .select('*')
    .order('created_at', { ascending: true })
  if (error) throw error
  return data
}

export async function addRecurring(rec) {
  const { data, error } = await supabase
    .from('cashflow_recurring')
    .insert(rec)
    .select()
    .single()
  if (error) throw error
  return data
}

export async function deleteRecurring(id) {
  const { error } = await supabase
    .from('cashflow_recurring')
    .delete()
    .eq('id', id)
  if (error) throw error
}

// ── CATEGORIES ───────────────────────────────────────────────

export async function getCategories() {
  const { data, error } = await supabase
    .from('cashflow_categories')
    .select('*')
    .order('type', { ascending: false }) // 'out' dulu, lalu 'in'
  if (error) throw error
  return data
}

export async function upsertCategory(cat) {
  const { data, error } = await supabase
    .from('cashflow_categories')
    .upsert(cat, { onConflict: 'id' })
    .select()
    .single()
  if (error) throw error
  return data
}

export async function deleteCategory(id) {
  const { error } = await supabase
    .from('cashflow_categories')
    .delete()
    .eq('id', id)
  if (error) throw error
}

// ── CONFIG (saldo awal) ───────────────────────────────────────

export async function getConfig(key) {
  const { data, error } = await supabase
    .from('cashflow_config')
    .select('value')
    .eq('key', key)
    .single()
  if (error && error.code !== 'PGRST116') throw error
  return data?.value ?? null
}

export async function setConfig(key, value) {
  const { error } = await supabase
    .from('cashflow_config')
    .upsert({ key, value: String(value), updated_at: new Date().toISOString() }, { onConflict: 'key' })
  if (error) throw error
}

// ── UPLOAD FILE (Firebase Storage → Supabase Storage) ────────

export async function uploadFile(file) {
  const ext = file.name.split('.').pop()
  const path = `cashflow/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`
  const { error } = await supabase.storage
    .from('attachments')
    .upload(path, file)
  if (error) throw error
  const { data } = supabase.storage.from('attachments').getPublicUrl(path)
  return { name: file.name, url: data.publicUrl }
}
