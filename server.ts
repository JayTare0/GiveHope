import express, { Request, Response, NextFunction } from 'express';
import path from 'path';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';
import { createServer as createViteServer } from 'vite';
import { initDB, dbQuery, dbGet, dbRun } from './server/db.ts';

dotenv.config({ path: '.env.local' });

// Extend Express Request type to support user injection
interface AuthenticatedRequest extends Request {
  user?: {
    id: number;
    name: string;
    email: string;
    role: string;
    status: string;
  };
}

const PORT = 3000;
const isProduction = process.env.NODE_ENV === 'production';
const JWT_SECRET = process.env.JWT_SECRET;

if (isProduction && !JWT_SECRET) {
  throw new Error('JWT_SECRET must be set when running in production.');
}

const signingSecret = JWT_SECRET || 'local-development-secret-change-me';

function validCoordinates(latitude: unknown, longitude: unknown) {
  return typeof latitude === 'number' && typeof longitude === 'number'
    && Number.isFinite(latitude) && Number.isFinite(longitude)
    && latitude >= -90 && latitude <= 90 && longitude >= -180 && longitude <= 180;
}

type RateLimitEntry = { count: number; resetAt: number };
const authAttempts = new Map<string, RateLimitEntry>();

function authRateLimit(req: Request, res: Response, next: NextFunction) {
  const key = req.ip || 'unknown';
  const now = Date.now();
  const windowMs = 15 * 60 * 1000;
  const maxAttempts = 20;
  const existing = authAttempts.get(key);
  const entry = !existing || existing.resetAt <= now
    ? { count: 0, resetAt: now + windowMs }
    : existing;

  entry.count += 1;
  authAttempts.set(key, entry);
  res.setHeader('RateLimit-Limit', maxAttempts);
  res.setHeader('RateLimit-Remaining', Math.max(0, maxAttempts - entry.count));
  if (entry.count > maxAttempts) {
    return res.status(429).json({ error: 'Too many attempts. Please try again in 15 minutes.' });
  }
  next();
}

