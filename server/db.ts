import pg from 'pg';
import bcrypt from 'bcryptjs';

const { Pool } = pg;

// Use DATABASE_URL from environment (set in Render dashboard)
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : undefined,
});

/**
 * Convert SQLite-style `?` placeholders to PostgreSQL `$1, $2, ...` style.
 * This lets us keep all existing queries in server.ts unchanged.
 */
function convertPlaceholders(sql: string): string {
  let index = 0;
  return sql.replace(/\?/g, () => {
    index += 1;
    return `$${index}`;
  });
}

// Helper for database queries (SELECT multiple rows)
export async function dbQuery<T>(sql: string, params: any[] = []): Promise<T[]> {
  try {
    const result = await pool.query(convertPlaceholders(sql), params);
    return result.rows as T[];
  } catch (err) {
    console.error('Database query error:', err, 'SQL:', sql, 'Params:', params);
    throw err;
  }
}

// Helper for single row database queries
export async function dbGet<T>(sql: string, params: any[] = []): Promise<T | undefined> {
  try {
    const result = await pool.query(convertPlaceholders(sql), params);
    return (result.rows[0] as T) || undefined;
  } catch (err) {
    console.error('Database get error:', err, 'SQL:', sql, 'Params:', params);
    throw err;
  }
}

// Helper for run commands (INSERT, UPDATE, DELETE)
// Automatically adds RETURNING id for INSERT statements to emulate SQLite's lastID
export async function dbRun(sql: string, params: any[] = []): Promise<{ lastID: number; changes: number }> {
  try {
    let finalSql = convertPlaceholders(sql);

    // For INSERT statements, add RETURNING id to get the inserted row's id
    const isInsert = finalSql.trim().toUpperCase().startsWith('INSERT');
    if (isInsert && !finalSql.toUpperCase().includes('RETURNING')) {
      finalSql = finalSql.replace(/;?\s*$/, ' RETURNING id');
    }

    const result = await pool.query(finalSql, params);
    return {
      lastID: result.rows[0]?.id ?? 0,
      changes: result.rowCount ?? 0,
    };
  } catch (err) {
    console.error('Database run error:', err, 'SQL:', sql, 'Params:', params);
    throw err;
  }
}

