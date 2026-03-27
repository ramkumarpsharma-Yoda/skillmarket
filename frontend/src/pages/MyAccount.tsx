import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../api'
import { useAuth } from '../context/AuthContext'

export default function MyAccount() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [profile, setProfile] = useState<any>(null)
  const [editing, setEditing] = useState(false)
  const [form, setForm] = useState({ name: '', phone: '', address: '', city: '', state: '', pincode: '' })
  const [msg, setMsg] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user) { navigate('/login'); return }
    api.me().then(data => {
      setProfile(data)
      setForm({
        name: data.name || '',
        phone: data.phone || '',
        address: data.address || '',
        city: data.city || '',
        state: data.state || '',
        pincode: data.pincode || '',
      })
    }).catch(() => {}).finally(() => setLoading(false))
  }, [user])

  const handleSave = async () => {
    setError(''); setMsg('')
    try {
      const updated = await api.updateMe(form)
      setProfile(updated)
      setEditing(false)
      setMsg('Profile updated successfully')
    } catch (err: any) { setError(err.message) }
  }

  if (loading) return <p>Loading...</p>
  if (!profile) return <p>Not logged in</p>

  return (
    <div style={{ maxWidth: 600, margin: '0 auto' }}>
      <h1 className="page-title">My Account</h1>

      {msg && <p className="success-msg" style={{ marginBottom: 16 }}>{msg}</p>}
      {error && <p className="error-msg" style={{ marginBottom: 16 }}>{error}</p>}

      <div className="card" style={{ padding: 28 }}>
        {!editing ? (
          <>
            <div style={{ marginBottom: 20 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
                <div style={{ width: 56, height: 56, borderRadius: '50%', background: 'var(--primary-light)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24, fontWeight: 700, color: 'var(--primary)' }}>
                  {profile.name?.charAt(0)?.toUpperCase()}
                </div>
                <div>
                  <h2 style={{ fontSize: 20, color: 'var(--gray-900)', margin: 0 }}>{profile.name}</h2>
                  <p style={{ fontSize: 13, color: 'var(--gray-500)', margin: 0 }}>{profile.role === 'professional' ? 'Professional' : 'Client'} · Joined {new Date(profile.created_at).toLocaleDateString()}</p>
                </div>
              </div>
            </div>

            <div style={{ display: 'grid', gap: 12 }}>
              <div><label style={{ fontSize: 12, color: 'var(--gray-500)', textTransform: 'uppercase' }}>Email</label><p style={{ margin: 0, color: 'var(--gray-900)' }}>{profile.email}</p></div>
              <div><label style={{ fontSize: 12, color: 'var(--gray-500)', textTransform: 'uppercase' }}>Phone</label><p style={{ margin: 0, color: profile.phone ? 'var(--gray-900)' : 'var(--gray-300)' }}>{profile.phone || 'Not added'}</p></div>
              <div><label style={{ fontSize: 12, color: 'var(--gray-500)', textTransform: 'uppercase' }}>Address</label><p style={{ margin: 0, color: profile.address ? 'var(--gray-900)' : 'var(--gray-300)' }}>{profile.address ? `${profile.address}, ${profile.city || ''} ${profile.state || ''} ${profile.pincode || ''}`.trim() : 'Not added'}</p></div>
            </div>

            <button className="btn btn-outline" style={{ marginTop: 20, width: '100%' }} onClick={() => setEditing(true)}>Edit Profile</button>
          </>
        ) : (
          <>
            <div className="form-group">
              <label htmlFor="acc-name">Full Name</label>
              <input id="acc-name" value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} />
            </div>
            <div className="form-group">
              <label htmlFor="acc-phone">Phone</label>
              <input id="acc-phone" value={form.phone} onChange={e => setForm(p => ({ ...p, phone: e.target.value }))} placeholder="Your phone number" />
            </div>
            <div className="form-group">
              <label htmlFor="acc-address">Address</label>
              <input id="acc-address" value={form.address} onChange={e => setForm(p => ({ ...p, address: e.target.value }))} placeholder="Street address" />
            </div>
            <div className="form-row">
              <div className="form-group">
                <label htmlFor="acc-city">City</label>
                <input id="acc-city" value={form.city} onChange={e => setForm(p => ({ ...p, city: e.target.value }))} />
              </div>
              <div className="form-group">
                <label htmlFor="acc-state">State</label>
                <input id="acc-state" value={form.state} onChange={e => setForm(p => ({ ...p, state: e.target.value }))} />
              </div>
            </div>
            <div className="form-group">
              <label htmlFor="acc-pin">Pincode</label>
              <input id="acc-pin" value={form.pincode} onChange={e => setForm(p => ({ ...p, pincode: e.target.value }))} />
            </div>
            <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
              <button className="btn btn-primary" onClick={handleSave}>Save Changes</button>
              <button className="btn btn-outline" onClick={() => setEditing(false)}>Cancel</button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
