import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

export default function Reports() {
  const [period, setPeriod] = useState('today')
  const [sales, setSales] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => { fetchSales() }, [period])

  const fetchSales = async () => {
    setLoading(true)
    const now = new Date()
    let from = new Date()
    if (period === 'today') { from.setHours(0, 0, 0, 0) }
    else if (period === 'week') { from.setDate(now.getDate() - 7) }
    else if (period === 'month') { from.setDate(1); from.setHours(0, 0, 0, 0) }

    const { data } = await supabase.from('sales').select('*').gte('created_at', from.toISOString()).order('created_at', { ascending: false })
    setSales(data || [])
    setLoading(false)
  }

  const total = sales.reduce((s, r) => s + (r.total_amount || 0), 0)
  const byMethod = sales.reduce((acc, r) => {
    acc[r.payment_method] = (acc[r.payment_method] || 0) + (r.total_amount || 0)
    return acc
  }, {})

  const fmt = v => `NZ$${(v || 0).toFixed(2)}`

  const exportCSV = () => {
    const rows = [['Date', 'Time', 'Payment', 'Customer', 'Items', 'Total']]
    sales.forEach(s => {
      const d = new Date(s.created_at)
      rows.push([
        d.toLocaleDateString('en-NZ'),
        d.toLocaleTimeString('en-NZ', { hour: '2-digit', minute: '2-digit' }),
        s.payment_method,
        s.customer_name || 'Walk-in',
        Array.isArray(s.items) ? s.items.map(i => `${i.name} x${i.qty}`).join('; ') : '',
        s.total_amount?.toFixed(2)
      ])
    })
    const csv = rows.map(r => r.map(v => `"${v}"`).join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `spa-road-sales-${period}.csv`
    a.click()
  }

  return (
    <div style={{ padding: 16, paddingBottom: 80 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <div style={{ fontWeight: 700, fontSize: 20, color: '#1a3a2a' }}>Reports</div>
        <button onClick={exportCSV} style={{ background: '#fff', border: '1.5px solid #1a6b3c', color: '#1a6b3c', borderRadius: 8, padding: '7px 12px', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>Export CSV</button>
      </div>

      <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
        {[['today', 'Today'], ['week', 'Last 7 Days'], ['month', 'This Month']].map(([v, l]) => (
          <button key={v} onClick={() => setPeriod(v)}
            style={{ flex: 1, padding: '8px 4px', borderRadius: 8, border: period === v ? '2px solid #1a6b3c' : '1.5px solid #e5e7eb',
              background: period === v ? '#e8f5ee' : '#fff', color: period === v ? '#1a6b3c' : '#374151', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
            {l}
          </button>
        ))}
      </div>

      <div style={{ background: '#1a6b3c', color: '#fff', borderRadius: 12, padding: '16px', marginBottom: 16 }}>
        <div style={{ fontSize: 12, opacity: 0.8, marginBottom: 4 }}>Total Revenue</div>
        <div style={{ fontWeight: 700, fontSize: 28 }}>{fmt(total)}</div>
        <div style={{ fontSize: 12, opacity: 0.7, marginTop: 4 }}>{sales.length} transactions</div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10, marginBottom: 16 }}>
        {['Cash', 'EFTPOS', 'Credit'].map(m => (
          <div key={m} style={{ background: '#fff', border: '1.5px solid #e5e7eb', borderRadius: 10, padding: '12px 10px', textAlign: 'center' }}>
            <div style={{ fontSize: 11, color: '#6b7280', marginBottom: 4 }}>{m}</div>
            <div style={{ fontWeight: 700, fontSize: 15, color: '#1a3a2a' }}>{fmt(byMethod[m] || 0)}</div>
          </div>
        ))}
      </div>

      {loading ? <div style={{ textAlign: 'center', color: '#9ca3af', padding: 20 }}>Loading...</div> :
        sales.map(s => (
          <div key={s.id} style={{ background: '#fff', border: '1.5px solid #e5e7eb', borderRadius: 10, padding: '12px 14px', marginBottom: 8 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <div style={{ fontSize: 13, fontWeight: 600, color: '#1a3a2a' }}>{s.customer_name || 'Walk-in'}</div>
                <div style={{ fontSize: 12, color: '#6b7280', marginTop: 2 }}>
                  {s.payment_method} · {new Date(s.created_at).toLocaleString('en-NZ', { dateStyle: 'short', timeStyle: 'short' })}
                </div>
                {Array.isArray(s.items) && <div style={{ fontSize: 11, color: '#9ca3af', marginTop: 3 }}>{s.items.map(i => `${i.name} ×${i.qty}`).join(', ')}</div>}
              </div>
              <div style={{ fontWeight: 700, color: '#1a6b3c', fontSize: 15 }}>{fmt(s.total_amount)}</div>
            </div>
          </div>
        ))
      }
    </div>
  )
}
