import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import { v4 as uuid } from 'uuid';
import { getOne, run } from '../db';
import { signToken, authRequired, AuthRequest } from '../middleware/auth';

const router = Router();

router.post('/signup', async (req: Request, res: Response) => {
  try {
    const { email, password, name, phone, role } = req.body;
    if (!email || !password || !name) return res.status(400).json({ error: 'email, password, name required' });

    const existing = await getOne('SELECT id FROM users WHERE email = ?', email);
    if (existing) return res.status(409).json({ error: 'Email already registered' });

    const id = uuid();
    const hashed = bcrypt.hashSync(password, 10);
    await run('INSERT INTO users (id, email, password, name, phone, role) VALUES (?, ?, ?, ?, ?, ?)',
      id, email, hashed, name, phone || null, role || 'client');

    const token = signToken({ id, email, role: role || 'client' });
    res.status(201).json({ token, user: { id, email, name, role: role || 'client' } });
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

router.post('/login', async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ error: 'email and password required' });

    const user = await getOne('SELECT * FROM users WHERE email = ?', email);
    if (!user || !bcrypt.compareSync(password, user.password))
      return res.status(401).json({ error: 'Invalid credentials' });

    const token = signToken({ id: user.id, email: user.email, role: user.role });
    res.json({ token, user: { id: user.id, email: user.email, name: user.name, role: user.role } });
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

router.get('/me', authRequired, async (req: AuthRequest, res: Response) => {
  try {
    const user = await getOne('SELECT id, email, name, phone, role, created_at FROM users WHERE id = ?', req.userId!);
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json(user);
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

export default router;
