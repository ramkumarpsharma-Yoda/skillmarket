import { Router, Request, Response } from 'express';
import { v4 as uuid } from 'uuid';
import { getOne, getAll, run } from '../db';
import { authRequired, AuthRequest } from '../middleware/auth';

const router = Router();

router.post('/', authRequired, async (req: AuthRequest, res: Response) => {
  try {
    const { booking_id, rating, comment } = req.body;
    if (!booking_id || !rating) return res.status(400).json({ error: 'booking_id and rating required' });
    if (rating < 1 || rating > 5) return res.status(400).json({ error: 'Rating must be 1-5' });

    const booking = await getOne('SELECT * FROM bookings WHERE id = ?', booking_id);
    if (!booking) return res.status(404).json({ error: 'Booking not found' });
    if (booking.status !== 'completed') return res.status(400).json({ error: 'Can only review completed bookings' });

    const existing = await getOne('SELECT id FROM feedbacks WHERE booking_id = ? AND from_user_id = ?', booking_id, req.userId!);
    if (existing) return res.status(409).json({ error: 'Already reviewed' });

    const profile = await getOne('SELECT user_id FROM profiles WHERE id = ?', booking.profile_id);
    const toUserId = req.userId === booking.client_id ? profile.user_id : booking.client_id;

    const id = uuid();
    await run('INSERT INTO feedbacks (id, booking_id, from_user_id, to_user_id, rating, comment) VALUES (?, ?, ?, ?, ?, ?)',
      id, booking_id, req.userId!, toUserId, rating, comment || null);

    res.status(201).json({ id, message: 'Feedback submitted' });
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

router.get('/profile/:profileId', async (req: Request, res: Response) => {
  try {
    const profile = await getOne('SELECT user_id FROM profiles WHERE id = ?', req.params.profileId);
    if (!profile) return res.status(404).json({ error: 'Profile not found' });

    const feedbacks = await getAll(`
      SELECT f.*, u.name as reviewer_name FROM feedbacks f
      JOIN users u ON f.from_user_id = u.id WHERE f.to_user_id = ?
      ORDER BY f.created_at DESC`, profile.user_id);

    const stats = await getOne(`
      SELECT COUNT(*) as total, COALESCE(AVG(rating), 0) as average FROM feedbacks WHERE to_user_id = ?`,
      profile.user_id);

    res.json({ feedbacks, stats });
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

export default router;
