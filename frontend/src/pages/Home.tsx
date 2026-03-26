import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const categories = [
  { id: 'teacher', label: 'Teacher / Tutor', icon: '📚' },
  { id: 'sports_coach', label: 'Sports Coach', icon: '🏅' },
  { id: 'lawyer', label: 'Lawyer', icon: '⚖️' },
  { id: 'ca', label: 'Chartered Accountant', icon: '📊' },
  { id: 'doctor', label: 'Doctor / Consultant', icon: '🏥' },
  { id: 'fitness', label: 'Fitness Trainer', icon: '💪' },
  { id: 'music', label: 'Music Instructor', icon: '🎵' },
  { id: 'counselor', label: 'Counselor / Therapist', icon: '🧠' },
  { id: 'tech', label: 'Tech Consultant', icon: '💻' },
];

export default function Home() {
  const { user } = useAuth();
  return (
    <div className="home">
      <section className="hero">
        <h1>Find Skilled Professionals Near You</h1>
        <p>Book teachers, coaches, lawyers, CAs and more — via video or in-person</p>
        <div className="hero-actions">
          <Link to="/browse" className="btn btn-primary btn-lg">Browse Professionals</Link>
          {!user && <Link to="/signup" className="btn btn-outline btn-lg">List Yourself</Link>}
        </div>
      </section>
      <section className="categories-grid">
        <h2>Popular Categories</h2>
        <div className="grid">
          {categories.map(c => (
            <Link to={`/browse?category=${c.id}`} key={c.id} className="category-card">
              <span className="category-icon">{c.icon}</span>
              <span>{c.label}</span>
            </Link>
          ))}
        </div>
      </section>
      <section className="how-it-works">
        <h2>How It Works</h2>
        <div className="steps">
          <div className="step"><span className="step-num">1</span><h3>Browse</h3><p>Find professionals by category, location or mode</p></div>
          <div className="step"><span className="step-num">2</span><h3>Book</h3><p>Pick a date, time slot and pay 20% booking amount</p></div>
          <div className="step"><span className="step-num">3</span><h3>Connect</h3><p>Meet via video, at their location, or yours</p></div>
        </div>
      </section>
    </div>
  );
}
