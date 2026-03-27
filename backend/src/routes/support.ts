import { Router, Response } from 'express';
import { v4 as uuid } from 'uuid';
import { getAll, run } from '../db';
import { authRequired, AuthRequest } from '../middleware/auth';

const router = Router();

router.post('/', authRequired, async (req: AuthRequest, res: Response) => {
  try {
    const { subject, description, booking_id } = req.body;
    if (!subject || !description) return res.status(400).json({ error: 'subject and description required' });

    const id = uuid();
    await run('INSERT INTO support_tickets (id, user_id, booking_id, subject, description) VALUES (?, ?, ?, ?, ?)',
      id, req.userId!, booking_id || null, subject, description);

    res.status(201).json({ id, message: 'Support ticket created' });
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

router.get('/my', authRequired, async (req: AuthRequest, res: Response) => {
  try {
    const tickets = await getAll('SELECT * FROM support_tickets WHERE user_id = ? ORDER BY created_at DESC', req.userId!);
    res.json(tickets);
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

export default router;
