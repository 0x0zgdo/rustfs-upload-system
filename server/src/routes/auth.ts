import { Router } from 'express';
import bcrypt from 'bcrypt';
import db from '../config/db';
import rateLimit from 'express-rate-limit';

const router = Router();

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // Limit each IP to 10 login requests per windowMs
  message: { error: 'Too many login attempts, please try again after 15 minutes' },
  standardHeaders: true,
  legacyHeaders: false,
});

router.post('/register', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required' });
  }

  try {
    const existing = await db.query('SELECT id FROM users WHERE email = $1', [email]);
    if (existing.rowCount && existing.rowCount > 0) {
      return res.status(400).json({ error: 'Email already exists' });
    }

    const salt = await bcrypt.genSalt(12);
    const passwordHash = await bcrypt.hash(password, salt);

    const result = await db.query(
      'INSERT INTO users (email, password_hash) VALUES ($1, $2) RETURNING id, email',
      [email, passwordHash]
    );

    const user = result.rows[0];
    
    // Automatically log them in after registration
    req.session.userId = user.id;

    res.status(201).json({ user });
  } catch (err) {
    console.error('Registration error:', err);
    res.status(500).json({ error: 'Failed to register user' });
  }
});

router.post('/login', loginLimiter, async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required' });
  }

  try {
    const result = await db.query('SELECT * FROM users WHERE email = $1', [email]);
    const user = result.rows[0];

    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const isValid = await bcrypt.compare(password, user.password_hash);
    if (!isValid) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Regenerate session to prevent fixation
    req.session.regenerate((err) => {
      if (err) return res.status(500).json({ error: 'Failed to create session' });
      
      req.session.userId = user.id;
      
      // Save session to ensure it's stored before sending response
      req.session.save((saveErr) => {
        if (saveErr) return res.status(500).json({ error: 'Failed to save session' });
        res.json({ user: { id: user.id, email: user.email } });
      });
    });

  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Failed to login' });
  }
});

router.post('/logout', (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      return res.status(500).json({ error: 'Could not log out' });
    }
    res.clearCookie('connect.sid');
    res.json({ success: true });
  });
});

router.get('/me', async (req, res) => {
  if (!req.session.userId) {
    return res.status(401).json({ error: 'Not authenticated' });
  }

  try {
    const result = await db.query('SELECT id, email, created_at FROM users WHERE id = $1', [req.session.userId]);
    const user = result.rows[0];
    
    if (!user) {
      // Session exists but user deleted?
      req.session.destroy(() => {});
      return res.status(401).json({ error: 'User no longer exists' });
    }

    res.json({ user });
  } catch (err) {
    console.error('Me query error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

export default router;
