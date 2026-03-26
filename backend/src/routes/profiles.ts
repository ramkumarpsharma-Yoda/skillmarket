import { Router, Request, Response } from 'express';
import { v4 as uuid } from 'uuid';
import multer from 'multer';
import path from 'path';
import { getOne, getAll, run } from '../db';
import { authRequired, optionalAuth, AuthRequest } from '../middleware/auth';

const upload = multer({
  dest: path.join(__dirname, '../../uploads'),
  limits: { fileSize: 5 * 1024 * 1024 },
});

const router = Router();

// Browse profiles — no login required
router.get('/', optionalAuth, (req: Request, res: Response) => {
  const { category, mode, city, search, page = '1', limit = '12' } = req.query;
  let sql = `SELECT p.*, u.name as professional_name, u.email as professional_email,
    (SELECT COALESCE(AVG(f.rating), 0) FROM feedbacks f WHERE f.to_user_id = p.user_id) as avg_rating,
    (SELECT COUNT(*) FROM feedbacks f WHERE f.to_user_id = p.user_id) as review_count
    FROM profiles p JOIN users u ON p.user_id = u.id WHERE p.status = 'approved'`;
  const params: any[] = [];

  if (category) { sql += ' AND p.category = ?'; params.push(category); }
  if (city) { sql += ' AND p.skilled_location_city = ?'; params.push(city); }
  if (mode) { sql += ` AND p.consultation_modes LIKE ?`; params.push(`%${mode}%`); }
  if (search) { sql += ' AND (p.expertise LIKE ? OR u.name LIKE ?)'; params.push(`%${search}%`, `%${search}%`); }

  const offset = (parseInt(page as string) - 1) * parseInt(limit as string);
  sql += ` ORDER BY avg_rating DESC LIMIT ? OFFSET ?`;
  params.push(parseInt(limit as string), offset);

  const profiles = getAll(sql, ...params);
  const total = getOne('SELECT COUNT(*) as count FROM profiles WHERE status = ?', 'approved');
  res.json({ profiles, total: total?.count || 0, page: parseInt(page as string) });
});

// Get single profile
router.get('/:id', optionalAuth, (req: Request, res: Response) => {
  const profile = getOne(`
    SELECT p.*, u.name as professional_name, u.email as professional_email,
    (SELECT COALESCE(AVG(f.rating), 0) FROM feedbacks f WHERE f.to_user_id = p.user_id) as avg_rating,
    (SELECT COUNT(*) FROM feedbacks f WHERE f.to_user_id = p.user_id) as review_count
    FROM profiles p JOIN users u ON p.user_id = u.id WHERE p.id = ?
  `, req.params.id);
  if (!profile) return res.status(404).json({ error: 'Profile not found' });

  const availability = getAll('SELECT * FROM availability WHERE profile_id = ? AND is_active = 1', req.params.id);
  const feedbacks = getAll(`
    SELECT f.*, u.name as reviewer_name FROM feedbacks f 
    JOIN users u ON f.from_user_id = u.id WHERE f.to_user_id = (SELECT user_id FROM profiles WHERE id = ?)
    ORDER BY f.created_at DESC LIMIT 10
  `, req.params.id);

  res.json({ ...profile, availability, feedbacks });
});

// Create profile (professional listing)
router.post('/', authRequired, upload.fields([
  { name: 'aadhaar_doc', maxCount: 1 },
  { name: 'qualification_docs', maxCount: 5 },
]), (req: AuthRequest, res: Response) => {
  const files = req.files as { [fieldname: string]: Express.Multer.File[] };
  if (!files?.aadhaar_doc?.[0]) return res.status(400).json({ error: 'Aadhaar document is mandatory' });

  const existing = getOne('SELECT id FROM profiles WHERE user_id = ?', req.userId!);
  if (existing) return res.status(409).json({ error: 'Profile already exists' });

  const { category, expertise, years_experience, qualifications, association, bio,
    base_charge, min_hours, max_hours, consultation_modes,
    skilled_location_address, skilled_location_city, skilled_location_state, skilled_location_pincode } = req.body;

  if (!category || !expertise || !base_charge) return res.status(400).json({ error: 'category, expertise, base_charge required' });

  const modes = JSON.parse(consultation_modes || '["video"]');
  const needsLocation = modes.includes('skilled_location');

  if (needsLocation && !skilled_location_address) {
    return res.status(400).json({ error: 'Skilled location address required when skilled_location mode is selected' });
  }

  const id = uuid();
  const qualDocs = files.qualification_docs?.map((f: any) => f.filename).join(',') || '';

  run(`INSERT INTO profiles (id, user_id, category, expertise, years_experience, qualifications, association, bio,
    base_charge, min_hours, max_hours, consultation_modes,
    skilled_location_address, skilled_location_city, skilled_location_state, skilled_location_pincode,
    aadhaar_doc, qualification_docs, status)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'approved')`,
    id, req.userId!, category, expertise, parseInt(years_experience) || 0,
    qualifications || null, association || null, bio || null,
    parseFloat(base_charge), parseFloat(min_hours) || 1, parseFloat(max_hours) || 8,
    JSON.stringify(modes),
    needsLocation ? skilled_location_address : null,
    needsLocation ? skilled_location_city : null,
    needsLocation ? skilled_location_state : null,
    needsLocation ? skilled_location_pincode : null,
    files.aadhaar_doc[0].filename, qualDocs);

  // Update user role
  run('UPDATE users SET role = ? WHERE id = ?', 'professional', req.userId!);

  // Parse and save availability
  if (req.body.availability) {
    const avail = JSON.parse(req.body.availability);
    for (const slot of avail) {
      run('INSERT INTO availability (id, profile_id, day_of_week, start_hour, end_hour) VALUES (?, ?, ?, ?, ?)',
        uuid(), id, slot.day_of_week, slot.start_hour, slot.end_hour);
    }
  }

  res.status(201).json({ id, message: 'Profile created successfully' });
});

// Update profile
router.put('/:id', authRequired, (req: AuthRequest, res: Response) => {
  const profile = getOne('SELECT * FROM profiles WHERE id = ? AND user_id = ?', req.params.id, req.userId!);
  if (!profile) return res.status(404).json({ error: 'Profile not found or unauthorized' });

  const { base_charge, min_hours, max_hours, consultation_modes, bio,
    skilled_location_address, skilled_location_city, skilled_location_state, skilled_location_pincode } = req.body;

  const modes = consultation_modes ? JSON.parse(consultation_modes) : JSON.parse(profile.consultation_modes);
  const needsLocation = modes.includes('skilled_location');

  run(`UPDATE profiles SET base_charge = COALESCE(?, base_charge), min_hours = COALESCE(?, min_hours),
    max_hours = COALESCE(?, max_hours), consultation_modes = ?, bio = COALESCE(?, bio),
    skilled_location_address = ?, skilled_location_city = ?, skilled_location_state = ?, skilled_location_pincode = ?
    WHERE id = ?`,
    base_charge || null, min_hours || null, max_hours || null, JSON.stringify(modes), bio || null,
    needsLocation ? (skilled_location_address || profile.skilled_location_address) : null,
    needsLocation ? (skilled_location_city || profile.skilled_location_city) : null,
    needsLocation ? (skilled_location_state || profile.skilled_location_state) : null,
    needsLocation ? (skilled_location_pincode || profile.skilled_location_pincode) : null,
    req.params.id);

  res.json({ message: 'Profile updated' });
});

export default router;
