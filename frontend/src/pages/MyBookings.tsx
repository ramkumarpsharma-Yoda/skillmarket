import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../api'
import { useAuth } from '../context/AuthContext'

export default function MyBookings() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [bookings, setBookings] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [feedbackForm, setFeedbackForm] = useState<{ id: string; rating: number; comment: string } | null>(null)
  const [msg, setMsg] = useState('')

  useEffect(() => {
    if (!user) { navigate('/login'); return }
    api.myBookings().then(setBookings).catch(() => {}).finally(() => setLoading(false))
  }, [user])

  const cancel = async (id: string) => {
    if (!confirm('Cancel this booking?')) return
    try {
      const res = await api.cancelBooking(id)
      setMsg(`Cancelled. Refund: ₹${res.refund_amount} (${res.refund_type})`)
      setBookings(prev => prev.map(b => b.id === id ? { ...b, status: 'cancelled' } : b))
    } catch (err: any) { setMsg(err.message) }
  }

  const submitFeedback = async () => {
    if (!feedbackForm) return
    try {
      await api.submitFeedback({ booking_id: feedbackForm.id, rating: feedbackForm.rating, comment: feedbackForm.comment })
      setMsg('Feedback submitted!')
      setFeedbackForm(null)
    } catch (err: any) { setMsg(err.message) }
  }

  if (loading) return <p>Loading...</p>

  return (
    <div>
      <h1 className="page-title">My Bookings</h1>
      {msg && <p className="success-msg" style={{ marginBottom: 16 }}>{msg}</p>}
      {bookings.length === 0 ? <p>No bookings yet. <a href="/browse">Browse professionals</a></p> : (
        <div className="bookings-list">
          {bookings.map(b => (
            <div key={b.id} className="card booking-card">
              <div className="booking-info">
                <h3>{b.professional_name} — {b.expertise}</h3>
                <p className="booking-meta">
                  {b.booking_date} · {b.start_hour}:00 ({b.duration_hours}hr) · {b.consultation_mode.replace('_', ' ')} · ₹{b.total_amount}
                  {b.payment_mode === 'partial_onspot' && ` (₹${b.remaining_amount} on-spot)`}
                </p>
                <span className={`status-badge status-${b.status}`}>{b.status}</span>
              </div>
              <div className="booking-actions">
                {b.status === 'confirmed' && (
                  <>
                    <button className="btn btn-outline btn-sm" onClick={() => {
                      const newDate = prompt('New date (YYYY-MM-DD):', b.booking_date)
                      const newHour = prompt('New hour (0-23):', b.start_hour)
                      if (newDate && newHour) {
                        api.modifyBooking(b.id, { booking_date: newDate, start_hour: Number(newHour) })
                          .then(() => { setMsg('Booking modified'); window.location.reload() })
                          .catch((err: any) => setMsg(err.message))
                      }
                    }}>Modify</button>
                    <button className="btn btn-danger btn-sm" onClick={() => cancel(b.id)}>Cancel</button>
                  </>
                )}
                {b.status === 'completed' && (
                  <button className="btn btn-outline btn-sm" onClick={() => setFeedbackForm({ id: b.id, rating: 5, comment: '' })}>
                    Leave Review
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
      {feedbackForm && (
        <div className="card feedback-form" style={{ marginTop: 24 }}>
          <h3>Leave a Review</h3>
          <div className="form-group">
            <label>Rating</label>
            <div className="stars">
              {[1,2,3,4,5].map(n => (
                <span key={n} className={n <= feedbackForm.rating ? 'active' : ''} onClick={() => setFeedbackForm(p => p ? {...p, rating: n} : p)}>★</span>
              ))}
            </div>
          </div>
          <div className="form-group">
            <label htmlFor="fb-comment">Comment (optional)</label>
            <textarea id="fb-comment" rows={3} value={feedbackForm.comment}
              onChange={e => setFeedbackForm(p => p ? {...p, comment: e.target.value} : p)} />
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn btn-primary btn-sm" onClick={submitFeedback}>Submit</button>
            <button className="btn btn-outline btn-sm" onClick={() => setFeedbackForm(null)}>Cancel</button>
          </div>
        </div>
      )}
    </div>
  )
}
