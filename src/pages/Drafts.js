import { useState, useEffect } from 'react'

export default function Drafts({ onResume }) {
  const [drafts, setDrafts] = useState([])

  useEffect(() => {
    loadDrafts()
  }, [])

  const loadDrafts = () => {
    const stored = JSON.parse(localStorage.getItem('pos_drafts') || '[]')
    setDrafts(stored)
  }

  const deleteDraft = (id) => {
    if (!window.confirm('Delete this draft?')) return
    const updated = drafts.filter(d => d.id !== id)
    localStorage.setItem('pos_drafts', JSON.stringify(updated))
    setDrafts(updated)
  }

  const resumeDraft = (draft) => {
    localStorage.setItem('pos_current_draft', JSON.stringify(draft))
    onResume()
  }

  return (
    <div style={{ padding: '16px', paddingBottom: 80 }}>
      <div style={{ fontWeight: 700, fontSize: 20, color: '#1a3a2a', marginBottom: 16 }}>Saved Drafts</div>
      
      {drafts.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '40px 20px', color: '#6b7280', fontSize: 15 }}>
          No saved drafts
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {drafts.map(d => (
            <div key={d.id} style={{ background: '#fff', border: '1.5px solid #e5e7eb', borderRadius: 12, padding: 16 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                <div>
                  <div style={{ fontWeight: 600, fontSize: 15, color: '#1a3a2a' }}>
                    {d.selectedCustomer?.name || d.newName || 'Walk-in Customer'}
                  </div>
                  <div style={{ fontSize: 12, color: '#6b7280', marginTop: 2 }}>
                    {new Date(d.date).toLocaleString()}
                  </div>
                </div>
                <div style={{ fontWeight: 700, fontSize: 16, color: '#1a6b3c' }}>
                  NZ${(d.total || 0).toFixed(2)}
                </div>
              </div>
              
              <div style={{ fontSize: 13, color: '#374151', marginBottom: 12 }}>
                {d.cart?.map(i => `${i.qty}x ${i.name}`).join(', ')}
              </div>
              
              <div style={{ display: 'flex', gap: 8 }}>
                <button onClick={() => resumeDraft(d)} style={{ flex: 1, padding: '8px', background: '#e8f5ee', color: '#1a6b3c', border: '1.5px solid #1a6b3c', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
                  Resume Sale
                </button>
                <button onClick={() => deleteDraft(d.id)} style={{ padding: '8px 12px', background: '#fee2e2', color: '#dc2626', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
