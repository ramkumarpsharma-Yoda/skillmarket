import { Routes, Route } from 'react-router-dom'
import Navbar from './components/Navbar'
import Home from './pages/Home'
import Login from './pages/Login'
import Signup from './pages/Signup'
import Browse from './pages/Browse'
import ProfileDetail from './pages/ProfileDetail'
import CreateProfile from './pages/CreateProfile'
import MyBookings from './pages/MyBookings'
import Dashboard from './pages/Dashboard'
import Support from './pages/Support'

export default function App() {
  return (
    <div className="app">
      <Navbar />
      <main className="main-content">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Signup />} />
          <Route path="/browse" element={<Browse />} />
          <Route path="/profile/:id" element={<ProfileDetail />} />
          <Route path="/create-profile" element={<CreateProfile />} />
          <Route path="/my-bookings" element={<MyBookings />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/support" element={<Support />} />
        </Routes>
      </main>
    </div>
  )
}
