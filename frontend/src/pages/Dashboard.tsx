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

  if (loading) return <p>Loading...</p>

  const confirmed = bookings.filter(b => b.status === 'confirmed')
  const completed = bookings.filter(b => b.status === 'completed')
  const cancelled = bookings.filter(b => b.status === 'cancelled')
  const totalEarnings = completed.reduce((s, b) => s + b.total_amount, 0)

  return (
    <div className="dashboard">
      <h1 className="page-title">Professional Dashboard</h1>
      <div className="stats">
        <div className="card stat-card"><div className="stat-value">{confirmed.length}</div><div className="stat-label">Upcoming</div></div>
        <div className="card stat-card"><div className="stat-value">{completed.length}</div><div className="stat-label">Completed</div></div>
        <div className="card stat-card"><div className="stat-value">₹{totalEarnings}</div><div className="stat-label">Total Earnings</div></div>
        <div className="card stat-card"><div className="stat-value">{cancelled.length}</div><div className="stat-label">Cancelled</div></div>
      </div>
      {msg && <p className="success-msg" style={{ marginBottom: 16 }}>{msg}</p>}
      <h2 style={{ fontSize: 20, marginBottom: 16 }}>Upcoming Bookings</h2>
      {confirmed.length === 0 ? <p>No upcoming bookings.</p> : (
        <div className="bookings-list">
          {confirmed.map(b => (
            <div key={b.id} className="card booking-card">
              <div className="booking-info">
                <h3>{b.client_name}</h3>
                <p className="booking-meta">{b.booking_date} · {b.start_hour}:00 ({b.duration_hours}hr) · {b.consultation_mode.replace('_',' ')} · ₹{b.total_amount}</p>
                {b.client_location_address && <p className="booking-meta">Client location: {b.client_location_address}</p>}
              </div>
              <button className="btn btn-primary btn-sm" onClick={() => complete(b.id)}>Mark Complete</button>
            </div>
          ))}
        </div>
      )}
      {completed.length > 0 && (
        <>
          <h2 style={{ fontSize: 20, margin: '24px 0 16px' }}>Completed</h2>
          <div className="bookings-list">
            {completed.map(b => (
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
    </div>
  )
}
