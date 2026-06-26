// Expand recurring items jadi transaksi virtual per bulan
// Mirip fungsi xr() di Firebase version, tapi pakai date bukan week num

export function expandRecurring(recurringList, year = 2026) {
  const expanded = []

  for (const r of recurringList) {
    for (let month = r.start_month; month <= r.end_month; month++) {
      // Tentukan tanggal berdasarkan week_of_month
      const weekDay = getWeekDate(year, month, r.week_of_month)
      expanded.push({
        id: `rec-${r.id}-${month}`,
        name: r.name,
        amount: r.amount,
        date: weekDay,
        type: r.type,
        account: r.account,
        cat_id: r.cat_id,
        cat_name: r.cat_name,
        subcat_id: r.subcat_id,
        subcat_name: r.subcat_name,
        is_est: false,
        is_kemb: false,
        is_rec: true,
        _rec_id: r.id,
      })
    }
  }

  return expanded
}

// Tentukan tanggal berdasarkan minggu ke-N dalam bulan
function getWeekDate(year, month, weekOfMonth) {
  // week 1 = tgl 1-7, week 2 = tgl 8-14, week 3 = tgl 15-21, week 4 = tgl 22+
  const days = [1, 8, 15, 22]
  const day = days[Math.min(weekOfMonth - 1, 3)]
  return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
}
