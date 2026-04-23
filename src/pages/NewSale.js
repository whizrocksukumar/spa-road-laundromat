import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'

const PAYMENT_METHODS = ['Cash', 'EFTPOS', 'Credit']

export default function NewSale({ onSaved }) {
  const { user } = useAuth()
  const [step, setStep] = useState('products') // products | payment
  const [products, setProducts] = useState([])
  const [categories, setCategories] = useState([])
  const [selectedCat, setSelectedCat] = useState('')
  const [cart, setCart] = useState([])
  const [paymentMethod, setPaymentMethod] = useState('Cash')
  const [custMode, setCustMode] = useState('walkin') // walkin | search | new
  const [custSearch, setCustSearch] = useState('')
  const [custResults, setCustResults] = useState([])
  const [selectedCustomer, setSelectedCustomer] = useState(null)
  const [searching, setSearching] = useState(false)
  const [newName, setNewName] = useState('')
  const [newPhone, setNewPhone] = useState('')
  const [notes, setNotes] = useState('')
  const [saving, setSaving] = useState(false)
  const [toast, setToast] = useState(null)

  useEffect(() => { fetchProducts() }, [])

  const fetchProducts = async () => {
    const { data } = await supabase.from('products').select('*').eq('active', true).order('category').order('sort_order')
    const prods = data || []
    setProducts(prods)
    const cats = [...new Set(prods.map(p => p.category))]
    setCategories(cats)
    if (cats.length > 0) setSelectedCat(cats[0])
  }

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 3000)
  }

  const addToCart = (product) => {
    setCart(prev => {
      const ex = prev.find(i => i.id === product.id)
      if (ex) return prev.map(i => i.id === product.id ? { ...i, qty: i.qty + 1 } : i)
      return [...prev, { ...product, qty: 1 }]
    })
  }

  const removeFromCart = (id) => setCart(prev => prev.filter(i => i.id !== id))
  const updateQty = (id, qty) => {
    if (qty < 1) return removeFromCart(id)
    setCart(prev => prev.map(i => i.id === id ? { ...i, qty } : i))
  }

  const total = cart.reduce((s, i) => s + i.price * i.qty, 0)

  const searchCustomers = useCallback(async (q) => {
    setCustSearch(q)
    if (!q || q.length < 2) { setCustResults([]); return }
    setSearching(true)
    const { data } = await supabase.from('customers').select('*')
      .or(`name.ilike.%${q}%,phone.ilike.%${q}%`).limit(8)
    setCustResults(data || [])
    setSearching(false)
  }, [])

  const selectCustomer = (c) => {
    setSelectedCustomer(c)
    setCustSearch(c.name)
    setCustResults([])
  }

  const clearCustomer = () => {
    setSelectedCustomer(null)
    setCustSearch('')
    setCustResults([])
  }

  const handleSubmit = async () => {
    if (cart.length === 0) return showToast('Add items first', 'error')
    if (paymentMethod === 'Credit' && !selectedCustomer) return showToast('Select a customer for credit', 'error')

    setSaving(true)

    let customerId = selectedCustomer?.id || null

    // Create new customer if needed
    if (custMode === 'new' && newName.trim()) {
      const { data: newCust } = await supabase.from('customers').insert({
        name: newName.trim(),
        phone: newPhone.trim() || null,
        created_by: user?.id
      }).select().single()
      if (newCust) customerId = newCust.id
    }

    const items = cart.map(i => ({ id: i.id, name: i.name, price: i.price, qty: i.qty }))

    const saleData = {
      staff_id: user?.id,
      staff_email: user?.email,
      payment_method: paymentMethod,
      customer_id: customerId,
      customer_type: custMode === 'walkin' ? 'walk-in' : 'account',
      customer_name: selectedCustomer?.name || (custMode === 'new' ? newName : null),
      items,
      total_amount: total,
      notes: notes || null
    }

    const { error } = await supabase.from('sales').insert(saleData)

    if (error) {
      showToast('Error saving sale: ' + error.message, 'error')
      setSaving(false)
      return
    }

    // Update customer balance for credit
    if (paymentMethod === 'Credit' && customerId) {
      await supabase.from('customers')
        .update({ outstanding_balance: (selectedCustomer?.outstanding_balance || 0) + total })
        .eq('id', customerId)
    }

    showToast('Sale recorded!')
    setTimeout(() => onSaved && onSaved(), 1200)
    setSaving(false)
  }

  // ─── STEP: PRODUCTS ───────────────────────────────────────
  if (step === 'products') return (
    <div style={{ padding: '16px', paddingBottom: 80 }}>
      <div style={{ fontWeight: 700, fontSize: 20, color: '#1a3a2a', marginBottom: 16 }}>New Sale</div>

      {/* Category tabs */}
      <div style={{ display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 4, marginBottom: 16 }}>
        {categories.map(c => (
          <button key={c} onClick={() => setSelectedCat(c)}
            style={{ padding: '6px 14px', borderRadius: 20, border: 'none', cursor: 'pointer', whiteSpace: 'nowrap', fontSize: 13, fontWeight: 600,
              background: selectedCat === c ? '#1a6b3c' : '#f3f4f6', color: selectedCat === c ? '#fff' : '#374151' }}>
            {c}
          </button>
        ))}
      </div>

      {/* Products grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 20 }}>
        {products.filter(p => p.category === selectedCat).map(p => {
          const inCart = cart.find(i => i.id === p.id)
          return (
            <button key={p.id} onClick={() => addToCart(p)}
              style={{ background: inCart ? '#e8f5ee' : '#fff', border: inCart ? '2px solid #1a6b3c' : '1.5px solid #e5e7eb',
                borderRadius: 10, padding: '12px 10px', cursor: 'pointer', textAlign: 'left', position: 'relative' }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: '#1a3a2a', marginBottom: 4 }}>{p.name}</div>
              <div style={{ fontSize: 14, fontWeight: 700, color: '#1a6b3c' }}>NZ${p.price.toFixed(2)}</div>
              {inCart && <div style={{ position: 'absolute', top: 8, right: 8, background: '#1a6b3c', color: '#fff', borderRadius: '50%', width: 20, height: 20, fontSize: 11, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{inCart.qty}</div>}
            </button>
          )
        })}
      </div>

      {/* Cart summary */}
      {cart.length > 0 && (
        <div style={{ background: '#fff', border: '1.5px solid #e5e7eb', borderRadius: 12, padding: 16, marginBottom: 16 }}>
          <div style={{ fontWeight: 600, fontSize: 14, color: '#1a3a2a', marginBottom: 10 }}>Cart</div>
          {cart.map(i => (
            <div key={i.id} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
              <div style={{ flex: 1, fontSize: 13, color: '#374151' }}>{i.name}</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <button onClick={() => updateQty(i.id, i.qty - 1)} style={{ width: 26, height: 26, borderRadius: '50%', border: '1.5px solid #e5e7eb', background: '#fff', cursor: 'pointer', fontWeight: 700 }}>−</button>
                <span style={{ fontSize: 13, fontWeight: 600, minWidth: 16, textAlign: 'center' }}>{i.qty}</span>
                <button onClick={() => updateQty(i.id, i.qty + 1)} style={{ width: 26, height: 26, borderRadius: '50%', border: '1.5px solid #e5e7eb', background: '#fff', cursor: 'pointer', fontWeight: 700 }}>+</button>
              </div>
              <div style={{ fontSize: 13, fontWeight: 600, color: '#1a6b3c', minWidth: 60, textAlign: 'right' }}>NZ${(i.price * i.qty).toFixed(2)}</div>
              <button onClick={() => removeFromCart(i.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#9ca3af', fontSize: 18 }}>×</button>
            </div>
          ))}
          <div style={{ borderTop: '1px solid #e5e7eb', paddingTop: 10, marginTop: 6, display: 'flex', justifyContent: 'space-between', fontWeight: 700, fontSize: 16 }}>
            <span>Total</span>
            <span style={{ color: '#1a6b3c' }}>NZ${total.toFixed(2)}</span>
          </div>
        </div>
      )}

      <button onClick={() => setStep('payment')} disabled={cart.length === 0}
        style={{ width: '100%', padding: '14px', background: cart.length === 0 ? '#e5e7eb' : '#1a6b3c', color: cart.length === 0 ? '#9ca3af' : '#fff',
          border: 'none', borderRadius: 10, fontSize: 15, fontWeight: 600, cursor: cart.length === 0 ? 'not-allowed' : 'pointer' }}>
        Continue to Payment →
      </button>
    </div>
  )

  // ─── STEP: PAYMENT ────────────────────────────────────────
  return (
    <div style={{ padding: '16px', paddingBottom: 80 }}>
      {toast && (
        <div style={{ position: 'fixed', bottom: 80, left: '50%', transform: 'translateX(-50%)', background: toast.type === 'error' ? '#dc2626' : '#1a6b3c',
          color: '#fff', padding: '10px 20px', borderRadius: 8, fontSize: 14, fontWeight: 500, zIndex: 999, whiteSpace: 'nowrap' }}>
          {toast.msg}
        </div>
      )}

      <button onClick={() => setStep('products')} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 13, color: '#1a6b3c', fontWeight: 600, padding: 0, marginBottom: 16 }}>
        ← Back
      </button>

      <div style={{ fontWeight: 700, fontSize: 20, color: '#1a3a2a', marginBottom: 16 }}>Customer & Payment</div>

      {/* Order summary */}
      <div style={{ background: '#f8faf8', border: '1px solid #e5e7eb', borderRadius: 10, padding: '12px 14px', marginBottom: 20 }}>
        {cart.map(i => (
          <div key={i.id} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, color: '#374151', marginBottom: 4 }}>
            <span>{i.name} ×{i.qty}</span>
            <span>NZ${(i.price * i.qty).toFixed(2)}</span>
          </div>
        ))}
        <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 700, fontSize: 16, borderTop: '1px solid #e5e7eb', paddingTop: 8, marginTop: 6 }}>
          <span>Total</span>
          <span style={{ color: '#1a6b3c' }}>NZ${total.toFixed(2)}</span>
        </div>
      </div>

      {/* Customer */}
      <div style={{ marginBottom: 20 }}>
        <div style={{ fontWeight: 600, fontSize: 14, color: '#1a3a2a', marginBottom: 10 }}>Customer</div>

        {/* Toggle buttons */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
          {['walkin', 'search', 'new'].map(mode => (
            <button key={mode} onClick={() => { setCustMode(mode); clearCustomer() }}
              style={{ flex: 1, padding: '8px 4px', borderRadius: 8, border: custMode === mode ? '2px solid #1a6b3c' : '1.5px solid #e5e7eb',
                background: custMode === mode ? '#e8f5ee' : '#fff', color: custMode === mode ? '#1a6b3c' : '#374151',
                fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
              {mode === 'walkin' ? 'Walk-in' : mode === 'search' ? 'Find Customer' : 'New Customer'}
            </button>
          ))}
        </div>

        {/* Find customer — search input always visible when in search mode */}
        {custMode === 'search' && (
          <div>
            {selectedCustomer ? (
              <div style={{ background: '#e8f5ee', border: '1.5px solid #1a6b3c', borderRadius: 10, padding: '12px 14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ fontWeight: 600, fontSize: 14, color: '#1a3a2a' }}>{selectedCustomer.name}</div>
                  <div style={{ fontSize: 12, color: '#374151', marginTop: 2 }}>
                    {selectedCustomer.phone && `${selectedCustomer.phone} · `}
                    Balance: NZ${(selectedCustomer.outstanding_balance || 0).toFixed(2)} / Limit: NZ${(selectedCustomer.credit_limit || 500).toFixed(2)}
                  </div>
                </div>
                <button onClick={clearCustomer} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 22, color: '#6b7280' }}>×</button>
              </div>
            ) : (
              <div>
                <input
                  value={custSearch}
                  onChange={e => searchCustomers(e.target.value)}
                  placeholder="Search by name or phone..."
                  autoFocus
                  style={{ width: '100%', padding: '10px 12px', border: '1.5px solid #1a6b3c', borderRadius: 8, fontSize: 14, boxSizing: 'border-box', outline: 'none' }}
                />
                {searching && <div style={{ fontSize: 12, color: '#9ca3af', marginTop: 6 }}>Searching...</div>}
                {custResults.length > 0 && (
                  <div style={{ border: '1.5px solid #e5e7eb', borderRadius: 8, marginTop: 4, overflow: 'hidden', boxShadow: '0 4px 12px rgba(0,0,0,0.08)' }}>
                    {custResults.map(c => (
                      <div key={c.id} onClick={() => selectCustomer(c)}
                        style={{ padding: '10px 14px', borderBottom: '1px solid #f3f4f6', cursor: 'pointer', background: '#fff' }}
                        onMouseEnter={e => e.target.style.background = '#f8faf8'}
                        onMouseLeave={e => e.target.style.background = '#fff'}>
                        <div style={{ fontSize: 14, fontWeight: 600, color: '#1a3a2a' }}>{c.name}</div>
                        <div style={{ fontSize: 12, color: '#6b7280' }}>
                          {c.phone && `${c.phone} · `}Balance: NZ${(c.outstanding_balance || 0).toFixed(2)}
                        </div>
                      </div>
                    ))}
                    <div onClick={() => { setCustMode('new'); clearCustomer() }}
                      style={{ padding: '10px 14px', cursor: 'pointer', background: '#f8faf8', color: '#1a6b3c', fontWeight: 600, fontSize: 13 }}>
                      + Add New Customer
                    </div>
                  </div>
                )}
                {custSearch.length >= 2 && !searching && custResults.length === 0 && (
                  <div style={{ marginTop: 8, padding: '10px 14px', background: '#f8faf8', borderRadius: 8, fontSize: 13, color: '#6b7280', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span>No customers found</span>
                    <button onClick={() => { setCustMode('new'); setNewName(custSearch); clearCustomer() }}
                      style={{ background: '#1a6b3c', color: '#fff', border: 'none', borderRadius: 6, padding: '4px 10px', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
                      + Add New
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* New customer form */}
        {custMode === 'new' && (
          <div style={{ background: '#f8faf8', border: '1.5px solid #e5e7eb', borderRadius: 10, padding: '14px' }}>
            <input value={newName} onChange={e => setNewName(e.target.value)} placeholder="Full name *"
              style={{ width: '100%', padding: '9px 12px', border: '1.5px solid #e5e7eb', borderRadius: 8, fontSize: 14, boxSizing: 'border-box', marginBottom: 8, outline: 'none' }} />
            <input value={newPhone} onChange={e => setNewPhone(e.target.value)} placeholder="Phone (optional)"
              style={{ width: '100%', padding: '9px 12px', border: '1.5px solid #e5e7eb', borderRadius: 8, fontSize: 14, boxSizing: 'border-box', outline: 'none' }} />
          </div>
        )}
      </div>

      {/* Payment method */}
      <div style={{ marginBottom: 20 }}>
        <div style={{ fontWeight: 600, fontSize: 14, color: '#1a3a2a', marginBottom: 10 }}>Payment Method</div>
        <div style={{ display: 'flex', gap: 8 }}>
          {PAYMENT_METHODS.map(m => {
            const isCredit = m === 'Credit'
            const needsCustomer = isCredit && !selectedCustomer && custMode !== 'new'
            return (
              <button key={m}
                onClick={() => { if (!needsCustomer) setPaymentMethod(m) }}
                style={{ flex: 1, padding: '10px 4px', borderRadius: 8, border: paymentMethod === m ? '2px solid #1a6b3c' : '1.5px solid #e5e7eb',
                  background: paymentMethod === m ? '#e8f5ee' : needsCustomer ? '#f9fafb' : '#fff',
                  color: paymentMethod === m ? '#1a6b3c' : needsCustomer ? '#9ca3af' : '#374151',
                  fontSize: 13, fontWeight: 600, cursor: needsCustomer ? 'not-allowed' : 'pointer' }}>
                {m}
                {isCredit && needsCustomer && <div style={{ fontSize: 10, fontWeight: 400, marginTop: 2 }}>Find customer first</div>}
              </button>
            )
          })}
        </div>
      </div>

      {/* Credit balance warning */}
      {paymentMethod === 'Credit' && selectedCustomer && (
        <div style={{ background: '#fef3c7', border: '1px solid #fbbf24', borderRadius: 8, padding: '10px 14px', marginBottom: 16, fontSize: 13 }}>
          New balance will be: <strong>NZ${((selectedCustomer.outstanding_balance || 0) + total).toFixed(2)}</strong>
          {((selectedCustomer.outstanding_balance || 0) + total) > (selectedCustomer.credit_limit || 500) &&
            <div style={{ color: '#dc2626', fontWeight: 600, marginTop: 4 }}>⚠ Exceeds credit limit of NZ${(selectedCustomer.credit_limit || 500).toFixed(2)}</div>
          }
        </div>
      )}

      {/* Notes */}
      <div style={{ marginBottom: 24 }}>
        <textarea value={notes} onChange={e => setNotes(e.target.value)} placeholder="Notes (optional)..."
          rows={2}
          style={{ width: '100%', padding: '10px 12px', border: '1.5px solid #e5e7eb', borderRadius: 8, fontSize: 14, boxSizing: 'border-box', resize: 'none', outline: 'none', fontFamily: 'inherit' }} />
      </div>

      <button onClick={handleSubmit} disabled={saving}
        style={{ width: '100%', padding: '14px', background: '#1a6b3c', color: '#fff', border: 'none', borderRadius: 10, fontSize: 15, fontWeight: 600, cursor: saving ? 'not-allowed' : 'pointer', opacity: saving ? 0.7 : 1 }}>
        {saving ? 'Recording...' : `Record Sale — NZ$${total.toFixed(2)}`}
      </button>
    </div>
  )
}
