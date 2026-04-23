import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip } from 'recharts'

export default function Dashboard() {
  const [todaySales, setTodaySales] = useState({ total: 0, count: 0, cash: 0, eftpos: 0 })
  const [weekData, setWeekData] = useState([])
  const [recent, setRecent] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => { fetchData() }, [])

  const fetchData = async () => {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const todayISO = today.toISOString()

    const weekStart = new Date(today)
    weekStart.setDate(today.getDate() - today.getDay() + 1) // Monday

    const [{ data: todayData }, { data: weekSales }, { data: recentData }] = await Promise.all([
      supabase.from('sales').select('total_amount, payment_method').gte('created_at', todayISO),
      supabase.from('sales').select('total_amount, created_at').gte('created_at', weekStart.toISOString()),
      supabase.from('sales').select('total_amount, payment_method, items, created_at').order('created_at', { ascending: false }).limit(5)
    ])

    if (todayData) {
      const total = todayData.reduce((s, r) => s + (r.total_amount || 0), 0)
      const cash = todayData.filter(r => r.payment_method === 'Cash').reduce((s, r) => s + (r.total_amount || 0), 0)
      const eftpos = todayData.filter(r => r.payment_method === 'EFTPOS').reduce((s, r) => s + (r.total_amount || 0), 0)
      setTodaySales({ total, count: todayData.length, cash, eftpos })
    }

    const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
    const byDay = days.map((d, i) => {
      const dayDate = new Date(weekStart)
      dayDate.setDate(weekStart.getDate() + i)
      const dayStr = dayDate.toISOString().split('T')[0]
      const total = (weekSales || [])
        .filter(s => s.created_at?.startsWith(dayStr))
        .reduce((sum, s) => sum + (s.total_amount || 0), 0)
      return { day: d, total }
    })
    setWeekData(byDay)
    setRecent(recentData || [])
    setLoading(false)
  }

  const fmt = v => `NZ$${(v || 0).toFixed(2)}`

  if (loading) return <div style={{ padding: 24, textAlign: 'center', color: '#9ca3af' }}>Loading...</div>

  return (
    <div style={{ padding: '16px' }}>
      <div style={{ fontSize: 12, color: '#9ca3af', marginBottom: 4 }}>
        {new Date().toLocaleDateString('en-NZ', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
      </div>
      <div style={{ fontWeight: 700, fontSize: 20, color: '#1a3a2a', marginBottom: 16 }}>Today's Overview</div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10, marginBottom: 20 }}>
        <div style={{ background: '#1a6b3c', color: '#fff', borderRadius: 12, padding: '14px 12px' }}>
          <div style={{ fontSize: 11, opacity: 0.8, marginBottom: 4 }}>Today's Sales</div>
          <div style={{ fontWeight: 700, fontSize: 18 }}>{fmt(todaySales.total)}</div>
          <div style={{ fontSize: 11, opacity: 0.7, marginTop: 2 }}>{todaySales.count} transactions</div>
        </div>
        <div style={{ background: '#fff', border: '1.5px solid #e5e7eb', borderRadius: 12, padding: '14px 12px' }}>
          <div style={{ fontSize: 11, color: '#6b7280', marginBottom: 4 }}>Cash</div>
          <div style={{ fontWeight: 700, fontSize: 16, color: '#1a3a2a' }}>{fmt(todaySales.cash)}</div>
        </div>
        <div style={{ background: '#fff', border: '1.5px solid #e5e7eb', borderRadius: 12, padding: '14px 12px' }}>
          <div style={{ fontSize: 11, color: '#6b7280', marginBottom: 4 }}>EFTPOS</div>
          <div style={{ fontWeight: 700, fontSize: 16, color: '#1a3a2a' }}>{fmt(todaySales.eftpos)}</div>
        </div>
      </div>

      <div style={{ background: '#fff', border: '1.5px solid #e5e7eb', borderRadius: 12, padding: '16px', marginBottom: 16 }}>
        <div style={{ fontWeight: 600, fontSize: 14, color: '#1a3a2a', marginBottom: 12 }}>This Week's Sales</div>
        <ResponsiveContainer width="100%" height={140}>
          <BarChart data={weekData}>
            <XAxis dataKey="day" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
            <YAxis hide />
            <Tooltip formatter={v => fmt(v)} />
            <Bar dataKey="total" fill="#1a6b3c" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div style={{ background: '#fff', border: '1.5px solid #e5e7eb', borderRadius: 12, padding: '16px' }}>
        <div style={{ fontWeight: 600, fontSize: 14, color: '#1a3a2a', marginBottom: 12 }}>Recent Transactions</div>
        {recent.length === 0
          ? <div style={{ color: '#9ca3af', fontSize: 13, textAlign: 'center', padding: '12px 0' }}>No sales recorded today yet</div>
          : recent.map((s, i) => (
            <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: i < recent.length - 1 ? '1px solid #f3f4f6' : 'none' }}>
              <div>
                <div style={{ fontSize: 13, fontWeight: 500, color: '#1a3a2a' }}>
                  {Array.isArray(s.items) ? s.items.map(i => i.name || i.product?.name).join(', ') : 'Sale'}
                </div>
                <div style={{ fontSize: 11, color: '#9ca3af' }}>
                  {s.payment_method} · {new Date(s.created_at).toLocaleTimeString('en-NZ', { hour: '2-digit', minute: '2-digit' })}
                </div>
              </div>
              <div style={{ fontWeight: 600, color: '#1a6b3c' }}>{fmt(s.total_amount)}</div>
            </div>
          ))
        }
      </div>
    </div>
  )
}
