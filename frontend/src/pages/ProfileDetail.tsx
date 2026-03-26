import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { api } from '../api'
import { useAuth } from '../context/AuthContext'

const MODE_LABELS: Record<string, string> = { video: '📹 Video', skilled_location: '📍 Professional\'s Location', client_location: '🏠 Your Location' }

export default function ProfileDetail() {
  const { id } = useParams<{ id: string }>()
  const { user } = useAuth()
  const navigate = useNavigate()
  const [profile, setProfile] = useState<any>(null)
  const [slots, setSlots] = useState<any[]>([])
  const [selectedDate, setSelectedDate] = useState('')
  const [selectedHour, setSelectedHour] = useState<number | null>(null)
  const [duration, setDuration] = useState(1)
  const [mode, setMode] = useState('')
  const [clientAddress, setClientAddress] = useState('')
  const [paymentMode, setPaymentMode] = useState('full_online')
  const [isRecurring, setIsRecurring] = useState(false)
  const [recurringDays, setRecurringDays] = useState(1)
  const [booking, setBooking] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  useEffect(() => { if (id) api.getProfile(id).then(setProfile).catch(() => {}) }, [id])

  useEffect(() => {
    if (id && selectedDate) api.getSlots(id, selectedDate).then(d => setSlots(d.slots)).catch(() => setSlots([]))
  }, [id, selectedDate])

  if (!profile) return <p>Loading...</p>

  const modes: string[] = JSON.parse(profile.consultation_modes || '[]')
  const today = new Date().toISOString().split('T')[0]
  const maxDate = new Date(Date.now() + 15 * 86400000).toISOString().split('T')[0]
  const totalAmount = profile.base_charge * duration
  const bookingAmount = totalAmount * 0.2

  const handleBook = async () => {
    if (!user) { navigate('/login'); return }
    if (!selectedDate || selectedHour === null || !mode) { setError('Select date, time slot and mode'); return }
    setError(''); setBooking(true)
    try {
      const res = await api.createBooking({
        profile_id: id, booking_date: selectedDate, start_hour: selectedHour,
        duration_hours: duration, consultation_mode: mode,
        client_location_address: mode === 'client_location' ? clientAddress : undefined,
        payment_mode: paymentMode, is_recurring: isRecurring, recurring_days: isRecurring ? recurringDays : 0,
      })
      setSuccess(res.message)
      setSelectedHour(null)
    } catch (err: any) { setError(err.message) }
    finally { setBooking(false) }
  }

  return (
    <div className="profile-detail">
      <div className="info">
        <h1>{profile.professional_name}</h1>
        <p className="subtitle">{profile.expertise} · {profile.category} · {profile.years_experience} yrs experience</p>
        {profile.association && <div className="detail-section"><h3>Association</h3><p>{profile.association}</p></div>}
        {profile.bio && <div className="detail-section"><h3>About</h3><p>{profile.bio}</p></div>}
        {profile.qualifications && <div className="detail-section"><h3>Qualifications</h3><p>{profile.qualifications}</p></div>}
        <div className="detail-section">
          <h3>Consultation Modes</h3>
          <div className="modes">{modes.map(m => <span key={m} className="mode-tag">{MODE_LABELS[m] || m}</span>)}</div>
        </div>
        {modes.includes('skilled_location') && profile.skilled_location_address && (
          <div className="detail-section">
            <h3>Professional's Location</h3>
            <p>{profile.skilled_location_address}, {profile.skilled_location_city}, {profile.skilled_location_state} - {profile.skilled_location_pincode}</p>
          </div>
        )}
        <div className="detail-section">
          <h3>Availability</h3>
          <p>Min {profile.min_hours}hr · Max {profile.max_hours}hrs · Up to 15 days advance booking</p>
          {profile.availability?.length > 0 && (
            <div style={{ marginTop: 8 }}>
              {profile.availability.map((a: any, i: number) => (
                <p key={i} style={{ fontSize: 13, color: '#6b7280' }}>
                  {['Sun','Mon','Tue','Wed','Thu','Fri','Sat'][a.day_of_week]}: {a.start_hour}:00 - {a.end_hour}:00
                </p>
              ))}
            </div>
          )}
        </div>
        {profile.feedbacks?.length > 0 && (
          <div className="detail-section">
            <h3>Reviews ({profile.review_count})</h3>
            <p className="rating" style={{ marginBottom: 12 }}>{'★'.repeat(Math.round(profile.avg_rating))}{'☆'.repeat(5 - Math.round(profile.avg_rating))} {Number(profile.avg_rating).toFixed(1)}</p>
            {profile.feedbacks.map((f: any) => (
              <div key={f.id} className="review-item">
                <span className="reviewer">{f.reviewer_name}</span>
                <span className="rating" style={{ marginLeft: 8 }}>{'★'.repeat(f.rating)}</span>
                {f.comment && <p style={{ fontSize: 14, marginTop: 4 }}>{f.comment}</p>}
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="booking-panel">
        <div className="card">
          <p className="price-display">₹{profile.base_charge}</p>
          <p className="price-unit">per hour</p>

          <div className="form-group" style={{ marginTop: 16 }}>
            <label htmlFor="booking-date">Select Date</label>
            <input id="booking-date" type="date" min={today} max={maxDate} value={selectedDate} onChange={e => { setSelectedDate(e.target.value); setSelectedHour(null) }} />
          </div>

          {selectedDate && (
            <div className="form-group">
              <label>Available Slots</label>
              {slots.length === 0 ? <p style={{ fontSize: 13, color: '#6b7280' }}>No availability on this date</p> : (
                <div className="slots-grid">
                  {slots.map(s => (
                    <button key={s.hour} className={`slot-btn ${!s.available ? 'unavailable' : selectedHour === s.hour ? 'selected' : ''}`}
                      disabled={!s.available} onClick={() => setSelectedHour(s.hour)}>
                      {s.hour}:00
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          <div className="form-group">
            <label htmlFor="duration">Duration (hours)</label>
            <input id="duration" type="number" min={profile.min_hours} max={profile.max_hours} value={duration}
              onChange={e => setDuration(Number(e.target.value))} />
          </div>

          <div className="form-group">
            <label htmlFor="consult-mode">Consultation Mode</label>
            <select id="consult-mode" value={mode} onChange={e => setMode(e.target.value)}>
              <option value="">Select mode</option>
              {modes.map(m => <option key={m} value={m}>{MODE_LABELS[m] || m}</option>)}
            </select>
          </div>

          {mode === 'client_location' && (
            <div className="form-group">
              <label htmlFor="client-addr">Your Address</label>
              <textarea id="client-addr" rows={2} value={clientAddress} onChange={e => setClientAddress(e.target.value)} placeholder="Enter your address" />
            </div>
          )}

          <div className="form-group">
            <label htmlFor="pay-mode">Payment Option</label>
            <select id="pay-mode" value={paymentMode} onChange={e => setPaymentMode(e.target.value)}>
              <option value="full_online">Full Payment Online</option>
              <option value="partial_onspot">20% Online + Rest On-Spot</option>
            </select>
          </div>

          <div className="form-group">
            <label className="checkbox-label">
              <input type="checkbox" checked={isRecurring} onChange={e => setIsRecurring(e.target.checked)} />
              Recurring booking
            </label>
            {isRecurring && (
              <div style={{ marginTop: 8 }}>
                <label htmlFor="rec-days">Number of days</label>
                <input id="rec-days" type="number" min={1} max={15} value={recurringDays} onChange={e => setRecurringDays(Number(e.target.value))} />
              </div>
            )}
          </div>

          <div className="booking-summary">
            <div className="row"><span>Rate</span><span>₹{profile.base_charge}/hr × {duration}hr</span></div>
            <div className="row"><span>Total</span><span>₹{totalAmount}</span></div>
            <div className="row"><span>Booking Amount (20%)</span><span>₹{bookingAmount}</span></div>
            {paymentMode === 'partial_onspot' && <div className="row"><span>On-Spot</span><span>₹{totalAmount - bookingAmount}</span></div>}
            {isRecurring && <div className="row"><span>Days</span><span>{recurringDays}</span></div>}
            <div className="row total"><span>Pay Now</span><span>₹{paymentMode === 'full_online' ? totalAmount * (isRecurring ? recurringDays : 1) : bookingAmount * (isRecurring ? recurringDays : 1)}</span></div>
          </div>

          {error && <p className="error-msg">{error}</p>}
          {success && <p className="success-msg">{success}</p>}
          <button className="btn btn-primary" style={{ width: '100%' }} onClick={handleBook} disabled={booking}>
            {!user ? 'Login to Book' : booking ? 'Booking...' : 'Confirm Booking'}
          </button>
        </div>
      </div>
    </div>
  )
}