async function startServer() {
  const app = express();
  app.use(express.json());

  // Initialize DB tables and seed data
  try {
    await initDB();
    console.log('SQLite database initialized successfully.');
  } catch (err) {
    console.error('Failed to initialize SQLite database:', err);
  }

  // --- AUTH MIDDLEWARE ---
  function authenticateToken(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
      return res.status(401).json({ error: 'Access token required' });
    }

    jwt.verify(token, signingSecret, (err, decoded) => {
      if (err) {
        return res.status(403).json({ error: 'Invalid or expired token' });
      }
      req.user = decoded as AuthenticatedRequest['user'];
      next();
    });
  }

  function requireRole(roles: string[]) {
    return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
      if (!req.user) {
        return res.status(401).json({ error: 'Unauthenticated' });
      }
      if (!roles.includes(req.user.role)) {
        return res.status(403).json({ error: `Access denied. Requires one of roles: ${roles.join(', ')}` });
      }
      next();
    };
  }

  // Helper for active NGO check
  async function requireApprovedNGO(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    if (!req.user || req.user.role !== 'ngo') {
      return res.status(403).json({ error: 'Access denied.' });
    }
    // Verify fresh status from DB
    const user = await dbGet<{ status: string }>('SELECT status FROM users WHERE id = ?', [req.user.id]);
    if (!user || user.status !== 'approved') {
      return res.status(403).json({ error: 'Your school/NGO account is currently pending approval or suspended.' });
    }
    next();
  }

  // --- API ROUTES ---

  // 1. AUTH ROUTES
  app.post('/api/auth/register', authRateLimit, async (req: Request, res: Response) => {
    const { name, email, password, role, schoolName, blurb, photoUrl } = req.body;

    if (!name || !email || !password || !role) {
      return res.status(400).json({ error: 'Missing required registration fields' });
    }

    if (!['ngo', 'donor', 'delivery'].includes(role)) {
      return res.status(400).json({ error: 'Invalid role selection' });
    }

    try {
      // Check if user exists
      const existingUser = await dbGet('SELECT id FROM users WHERE email = ?', [email]);
      if (existingUser) {
        return res.status(400).json({ error: 'Email already registered' });
      }

      const hash = await bcrypt.hash(password, 10);
      const status = role === 'ngo' ? 'pending' : 'approved';

      const userResult = await dbRun(
        'INSERT INTO users (name, email, password_hash, role, status) VALUES (?, ?, ?, ?, ?)',
        [name, email, hash, role, status]
      );

      const userId = userResult.lastID;

      // If registered as NGO, create schools profile
      if (role === 'ngo') {
        const finalSchoolName = schoolName || `${name} School`;
        const finalBlurb = blurb || 'We are a dedicated community organization looking to support children in need of basic school supplies.';
        const finalPhoto = photoUrl || 'https://images.unsplash.com/photo-1503676260728-1c00da094a0b?auto=format&fit=crop&w=800&q=85';

        await dbRun(
          'INSERT INTO schools (user_id, name, blurb, photo_url) VALUES (?, ?, ?, ?)',
          [userId, finalSchoolName, finalBlurb, finalPhoto]
        );
      }

      res.status(201).json({
        message: 'Registration successful',
        user: { id: userId, name, email, role, status }
      });
    } catch (err: any) {
      console.error(err);
      res.status(500).json({ error: 'Registration failed due to server error' });
    }
  });

  app.post('/api/auth/login', authRateLimit, async (req: Request, res: Response) => {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    try {
      const user = await dbGet<{ id: number; name: string; email: string; password_hash: string; role: string; status: string }>(
        'SELECT id, name, email, password_hash, role, status FROM users WHERE email = ?',
        [email]
      );

      if (!user) {
        return res.status(401).json({ error: 'Invalid email or password' });
      }

      if (user.status === 'suspended') {
        return res.status(403).json({ error: 'Your account has been suspended by an administrator.' });
      }

      const isValid = await bcrypt.compare(password, user.password_hash);
      if (!isValid) {
        return res.status(401).json({ error: 'Invalid email or password' });
      }

      const token = jwt.sign(
        { id: user.id, name: user.name, email: user.email, role: user.role, status: user.status },
        signingSecret,
        { expiresIn: '7d' }
      );

      // If NGO, find their school_id
      let schoolId = null;
      if (user.role === 'ngo') {
        const school = await dbGet<{ id: number }>('SELECT id FROM schools WHERE user_id = ?', [user.id]);
        schoolId = school ? school.id : null;
      }

      res.json({
        token,
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          status: user.status,
          schoolId
        }
      });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Login failed due to server error' });
    }
  });

  // 2. PUBLIC DIRECTORY & PROFILES
  app.get('/api/public/schools', async (req: Request, res: Response) => {
    try {
      // Return approved schools
      const schools = await dbQuery<any>(`
        SELECT s.id, s.name, s.blurb, s.photo_url, u.status,
          COALESCE((SELECT SUM(n.qty_needed) FROM needs n WHERE n.school_id = s.id), 0) as total_needed,
          COALESCE((SELECT SUM(p.qty) FROM pledges p JOIN needs n ON p.need_id = n.id WHERE n.school_id = s.id), 0) as total_pledged
        FROM schools s
        JOIN users u ON s.user_id = u.id
        WHERE u.status = 'approved'
      `);
      res.json(schools);
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Failed to load schools list' });
    }
  });

  app.get('/api/public/schools/:id', async (req: Request, res: Response) => {
    const schoolId = parseInt(req.params.id);
    if (isNaN(schoolId)) {
      return res.status(400).json({ error: 'Invalid school ID' });
    }

    try {
      const school = await dbGet<any>(`
        SELECT s.id, s.name, s.blurb, s.photo_url, u.status, s.user_id
        FROM schools s
        JOIN users u ON s.user_id = u.id
        WHERE s.id = ?
      `, [schoolId]);

      if (!school) {
        return res.status(404).json({ error: 'School not found' });
      }

      // Allow admins to view any school, but public can only view approved schools
      const authHeader = req.headers['authorization'];
      let isAllowed = school.status === 'approved';

      if (!isAllowed && authHeader) {
        const token = authHeader.split(' ')[1];
        try {
          const decoded = jwt.verify(token, signingSecret) as any;
          if (decoded.role === 'admin' || decoded.id === school.user_id) {
            isAllowed = true;
          }
        } catch (e) {}
      }

      if (!isAllowed) {
        return res.status(403).json({ error: 'This school page is pending approval or suspended.' });
      }

      // Load needs for this school, along with their pledges
      const needs = await dbQuery<any>(`
        SELECT n.id, n.title, n.category, n.grade_info, n.qty_needed,
          COALESCE((SELECT SUM(p.qty) FROM pledges p WHERE p.need_id = n.id), 0) as qty_pledged
        FROM needs n
        WHERE n.school_id = ?
        ORDER BY n.created_at DESC
      `, [schoolId]);

      // Load updates timeline
      const updates = await dbQuery<any>(`
        SELECT id, text, created_at
        FROM updates
        WHERE school_id = ?
        ORDER BY created_at DESC
      `, [schoolId]);

      res.json({ school, needs, updates });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Failed to load school profile' });
    }
  });

  // Public pledge creation
  app.post('/api/public/schools/:id/pledge', async (req: Request, res: Response) => {
    const schoolId = parseInt(req.params.id);
    const { needId, qty, donorName, contact, donorId, pickupAddress, latitude, longitude } = req.body;

    if (isNaN(schoolId) || !needId || !qty || !donorName || !contact) {
      return res.status(400).json({ error: 'Missing required pledge details' });
    }

    if (qty <= 0) {
      return res.status(400).json({ error: 'Pledge quantity must be greater than zero' });
    }

    try {
      // 1. Verify need belongs to this school
      const need = await dbGet<any>('SELECT id, qty_needed, title FROM needs WHERE id = ? AND school_id = ?', [needId, schoolId]);
      if (!need) {
        return res.status(404).json({ error: 'Need item not found for this school' });
      }

      // 2. Data Integrity: Validate that pledge does not exceed remaining quantity
      const pledgedSumResult = await dbGet<{ sum: number }>('SELECT COALESCE(SUM(qty), 0) as sum FROM pledges WHERE need_id = ?', [needId]);
      const currentPledged = pledgedSumResult ? pledgedSumResult.sum : 0;
      const remainingNeeded = need.qty_needed - currentPledged;

      if (qty > remainingNeeded) {
        return res.status(400).json({
          error: `Pledge exceeds remaining need. Only ${remainingNeeded} more of "${need.title}" are required. You tried to pledge ${qty}.`
        });
      }

      // 3. Save pledge
      const result = await dbRun(
        'INSERT INTO pledges (need_id, donor_id, donor_name, qty, contact, status, pickup_address, latitude, longitude, location_updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
        [needId, donorId || null, donorName, qty, contact, 'pledged', pickupAddress || null, validCoordinates(latitude, longitude) ? latitude : null, validCoordinates(latitude, longitude) ? longitude : null, validCoordinates(latitude, longitude) ? new Date().toISOString() : null]
      );

      res.status(201).json({
        id: result.lastID,
        needId,
        donorName,
        qty,
        status: 'pledged'
      });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Failed to process pledge' });
    }
  });

  // 3. ADMIN ENDPOINTS
  app.get('/api/admin/stats', authenticateToken, requireRole(['admin']), async (req: AuthenticatedRequest, res: Response) => {
    try {
      const schoolsCount = await dbGet<{ count: number }>('SELECT COUNT(*) as count FROM schools');
      const pendingCount = await dbGet<{ count: number }>("SELECT COUNT(*) as count FROM users WHERE role = 'ngo' AND status = 'pending'");
      const totalPledged = await dbGet<{ sum: number }>('SELECT SUM(qty) as sum FROM pledges');
      const totalDelivered = await dbGet<{ count: number }>("SELECT COUNT(*) as count FROM pledges WHERE status = 'delivered'");

      res.json({
        totalSchools: schoolsCount?.count || 0,
        pendingApprovals: pendingCount?.count || 0,
        totalItemsPledged: totalPledged?.sum || 0,
        totalDeliveriesCompleted: totalDelivered?.count || 0
      });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Failed to fetch admin stats' });
    }
  });

  app.get('/api/admin/schools', authenticateToken, requireRole(['admin']), async (req: AuthenticatedRequest, res: Response) => {
    try {
      const schools = await dbQuery<any>(`
        SELECT s.id, s.name, s.blurb, s.photo_url, u.email, u.status, u.id as user_id,
          (SELECT COUNT(*) FROM needs n WHERE n.school_id = s.id) as needs_count
        FROM schools s
        JOIN users u ON s.user_id = u.id
        ORDER BY s.created_at DESC
      `);
      res.json(schools);
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Failed to fetch schools' });
    }
  });

  app.post('/api/admin/schools/:id/status', authenticateToken, requireRole(['admin']), async (req: AuthenticatedRequest, res: Response) => {
    const schoolId = parseInt(req.params.id);
    const { status } = req.body; // 'approved', 'pending', 'suspended'

    if (isNaN(schoolId) || !status || !['approved', 'pending', 'suspended'].includes(status)) {
      return res.status(400).json({ error: 'Invalid school ID or status option' });
    }

    try {
      const school = await dbGet<{ user_id: number }>('SELECT user_id FROM schools WHERE id = ?', [schoolId]);
      if (!school) {
        return res.status(404).json({ error: 'School profile not found' });
      }

      await dbRun('UPDATE users SET status = ? WHERE id = ?', [status, school.user_id]);
      res.json({ message: `School status successfully updated to ${status}` });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Failed to update school status' });
    }
  });

  app.get('/api/admin/deliveries', authenticateToken, requireRole(['admin']), async (req: AuthenticatedRequest, res: Response) => {
    try {
      const deliveries = await dbQuery<any>(`
        SELECT p.id as pledge_id, p.donor_name, p.qty, p.status as pledge_status, p.created_at,
          n.title as need_title, s.name as school_name,
          v.name as volunteer_name, d.status as delivery_status,
          d.claimed_at, d.collected_at, d.delivered_at
        FROM pledges p
        JOIN needs n ON p.need_id = n.id
        JOIN schools s ON n.school_id = s.id
        LEFT JOIN deliveries d ON d.pledge_id = p.id
        LEFT JOIN users v ON d.volunteer_id = v.id
        ORDER BY p.created_at DESC
      `);
      res.json(deliveries);
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Failed to load deliveries table' });
    }
  });

  // 4. NGO / SCHOOL DASHBOARD ENDPOINTS
  app.get('/api/ngo/stats', authenticateToken, requireApprovedNGO, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const school = await dbGet<{ id: number }>('SELECT id FROM schools WHERE user_id = ?', [req.user!.id]);
      if (!school) {
        return res.status(404).json({ error: 'School profile not found' });
      }

      const itemsNeededSum = await dbGet<{ sum: number }>('SELECT SUM(qty_needed) as sum FROM needs WHERE school_id = ?', [school.id]);
      const totalNeeded = itemsNeededSum?.sum || 0;

      const itemsPledgedSum = await dbGet<{ sum: number }>(`
        SELECT SUM(p.qty) as sum
        FROM pledges p
        JOIN needs n ON p.need_id = n.id
        WHERE n.school_id = ?
      `, [school.id]);
      const totalPledged = itemsPledgedSum?.sum || 0;

      const pledgesCount = await dbGet<{ count: number }>(`
        SELECT COUNT(p.id) as count
        FROM pledges p
        JOIN needs n ON p.need_id = n.id
        WHERE n.school_id = ?
      `, [school.id]);

      res.json({
        totalNeeded,
        totalPledged,
        pledgesReceived: pledgesCount?.count || 0,
        fulfillmentRate: totalNeeded > 0 ? Math.round((totalPledged / totalNeeded) * 100) : 0
      });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Failed to fetch NGO stats' });
    }
  });

  app.get('/api/ngo/needs', authenticateToken, requireApprovedNGO, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const school = await dbGet<{ id: number }>('SELECT id FROM schools WHERE user_id = ?', [req.user!.id]);
      if (!school) return res.status(404).json({ error: 'School profile not found' });

      const needs = await dbQuery<any>(`
        SELECT n.id, n.title, n.category, n.grade_info, n.qty_needed, n.created_at,
          COALESCE((SELECT SUM(qty) FROM pledges WHERE need_id = n.id), 0) as qty_pledged
        FROM needs n
        WHERE n.school_id = ?
        ORDER BY n.created_at DESC
      `, [school.id]);

      res.json(needs);
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Failed to load needs' });
    }
  });

  app.post('/api/ngo/needs', authenticateToken, requireApprovedNGO, async (req: AuthenticatedRequest, res: Response) => {
    const { title, category, grade_info, qty_needed } = req.body;
    if (!title || !category || !grade_info || !qty_needed) {
      return res.status(400).json({ error: 'All needs fields are required' });
    }

    try {
      const school = await dbGet<{ id: number }>('SELECT id FROM schools WHERE user_id = ?', [req.user!.id]);
      if (!school) return res.status(404).json({ error: 'School profile not found' });

      const result = await dbRun(
        'INSERT INTO needs (school_id, title, category, grade_info, qty_needed) VALUES (?, ?, ?, ?, ?)',
        [school.id, title, category, grade_info, parseInt(qty_needed)]
      );

      res.status(201).json({
        id: result.lastID,
        title,
        category,
        grade_info,
        qty_needed,
        qty_pledged: 0
      });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Failed to create need item' });
    }
  });

  app.put('/api/ngo/needs/:id', authenticateToken, requireApprovedNGO, async (req: AuthenticatedRequest, res: Response) => {
    const needId = parseInt(req.params.id);
    const { title, category, grade_info, qty_needed } = req.body;

    if (isNaN(needId) || !title || !category || !grade_info || !qty_needed) {
      return res.status(400).json({ error: 'Missing editing parameters' });
    }

    try {
      const school = await dbGet<{ id: number }>('SELECT id FROM schools WHERE user_id = ?', [req.user!.id]);
      if (!school) return res.status(404).json({ error: 'School profile not found' });

      // Ensure the need belongs to this school
      const existingNeed = await dbGet('SELECT id FROM needs WHERE id = ? AND school_id = ?', [needId, school.id]);
      if (!existingNeed) return res.status(404).json({ error: 'Need item not found' });

      // Keep track of current pledges to make sure the user does not edit quantity to be less than what has been pledged!
      const pledgesSum = await dbGet<{ sum: number }>('SELECT COALESCE(SUM(qty), 0) as sum FROM pledges WHERE need_id = ?', [needId]);
      const currentPledges = pledgesSum?.sum || 0;

      if (parseInt(qty_needed) < currentPledges) {
        return res.status(400).json({
          error: `Cannot reduce quantity below pledged amount. Current pledges: ${currentPledges}. You tried to set: ${qty_needed}.`
        });
      }

      await dbRun(
        'UPDATE needs SET title = ?, category = ?, grade_info = ?, qty_needed = ? WHERE id = ?',
        [title, category, grade_info, parseInt(qty_needed), needId]
      );

      res.json({ id: needId, title, category, grade_info, qty_needed });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Failed to update need' });
    }
  });

  app.delete('/api/ngo/needs/:id', authenticateToken, requireApprovedNGO, async (req: AuthenticatedRequest, res: Response) => {
    const needId = parseInt(req.params.id);
    if (isNaN(needId)) return res.status(400).json({ error: 'Invalid ID' });

    try {
      const school = await dbGet<{ id: number }>('SELECT id FROM schools WHERE user_id = ?', [req.user!.id]);
      if (!school) return res.status(404).json({ error: 'School profile not found' });

      // Verify ownership
      const existingNeed = await dbGet('SELECT id FROM needs WHERE id = ? AND school_id = ?', [needId, school.id]);
      if (!existingNeed) return res.status(404).json({ error: 'Need item not found' });

      await dbRun('DELETE FROM needs WHERE id = ?', [needId]);
      res.json({ success: true, message: 'Need item deleted successfully.' });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Failed to delete need' });
    }
  });

  app.get('/api/ngo/updates', authenticateToken, requireApprovedNGO, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const school = await dbGet<{ id: number }>('SELECT id FROM schools WHERE user_id = ?', [req.user!.id]);
      if (!school) return res.status(404).json({ error: 'School profile not found' });

      const updates = await dbQuery('SELECT id, text, created_at FROM updates WHERE school_id = ? ORDER BY created_at DESC', [school.id]);
      res.json(updates);
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Failed to fetch updates' });
    }
  });

  app.post('/api/ngo/updates', authenticateToken, requireApprovedNGO, async (req: AuthenticatedRequest, res: Response) => {
    const { text } = req.body;
    if (!text) return res.status(400).json({ error: 'Update text is required' });

    try {
      const school = await dbGet<{ id: number }>('SELECT id FROM schools WHERE user_id = ?', [req.user!.id]);
      if (!school) return res.status(404).json({ error: 'School profile not found' });

      const result = await dbRun('INSERT INTO updates (school_id, text) VALUES (?, ?)', [school.id, text]);
      res.status(201).json({
        id: result.lastID,
        text,
        created_at: new Date().toISOString()
      });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Failed to post update' });
    }
  });

  app.get('/api/ngo/pledges', authenticateToken, requireApprovedNGO, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const school = await dbGet<{ id: number }>('SELECT id FROM schools WHERE user_id = ?', [req.user!.id]);
      if (!school) return res.status(404).json({ error: 'School profile not found' });

      const pledges = await dbQuery<any>(`
        SELECT p.id, p.donor_name, p.qty, p.status, p.contact, p.created_at, n.title as need_title
        FROM pledges p
        JOIN needs n ON p.need_id = n.id
        WHERE n.school_id = ?
        ORDER BY p.created_at DESC
      `, [school.id]);

      res.json(pledges);
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Failed to fetch school pledges' });
    }
  });

  // NGO manually requests pickup or donor does
  app.post('/api/ngo/pledges/:id/request-pickup', authenticateToken, requireApprovedNGO, async (req: AuthenticatedRequest, res: Response) => {
    const pledgeId = parseInt(req.params.id);
    if (isNaN(pledgeId)) return res.status(400).json({ error: 'Invalid pledge ID' });

    try {
      const school = await dbGet<{ id: number }>('SELECT id FROM schools WHERE user_id = ?', [req.user!.id]);
      if (!school) return res.status(404).json({ error: 'School profile not found' });

      const pledge = await dbGet<any>(`
        SELECT p.id, p.status FROM pledges p
        JOIN needs n ON p.need_id = n.id
        WHERE p.id = ? AND n.school_id = ?
      `, [pledgeId, school.id]);

      if (!pledge) return res.status(404).json({ error: 'Pledge not found' });

      await dbRun("UPDATE pledges SET status = 'ready_for_pickup' WHERE id = ?", [pledgeId]);
      res.json({ id: pledgeId, status: 'ready_for_pickup' });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Failed to request pickup' });
    }
  });

  app.put('/api/ngo/settings', authenticateToken, requireApprovedNGO, async (req: AuthenticatedRequest, res: Response) => {
    const { name, blurb, photo_url } = req.body;
    if (!name || !blurb || !photo_url) {
      return res.status(400).json({ error: 'Name, blurb, and photo URL are required.' });
    }

    try {
      const school = await dbGet<{ id: number }>('SELECT id FROM schools WHERE user_id = ?', [req.user!.id]);
      if (!school) return res.status(404).json({ error: 'School profile not found' });

      await dbRun(
        'UPDATE schools SET name = ?, blurb = ?, photo_url = ? WHERE id = ?',
        [name, blurb, photo_url, school.id]
      );

      res.json({ id: school.id, name, blurb, photo_url });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Failed to update school settings' });
    }
  });

  app.put('/api/ngo/location', authenticateToken, requireApprovedNGO, async (req: AuthenticatedRequest, res: Response) => {
    const { address, latitude, longitude } = req.body;
    if (!address || !validCoordinates(latitude, longitude)) {
      return res.status(400).json({ error: 'A delivery address and valid location are required.' });
    }
    const school = await dbGet<{ id: number }>('SELECT id FROM schools WHERE user_id = ?', [req.user!.id]);
    if (!school) return res.status(404).json({ error: 'School profile not found' });
    await dbRun('UPDATE schools SET delivery_address = ?, latitude = ?, longitude = ?, location_updated_at = CURRENT_TIMESTAMP WHERE id = ?', [address.trim(), latitude, longitude, school.id]);
    res.json({ success: true });
  });

  // 5. REGISTERED DONOR DASHBOARD
  app.get('/api/donor/pledges', authenticateToken, requireRole(['donor']), async (req: AuthenticatedRequest, res: Response) => {
    try {
      const pledges = await dbQuery<any>(`
        SELECT p.id, p.qty, p.status, p.created_at, n.title as need_title, s.name as school_name, s.id as school_id
        FROM pledges p
        JOIN needs n ON p.need_id = n.id
        JOIN schools s ON n.school_id = s.id
        WHERE p.donor_id = ?
        ORDER BY p.created_at DESC
      `, [req.user!.id]);

      res.json(pledges);
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Failed to fetch donor pledges' });
    }
  });

  app.post('/api/donor/pledges/:id/ready', authenticateToken, requireRole(['donor']), async (req: AuthenticatedRequest, res: Response) => {
    const pledgeId = parseInt(req.params.id);
    if (isNaN(pledgeId)) return res.status(400).json({ error: 'Invalid pledge ID' });

    try {
      const pledge = await dbGet<any>('SELECT id, status FROM pledges WHERE id = ? AND donor_id = ?', [pledgeId, req.user!.id]);
      if (!pledge) {
        return res.status(404).json({ error: 'Pledge not found or not owned by you' });
      }

      await dbRun("UPDATE pledges SET status = 'ready_for_pickup' WHERE id = ?", [pledgeId]);
      res.json({ id: pledgeId, status: 'ready_for_pickup' });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Failed to update pledge status' });
    }
  });

  app.put('/api/donor/pledges/:id/location', authenticateToken, requireRole(['donor']), async (req: AuthenticatedRequest, res: Response) => {
    const pledgeId = parseInt(req.params.id);
    const { latitude, longitude } = req.body;
    if (isNaN(pledgeId) || !validCoordinates(latitude, longitude)) return res.status(400).json({ error: 'Valid coordinates are required.' });
    const pledge = await dbGet('SELECT id FROM pledges WHERE id = ? AND donor_id = ?', [pledgeId, req.user!.id]);
    if (!pledge) return res.status(404).json({ error: 'Pledge not found or not owned by you.' });
    await dbRun('UPDATE pledges SET latitude = ?, longitude = ?, location_updated_at = CURRENT_TIMESTAMP WHERE id = ?', [latitude, longitude, pledgeId]);
    res.json({ success: true });
  });

  // 6. DELIVERY VOLUNTEER DASHBOARD
  app.get('/api/delivery/queue', authenticateToken, requireRole(['delivery']), async (req: AuthenticatedRequest, res: Response) => {
    try {
      // Find all ready pledges that aren't claimed yet (no active delivery)
      const queue = await dbQuery<any>(`
        SELECT p.id as pledge_id, p.donor_name, p.qty, p.contact, p.created_at,
          n.title as need_title, s.name as school_name, s.photo_url as school_photo, s.blurb as school_blurb
        FROM pledges p
        JOIN needs n ON p.need_id = n.id
        JOIN schools s ON n.school_id = s.id
        WHERE p.status = 'ready_for_pickup'
          AND p.id NOT IN (SELECT pledge_id FROM deliveries WHERE status != 'delivered')
        ORDER BY p.created_at DESC
      `);
      res.json(queue);
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Failed to fetch delivery queue' });
    }
  });

  app.get('/api/delivery/my-deliveries', authenticateToken, requireRole(['delivery']), async (req: AuthenticatedRequest, res: Response) => {
    try {
      const deliveries = await dbQuery<any>(`
        SELECT d.id as delivery_id, d.status as delivery_status, d.claimed_at, d.collected_at,
          p.id as pledge_id, p.donor_name, p.contact as donor_contact, p.qty,
          n.title as need_title, s.name as school_name, s.photo_url as school_photo,
          p.pickup_address, p.latitude as donor_latitude, p.longitude as donor_longitude,
          s.delivery_address, s.latitude as school_latitude, s.longitude as school_longitude,
          d.volunteer_latitude, d.volunteer_longitude, d.location_updated_at
        FROM deliveries d
        JOIN pledges p ON d.pledge_id = p.id
        JOIN needs n ON p.need_id = n.id
        JOIN schools s ON n.school_id = s.id
        WHERE d.volunteer_id = ? AND d.status != 'delivered'
        ORDER BY d.claimed_at DESC
      `, [req.user!.id]);

      res.json(deliveries);
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Failed to fetch active deliveries' });
    }
  });

  app.post('/api/delivery/pledges/:id/claim', authenticateToken, requireRole(['delivery']), async (req: AuthenticatedRequest, res: Response) => {
    const pledgeId = parseInt(req.params.id);
    if (isNaN(pledgeId)) return res.status(400).json({ error: 'Invalid pledge ID' });

    try {
      // Verify pledge is ready for pickup and not already claimed
      const pledge = await dbGet<any>("SELECT id, status FROM pledges WHERE id = ? AND status = 'ready_for_pickup'", [pledgeId]);
      if (!pledge) {
        return res.status(400).json({ error: 'Pledge is not ready for pickup or has been claimed' });
      }

      const activeDelivery = await dbGet('SELECT id FROM deliveries WHERE pledge_id = ?', [pledgeId]);
      if (activeDelivery) {
        return res.status(400).json({ error: 'Delivery has already been claimed by someone else' });
      }

      // Claim it
      await dbRun(
        'INSERT INTO deliveries (pledge_id, volunteer_id, status, claimed_at) VALUES (?, ?, ?, CURRENT_TIMESTAMP)',
        [pledgeId, req.user!.id, 'claimed']
      );

      // We do not change pledge status yet or change to same
      res.json({ success: true, pledgeId, status: 'claimed' });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Failed to claim delivery' });
    }
  });

  app.put('/api/delivery/pledges/:id/location', authenticateToken, requireRole(['delivery']), async (req: AuthenticatedRequest, res: Response) => {
    const pledgeId = parseInt(req.params.id);
    const { latitude, longitude } = req.body;
    if (isNaN(pledgeId) || !validCoordinates(latitude, longitude)) return res.status(400).json({ error: 'Valid coordinates are required.' });
    const delivery = await dbGet("SELECT id FROM deliveries WHERE pledge_id = ? AND volunteer_id = ? AND status != 'delivered'", [pledgeId, req.user!.id]);
    if (!delivery) return res.status(404).json({ error: 'Active delivery not found.' });
    await dbRun('UPDATE deliveries SET volunteer_latitude = ?, volunteer_longitude = ?, location_updated_at = CURRENT_TIMESTAMP WHERE pledge_id = ?', [latitude, longitude, pledgeId]);
    res.json({ success: true });
  });

  app.get('/api/donor/pledges/:id/delivery-location', authenticateToken, requireRole(['donor']), async (req: AuthenticatedRequest, res: Response) => {
    const pledgeId = parseInt(req.params.id);
    const location = await dbGet<any>(`SELECT d.volunteer_latitude as latitude, d.volunteer_longitude as longitude, d.location_updated_at
      FROM deliveries d JOIN pledges p ON p.id = d.pledge_id
      WHERE p.id = ? AND p.donor_id = ? AND d.status != 'delivered'`, [pledgeId, req.user!.id]);
    if (!location) return res.status(404).json({ error: 'No active volunteer location is available.' });
    res.json(location);
  });

  app.get('/api/ngo/pledges/:id/delivery-location', authenticateToken, requireApprovedNGO, async (req: AuthenticatedRequest, res: Response) => {
    const pledgeId = parseInt(req.params.id);
    const location = await dbGet<any>(`SELECT d.volunteer_latitude as latitude, d.volunteer_longitude as longitude, d.location_updated_at
      FROM deliveries d JOIN pledges p ON p.id = d.pledge_id JOIN needs n ON n.id = p.need_id JOIN schools s ON s.id = n.school_id
      WHERE p.id = ? AND s.user_id = ? AND d.status != 'delivered'`, [pledgeId, req.user!.id]);
    if (!location) return res.status(404).json({ error: 'No active volunteer location is available.' });
    res.json(location);
  });

  app.post('/api/delivery/pledges/:id/collect', authenticateToken, requireRole(['delivery']), async (req: AuthenticatedRequest, res: Response) => {
    const pledgeId = parseInt(req.params.id);
    if (isNaN(pledgeId)) return res.status(400).json({ error: 'Invalid pledge ID' });

    try {
      const delivery = await dbGet<any>('SELECT id FROM deliveries WHERE pledge_id = ? AND volunteer_id = ?', [pledgeId, req.user!.id]);
      if (!delivery) {
        return res.status(404).json({ error: 'Delivery record not found or not claimed by you' });
      }

      await dbRun("UPDATE deliveries SET status = 'collected', collected_at = CURRENT_TIMESTAMP WHERE pledge_id = ?", [pledgeId]);
      await dbRun("UPDATE pledges SET status = 'collected' WHERE id = ?", [pledgeId]);

      res.json({ success: true, pledgeId, status: 'collected' });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Failed to collect package' });
    }
  });

  app.post('/api/delivery/pledges/:id/deliver', authenticateToken, requireRole(['delivery']), async (req: AuthenticatedRequest, res: Response) => {
    const pledgeId = parseInt(req.params.id);
    if (isNaN(pledgeId)) return res.status(400).json({ error: 'Invalid pledge ID' });

    try {
      const delivery = await dbGet<any>('SELECT id FROM deliveries WHERE pledge_id = ? AND volunteer_id = ?', [pledgeId, req.user!.id]);
      if (!delivery) {
        return res.status(404).json({ error: 'Delivery record not found or not claimed by you' });
      }

      await dbRun("UPDATE deliveries SET status = 'delivered', delivered_at = CURRENT_TIMESTAMP WHERE pledge_id = ?", [pledgeId]);
      await dbRun("UPDATE pledges SET status = 'delivered' WHERE id = ?", [pledgeId]);

      res.json({ success: true, pledgeId, status: 'delivered' });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Failed to mark package delivered' });
    }
  });

  app.get('/api/delivery/completed', authenticateToken, requireRole(['delivery']), async (req: AuthenticatedRequest, res: Response) => {
    try {
      const completed = await dbQuery<any>(`
        SELECT d.id as delivery_id, d.delivered_at,
          p.id as pledge_id, p.donor_name, p.qty,
          n.title as need_title, s.name as school_name, s.photo_url as school_photo
        FROM deliveries d
        JOIN pledges p ON d.pledge_id = p.id
        JOIN needs n ON p.need_id = n.id
        JOIN schools s ON n.school_id = s.id
        WHERE d.volunteer_id = ? AND d.status = 'delivered'
        ORDER BY d.delivered_at DESC
      `, [req.user!.id]);

      res.json(completed);
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Failed to fetch completed history' });
    }
  });


  // --- VITE MIDDLEWARE INTERACTION ---

  // Vite integration in development, static files in production
  if (!isProduction) {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
    console.log('Vite development middleware integrated.');
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req: Request, res: Response) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
    console.log('Production static asset serving configured.');
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Supply the Need server running on http://localhost:${PORT}`);
  });
}

startServer();
