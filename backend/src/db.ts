import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
});

export async function initDB() {
  const client = await pool.connect();
  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        email TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL,
        name TEXT NOT NULL,
        phone TEXT,
        role TEXT NOT NULL DEFAULT 'client',
        created_at TIMESTAMPTZ DEFAULT NOW()
      )`);
    await client.query(`
      CREATE TABLE IF NOT EXISTS profiles (
        id TEXT PRIMARY KEY,
        user_id TEXT UNIQUE NOT NULL REFERENCES users(id),
        category TEXT NOT NULL,
        expertise TEXT NOT NULL,
        years_experience INTEGER NOT NULL DEFAULT 0,
        qualifications TEXT,
        association TEXT,
        bio TEXT,
        base_charge REAL NOT NULL DEFAULT 0,
        min_hours REAL NOT NULL DEFAULT 1,
        max_hours REAL NOT NULL DEFAULT 8,
        consultation_modes TEXT NOT NULL DEFAULT '["video"]',
        skilled_location_address TEXT,
        skilled_location_city TEXT,
        skilled_location_state TEXT,
        skilled_location_pincode TEXT,
        aadhaar_doc TEXT NOT NULL,
        qualification_docs TEXT,
        status TEXT NOT NULL DEFAULT 'pending',
        advance_booking_days INTEGER NOT NULL DEFAULT 15,
        created_at TIMESTAMPTZ DEFAULT NOW()
      )`);
    await client.query(`
      CREATE TABLE IF NOT EXISTS availability (
        id TEXT PRIMARY KEY,
        profile_id TEXT NOT NULL REFERENCES profiles(id),
        day_of_week INTEGER NOT NULL,
        start_hour INTEGER NOT NULL,
        end_hour INTEGER NOT NULL,
        is_active INTEGER NOT NULL DEFAULT 1
      )`);
    await client.query(`
      CREATE TABLE IF NOT EXISTS bookings (
        id TEXT PRIMARY KEY,
        client_id TEXT NOT NULL REFERENCES users(id),
        profile_id TEXT NOT NULL REFERENCES profiles(id),
        booking_date TEXT NOT NULL,
        start_hour INTEGER NOT NULL,
        duration_hours INTEGER NOT NULL DEFAULT 1,
        consultation_mode TEXT NOT NULL,
        client_location_address TEXT,
        total_amount REAL NOT NULL,
        booking_amount REAL NOT NULL,
        remaining_amount REAL NOT NULL DEFAULT 0,
        payment_mode TEXT NOT NULL DEFAULT 'full_online',
        status TEXT NOT NULL DEFAULT 'confirmed',
        is_recurring INTEGER NOT NULL DEFAULT 0,
        recurring_days INTEGER DEFAULT NULL,
        parent_booking_id TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW()
      )`);
    await client.query(`
      CREATE TABLE IF NOT EXISTS feedbacks (
        id TEXT PRIMARY KEY,
        booking_id TEXT NOT NULL REFERENCES bookings(id),
        from_user_id TEXT NOT NULL REFERENCES users(id),
        to_user_id TEXT NOT NULL REFERENCES users(id),
        rating INTEGER NOT NULL CHECK(rating >= 1 AND rating <= 5),
        comment TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW()
      )`);
    await client.query(`
      CREATE TABLE IF NOT EXISTS support_tickets (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL REFERENCES users(id),
        booking_id TEXT,
        subject TEXT NOT NULL,
        description TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'open',
        created_at TIMESTAMPTZ DEFAULT NOW()
      )`);
    // Unique index to prevent double booking
    await client.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS idx_booking_slot 
      ON bookings(profile_id, booking_date, start_hour) 
      WHERE status != 'cancelled'`);
  } finally {
    client.release();
  }
}

// Helper functions matching the old API
export async function getOne(sql: string, ...params: any[]): Promise<any> {
  const numbered = convertPlaceholders(sql);
  const { rows } = await pool.query(numbered, params);
  return rows[0] || undefined;
}

export async function getAll(sql: string, ...params: any[]): Promise<any[]> {
  const numbered = convertPlaceholders(sql);
  const { rows } = await pool.query(numbered, params);
  return rows;
}

export async function run(sql: string, ...params: any[]) {
  const numbered = convertPlaceholders(sql);
  await pool.query(numbered, params);
}

// Convert ? placeholders to $1, $2, etc. for pg
function convertPlaceholders(sql: string): string {
  let i = 0;
  return sql.replace(/\?/g, () => `$${++i}`);
}

export default { getOne, getAll, run };
