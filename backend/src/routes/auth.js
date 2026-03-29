const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { query } = require('../config/db');
const { authenticateToken, authorizeRole } = require('../middleware/auth');
const auditService = require('../services/audit.service');

const router = express.Router();

// POST /api/auth/register — Register a new company + admin user
router.post('/register', async (req, res) => {
  try {
    const { companyName, firstName, lastName, email, password } = req.body;

    if (!companyName || !firstName || !lastName || !email || !password) {
      return res.status(400).json({ success: false, message: 'All fields are required' });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ success: false, message: 'Invalid email format' });
    }

    if (password.length < 6) {
      return res.status(400).json({ success: false, message: 'Password must be at least 6 characters' });
    }

    // Check if email already exists
    const existing = await query('SELECT id FROM users WHERE email = $1', [email]);
    if (existing.rows.length > 0) {
      return res.status(400).json({ success: false, message: 'Email already in use' });
    }

    // Create company (triggers auto-create default workflow + categories)
    const companyResult = await query(
      'INSERT INTO companies (name) VALUES ($1) RETURNING id, name',
      [companyName]
    );
    const company = companyResult.rows[0];

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    // Create admin user
    const userResult = await query(
      `INSERT INTO users (company_id, email, password_hash, first_name, last_name, role)
       VALUES ($1, $2, $3, $4, $5, 'ADMIN') RETURNING id, company_id, email, first_name, last_name, role`,
      [company.id, email, passwordHash, firstName, lastName]
    );
    const user = userResult.rows[0];

    // Generate JWT
    const token = jwt.sign(
      { id: user.id, role: user.role, companyId: user.company_id },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );

    await auditService.log({
      userId: user.id,
      companyId: company.id,
      action: 'CREATE_USER',
      entityType: 'user',
      entityId: user.id,
      details: { role: 'ADMIN', registrationType: 'company_registration' }
    });

    res.status(201).json({
      success: true,
      message: 'Company and admin account created successfully',
      data: {
        token,
        user: {
          id: user.id,
          name: `${user.first_name} ${user.last_name}`,
          email: user.email,
          role: user.role,
          companyId: user.company_id,
          company: company.name
        }
      }
    });
  } catch (err) {
    console.error('Register error:', err);
    res.status(500).json({ success: false, message: 'Server error during registration' });
  }
});

// POST /api/auth/login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ success: false, message: 'Email and password are required' });
    }

    // Find user with company info
    const result = await query(
      `SELECT u.id, u.company_id, u.email, u.password_hash, u.first_name, u.last_name, u.role, u.is_active,
              c.name as company_name
       FROM users u
       LEFT JOIN companies c ON u.company_id = c.id
       WHERE u.email = $1`,
      [email]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }

    const user = result.rows[0];

    if (!user.is_active) {
      return res.status(401).json({ success: false, message: 'Account is deactivated' });
    }

    // Compare password
    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) {
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }

    // Generate JWT
    const token = jwt.sign(
      { id: user.id, role: user.role, companyId: user.company_id },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.json({
      success: true,
      message: 'Login successful',
      data: {
        token,
        user: {
          id: user.id,
          name: `${user.first_name} ${user.last_name}`,
          email: user.email,
          role: user.role,
          companyId: user.company_id,
          company: user.company_name
        }
      }
    });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ success: false, message: 'Server error during login' });
  }
});

// POST /api/auth/create-user — Admin creates users in their company
router.post('/create-user', authenticateToken, authorizeRole(['ADMIN']), async (req, res) => {
  try {
    const { firstName, lastName, email, password, role, managerId } = req.body;
    const companyId = req.user.companyId;

    if (!firstName || !lastName || !email || !password || !role) {
      return res.status(400).json({ success: false, message: 'All fields are required' });
    }

    const validRoles = ['ADMIN', 'MANAGER', 'EMPLOYEE'];
    if (!validRoles.includes(role)) {
      return res.status(400).json({ success: false, message: 'Invalid role. Must be ADMIN, MANAGER, or EMPLOYEE' });
    }

    // Rule: Only one ADMIN allowed per company
    if (role === 'ADMIN') {
      const existingAdmin = await query('SELECT id FROM users WHERE company_id = $1 AND role = $2', [companyId, 'ADMIN']);
      if (existingAdmin.rows.length > 0) {
        return res.status(400).json({ success: false, message: 'Limit reached: A company can only have one ADMIN account.' });
      }
    }

    // Check if email exists
    const existing = await query('SELECT id FROM users WHERE email = $1', [email]);
    if (existing.rows.length > 0) {
      return res.status(400).json({ success: false, message: 'Email already in use' });
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    const result = await query(
      `INSERT INTO users (company_id, email, password_hash, first_name, last_name, role, manager_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id, company_id, email, first_name, last_name, role`,
      [companyId, email, passwordHash, firstName, lastName, role, managerId || null]
    );

    const newUser = result.rows[0];

    await auditService.log({
      userId: req.user.id,
      companyId,
      action: 'CREATE_USER',
      entityType: 'user',
      entityId: newUser.id,
      details: { role, createdBy: req.user.id }
    });

    res.status(201).json({
      success: true,
      message: `User created with role ${role}`,
      data: {
        id: newUser.id,
        name: `${newUser.first_name} ${newUser.last_name}`,
        email: newUser.email,
        role: newUser.role
      }
    });
  } catch (err) {
    console.error('Create user error:', err);
    res.status(500).json({ success: false, message: 'Server error creating user' });
  }
});

module.exports = router;
