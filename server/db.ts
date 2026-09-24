import sqlite3 from 'sqlite3';
import bcrypt from 'bcryptjs';
import path from 'path';
import { fileURLToPath } from 'url';

// Resolve the database path safely for both ESM (development) and CJS (production bundle)
let currentDir;
if (typeof __dirname !== 'undefined') {
  currentDir = __dirname;
} else if (typeof import.meta !== 'undefined' && import.meta.url) {
  currentDir = path.dirname(fileURLToPath(import.meta.url));
} else {
  currentDir = process.cwd(); // Fallback
}

const dbPath = path.resolve(currentDir, '..', 'database.db');
const db = new sqlite3.Database(dbPath);

// Helper for database queries
export function dbQuery<T>(sql: string, params: any[] = []): Promise<T[]> {
  return new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => {
      if (err) {
        console.error('Database query error:', err, 'SQL:', sql, 'Params:', params);
        reject(err);
      } else {
        resolve(rows as T[]);
      }
    });
  });
}

// Helper for single row database queries
export function dbGet<T>(sql: string, params: any[] = []): Promise<T | undefined> {
  return new Promise((resolve, reject) => {
    db.get(sql, params, (err, row) => {
      if (err) {
        console.error('Database get error:', err, 'SQL:', sql, 'Params:', params);
        reject(err);
      } else {
        resolve(row as T | undefined);
      }
    });
  });
}

// Helper for run commands (INSERT, UPDATE, DELETE)
export function dbRun(sql: string, params: any[] = []): Promise<{ lastID: number; changes: number }> {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function (err) {
      if (err) {
        console.error('Database run error:', err, 'SQL:', sql, 'Params:', params);
        reject(err);
      } else {
        resolve({ lastID: this.lastID, changes: this.changes });
      }
    });
  });
}

