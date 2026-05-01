import { useState } from 'react'
import { AuthProvider, useAuth } from './context/AuthContext'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import NewSale from './pages/NewSale'
import Customers from './pages/Customers'
import Reports from './pages/Reports'
import Settings from './pages/Settings'
import Drafts from './pages/Drafts'
import './App.css'

const NAV = [
  { id: 'home', label: 'Home', icon: '⊞' },
  { id: 'sale', label: 'New Sale', icon: '+' },
  { id: 'drafts', label: 'Drafts', icon: '📝' },
  { id: 'customers', label: 'Customers', icon: '👥' },
  { id: 'reports', label: 'Reports', icon: '📊' },
  { id: 'settings', label: 'Settings', icon: '⚙' },
]

function AppInner() {
  const { user, loading, signOut } = useAuth()
  const [tab, setTab] = useState('home')

  if (loading) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f4f6f4' }}>
      <div style={{ textAlign: 'center', color: '#6b7280' }}>
        <img src="/spard_logo.png" alt="logo" style={{ width: 72, height: 72, borderRadius: '50%', marginBottom: 12 }} onError={e => e.target.style.display = 'none'} />
        <div style={{ fontSize: 14 }}>Loading...</div>
      </div>
    </div>
  )

  if (!user) return <Login />

  return (
    <div style={{ maxWidth: 480, margin: '0 auto', minHeight: '100vh', background: '#f4f6f4', position: 'relative' }}>
      {/* Top bar */}
      <div style={{ background: '#1a6b3c', color: '#fff', padding: '12px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', position: 'sticky', top: 0, zIndex: 100 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <img src="/spard_logo.png" alt="logo" style={{ width: 36, height: 36, borderRadius: '50%', objectFit: 'cover' }} onError={e => e.target.style.display = 'none'} />
          <div>
            <div style={{ fontWeight: 700, fontSize: 15 }}>Spa Road Laundromat</div>
            <div style={{ fontSize: 11, opacity: 0.8 }}>Taupo, NZ</div>
          </div>
        </div>
        <button onClick={signOut} style={{ background: 'rgba(255,255,255,0.15)', border: 'none', color: '#fff', borderRadius: 6, padding: '5px 12px', fontSize: 12, cursor: 'pointer' }}>
          Sign out
        </button>
      </div>

      {/* Page content */}
      <div style={{ paddingBottom: 70 }}>
        {tab === 'home' && <Dashboard />}
        {tab === 'sale' && <NewSale onSaved={() => setTab('home')} />}
        {tab === 'drafts' && <Drafts onResume={() => setTab('sale')} />}
        {tab === 'customers' && <Customers />}
        {tab === 'reports' && <Reports />}
        {tab === 'settings' && <Settings />}
      </div>

      {/* Bottom nav */}
      <nav style={{ position: 'fixed', bottom: 0, left: '50%', transform: 'translateX(-50%)', width: '100%', maxWidth: 480, background: '#fff', borderTop: '1px solid #e5e7eb', display: 'flex', zIndex: 100 }}>
        {NAV.map(n => (
          <button key={n.id} onClick={() => setTab(n.id)}
            style={{ flex: 1, padding: '10px 4px 8px', border: 'none', background: 'none', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3 }}>
            <span style={{ fontSize: n.id === 'sale' ? 22 : 18, lineHeight: 1 }}>{n.icon}</span>
            <span style={{ fontSize: 10, fontWeight: 600, color: tab === n.id ? '#1a6b3c' : '#9ca3af' }}>{n.label}</span>
            {tab === n.id && <div style={{ width: 20, height: 2, background: '#1a6b3c', borderRadius: 2 }} />}
          </button>
        ))}
      </nav>
    </div>
  )
}

export default function App() {
  return <AuthProvider><AppInner /></AuthProvider>
}
