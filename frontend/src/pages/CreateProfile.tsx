import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../api'
import { useAuth } from '../context/AuthContext'

const CATEGORIES = [
  { id: 'teacher', label: 'Teacher / Tutor' }, { id: 'sports_coach', label: 'Sports Coach' },
  { id: 'lawyer', label: 'Lawyer' }, { id: 'ca', label: 'Chartered Accountant' },
  { id: 'doctor', label: 'Doctor / Consultant' }, { id: 'fitness', label: 'Fitness Trainer' },
  { id: 'music', label: 'Music Instructor' }, { id: 'counselor', label: 'Counselor / Therapist' },
  { id: 'tech', label: 'Tech Consultant' }, { id: 'other', label: 'Other' },
]
const DAYS = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday']

export default function CreateProfile() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [form, setForm] = useState({
    category: 'teacher', expertise: '', years_experience: '0', qualifications: '', association: '', bio: '',
    base_charge: '', min_hours: '1', max_hours: '8',
    skilled_location_address: '', skilled_location_city: '', skilled_location_state: '', skilled_location_pincode: '',
  })
  const [modes, setModes] = useState<string[]>(['video'])
  const [aadhaar, setAadhaar] = useState<File | null>(null)
  const [qualDocs, setQualDocs] = useState<FileList | null>(null)
  const [availability, setAvailability] = useState<{ day_of_week: number; start_hour: number; end_hour: number }[]>([
    { day_of_week: 1, start_hour: 9, end_hour: 17 },
  ])
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  if (!user) { navigate('/login'); return null }

  const set = (k: string, v: string) => setForm(p => ({ ...p, [k]: v }))
  const toggleMode = (m: string) => setModes(prev => prev.includes(m) ? prev.filter(x => x !== m) : [...prev, m])
  const needsLocation = modes.includes('skilled_location')

  const addAvail = () => setAvailability(p => [...p, { day_of_week: 1, start_hour: 9, end_hour: 17 }])
  const removeAvail = (i: number) => setAvailability(p => p.filter((_, idx) => idx !== i))
  const updateAvail = (i: number, k: string, v: number) => setAvailability(p => p.map((a, idx) => idx === i ? { ...a, [k]: v } : a))

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!aadhaar) { setError('Aadhaar document is mandatory'); return }
    if (modes.length === 0) { setError('Select at least one consultation mode'); return }
    setError(''); setSubmitting(true)
    try {
      const fd = new FormData()
      Object.entries(form).forEach(([k, v]) => fd.append(k, v))
      fd.append('consultation_modes', JSON.stringify(modes))
      fd.append('aadhaar_doc', aadhaar)
      if (qualDocs) Array.from(qualDocs).forEach(f => fd.append('qualification_docs', f))
      fd.append('availability', JSON.stringify(availability))
      await api.createProfile(fd)
      navigate('/dashboard')
    } catch (err: any) { setError(err.message) }
    finally { setSubmitting(false) }
  }

  return (
    <div className="create-profile">
      <h1 className="page-title">List Yourself as a Professional</h1>
      <div className="card">
        <form onSubmit={handleSubmit}>
          <div className="form-row">
            <div className="form-group">
              <label htmlFor="category">Category</label>
              <select id="category" value={form.category} onChange={e => set('category', e.target.value)}>
                {CATEGORIES.map(c => <option key={c.id} value={c.id}>{c.label}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label htmlFor="years_exp">Years of Experience</label>
              <input id="years_exp" type="number" min="0" value={form.years_experience} onChange={e => set('years_experience', e.target.value)} />
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="expertise">Expertise / Specialization</label>
            <input id="expertise" value={form.expertise} onChange={e => set('expertise', e.target.value)} required placeholder="e.g. Mathematics, Criminal Law, Tax Filing" />
          </div>

          <div className="form-group">
            <label htmlFor="qualifications">Qualifications</label>
            <input id="qualifications" value={form.qualifications} onChange={e => set('qualifications', e.target.value)} placeholder="e.g. B.Ed, LLB, CA" />
          </div>

          <div className="form-group">
            <label htmlFor="association">Association / Organization</label>
            <input id="association" value={form.association} onChange={e => set('association', e.target.value)} placeholder="e.g. Bar Council, ICAI" />
          </div>

          <div className="form-group">
            <label htmlFor="bio">About You</label>
            <textarea id="bio" rows={3} value={form.bio} onChange={e => set('bio', e.target.value)} placeholder="Brief description about yourself" />
          </div>

          <h3 style={{ margin: '20px 0 12px', fontSize: 16 }}>Consultation Modes</h3>
          <div className="checkbox-group" style={{ marginBottom: 16 }}>
            {[{ id: 'video', label: '📹 Video Call' }, { id: 'skilled_location', label: '📍 Your Location' }, { id: 'client_location', label: '🏠 Client\'s Location' }].map(m => (
              <label key={m.id} className="checkbox-label">
                <input type="checkbox" checked={modes.includes(m.id)} onChange={() => toggleMode(m.id)} />
                {m.label}
              </label>
            ))}
          </div>

          {needsLocation && (
            <>
              <h3 style={{ margin: '12px 0 8px', fontSize: 14 }}>Your Location (shown to clients)</h3>
              <div className="form-row">
                <div className="form-group"><label htmlFor="addr">Address</label><input id="addr" value={form.skilled_location_address} onChange={e => set('skilled_location_address', e.target.value)} required /></div>
                <div className="form-group"><label htmlFor="city">City</label><input id="city" value={form.skilled_location_city} onChange={e => set('skilled_location_city', e.target.value)} /></div>
              </div>
              <div className="form-row">
                <div className="form-group"><label htmlFor="state">State</label><input id="state" value={form.skilled_location_state} onChange={e => set('skilled_location_state', e.target.value)} /></div>
                <div className="form-group"><label htmlFor="pin">Pincode</label><input id="pin" value={form.skilled_location_pincode} onChange={e => set('skilled_location_pincode', e.target.value)} /></div>
              </div>
            </>
          )}

          <h3 style={{ margin: '20px 0 12px', fontSize: 16 }}>Charges & Hours</h3>
          <div className="form-row">
            <div className="form-group"><label htmlFor="charge">Base Charge (₹/hr)</label><input id="charge" type="number" min="0" value={form.base_charge} onChange={e => set('base_charge', e.target.value)} required /></div>
            <div className="form-group">
              <label htmlFor="min_hrs">Min Hours</label><input id="min_hrs" type="number" min="1" value={form.min_hours} onChange={e => set('min_hours', e.target.value)} />
            </div>
          </div>
          <div className="form-group"><label htmlFor="max_hrs">Max Hours per Session</label><input id="max_hrs" type="number" min="1" value={form.max_hours} onChange={e => set('max_hours', e.target.value)} /></div>

          <h3 style={{ margin: '20px 0 12px', fontSize: 16 }}>Weekly Availability</h3>
          {availability.map((a, i) => (
            <div key={i} className="form-row" style={{ alignItems: 'end', marginBottom: 8 }}>
              <div className="form-group">
                <label>Day</label>
                <select value={a.day_of_week} onChange={e => updateAvail(i, 'day_of_week', Number(e.target.value))}>
                  {DAYS.map((d, di) => <option key={di} value={di}>{d}</option>)}
                </select>
              </div>
              <div className="form-group"><label>From</label><input type="number" min={0} max={23} value={a.start_hour} onChange={e => updateAvail(i, 'start_hour', Number(e.target.value))} /></div>
              <div className="form-group"><label>To</label><input type="number" min={1} max={24} value={a.end_hour} onChange={e => updateAvail(i, 'end_hour', Number(e.target.value))} /></div>
              <button type="button" className="btn btn-danger btn-sm" onClick={() => removeAvail(i)} style={{ marginBottom: 16 }}>✕</button>
            </div>
          ))}
          <button type="button" className="btn btn-outline btn-sm" onClick={addAvail} style={{ marginBottom: 16 }}>+ Add Slot</button>

          <h3 style={{ margin: '20px 0 12px', fontSize: 16 }}>Documents</h3>
          <div className="form-group">
            <label htmlFor="aadhaar">Aadhaar Document (mandatory)</label>
            <input id="aadhaar" type="file" accept="image/*,.pdf" onChange={e => setAadhaar(e.target.files?.[0] || null)} required />
          </div>
          <div className="form-group">
            <label htmlFor="qual_docs">Qualification Documents (optional)</label>
            <input id="qual_docs" type="file" accept="image/*,.pdf" multiple onChange={e => setQualDocs(e.target.files)} />
          </div>

          {error && <p className="error-msg">{error}</p>}
          <button type="submit" className="btn btn-primary" style={{ width: '100%', marginTop: 12 }} disabled={submitting}>
            {submitting ? 'Submitting...' : 'Create Profile'}
          </button>
        </form>
      </div>
    </div>
  )
}
