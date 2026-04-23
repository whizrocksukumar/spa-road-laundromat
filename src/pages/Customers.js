import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'

export default function Customers() {
  const { user } = useAuth()
  const [customers, setCustomers] = useState([])
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [view, setView] = useState('list') // list | detail | new
  const [selected, setSelected] = useState(null)
  const [payments, setPayments] = useState([])
  const [sales, setSales] = useState([])
  const [newName, setNewName] = useState('')
  const [newPhone, setNewPhone] = useState('')
  const [newEmail, setNewEmail] = useState('')
  const [newLimit, setNewLimit] = useState('500')
  const [saving, setSaving] = useState(false)
  const [payAmount, setPayAmount] = useState('')
  const [payMethod, setPayMethod] = useState('Cash')
  const [payNote, setPayNote] = useState('')
  const [toast, setToast] = useState(null)

  useEffect(() => { fetchCustomers() }, [])

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 3000)
  }

  const fetchCustomers = async () => {
    setLoading(true)
    const { data } = await supabase.from('customers').select('*').order('name')
    setCustomers(data || [])
    setLoading(false)
  }

  const openDetail = async (c) => {
    setSelected(c)
    setView('detail')
    const [{ data: p }, { data: s }] = await Promise.all([
      supabase.from('customer_payments').select('*').eq('customer_id', c.id).order('created_at', { ascending: false }).limit(20),
      supabase.from('sales').select('*').eq('customer_id', c.id).order('created_at', { ascending: false }).limit(20)
    ])
    setPayments(p || [])
    setSales(s || [])
  }

  const createCustomer = async () => {
    if (!newName.trim()) return showToast('Name is required', 'error')
    setSaving(true)
    const { error } = await supabase.from('customers').insert({
      name: newName.trim(), phone: newPhone.trim() || null, email: newEmail.trim() || null,
      credit_limit: parseFloat(newLimit) || 500, created_by: user?.id
    })
    if (error) { showToast('Error: ' + error.message, 'error'); setSaving(false); return }
    showToast('Customer added!')
    setNewName(''); setNewPhone(''); setNewEmail(''); setNewLimit('500')
    await fetchCustomers()
    setView('list')
    setSaving(false)
  }

  const recordPayment = async () => {
    const amt = parseFloat(payAmount)
    if (!amt || amt <= 0) return showToast('Enter a valid amount', 'error')
    const { error } = await supabase.from('customer_payments').insert({
      customer_id: selected.id, amount: amt, payment_method: payMethod,
      note: payNote || null, recorded_by: user?.id, recorded_by_email: user?.email
    })
    if (error) { showToast('Error: ' + error.message, 'error'); return }
    const newBal = (selected.outstanding_balance || 0) - amt
    await supabase.from('customers').update({ outstanding_balance: newBal }).eq('id', selected.id)
    showToast('Payment recorded!')
    setPayAmount(''); setPayNote('')
    await fetchCustomers()
    const updated = { ...selected, outstanding_balance: newBal }
    setSelected(updated)
    openDetail(updated)
  }

  const filtered = customers.filter(c =>
    c.name?.toLowerCase().includes(search.toLowerCase()) ||
    c.phone?.includes(search)
  )

  const fmt = v => `NZ$${(v || 0).toFixed(2)}`

  if (view === 'new') return (
    <div style={{ padding: 16, paddingBottom: 80 }}>
      {toast && <div style={{ position: 'fixed', bottom: 80, left: '50%', transform: 'translateX(-50%)', background: toast.type === 'error' ? '#dc2626' : '#1a6b3c', color: '#fff', padding: '10px 20px', borderRadius: 8, fontSize: 14, fontWeight: 500, zIndex: 999 }}>{toast.msg}</div>}
      <button onClick={() => setView('list')} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 13, color: '#1a6b3c', fontWeight: 600, padding: 0, marginBottom: 16 }}>← Back</button>
      <div style={{ fontWeight: 700, fontSize: 20, color: '#1a3a2a', marginBottom: 20 }}>New Customer</div>
      {[['Full Name *', newName, setNewName, 'text'], ['Phone', newPhone, setNewPhone, 'tel'], ['Email', newEmail, setNewEmail, 'email']].map(([label, val, setter, type]) => (
        <div key={label} style={{ marginBottom: 14 }}>
          <label style={{ fontSize: 13, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 5 }}>{label}</label>
          <input value={val} onChange={e => setter(e.target.value)} type={type}
            style={{ width: '100%', padding: '10px 12px', border: '1.5px solid #e5e7eb', borderRadius: 8, fontSize: 14, boxSizing: 'border-box', outline: 'none' }} />
        </div>
      ))}
      <div style={{ marginBottom: 24 }}>
        <label style={{ fontSize: 13, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 5 }}>Credit Limit (NZ$)</label>
        <input value={newLimit} onChange={e => setNewLimit(e.target.value)} type="number"
          style={{ width: '100%', padding: '10px 12px', border: '1.5px solid #e5e7eb', borderRadius: 8, fontSize: 14, boxSizing: 'border-box', outline: 'none' }} />
      </div>
      <button onClick={createCustomer} disabled={saving}
        style={{ width: '100%', padding: 14, background: '#1a6b3c', color: '#fff', border: 'none', borderRadius: 10, fontSize: 15, fontWeight: 600, cursor: 'pointer' }}>
        {saving ? 'Saving...' : 'Add Customer'}
      </button>
    </div>
  )

  if (view === 'detail' && selected) return (
    <div style={{ padding: 16, paddingBottom: 80 }}>
      {toast && <div style={{ position: 'fixed', bottom: 80, left: '50%', transform: 'translateX(-50%)', background: toast.type === 'error' ? '#dc2626' : '#1a6b3c', color: '#fff', padding: '10px 20px', borderRadius: 8, fontSize: 14, fontWeight: 500, zIndex: 999 }}>{toast.msg}</div>}
      <button onClick={() => setView('list')} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 13, color: '#1a6b3c', fontWeight: 600, padding: 0, marginBottom: 16 }}>← Back</button>
      <div style={{ fontWeight: 700, fontSize: 20, color: '#1a3a2a' }}>{selected.name}</div>
      {selected.phone && <div style={{ fontSize: 13, color: '#6b7280', marginTop: 2 }}>{selected.phone}</div>}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, margin: '16px 0' }}>
        <div style={{ background: (selected.outstanding_balance || 0) > 0 ? '#fee2e2' : '#e8f5ee', borderRadius: 10, padding: '12px 14px' }}>
          <div style={{ fontSize: 11, color: '#6b7280', marginBottom: 4 }}>Outstanding</div>
          <div style={{ fontWeight: 700, fontSize: 18, color: (selected.outstanding_balance || 0) > 0 ? '#dc2626' : '#1a6b3c' }}>{fmt(selected.outstanding_balance)}</div>
        </div>
        <div style={{ background: '#f8faf8', border: '1px solid #e5e7eb', borderRadius: 10, padding: '12px 14px' }}>
          <div style={{ fontSize: 11, color: '#6b7280', marginBottom: 4 }}>Credit Limit</div>
          <div style={{ fontWeight: 700, fontSize: 18, color: '#1a3a2a' }}>{fmt(selected.credit_limit || 500)}</div>
        </div>
      </div>

      {(selected.outstanding_balance || 0) > 0 && (
        <div style={{ background: '#fff', border: '1.5px solid #e5e7eb', borderRadius: 12, padding: 16, marginBottom: 16 }}>
          <div style={{ fontWeight: 600, fontSize: 14, color: '#1a3a2a', marginBottom: 10 }}>Record Payment</div>
          <input value={payAmount} onChange={e => setPayAmount(e.target.value)} type="number" placeholder="Amount (NZ$)"
            style={{ width: '100%', padding: '9px 12px', border: '1.5px solid #e5e7eb', borderRadius: 8, fontSize: 14, boxSizing: 'border-box', marginBottom: 8, outline: 'none' }} />
          <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
            {['Cash', 'EFTPOS'].map(m => (
              <button key={m} onClick={() => setPayMethod(m)}
                style={{ flex: 1, padding: '8px', borderRadius: 8, border: payMethod === m ? '2px solid #1a6b3c' : '1.5px solid #e5e7eb',
                  background: payMethod === m ? '#e8f5ee' : '#fff', color: payMethod === m ? '#1a6b3c' : '#374151', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
                {m}
              </button>
            ))}
          </div>
          <input value={payNote} onChange={e => setPayNote(e.target.value)} placeholder="Note (optional)"
            style={{ width: '100%', padding: '9px 12px', border: '1.5px solid #e5e7eb', borderRadius: 8, fontSize: 14, boxSizing: 'border-box', marginBottom: 10, outline: 'none' }} />
          <button onClick={recordPayment}
            style={{ width: '100%', padding: '10px', background: '#1a6b3c', color: '#fff', border: 'none', borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>
            Record Payment
          </button>
        </div>
      )}

      {payments.length > 0 && (
        <div style={{ background: '#fff', border: '1.5px solid #e5e7eb', borderRadius: 12, padding: 16, marginBottom: 16 }}>
          <div style={{ fontWeight: 600, fontSize: 14, color: '#1a3a2a', marginBottom: 10 }}>Payment History</div>
          {payments.map((p, i) => (
            <div key={p.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '7px 0', borderBottom: i < payments.length - 1 ? '1px solid #f3f4f6' : 'none' }}>
              <div>
                <div style={{ fontSize: 13, color: '#374151' }}>{p.payment_method}{p.note && ` · ${p.note}`}</div>
                <div style={{ fontSize: 11, color: '#9ca3af' }}>{new Date(p.created_at).toLocaleDateString('en-NZ')}</div>
              </div>
              <div style={{ fontWeight: 600, color: '#1a6b3c', fontSize: 14 }}>-{fmt(p.amount)}</div>
            </div>
          ))}
        </div>
      )}

      {sales.length > 0 && (
        <div style={{ background: '#fff', border: '1.5px solid #e5e7eb', borderRadius: 12, padding: 16 }}>
          <div style={{ fontWeight: 600, fontSize: 14, color: '#1a3a2a', marginBottom: 10 }}>Sale History</div>
          {sales.map((s, i) => (
            <div key={s.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '7px 0', borderBottom: i < sales.length - 1 ? '1px solid #f3f4f6' : 'none' }}>
              <div>
                <div style={{ fontSize: 13, color: '#374151' }}>{s.payment_method}</div>
                <div style={{ fontSize: 11, color: '#9ca3af' }}>{new Date(s.created_at).toLocaleDateString('en-NZ')}</div>
              </div>
              <div style={{ fontWeight: 600, color: '#374151', fontSize: 14 }}>{fmt(s.total_amount)}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  )

  return (
    <div style={{ padding: 16, paddingBottom: 80 }}>
      {toast && <div style={{ position: 'fixed', bottom: 80, left: '50%', transform: 'translateX(-50%)', background: '#1a6b3c', color: '#fff', padding: '10px 20px', borderRadius: 8, fontSize: 14, fontWeight: 500, zIndex: 999 }}>{toast.msg}</div>}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <div style={{ fontWeight: 700, fontSize: 20, color: '#1a3a2a' }}>Customers</div>
        <button onClick={() => setView('new')} style={{ background: '#1a6b3c', color: '#fff', border: 'none', borderRadius: 8, padding: '8px 14px', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>+ New</button>
      </div>
      <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by name or phone..."
        style={{ width: '100%', padding: '10px 12px', border: '1.5px solid #e5e7eb', borderRadius: 8, fontSize: 14, boxSizing: 'border-box', marginBottom: 16, outline: 'none' }} />
      {loading ? <div style={{ textAlign: 'center', color: '#9ca3af', padding: 20 }}>Loading...</div> :
        filtered.length === 0 ? <div style={{ textAlign: 'center', color: '#9ca3af', padding: 20 }}>No customers found</div> :
        filtered.map(c => (
          <div key={c.id} onClick={() => openDetail(c)}
            style={{ background: '#fff', border: '1.5px solid #e5e7eb', borderRadius: 10, padding: '12px 14px', marginBottom: 10, cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div style={{ fontWeight: 600, fontSize: 14, color: '#1a3a2a' }}>{c.name}</div>
              {c.phone && <div style={{ fontSize: 12, color: '#6b7280', marginTop: 2 }}>{c.phone}</div>}
            </div>
            <div style={{ textAlign: 'right' }}>
              {(c.outstanding_balance || 0) > 0
                ? <div style={{ fontWeight: 700, color: '#dc2626', fontSize: 14 }}>Owes {fmt(c.outstanding_balance)}</div>
                : <div style={{ color: '#1a6b3c', fontSize: 13 }}>✓ Clear</div>
              }
            </div>
          </div>
        ))
      }
    </div>
  )
}
