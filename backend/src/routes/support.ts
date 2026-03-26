import { Router, Response } from 'express';
import { v4 as uuid } from 'uuid';
import { getAll, run } from '../db';
import { authRequired, AuthRequest } from '../middleware/auth';

const router = Router();

router.post('/', authRequired, (req: AuthRequest, res: Response) => {
  const { subject, description, booking_id } = req.body;
  if (!subject || !description) return res.status(400).json({ error: 'subject and description required' });

  const id = uuid();
  run('INSERT INTO support_tickets (id, user_id, booking_id, subject, description) VALUES (?, ?, ?, ?, ?)',
    id, req.userId!, booking_id || null, subject, description);

  res.status(201).json({ id, message: 'Support ticket created' });
});

router.get('/my', authRequired, (req: AuthRequest, res: Response) => {
  const tickets = getAll('SELECT * FROM support_tickets WHERE user_id = ? ORDER BY created_at DESC', req.userId!);
  res.json(tickets);
});

export default router;
