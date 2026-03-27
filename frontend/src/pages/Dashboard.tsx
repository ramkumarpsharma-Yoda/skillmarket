import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../api'
import { useAuth } from '../context/AuthContext'

export default function Dashboard() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [bookings, setBookings] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [msg, setMsg] = useState('')
  const [proposeForm, setProposeForm] = useState<{ id: string; date: string; hour: string } | null>(null)

  useEffect(() => {
    if (!user) { navigate('/login'); return }
    api.professionalBookings().then(setBookings).catch(() => {}).finally(() => setLoading(false))
  }, [user])

  const complete = async (id: string) => {
    try {
      await api.completeBooking(id)
      setBookings(prev => prev.map(b => b.id === id ? { ...b, status: 'completed' } : b))
      setMsg('Booking marked complete. Payment will be released.')
    } catch (err: any) { setMsg(err.message) }
  }

  const proCancel = async (id: string) => {
    const reason = prompt('Reason for cancellation (optional):')
    if (reason === null) return // user clicked Cancel on prompt
    try {
      await api.proCancelBooking(id, reason || 'Cancelled by professional')
      setBookings(prev => prev.map(b => b.id === id ? { ...b, status: 'cancelled_by_pro' } : b))
      setMsg('Booking cancelled. Full refund will be issued to client.')
    } catch (err: any) { setMsg(err.message) }
  }

  const propose = async () => {
    if (!proposeForm) return
    try {
      await api.proposeSlot(proposeForm.id, proposeForm.date, parseInt(proposeForm.hour))
      setBookings(prev => prev.map(b => b.id === proposeForm.id ? { ...b, status: 'proposed', proposed_date: proposeForm.date, proposed_hour: parseInt(proposeForm.hour) } : b))
      setMsg('New slot proposed to client.')
      setProposeForm(null)
    } catch (err: any) { setMsg(err.message) }
  }

  if (loading) return <p>Loading...</p>

  const confirmed = bookings.filter(b => b.status === 'confirmed')
  const proposed = bookings.filter(b => b.status === 'proposed')
  const completed = bookings.filter(b => b.status === 'completed')
  const cancelled = bookings.filter(b => b.status === 'cancelled' || b.status === 'cancelled_by_pro')
  const totalEarnings = completed.reduce((s, b) => s + b.total_amount, 0)

  return (
    <div className="dashboard">
      <h1 className="page-title">Professional Dashboard</h1>
      <div className="stats">
        <div className="card stat-card"><div className="stat-value">{confirmed.length}</div><div className="stat-label">Upcoming</div></div>
        <div className="card stat-card"><div className="stat-value">{proposed.length}</div><div className="stat-label">Proposed</div></div>
        <div className="card stat-card"><div className="stat-value">{completed.length}</div><div className="stat-label">Completed</div></div>
        <div className="card stat-card"><div className="stat-value">₹{totalEarnings}</div><div className="stat-label">Total Earnings</div></div>
      </div>
      {msg && <p className="success-msg" style={{ marginBottom: 16 }}>{msg}</p>}

      <h2 style={{ fontSize: 20, marginBottom: 16 }}>Upcoming Bookings</h2>
      {confirmed.length === 0 ? <p style={{ color: '#6b7280' }}>No upcoming bookings.</p> : (
        <div className="bookings-list">
          {confirmed.map(b => (
            <div key={b.id} className="card booking-card">
              <div className="booking-info">
                <h3>{b.client_name} <span style={{ fontSize: 13, color: '#6b7280' }}>({b.client_email})</span></h3>
                <p className="booking-meta">
                  📅 {b.booking_date} · ⏰ {b.start_hour}:00 ({b.duration_hours}hr) · {b.consultation_mode.replace(/_/g, ' ')} · ₹{b.total_amount}
                  {b.payment_mode === 'partial_onspot' && ` (₹${b.remaining_amount} on-spot)`}
                </p>
                {b.client_location_address && <p className="booking-meta">📍 Client: {b.client_location_address}</p>}
                <span className="status-badge status-confirmed">confirmed</span>
              </div>
              <div className="booking-actions">
                <button className="btn btn-primary btn-sm" onClick={() => complete(b.id)}>✓ Complete</button>
                <button className="btn btn-outline btn-sm" onClick={() => setProposeForm({ id: b.id, date: b.booking_date, hour: String(b.start_hour) })}>↔ Propose New Slot</button>
                <button className="btn btn-danger btn-sm" onClick={() => proCancel(b.id)}>✕ Cancel</button>
              </div>
            </div>
          ))}
        </div>
      )}

      {proposed.length > 0 && (
        <>
          <h2 style={{ fontSize: 20, margin: '24px 0 16px' }}>Awaiting Client Response</h2>
          <div className="bookings-list">
            {proposed.map(b => (
              <div key={b.id} className="card booking-card">
                <div className="booking-info">
                  <h3>{b.client_name}</h3>
                  <p className="booking-meta">
                    Original: {b.booking_date} {b.start_hour}:00 → Proposed: {b.proposed_date} {b.proposed_hour}:00
                  </p>
                  <span className="status-badge" style={{ background: '#fef3c7', color: '#92400e' }}>proposed</span>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {proposeForm && (
        <div className="card" style={{ marginTop: 24, padding: 24 }}>
          <h3 style={{ marginBottom: 12 }}>Propose New Slot</h3>
          <div className="form-row">
            <div className="form-group">
              <label htmlFor="prop-date">New Date</label>
              <input id="prop-date" type="date" value={proposeForm.date} onChange={e => setProposeForm(p => p ? { ...p, date: e.target.value } : p)} />
            </div>
            <div className="form-group">
              <label htmlFor="prop-hour">New Hour (0-23)</label>
              <input id="prop-hour" type="number" min={0} max={23} value={proposeForm.hour} onChange={e => setProposeForm(p => p ? { ...p, hour: e.target.value } : p)} />
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn btn-primary btn-sm" onClick={propose}>Send Proposal</button>
            <button className="btn btn-outline btn-sm" onClick={() => setProposeForm(null)}>Cancel</button>
          </div>
        </div>
      )}

      {completed.length > 0 && (
        <>
          <h2 style={{ fontSize: 20, margin: '24px 0 16px' }}>Completed ({completed.length})</h2>
          <div className="bookings-list">
            {completed.slice(0, 10).map(b => (
              <div key={b.id} className="card booking-card">
                <div className="booking-info">
                  <h3>{b.client_name}</h3>
                  <p className="booking-meta">{b.booking_date} · ₹{b.total_amount}</p>
                  <span className="status-badge status-completed">completed</span>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {cancelled.length > 0 && (
        <>
          <h2 style={{ fontSize: 20, margin: '24px 0 16px' }}>Cancelled ({cancelled.length})</h2>
          <div className="bookings-list">
            {cancelled.slice(0, 5).map(b => (
              <div key={b.id} className="card booking-card">
                <div className="booking-info">
                  <h3>{b.client_name}</h3>
                  <p className="booking-meta">{b.booking_date} · {b.cancel_reason || 'No reason'}</p>
                  <span className="status-badge status-cancelled">{b.status === 'cancelled_by_pro' ? 'cancelled by you' : 'cancelled'}</span>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  )
}
