// Format Rupiah
export function rp(n) {
  if (!n && n !== 0) return '—'
  return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(n)
}

export function rpShort(n) {
  if (n === 0) return 'Rp 0'
  const abs = Math.abs(n)
  const sign = n < 0 ? '-' : ''
  if (abs >= 1_000_000_000) return `${sign}Rp ${(abs / 1_000_000_000).toFixed(1)}M`
  if (abs >= 1_000_000) return `${sign}Rp ${(abs / 1_000_000).toFixed(1)}jt`
  if (abs >= 1_000) return `${sign}Rp ${(abs / 1_000).toFixed(0)}rb`
  return `${sign}Rp ${abs}`
}

// Format tanggal
export function fmtDate(dateStr) {
  if (!dateStr) return '—'
  const d = new Date(dateStr)
  return d.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })
}

export function fmtDateShort(dateStr) {
  if (!dateStr) return '—'
  const d = new Date(dateStr)
  return d.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })
}

// Nama bulan
export const MONTHS = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember']
export const MONTHS_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des']

// Nama rekening
export const ACCOUNT_LABELS = {
  utama: 'Utama',
  buffer: 'Buffer',
  petty: 'Petty Cash',
  procurement: 'Procurement',
}

// Warna rekening
export const ACCOUNT_COLORS = {
  utama: '#3b82f6',
  buffer: '#8b5cf6',
  petty: '#f59e0b',
  procurement: '#10b981',
}

// Get week of month label
export function getWeekLabel(dateStr) {
  if (!dateStr) return ''
  const d = new Date(dateStr)
  const day = d.getDate()
  if (day <= 7) return 'Awal bulan'
  if (day <= 14) return '~tgl 8–14'
  if (day <= 21) return '~tgl 15–21'
  return 'Akhir bulan'
}

// Get today's date as YYYY-MM-DD
export function today() {
  return new Date().toISOString().split('T')[0]
}

// Group array by key
export function groupBy(arr, key) {
  return arr.reduce((acc, item) => {
    const k = typeof key === 'function' ? key(item) : item[key]
    if (!acc[k]) acc[k] = []
    acc[k].push(item)
    return acc
  }, {})
}

// Escape HTML
export function esc(str) {
  if (!str) return ''
  return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

// Generate ID
export function mkId() {
  return 't' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6)
}
