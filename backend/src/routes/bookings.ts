import { Router, Request, Response } from 'express';
import { v4 as uuid } from 'uuid';
import { getOne, getAll, run } from '../db';
import { authRequired, AuthRequest } from '../middleware/auth';

const router = Router();

router.post('/check-availability', async (req: Request, res: Response) => {
  try {
    const { profile_id, booking_date, start_hour, duration_hours = 1 } = req.body;
    if (!profile_id || !booking_date || start_hour === undefined)
      return res.status(400).json({ error: 'profile_id, booking_date, start_hour required' });

    const bookDate = new Date(booking_date);
    const now = new Date();
    const diffDays = Math.ceil((bookDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    if (diffDays > 15) return res.status(400).json({ error: 'Max 15 days advance booking allowed' });
    if (diffDays < 0) return res.status(400).json({ error: 'Cannot book in the past' });

    for (let h = 0; h < duration_hours; h++) {
      const hour = start_hour + h;
      const existing = await getOne(
        `SELECT id FROM bookings WHERE profile_id = ? AND booking_date = ? AND start_hour = ? AND status != 'cancelled'`,
        profile_id, booking_date, hour);
      if (existing) return res.json({ available: false, conflicting_hour: hour });
    }
    res.json({ available: true });
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

router.get('/slots/:profileId/:date', async (req: Request, res: Response) => {
  try {
    const { profileId, date } = req.params;
    const profile = await getOne('SELECT * FROM profiles WHERE id = ?', profileId);
    if (!profile) return res.status(404).json({ error: 'Profile not found' });

    const dayOfWeek = new Date(date).getDay();
    const availability = await getAll(
      'SELECT * FROM availability WHERE profile_id = ? AND day_of_week = ? AND is_active = 1', profileId, dayOfWeek);

    const booked = await getAll(
      `SELECT start_hour, duration_hours FROM bookings WHERE profile_id = ? AND booking_date = ? AND status != 'cancelled'`,
      profileId, date);

    const bookedHours = new Set<number>();
    for (const b of booked) { for (let h = 0; h < b.duration_hours; h++) bookedHours.add(b.start_hour + h); }

    const slots: { hour: number; available: boolean }[] = [];
    for (const avail of availability) {
      for (let h = avail.start_hour; h < avail.end_hour; h++) {
        slots.push({ hour: h, available: !bookedHours.has(h) });
      }
    }
    res.json({ date, slots });
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

router.post('/', authRequired, async (req: AuthRequest, res: Response) => {
  try {
    const { profile_id, booking_date, start_hour, duration_hours = 1,
      consultation_mode, client_location_address, payment_mode = 'full_online',
      is_recurring = false, recurring_days = 0 } = req.body;

    if (!profile_id || !booking_date || start_hour === undefined || !consultation_mode)
      return res.status(400).json({ error: 'profile_id, booking_date, start_hour, consultation_mode required' });

    const profile = await getOne('SELECT * FROM profiles WHERE id = ?', profile_id);
    if (!profile) return res.status(404).json({ error: 'Profile not found' });

    const modes = JSON.parse(profile.consultation_modes);
    if (!modes.includes(consultation_mode))
      return res.status(400).json({ error: `Professional does not offer ${consultation_mode}` });

    if (consultation_mode === 'client_location' && !client_location_address)
      return res.status(400).json({ error: 'Client location address required' });

    const totalAmount = profile.base_charge * duration_hours;
    const bookingAmount = totalAmount * 0.2;
    const remainingAmount = payment_mode === 'full_online' ? 0 : totalAmount - bookingAmount;

    const bookingIds: string[] = [];
    const totalDays = is_recurring ? recurring_days : 1;
    const parentId = uuid();

    for (let day = 0; day < totalDays; day++) {
      const date = new Date(booking_date);
      date.setDate(date.getDate() + day);
      const dateStr = date.toISOString().split('T')[0];

      const now = new Date();
      const diffDays = Math.ceil((date.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
      if (diffDays > 15) continue;

      let slotAvailable = true;
      for (let h = 0; h < duration_hours; h++) {
        const existing = await getOne(
          `SELECT id FROM bookings WHERE profile_id = ? AND booking_date = ? AND start_hour = ? AND status != 'cancelled'`,
          profile_id, dateStr, start_hour + h);
        if (existing) { slotAvailable = false; break; }
      }
      if (!slotAvailable) continue;

      const id = day === 0 ? parentId : uuid();
      await run(`INSERT INTO bookings 
        (id, client_id, profile_id, booking_date, start_hour, duration_hours, consultation_mode,
         client_location_address, total_amount, booking_amount, remaining_amount, payment_mode,
         status, is_recurring, recurring_days, parent_booking_id)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'confirmed', ?, ?, ?)`,
        id, req.userId!, profile_id, dateStr, start_hour, duration_hours,
        consultation_mode, client_location_address || null,
        totalAmount, bookingAmount, remainingAmount, payment_mode,
        is_recurring ? 1 : 0, recurring_days || null, day === 0 ? null : parentId);
      bookingIds.push(id);
    }

    if (bookingIds.length === 0) return res.status(409).json({ error: 'No available slots' });

    res.status(201).json({
      booking_ids: bookingIds, total_amount: totalAmount,
      booking_amount: bookingAmount, remaining_amount: remainingAmount,
      payment_mode, message: `${bookingIds.length} booking(s) confirmed`
    });
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

router.get('/my', authRequired, async (req: AuthRequest, res: Response) => {
  try {
    const bookings = await getAll(`
      SELECT b.*, p.category, p.expertise, u.name as professional_name
      FROM bookings b JOIN profiles p ON b.profile_id = p.id JOIN users u ON p.user_id = u.id
      WHERE b.client_id = ? ORDER BY b.booking_date DESC, b.start_hour`, req.userId!);
    res.json(bookings);
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

router.get('/professional', authRequired, async (req: AuthRequest, res: Response) => {
  try {
    const profile = await getOne('SELECT id FROM profiles WHERE user_id = ?', req.userId!);
    if (!profile) return res.status(404).json({ error: 'No professional profile' });
    const bookings = await getAll(`
      SELECT b.*, u.name as client_name, u.email as client_email
      FROM bookings b JOIN users u ON b.client_id = u.id
      WHERE b.profile_id = ? ORDER BY b.booking_date DESC, b.start_hour`, profile.id);
    res.json(bookings);
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

router.post('/:id/cancel', authRequired, async (req: AuthRequest, res: Response) => {
  try {
    const booking = await getOne('SELECT * FROM bookings WHERE id = ? AND client_id = ?', req.params.id, req.userId!);
    if (!booking) return res.status(404).json({ error: 'Booking not found' });
    if (booking.status === 'cancelled') return res.status(400).json({ error: 'Already cancelled' });

    const slotTime = new Date(`${booking.booking_date}T${String(booking.start_hour).padStart(2, '0')}:00:00`);
    const now = new Date();
    const hoursUntilSlot = (slotTime.getTime() - now.getTime()) / (1000 * 60 * 60);

    let refundAmount: number, refundType: string;
    if (hoursUntilSlot > 2) { refundAmount = booking.booking_amount; refundType = 'full'; }
    else { refundAmount = booking.booking_amount * 0.25; refundType = 'partial'; }

    await run('UPDATE bookings SET status = ? WHERE id = ?', 'cancelled', req.params.id);
    res.json({ message: 'Booking cancelled', refund_amount: refundAmount, refund_type: refundType });
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

router.put('/:id', authRequired, async (req: AuthRequest, res: Response) => {
  try {
    const booking = await getOne('SELECT * FROM bookings WHERE id = ? AND client_id = ?', req.params.id, req.userId!);
    if (!booking) return res.status(404).json({ error: 'Booking not found' });
    if (booking.status === 'cancelled') return res.status(400).json({ error: 'Cannot modify cancelled booking' });

    const { booking_date, start_hour } = req.body;
    const newDate = booking_date || booking.booking_date;
    const newHour = start_hour !== undefined ? start_hour : booking.start_hour;

    const existing = await getOne(
      `SELECT id FROM bookings WHERE profile_id = ? AND booking_date = ? AND start_hour = ? AND status != 'cancelled' AND id != ?`,
      booking.profile_id, newDate, newHour, req.params.id);
    if (existing) return res.status(409).json({ error: 'Slot not available' });

    await run('UPDATE bookings SET booking_date = ?, start_hour = ? WHERE id = ?', newDate, newHour, req.params.id);
    res.json({ message: 'Booking updated' });
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

router.post('/:id/complete', authRequired, async (req: AuthRequest, res: Response) => {
  try {
    const profile = await getOne('SELECT id FROM profiles WHERE user_id = ?', req.userId!);
    if (!profile) return res.status(403).json({ error: 'Not a professional' });
    const booking = await getOne('SELECT * FROM bookings WHERE id = ? AND profile_id = ?', req.params.id, profile.id);
    if (!booking) return res.status(404).json({ error: 'Booking not found' });
    await run('UPDATE bookings SET status = ? WHERE id = ?', 'completed', req.params.id);
    res.json({ message: 'Booking marked complete. Payment will be released.' });
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

export default router;
