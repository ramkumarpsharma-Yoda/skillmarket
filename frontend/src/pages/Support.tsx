import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../api'
import { useAuth } from '../context/AuthContext'

export default function Support() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [tickets, setTickets] = useState<any[]>([])
  const [form, setForm] = useState({ subject: '', description: '', booking_id: '' })
  const [msg, setMsg] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user) { navigate('/login'); return }
    api.myTickets().then(setTickets).catch(() => {}).finally(() => setLoading(false))
  }, [user])

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      await api.createTicket(form)
      setMsg('Ticket created successfully')
      setForm({ subject: '', description: '', booking_id: '' })
      api.myTickets().then(setTickets)
    } catch (err: any) { setMsg(err.message) }
  }

  return (
    <div className="support-page">
      <h1 className="page-title">Support</h1>
      <div className="card">
        <h3 style={{ marginBottom: 16 }}>Create a Support Ticket</h3>
        <form onSubmit={submit}>
          <div className="form-group">
            <label htmlFor="subject">Subject</label>
            <input id="subject" value={form.subject} onChange={e => setForm(p => ({...p, subject: e.target.value}))} required />
          </div>
          <div className="form-group">
            <label htmlFor="desc">Description</label>
            <textarea id="desc" rows={4} value={form.description} onChange={e => setForm(p => ({...p, description: e.target.value}))} required />
          </div>
          <div className="form-group">
            <label htmlFor="bid">Booking ID (optional)</label>
            <input id="bid" value={form.booking_id} onChange={e => setForm(p => ({...p, booking_id: e.target.value}))} placeholder="If related to a booking" />
          </div>
          {msg && <p className="success-msg">{msg}</p>}
          <button type="submit" className="btn btn-primary">Submit Ticket</button>
        </form>
      </div>
      {!loading && tickets.length > 0 && (
        <div className="card ticket-list" style={{ marginTop: 24 }}>
          <h3>Your Tickets</h3>
          {tickets.map((t: any) => (
            <div key={t.id} className="ticket-item">
              <h4>{t.subject}</h4>
              <p>{t.description}</p>
              <p className="ticket-meta">Status: {t.status} · Created: {t.created_at}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