// Initialize database schema and seed data
export async function initDB() {
  console.log('Initializing database schema at:', dbPath);

  // Enable foreign key support
  await dbRun('PRAGMA foreign_keys = ON;');

  // 1. Users table
  await dbRun(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      email TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      role TEXT NOT NULL, -- 'admin', 'ngo', 'donor', 'delivery'
      status TEXT NOT NULL, -- 'pending', 'approved', 'suspended'
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // 2. Schools table
  await dbRun(`
    CREATE TABLE IF NOT EXISTS schools (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      name TEXT NOT NULL,
      blurb TEXT NOT NULL,
      photo_url TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    )
  `);

  // 3. Needs table
  await dbRun(`
    CREATE TABLE IF NOT EXISTS needs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      school_id INTEGER NOT NULL,
      title TEXT NOT NULL,
      category TEXT NOT NULL,
      grade_info TEXT NOT NULL,
      qty_needed INTEGER NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (school_id) REFERENCES schools(id) ON DELETE CASCADE
    )
  `);

  // 4. Pledges table
  await dbRun(`
    CREATE TABLE IF NOT EXISTS pledges (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      need_id INTEGER NOT NULL,
      donor_id INTEGER, -- Nullable for guest pledges
      donor_name TEXT NOT NULL,
      qty INTEGER NOT NULL,
      contact TEXT NOT NULL,
      status TEXT NOT NULL, -- 'pledged', 'ready_for_pickup', 'collected', 'delivered'
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (need_id) REFERENCES needs(id) ON DELETE CASCADE,
      FOREIGN KEY (donor_id) REFERENCES users(id) ON DELETE SET NULL
    )
  `);

  // 5. Deliveries table
  await dbRun(`
    CREATE TABLE IF NOT EXISTS deliveries (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      pledge_id INTEGER NOT NULL UNIQUE,
      volunteer_id INTEGER NOT NULL,
      status TEXT NOT NULL, -- 'claimed', 'collected', 'delivered'
      claimed_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      collected_at DATETIME,
      delivered_at DATETIME,
      FOREIGN KEY (pledge_id) REFERENCES pledges(id) ON DELETE CASCADE,
      FOREIGN KEY (volunteer_id) REFERENCES users(id) ON DELETE CASCADE
    )
  `);

  // 6. Updates table
  await dbRun(`
    CREATE TABLE IF NOT EXISTS updates (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      school_id INTEGER NOT NULL,
      text TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (school_id) REFERENCES schools(id) ON DELETE CASCADE
    )
  `);

  // Lightweight migrations for databases created before location sharing.
  // SQLite supports ADD COLUMN, so existing local data stays intact.
  const addColumnIfMissing = async (table: string, column: string, definition: string) => {
    const columns = await dbQuery<{ name: string }>(`PRAGMA table_info(${table})`);
    if (!columns.some((item) => item.name === column)) {
      await dbRun(`ALTER TABLE ${table} ADD COLUMN ${definition}`);
    }
  };
  await addColumnIfMissing('schools', 'delivery_address', 'delivery_address TEXT');
  await addColumnIfMissing('schools', 'latitude', 'latitude REAL');
  await addColumnIfMissing('schools', 'longitude', 'longitude REAL');
  await addColumnIfMissing('schools', 'location_updated_at', 'location_updated_at DATETIME');
  await addColumnIfMissing('pledges', 'pickup_address', 'pickup_address TEXT');
  await addColumnIfMissing('pledges', 'latitude', 'latitude REAL');
  await addColumnIfMissing('pledges', 'longitude', 'longitude REAL');
  await addColumnIfMissing('pledges', 'location_updated_at', 'location_updated_at DATETIME');
  await addColumnIfMissing('deliveries', 'volunteer_latitude', 'volunteer_latitude REAL');
  await addColumnIfMissing('deliveries', 'volunteer_longitude', 'volunteer_longitude REAL');
  await addColumnIfMissing('deliveries', 'location_updated_at', 'location_updated_at DATETIME');

  // Check if we need to seed the database
  const userCount = await dbGet<{ count: number }>('SELECT count(*) as count FROM users');
  if (userCount && userCount.count === 0) {
    console.log('Seeding initial data into database...');

    // Hash passwords
    const adminPass = await bcrypt.hash('admin123', 10);
    const schoolPass = await bcrypt.hash('school123', 10);
    const donorPass = await bcrypt.hash('donor123', 10);
    const volunteerPass = await bcrypt.hash('volunteer123', 10);

    // Seed Users
    // Admin
    const adminUser = await dbRun(
      'INSERT INTO users (name, email, password_hash, role, status) VALUES (?, ?, ?, ?, ?)',
      ['System Administrator', 'admin@supplytheneed.org', adminPass, 'admin', 'approved']
    );

    // Schools / NGOs
    const school1User = await dbRun(
      'INSERT INTO users (name, email, password_hash, role, status) VALUES (?, ?, ?, ?, ?)',
      ['Woodlands Elementary', 'woodlands@school.org', schoolPass, 'ngo', 'approved']
    );
    const school2User = await dbRun(
      'INSERT INTO users (name, email, password_hash, role, status) VALUES (?, ?, ?, ?, ?)',
      ['Hope NGO Center', 'hopecenter@ngo.org', schoolPass, 'ngo', 'approved']
    );
    const school3User = await dbRun(
      'INSERT INTO users (name, email, password_hash, role, status) VALUES (?, ?, ?, ?, ?)',
      ['Valley Prep Academy', 'valleyprep@school.org', schoolPass, 'ngo', 'pending']
    );
    const school4User = await dbRun(
      'INSERT INTO users (name, email, password_hash, role, status) VALUES (?, ?, ?, ?, ?)',
      ['Fake School Organization', 'fakeorg@school.org', schoolPass, 'ngo', 'suspended']
    );

    // Registered Donor
    const donorUser = await dbRun(
      'INSERT INTO users (name, email, password_hash, role, status) VALUES (?, ?, ?, ?, ?)',
      ['Jane Doe', 'donor@gmail.com', donorPass, 'donor', 'approved']
    );

    // Delivery Volunteer
    const volunteerUser = await dbRun(
      'INSERT INTO users (name, email, password_hash, role, status) VALUES (?, ?, ?, ?, ?)',
      ['Dave Express', 'volunteer@deliver.org', volunteerPass, 'delivery', 'approved']
    );

    // Seed Schools details
    const school1 = await dbRun(
      'INSERT INTO schools (user_id, name, blurb, photo_url) VALUES (?, ?, ?, ?)',
      [
        school1User.lastID,
        'Woodlands Elementary School',
        'Located in a remote rural valley, we serve over 150 underprivileged students. This school year, we are aiming to provide basic learning kits to all our Grade 1 to 5 children. Your generous item donations will change lives.',
        'https://images.unsplash.com/photo-1577896851231-70ef18881754?auto=format&fit=crop&w=800&q=85'
      ]
    );

    const school2 = await dbRun(
      'INSERT INTO schools (user_id, name, blurb, photo_url) VALUES (?, ?, ?, ?)',
      [
        school2User.lastID,
        'Hope NGO Education Center',
        'We run after-school learning support centers for children in high-density urban slums. We provide free tutoring, healthy snacks, and essential school materials. We are currently looking for kindergarten stationery and middle-school science supplies.',
        'https://images.unsplash.com/photo-1488521787991-ed7bbaae773c?auto=format&fit=crop&w=800&q=85'
      ]
    );

    const school3 = await dbRun(
      'INSERT INTO schools (user_id, name, blurb, photo_url) VALUES (?, ?, ?, ?)',
      [
        school3User.lastID,
        'Valley Prep Academy',
        'A community school looking to support children from families of seasonal farming laborers. We need drawing pads, crayons, and school bags.',
        'https://images.unsplash.com/photo-1503676260728-1c00da094a0b?auto=format&fit=crop&w=800&q=85'
      ]
    );

    const school4 = await dbRun(
      'INSERT INTO schools (user_id, name, blurb, photo_url) VALUES (?, ?, ?, ?)',
      [
        school4User.lastID,
        'Fake School Organization',
        'A suspicious organization asking for luxury items instead of school supplies. For testing purposes.',
        'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&w=800&q=85'
      ]
    );

    // Seed Needs
    // Woodlands Elementary
    const needW1 = await dbRun(
      'INSERT INTO needs (school_id, title, category, grade_info, qty_needed) VALUES (?, ?, ?, ?, ?)',
      [school1.lastID, 'Grade 5 Notebooks', 'Notebooks', 'Grade 5', 20]
    );
    const needW2 = await dbRun(
      'INSERT INTO needs (school_id, title, category, grade_info, qty_needed) VALUES (?, ?, ?, ?, ?)',
      [school1.lastID, 'Wooden Pencils (Box of 12)', 'Stationery', 'Grade 1-3', 15]
    );
    const needW3 = await dbRun(
      'INSERT INTO needs (school_id, title, category, grade_info, qty_needed) VALUES (?, ?, ?, ?, ?)',
      [school1.lastID, 'Ergonomic School Backpacks', 'Bags', 'Grade 4-5', 10]
    );

    // Hope NGO Center
    const needH1 = await dbRun(
      'INSERT INTO needs (school_id, title, category, grade_info, qty_needed) VALUES (?, ?, ?, ?, ?)',
      [school2.lastID, 'Crayola Washable Crayons (24 Pack)', 'Art Supplies', 'Kindergarten', 25]
    );
    const needH2 = await dbRun(
      'INSERT INTO needs (school_id, title, category, grade_info, qty_needed) VALUES (?, ?, ?, ?, ?)',
      [school2.lastID, 'Drawing Sketchbooks (A4)', 'Art Supplies', 'Grade 1-6', 30]
    );
    const needH3 = await dbRun(
      'INSERT INTO needs (school_id, title, category, grade_info, qty_needed) VALUES (?, ?, ?, ?, ?)',
      [school2.lastID, 'Kid-Friendly Scissors', 'Stationery', 'Kindergarten', 15]
    );

    // Seed Pledges
    // Pledge 1: Woodlands Elementary -> Grade 5 Notebooks. Donor: Jane Doe. Qty: 8. Status: 'ready_for_pickup'
    const pledge1 = await dbRun(
      'INSERT INTO pledges (need_id, donor_id, donor_name, qty, contact, status) VALUES (?, ?, ?, ?, ?, ?)',
      [needW1.lastID, donorUser.lastID, 'Jane Doe', 8, 'jane.doe@gmail.com', 'ready_for_pickup']
    );

    // Pledge 2: Woodlands Elementary -> Wooden Pencils. Donor: Guest Sam Wilson. Qty: 5. Status: 'pledged'
    await dbRun(
      'INSERT INTO pledges (need_id, donor_id, donor_name, qty, contact, status) VALUES (?, NULL, ?, ?, ?, ?)',
      [needW2.lastID, 'Sam Wilson', 5, 'sam.w@example.com', 'pledged']
    );

    // Pledge 3: Hope NGO Center -> Crayola Crayons. Donor: Jane Doe. Qty: 10. Status: 'collected'
    const pledge3 = await dbRun(
      'INSERT INTO pledges (need_id, donor_id, donor_name, qty, contact, status) VALUES (?, ?, ?, ?, ?, ?)',
      [needH1.lastID, donorUser.lastID, 'Jane Doe', 10, 'jane.doe@gmail.com', 'collected']
    );

    // Delivery 1 for Pledge 3: Dave volunteer claimed & collected
    await dbRun(
      'INSERT INTO deliveries (pledge_id, volunteer_id, status, claimed_at, collected_at) VALUES (?, ?, ?, datetime("now", "-1 day"), datetime("now", "-12 hours"))',
      [pledge3.lastID, volunteerUser.lastID, 'collected']
    );

    // Pledge 4: Hope NGO Center -> Drawing Sketchbooks. Donor: Anonymous Guest. Qty: 12. Status: 'delivered'
    const pledge4 = await dbRun(
      'INSERT INTO pledges (need_id, donor_id, donor_name, qty, contact, status) VALUES (?, NULL, ?, ?, ?, ?)',
      [needH2.lastID, 'Anonymous Guest', 12, 'anonymous@example.com', 'delivered']
    );

    // Delivery 2 for Pledge 4: Dave volunteer delivered
    await dbRun(
      'INSERT INTO deliveries (pledge_id, volunteer_id, status, claimed_at, collected_at, delivered_at) VALUES (?, ?, ?, datetime("now", "-2 days"), datetime("now", "-2 days", "+2 hours"), datetime("now", "-1 day"))',
      [pledge4.lastID, volunteerUser.lastID, 'delivered']
    );

    // Seed Updates
    await dbRun(
      'INSERT INTO updates (school_id, text, created_at) VALUES (?, ?, datetime("now", "-3 days"))',
      [school1.lastID, 'Welcome to Woodlands Elementary Supply Drive page! We are so excited to open our campaign. We serve 150 children who need basic school supplies. Please pledge what you can, and thank you for being a hero!']
    );

    await dbRun(
      'INSERT INTO updates (school_id, text, created_at) VALUES (?, ?, datetime("now", "-1 day"))',
      [school2.lastID, 'Amazing news! We have received a delivery of 12 Drawing Sketchbooks from a guest donor! Our weekend art club children are absolutely thrilled. Thank you so much for making this possible!']
    );

    console.log('Database seeded successfully.');
  } else {
    console.log('Database already has data. Skipping seed.');
  }
}