// Initialize database schema and seed data
export async function initDB() {
  console.log('Initializing PostgreSQL database schema...');

  // 1. Users table
  await pool.query(`
    CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      name TEXT NOT NULL,
      email TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      role TEXT NOT NULL,
      status TEXT NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // 2. Schools table
  await pool.query(`
    CREATE TABLE IF NOT EXISTS schools (
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      blurb TEXT NOT NULL,
      photo_url TEXT NOT NULL,
      delivery_address TEXT,
      latitude DOUBLE PRECISION,
      longitude DOUBLE PRECISION,
      location_updated_at TIMESTAMP,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // 3. Needs table
  await pool.query(`
    CREATE TABLE IF NOT EXISTS needs (
      id SERIAL PRIMARY KEY,
      school_id INTEGER NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
      title TEXT NOT NULL,
      category TEXT NOT NULL,
      grade_info TEXT NOT NULL,
      qty_needed INTEGER NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // 4. Pledges table
  await pool.query(`
    CREATE TABLE IF NOT EXISTS pledges (
      id SERIAL PRIMARY KEY,
      need_id INTEGER NOT NULL REFERENCES needs(id) ON DELETE CASCADE,
      donor_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
      donor_name TEXT NOT NULL,
      qty INTEGER NOT NULL,
      contact TEXT NOT NULL,
      status TEXT NOT NULL,
      pickup_address TEXT,
      latitude DOUBLE PRECISION,
      longitude DOUBLE PRECISION,
      location_updated_at TIMESTAMP,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // 5. Deliveries table
  await pool.query(`
    CREATE TABLE IF NOT EXISTS deliveries (
      id SERIAL PRIMARY KEY,
      pledge_id INTEGER NOT NULL UNIQUE REFERENCES pledges(id) ON DELETE CASCADE,
      volunteer_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      status TEXT NOT NULL,
      claimed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      collected_at TIMESTAMP,
      delivered_at TIMESTAMP,
      volunteer_latitude DOUBLE PRECISION,
      volunteer_longitude DOUBLE PRECISION,
      location_updated_at TIMESTAMP
    )
  `);

  // 6. Updates table
  await pool.query(`
    CREATE TABLE IF NOT EXISTS updates (
      id SERIAL PRIMARY KEY,
      school_id INTEGER NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
      text TEXT NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Check if we need to seed the database
  const userCountResult = await pool.query('SELECT count(*) as count FROM users');
  const userCount = parseInt(userCountResult.rows[0].count, 10);

  if (userCount === 0) {
    console.log('Seeding initial data into database...');

    // Hash passwords
    const adminPass = await bcrypt.hash('admin123', 10);
    const schoolPass = await bcrypt.hash('school123', 10);
    const donorPass = await bcrypt.hash('donor123', 10);
    const volunteerPass = await bcrypt.hash('volunteer123', 10);

    // Seed Users
    // Admin
    await pool.query(
      'INSERT INTO users (name, email, password_hash, role, status) VALUES ($1, $2, $3, $4, $5)',
      ['System Administrator', 'admin@supplytheneed.org', adminPass, 'admin', 'approved']
    );

    // Schools / NGOs
    const school1UserResult = await pool.query(
      'INSERT INTO users (name, email, password_hash, role, status) VALUES ($1, $2, $3, $4, $5) RETURNING id',
      ['Woodlands Elementary', 'woodlands@school.org', schoolPass, 'ngo', 'approved']
    );
    const school1UserId = school1UserResult.rows[0].id;

    const school2UserResult = await pool.query(
      'INSERT INTO users (name, email, password_hash, role, status) VALUES ($1, $2, $3, $4, $5) RETURNING id',
      ['Hope NGO Center', 'hopecenter@ngo.org', schoolPass, 'ngo', 'approved']
    );
    const school2UserId = school2UserResult.rows[0].id;

    const school3UserResult = await pool.query(
      'INSERT INTO users (name, email, password_hash, role, status) VALUES ($1, $2, $3, $4, $5) RETURNING id',
      ['Valley Prep Academy', 'valleyprep@school.org', schoolPass, 'ngo', 'pending']
    );
    const school3UserId = school3UserResult.rows[0].id;

    const school4UserResult = await pool.query(
      'INSERT INTO users (name, email, password_hash, role, status) VALUES ($1, $2, $3, $4, $5) RETURNING id',
      ['Fake School Organization', 'fakeorg@school.org', schoolPass, 'ngo', 'suspended']
    );
    const school4UserId = school4UserResult.rows[0].id;

    // Registered Donor
    const donorUserResult = await pool.query(
      'INSERT INTO users (name, email, password_hash, role, status) VALUES ($1, $2, $3, $4, $5) RETURNING id',
      ['Jane Doe', 'donor@gmail.com', donorPass, 'donor', 'approved']
    );
    const donorUserId = donorUserResult.rows[0].id;

    // Delivery Volunteer
    const volunteerUserResult = await pool.query(
      'INSERT INTO users (name, email, password_hash, role, status) VALUES ($1, $2, $3, $4, $5) RETURNING id',
      ['Dave Express', 'volunteer@deliver.org', volunteerPass, 'delivery', 'approved']
    );
    const volunteerUserId = volunteerUserResult.rows[0].id;

    // Seed Schools details
    const school1Result = await pool.query(
      'INSERT INTO schools (user_id, name, blurb, photo_url) VALUES ($1, $2, $3, $4) RETURNING id',
      [
        school1UserId,
        'Woodlands Elementary School',
        'Located in a remote rural valley, we serve over 150 underprivileged students. This school year, we are aiming to provide basic learning kits to all our Grade 1 to 5 children. Your generous item donations will change lives.',
        'https://images.unsplash.com/photo-1577896851231-70ef18881754?auto=format&fit=crop&w=800&q=85'
      ]
    );
    const school1Id = school1Result.rows[0].id;

    const school2Result = await pool.query(
      'INSERT INTO schools (user_id, name, blurb, photo_url) VALUES ($1, $2, $3, $4) RETURNING id',
      [
        school2UserId,
        'Hope NGO Education Center',
        'We run after-school learning support centers for children in high-density urban slums. We provide free tutoring, healthy snacks, and essential school materials. We are currently looking for kindergarten stationery and middle-school science supplies.',
        'https://images.unsplash.com/photo-1488521787991-ed7bbaae773c?auto=format&fit=crop&w=800&q=85'
      ]
    );
    const school2Id = school2Result.rows[0].id;

    await pool.query(
      'INSERT INTO schools (user_id, name, blurb, photo_url) VALUES ($1, $2, $3, $4)',
      [
        school3UserId,
        'Valley Prep Academy',
        'A community school looking to support children from families of seasonal farming laborers. We need drawing pads, crayons, and school bags.',
        'https://images.unsplash.com/photo-1503676260728-1c00da094a0b?auto=format&fit=crop&w=800&q=85'
      ]
    );

    await pool.query(
      'INSERT INTO schools (user_id, name, blurb, photo_url) VALUES ($1, $2, $3, $4)',
      [
        school4UserId,
        'Fake School Organization',
        'A suspicious organization asking for luxury items instead of school supplies. For testing purposes.',
        'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&w=800&q=85'
      ]
    );

    // Seed Needs
    // Woodlands Elementary
    const needW1Result = await pool.query(
      'INSERT INTO needs (school_id, title, category, grade_info, qty_needed) VALUES ($1, $2, $3, $4, $5) RETURNING id',
      [school1Id, 'Grade 5 Notebooks', 'Notebooks', 'Grade 5', 20]
    );
    const needW1Id = needW1Result.rows[0].id;

    const needW2Result = await pool.query(
      'INSERT INTO needs (school_id, title, category, grade_info, qty_needed) VALUES ($1, $2, $3, $4, $5) RETURNING id',
      [school1Id, 'Wooden Pencils (Box of 12)', 'Stationery', 'Grade 1-3', 15]
    );
    const needW2Id = needW2Result.rows[0].id;

    await pool.query(
      'INSERT INTO needs (school_id, title, category, grade_info, qty_needed) VALUES ($1, $2, $3, $4, $5)',
      [school1Id, 'Ergonomic School Backpacks', 'Bags', 'Grade 4-5', 10]
    );

    // Hope NGO Center
    const needH1Result = await pool.query(
      'INSERT INTO needs (school_id, title, category, grade_info, qty_needed) VALUES ($1, $2, $3, $4, $5) RETURNING id',
      [school2Id, 'Crayola Washable Crayons (24 Pack)', 'Art Supplies', 'Kindergarten', 25]
    );
    const needH1Id = needH1Result.rows[0].id;

    const needH2Result = await pool.query(
      'INSERT INTO needs (school_id, title, category, grade_info, qty_needed) VALUES ($1, $2, $3, $4, $5) RETURNING id',
      [school2Id, 'Drawing Sketchbooks (A4)', 'Art Supplies', 'Grade 1-6', 30]
    );
    const needH2Id = needH2Result.rows[0].id;

    await pool.query(
      'INSERT INTO needs (school_id, title, category, grade_info, qty_needed) VALUES ($1, $2, $3, $4, $5)',
      [school2Id, 'Kid-Friendly Scissors', 'Stationery', 'Kindergarten', 15]
    );

    // Seed Pledges
    // Pledge 1: Woodlands Elementary -> Grade 5 Notebooks. Donor: Jane Doe. Qty: 8. Status: 'ready_for_pickup'
    await pool.query(
      'INSERT INTO pledges (need_id, donor_id, donor_name, qty, contact, status) VALUES ($1, $2, $3, $4, $5, $6)',
      [needW1Id, donorUserId, 'Jane Doe', 8, 'jane.doe@gmail.com', 'ready_for_pickup']
    );

    // Pledge 2: Woodlands Elementary -> Wooden Pencils. Donor: Guest Sam Wilson. Qty: 5. Status: 'pledged'
    await pool.query(
      'INSERT INTO pledges (need_id, donor_id, donor_name, qty, contact, status) VALUES ($1, NULL, $2, $3, $4, $5)',
      [needW2Id, 'Sam Wilson', 5, 'sam.w@example.com', 'pledged']
    );

    // Pledge 3: Hope NGO Center -> Crayola Crayons. Donor: Jane Doe. Qty: 10. Status: 'collected'
    const pledge3Result = await pool.query(
      'INSERT INTO pledges (need_id, donor_id, donor_name, qty, contact, status) VALUES ($1, $2, $3, $4, $5, $6) RETURNING id',
      [needH1Id, donorUserId, 'Jane Doe', 10, 'jane.doe@gmail.com', 'collected']
    );
    const pledge3Id = pledge3Result.rows[0].id;

    // Delivery 1 for Pledge 3: Dave volunteer claimed & collected
    await pool.query(
      'INSERT INTO deliveries (pledge_id, volunteer_id, status, claimed_at, collected_at) VALUES ($1, $2, $3, NOW() - INTERVAL \'1 day\', NOW() - INTERVAL \'12 hours\')',
      [pledge3Id, volunteerUserId, 'collected']
    );

    // Pledge 4: Hope NGO Center -> Drawing Sketchbooks. Donor: Anonymous Guest. Qty: 12. Status: 'delivered'
    const pledge4Result = await pool.query(
      'INSERT INTO pledges (need_id, donor_id, donor_name, qty, contact, status) VALUES ($1, NULL, $2, $3, $4, $5) RETURNING id',
      [needH2Id, 'Anonymous Guest', 12, 'anonymous@example.com', 'delivered']
    );
    const pledge4Id = pledge4Result.rows[0].id;

    // Delivery 2 for Pledge 4: Dave volunteer delivered
    await pool.query(
      'INSERT INTO deliveries (pledge_id, volunteer_id, status, claimed_at, collected_at, delivered_at) VALUES ($1, $2, $3, NOW() - INTERVAL \'2 days\', NOW() - INTERVAL \'2 days\' + INTERVAL \'2 hours\', NOW() - INTERVAL \'1 day\')',
      [pledge4Id, volunteerUserId, 'delivered']
    );

    // Seed Updates
    await pool.query(
      'INSERT INTO updates (school_id, text, created_at) VALUES ($1, $2, NOW() - INTERVAL \'3 days\')',
      [school1Id, 'Welcome to Woodlands Elementary Supply Drive page! We are so excited to open our campaign. We serve 150 children who need basic school supplies. Please pledge what you can, and thank you for being a hero!']
    );

    await pool.query(
      'INSERT INTO updates (school_id, text, created_at) VALUES ($1, $2, NOW() - INTERVAL \'1 day\')',
      [school2Id, 'Amazing news! We have received a delivery of 12 Drawing Sketchbooks from a guest donor! Our weekend art club children are absolutely thrilled. Thank you so much for making this possible!']
    );

    console.log('Database seeded successfully.');
  } else {
    console.log('Database already has data. Skipping seed.');
  }
}
