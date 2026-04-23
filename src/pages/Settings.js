import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

export default function Settings() {
  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(null)
  const [toast, setToast] = useState(null)
  const [activeTab, setActiveTab] = useState(null)
  const [editingCats, setEditingCats] = useState(new Set())
  const [showAddForm, setShowAddForm] = useState(false)
  const [newProduct, setNewProduct] = useState({ name: '', price: '', category: '' })

  useEffect(() => { fetchProducts() }, [])

  const showToast = (msg) => { setToast(msg); setTimeout(() => setToast(null), 3000) }

  const fetchProducts = async () => {
    setLoading(true)
    const { data } = await supabase.from('products').select('*').order('category').order('sort_order')
    setProducts(data || [])
    setLoading(false)
  }

  const categories = [...new Set(products.map(p => p.category))]

  useEffect(() => {
    if (categories.length > 0 && activeTab === null) setActiveTab(categories[0])
  }, [products])

  const updateProduct = (id, field, value) => {
    setProducts(prev => prev.map(p => p.id === id ? { ...p, [field]: value } : p))
  }

  const saveCategory = async (cat) => {
    setSaving(cat)
    for (const p of products.filter(q => q.category === cat)) {
      await supabase.from('products').update({ name: p.name, price: p.price, active: p.active }).eq('id', p.id)
    }
    setEditingCats(prev => { const s = new Set(prev); s.delete(cat); return s })
    showToast('Saved!')
    setSaving(null)
  }

  const cancelEdit = async (cat) => {
    setEditingCats(prev => { const s = new Set(prev); s.delete(cat); return s })
    await fetchProducts()
  }

  const addProduct = async () => {
    if (!newProduct.name.trim() || !newProduct.price || !newProduct.category.trim()) return
    const { error } = await supabase.from('products').insert({
      name: newProduct.name.trim(),
      price: parseFloat(newProduct.price),
      category: newProduct.category.trim(),
      active: true,
      sort_order: 999
    })
    if (!error) {
      const cat = newProduct.category.trim()
      setNewProduct({ name: '', price: '', category: '' })
      setShowAddForm(false)
      await fetchProducts()
      setActiveTab(cat)
      showToast('Product added!')
    }
  }

  if (loading) return <div style={{ textAlign: 'center', color: '#9ca3af', padding: 40 }}>Loading...</div>

  const tabProducts = products.filter(p => p.category === activeTab)
  const isEditing = editingCats.has(activeTab)

  return (
    <div style={{ padding: 16, paddingBottom: 100 }}>
      {toast && (
        <div style={{ position: 'fixed', bottom: 80, left: '50%', transform: 'translateX(-50%)', background: '#1a6b3c', color: '#fff', padding: '10px 20px', borderRadius: 8, fontSize: 14, fontWeight: 500, zIndex: 999 }}>
          {toast}
        </div>
      )}

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <div style={{ fontWeight: 700, fontSize: 20, color: '#1a3a2a' }}>Settings</div>
        <button onClick={() => setShowAddForm(v => !v)}
          style={{ background: '#1a6b3c', color: '#fff', border: 'none', borderRadius: 8, padding: '8px 14px', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
          + Add Product
        </button>
      </div>

      {/* Add Product Form */}
      {showAddForm && (
        <div style={{ background: '#f9fafb', border: '1.5px solid #e5e7eb', borderRadius: 10, padding: 16, marginBottom: 16 }}>
          <div style={{ fontWeight: 600, fontSize: 14, color: '#1a3a2a', marginBottom: 10 }}>New Product</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <input placeholder="Product name" value={newProduct.name}
              onChange={e => setNewProduct(p => ({ ...p, name: e.target.value }))}
              style={{ padding: '8px 10px', border: '1.5px solid #e5e7eb', borderRadius: 7, fontSize: 13, outline: 'none' }} />
            <input placeholder="Price" type="number" step="0.5" value={newProduct.price}
              onChange={e => setNewProduct(p => ({ ...p, price: e.target.value }))}
              style={{ padding: '8px 10px', border: '1.5px solid #e5e7eb', borderRadius: 7, fontSize: 13, outline: 'none' }} />
            <input list="cat-options" placeholder="Category (select or type new)" value={newProduct.category}
              onChange={e => setNewProduct(p => ({ ...p, category: e.target.value }))}
              style={{ padding: '8px 10px', border: '1.5px solid #e5e7eb', borderRadius: 7, fontSize: 13, outline: 'none' }} />
            <datalist id="cat-options">
              {categories.map(c => <option key={c} value={c} />)}
            </datalist>
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={addProduct}
                style={{ flex: 1, background: '#1a6b3c', color: '#fff', border: 'none', borderRadius: 7, padding: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
                Add
              </button>
              <button onClick={() => { setShowAddForm(false); setNewProduct({ name: '', price: '', category: '' }) }}
                style={{ flex: 1, background: '#f3f4f6', color: '#6b7280', border: 'none', borderRadius: 7, padding: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Category Tabs */}
      <div style={{ display: 'flex', gap: 6, overflowX: 'auto', marginBottom: 16, paddingBottom: 2 }}>
        {categories.map(cat => (
          <button key={cat} onClick={() => setActiveTab(cat)}
            style={{ padding: '7px 14px', borderRadius: 20, border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 600, whiteSpace: 'nowrap',
              background: activeTab === cat ? '#1a6b3c' : '#f3f4f6',
              color: activeTab === cat ? '#fff' : '#6b7280' }}>
            {cat}
          </button>
        ))}
      </div>

      {/* Active Category Products */}
      {activeTab && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8, paddingBottom: 6, borderBottom: '2px solid #e5e7eb' }}>
            <div style={{ fontWeight: 700, fontSize: 14, color: '#1a3a2a' }}>{activeTab}</div>
            <div style={{ display: 'flex', gap: 6 }}>
              {isEditing ? (
                <>
                  <button onClick={() => saveCategory(activeTab)} disabled={saving === activeTab}
                    style={{ background: '#1a6b3c', color: '#fff', border: 'none', borderRadius: 7, padding: '5px 12px', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
                    {saving === activeTab ? 'Saving...' : 'Save'}
                  </button>
                  <button onClick={() => cancelEdit(activeTab)}
                    style={{ background: '#f3f4f6', color: '#6b7280', border: 'none', borderRadius: 7, padding: '5px 12px', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
                    Cancel
                  </button>
                </>
              ) : (
                <button onClick={() => setEditingCats(prev => new Set([...prev, activeTab]))}
                  style={{ background: '#f3f4f6', color: '#1a3a2a', border: 'none', borderRadius: 7, padding: '5px 12px', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
                  Edit
                </button>
              )}
            </div>
          </div>

          {tabProducts.map(p => (
            <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
              {isEditing ? (
                <>
                  <input value={p.name} onChange={e => updateProduct(p.id, 'name', e.target.value)}
                    style={{ flex: 1, padding: '7px 10px', border: '1.5px solid #e5e7eb', borderRadius: 7, fontSize: 13, outline: 'none' }} />
                  <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                    <span style={{ fontSize: 13, color: '#6b7280' }}>$</span>
                    <input value={p.price} onChange={e => updateProduct(p.id, 'price', e.target.value)} type="number" step="0.5"
                      style={{ width: 70, padding: '7px 8px', border: '1.5px solid #e5e7eb', borderRadius: 7, fontSize: 13, outline: 'none' }} />
                  </div>
                  <button onClick={() => updateProduct(p.id, 'active', !p.active)}
                    style={{ padding: '6px 10px', borderRadius: 7, border: 'none', cursor: 'pointer', fontSize: 11, fontWeight: 600,
                      background: p.active ? '#e8f5ee' : '#f3f4f6', color: p.active ? '#1a6b3c' : '#9ca3af' }}>
                    {p.active ? 'On' : 'Off'}
                  </button>
                </>
              ) : (
                <>
                  <div style={{ flex: 1, padding: '7px 2px', fontSize: 13, color: '#1a3a2a' }}>{p.name}</div>
                  <div style={{ fontSize: 13, color: '#6b7280' }}>${Number(p.price).toFixed(2)}</div>
                  <div style={{ padding: '6px 10px', borderRadius: 7, fontSize: 11, fontWeight: 600,
                    background: p.active ? '#e8f5ee' : '#f3f4f6', color: p.active ? '#1a6b3c' : '#9ca3af' }}>
                    {p.active ? 'On' : 'Off'}
                  </div>
                </>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
