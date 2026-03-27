import { initDB, run, getOne } from './db';
import bcrypt from 'bcryptjs';
import { v4 as uuid } from 'uuid';

async function seed() {
  await initDB();
  const hash = bcrypt.hashSync('password123', 10);

  const pros = [
    { name: 'Priya Sharma', email: 'priya@example.com', category: 'teacher', expertise: 'Mathematics & Physics', years: 8, charge: 500, bio: 'Experienced math teacher with 8 years in CBSE curriculum.', modes: ['video', 'client_location'] },
    { name: 'Rajesh Kumar', email: 'rajesh@example.com', category: 'lawyer', expertise: 'Criminal & Civil Law', years: 15, charge: 2000, bio: 'Senior advocate with expertise in criminal and civil litigation.', modes: ['video', 'skilled_location'], addr: '45 Court Road', city: 'Delhi', state: 'Delhi', pin: '110001' },
    { name: 'Anita Desai', email: 'anita@example.com', category: 'ca', expertise: 'Tax Filing & GST', years: 10, charge: 1500, bio: 'Chartered Accountant specializing in tax planning and GST compliance.', modes: ['video', 'skilled_location', 'client_location'], addr: '12 MG Road', city: 'Mumbai', state: 'Maharashtra', pin: '400001' },
    { name: 'Vikram Singh', email: 'vikram@example.com', category: 'sports_coach', expertise: 'Cricket Coaching', years: 12, charge: 800, bio: 'Former state-level cricketer, coaching batsmen and bowlers.', modes: ['skilled_location', 'client_location'], addr: 'Sports Complex', city: 'Jaipur', state: 'Rajasthan', pin: '302001' },
    { name: 'Dr. Meera Patel', email: 'meera@example.com', category: 'counselor', expertise: 'Career & Mental Health Counseling', years: 6, charge: 1200, bio: 'Licensed counselor helping with career transitions and stress management.', modes: ['video'] },
  ];

  for (const p of pros) {
    const uid = uuid();
    const pid = uuid();
    const existing = await getOne('SELECT id FROM users WHERE email = ?', p.email);
    if (existing) continue;
    await run('INSERT INTO users (id, email, password, name, role) VALUES (?, ?, ?, ?, ?)', uid, p.email, hash, p.name, 'professional');
    const needsLoc = p.modes.includes('skilled_location');
    await run(`INSERT INTO profiles (id, user_id, category, expertise, years_experience, bio, base_charge, min_hours, max_hours,
      consultation_modes, skilled_location_address, skilled_location_city, skilled_location_state, skilled_location_pincode,
      aadhaar_doc, qualification_docs, status) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
      pid, uid, p.category, p.expertise, p.years, p.bio, p.charge, 1, 8,
      JSON.stringify(p.modes), needsLoc ? (p.addr || null) : null, needsLoc ? (p.city || null) : null,
      needsLoc ? (p.state || null) : null, needsLoc ? (p.pin || null) : null, 'seed_aadhaar.pdf', '', 'approved');
    for (let d = 1; d <= 5; d++) {
      await run('INSERT INTO availability (id, profile_id, day_of_week, start_hour, end_hour) VALUES (?,?,?,?,?)', uuid(), pid, d, 9, 17);
    }
  }

  const clientExists = await getOne('SELECT id FROM users WHERE email = ?', 'client@example.com');
  if (!clientExists) {
    await run('INSERT INTO users (id, email, password, name, role) VALUES (?, ?, ?, ?, ?)', uuid(), 'client@example.com', hash, 'Test Client', 'client');
  }

  console.log('Seed complete! Login with any email above + password: password123');
  process.exit(0);
}

seed().catch(e => { console.error(e); process.exit(1); });
