import { useState, useEffect } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import { api } from '../api'

const MODE_LABELS: Record<string, string> = { video: '📹 Video', skilled_location: '📍 Their Location', client_location: '🏠 Your Location' }
const CATEGORIES = [
  { id: '', label: 'All Categories' },
  { id: 'teacher', label: 'Teacher / Tutor' }, { id: 'sports_coach', label: 'Sports Coach' },
  { id: 'lawyer', label: 'Lawyer' }, { id: 'ca', label: 'Chartered Accountant' },
  { id: 'doctor', label: 'Doctor / Consultant' }, { id: 'fitness', label: 'Fitness Trainer' },
  { id: 'music', label: 'Music Instructor' }, { id: 'counselor', label: 'Counselor / Therapist' },
  { id: 'tech', label: 'Tech Consultant' }, { id: 'other', label: 'Other' },
]

export default function Browse() {
  const [params, setParams] = useSearchParams()
  const navigate = useNavigate()
  const [profiles, setProfiles] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState(params.get('search') || '')
  const category = params.get('category') || ''

  useEffect(() => {
    setLoading(true)
    api.getProfiles(params.toString()).then(d => setProfiles(d.profiles)).catch(() => {}).finally(() => setLoading(false))
  }, [params.toString()])

  const updateFilter = (key: string, val: string) => {
    const p = new URLSearchParams(params)
    if (val) p.set(key, val); else p.delete(key)
    setParams(p)
  }

  return (
    <div className="browse-page">
      <h1 className="page-title">Browse Professionals</h1>
      <div className="filters">
        <select value={category} onChange={e => updateFilter('category', e.target.value)} aria-label="Category filter">
          {CATEGORIES.map(c => <option key={c.id} value={c.id}>{c.label}</option>)}
        </select>
        <select onChange={e => updateFilter('mode', e.target.value)} aria-label="Mode filter" defaultValue="">
          <option value="">All Modes</option>
          <option value="video">Video</option>
          <option value="skilled_location">Their Location</option>
          <option value="client_location">Your Location</option>
        </select>
        <input placeholder="Search by name or expertise..." value={search}
          onChange={e => setSearch(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && updateFilter('search', search)} />
        <button className="btn btn-outline btn-sm" onClick={() => updateFilter('search', search)}>Search</button>
      </div>
      {loading ? <p>Loading...</p> : profiles.length === 0 ? <p>No professionals found. Try different filters.</p> : (
        <div className="profiles-grid">
          {profiles.map((p: any) => (
            <div key={p.id} className="card profile-card" onClick={() => navigate(`/profile/${p.id}`)}>
              <div className="card-header">
                <h3>{p.professional_name}</h3>
                <span className="category-badge">{p.category}</span>
              </div>
              <p className="expertise">{p.expertise}</p>
              <div className="meta">
                <span>{p.years_experience} yrs exp</span>
                <span className="rating">{'★'.repeat(Math.round(p.avg_rating))}{'☆'.repeat(5 - Math.round(p.avg_rating))} ({p.review_count})</span>
              </div>
              <div className="modes">
                {JSON.parse(p.consultation_modes || '[]').map((m: string) => (
                  <span key={m} className="mode-tag">{MODE_LABELS[m] || m}</span>
                ))}
              </div>
              <p className="price">₹{p.base_charge}/hr</p>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
