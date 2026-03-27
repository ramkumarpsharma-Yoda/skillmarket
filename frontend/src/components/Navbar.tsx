import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Navbar() {
  const { user, logout } = useAuth();
  return (
    <nav className="navbar">
      <Link to="/" className="nav-brand">🎯 Proficio</Link>
      <div className="nav-links">
        <Link to="/browse">Browse</Link>
        {user ? (
          <>
            {user.role === 'professional' ? (
              <Link to="/dashboard">Dashboard</Link>
            ) : (
              <Link to="/create-profile">List Yourself</Link>
            )}
            <Link to="/my-bookings">My Bookings</Link>
            <Link to="/support">Support</Link>
            <Link to="/my-account" className="nav-user">{user.name}</Link>
            <button onClick={logout} className="btn btn-sm">Logout</button>
          </>
        ) : (
          <>
            <Link to="/login">Login</Link>
            <Link to="/signup" className="btn btn-primary btn-sm">Sign Up</Link>
          </>
        )}
      </div>
    </nav>
  );
}
