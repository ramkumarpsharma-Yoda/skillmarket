import express from 'express';
import cors from 'cors';
import path from 'path';
import { initDB } from './db';
import authRoutes from './routes/auth';
import profileRoutes from './routes/profiles';
import bookingRoutes from './routes/bookings';
import feedbackRoutes from './routes/feedback';
import supportRoutes from './routes/support';

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// In production, serve the frontend build
const frontendPath = path.join(__dirname, '../../frontend/dist');
app.use(express.static(frontendPath));

app.use('/api/auth', authRoutes);
app.use('/api/profiles', profileRoutes);
app.use('/api/bookings', bookingRoutes);
app.use('/api/feedback', feedbackRoutes);
app.use('/api/support', supportRoutes);

app.get('/api/health', (_req, res) => res.json({ status: 'ok', timestamp: new Date().toISOString() }));

app.get('/api/categories', (_req, res) => {
  res.json([
    { id: 'teacher', label: 'Teacher / Tutor', icon: '📚' },
    { id: 'sports_coach', label: 'Sports Coach', icon: '🏅' },
    { id: 'lawyer', label: 'Lawyer', icon: '⚖️' },
    { id: 'ca', label: 'Chartered Accountant', icon: '📊' },
    { id: 'doctor', label: 'Doctor / Consultant', icon: '🏥' },
    { id: 'fitness', label: 'Fitness Trainer', icon: '💪' },
    { id: 'music', label: 'Music Instructor', icon: '🎵' },
    { id: 'counselor', label: 'Counselor / Therapist', icon: '🧠' },
    { id: 'tech', label: 'Tech Consultant', icon: '💻' },
    { id: 'other', label: 'Other', icon: '🔧' },
  ]);
});

initDB().then(() => {
  // Serve frontend for any non-API route (SPA fallback)
  app.get('*', (_req, res) => {
    res.sendFile(path.join(__dirname, '../../frontend/dist/index.html'));
  });
  app.listen(PORT, () => console.log(`SkillMarket API running on http://localhost:${PORT}`));
});
