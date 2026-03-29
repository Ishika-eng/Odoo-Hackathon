const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const { query } = require('./config/db');
const { authenticateToken, authorizeRole } = require('./middleware/auth');

// Routes
const authRoutes = require('./routes/auth');
const expenseRoutes = require('./routes/expenses');
const approvalRoutes = require('./routes/approval.routes');
const receiptRoutes = require('./routes/receipts');
const ocrRoutes = require('./routes/ocr');

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Serve uploaded files
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// Health check
app.get('/api/health', (req, res) => {
  res.json({ success: true, message: 'Server is running' });
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/expenses', expenseRoutes);
app.use('/api/approvals', approvalRoutes);
app.use('/api/receipts', receiptRoutes);
app.use('/api/ocr', ocrRoutes);

// GET /api/categories
app.get('/api/categories', authenticateToken, async (req, res) => {
  try {
    const result = await query(
      `SELECT id, name, description FROM expense_categories WHERE company_id = $1 AND is_active = TRUE ORDER BY name`,
      [req.user.companyId]
    );
    res.json({ success: true, data: result.rows });
  } catch (err) {
    console.error('Fetch categories error:', err);
    res.status(500).json({ success: false, message: 'Server error fetching categories' });
  }
});

// GET /api/users
app.get('/api/users', authenticateToken, async (req, res) => {
  try {
    const result = await query(
      `SELECT id, first_name, last_name, email, role, is_active, created_at
       FROM users WHERE company_id = $1 ORDER BY created_at DESC`,
      [req.user.companyId]
    );
    res.json({ success: true, data: result.rows });
  } catch (err) {
    console.error('Fetch users error:', err);
    res.status(500).json({ success: false, message: 'Server error fetching users' });
  }
});

// GET /api/audit
app.get('/api/audit', authenticateToken, authorizeRole(['ADMIN']), async (req, res) => {
  try {
    const result = await query(
      `SELECT al.*, u.first_name, u.last_name
       FROM audit_logs al
       LEFT JOIN users u ON al.user_id = u.id
       WHERE al.company_id = $1
       ORDER BY al.created_at DESC
       LIMIT 100`,
      [req.user.companyId]
    );
    res.json({ success: true, data: result.rows });
  } catch (err) {
    console.error('Fetch audit logs error:', err);
    res.status(500).json({ success: false, message: 'Server error fetching audit logs' });
  }
});

// GET /api/dashboard/stats — Dashboard statistics
app.get('/api/dashboard/stats', authenticateToken, async (req, res) => {
  try {
    const companyId = req.user.companyId;
    const userId = req.user.id;
    const role = req.user.role;

    let expenseFilter = 'WHERE e.company_id = $1';
    let params = [companyId];

    if (role === 'EMPLOYEE') {
      expenseFilter = 'WHERE e.user_id = $1';
      params = [userId];
    }

    const [totalRes, pendingRes, approvedRes, rejectedRes, recentRes] = await Promise.all([
      query(`SELECT COUNT(*) as count, COALESCE(SUM(amount), 0) as total FROM expenses e ${expenseFilter}`, params),
      query(`SELECT COUNT(*) as count, COALESCE(SUM(amount), 0) as total FROM expenses e ${expenseFilter} AND e.status = 'PENDING'`, params),
      query(`SELECT COUNT(*) as count, COALESCE(SUM(amount), 0) as total FROM expenses e ${expenseFilter} AND e.status = 'APPROVED'`, params),
      query(`SELECT COUNT(*) as count, COALESCE(SUM(amount), 0) as total FROM expenses e ${expenseFilter} AND e.status = 'REJECTED'`, params),
      query(`SELECT e.*, u.first_name, u.last_name FROM expenses e LEFT JOIN users u ON e.user_id = u.id ${expenseFilter} ORDER BY e.created_at DESC LIMIT 5`, params)
    ]);

    // Pending approvals count for managers/admins
    let pendingApprovals = 0;
    if (role === 'MANAGER' || role === 'ADMIN') {
      const paRes = await query(
        `SELECT COUNT(*) as count FROM approvals WHERE approver_id = $1 AND status = 'PENDING'`,
        [userId]
      );
      pendingApprovals = parseInt(paRes.rows[0].count);
    }

    res.json({
      success: true,
      data: {
        total: { count: parseInt(totalRes.rows[0].count), amount: parseFloat(totalRes.rows[0].total) },
        pending: { count: parseInt(pendingRes.rows[0].count), amount: parseFloat(pendingRes.rows[0].total) },
        approved: { count: parseInt(approvedRes.rows[0].count), amount: parseFloat(approvedRes.rows[0].total) },
        rejected: { count: parseInt(rejectedRes.rows[0].count), amount: parseFloat(rejectedRes.rows[0].total) },
        pendingApprovals,
        recentExpenses: recentRes.rows
      }
    });
  } catch (err) {
    console.error('Dashboard stats error:', err);
    res.status(500).json({ success: false, message: 'Server error fetching stats' });
  }
});

// Global Error Handler
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  if (err.message && err.message.includes('Invalid file type')) {
    return res.status(400).json({ success: false, message: err.message });
  }
  res.status(500).json({ success: false, message: 'Internal server error' });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ success: false, message: `Route ${req.method} ${req.url} not found` });
});

// Start server
const PORT = process.env.PORT || 5000;
app.listen(PORT, async () => {
  try {
    await query('SELECT NOW()');
    console.log(`Server running on port ${PORT}`);
    console.log('Database connected successfully');
  } catch (err) {
    console.error('Database connection failed:', err.message);
    console.log(`Server running on port ${PORT} (DB not connected)`);
  }
});
