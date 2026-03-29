const express = require('express');
const { query } = require('../config/db');
const { authenticateToken, authorizeRole } = require('../middleware/auth');
const approvalEngineService = require('../services/approvalEngine.service');
const auditService = require('../services/audit.service');

const router = express.Router();

// POST /api/expenses — Submit a new expense
router.post('/', authenticateToken, async (req, res) => {
  try {
    const { title, description, amount, currency, categoryId, items, receiptUrl } = req.body;
    const userId = req.user.id;
    const companyId = req.user.companyId;

    if (!title || !amount) {
      return res.status(400).json({ success: false, message: 'Title and amount are required' });
    }

    if (isNaN(parseFloat(amount)) || parseFloat(amount) <= 0) {
      return res.status(400).json({ success: false, message: 'Amount must be a positive number' });
    }

    // Begin Transaction to insert both expense and items atomically
    await query('BEGIN');

    const result = await query(
      `INSERT INTO expenses (company_id, user_id, category_id, title, description, amount, currency, status, receipt_url)
       VALUES ($1, $2, $3, $4, $5, $6, $7, 'PENDING', $8)
       RETURNING *`,
      [companyId, userId, categoryId || null, title, description || null, parseFloat(amount), currency || 'USD', receiptUrl || null]
    );

    const expense = result.rows[0];

    // Insert Items if provided
    if (items && Array.isArray(items) && items.length > 0) {
      for (const item of items) {
        await query(
          `INSERT INTO expense_items (expense_id, name, quantity, price, total) VALUES ($1, $2, $3, $4, $5)`,
          [expense.id, item.name || 'Item', item.quantity || 1, item.price || 0, (item.price || 0) * (item.quantity || 1)]
        );
      }
    }

    await query('COMMIT');

    // Initiate approval workflow
    const flowResult = await approvalEngineService.initiateApprovalFlow(expense.id, companyId);

    await auditService.log({
      userId,
      companyId,
      action: 'CREATE_EXPENSE',
      entityType: 'expense',
      entityId: expense.id,
      details: { amount: expense.amount, currency: expense.currency, title }
    });

    res.status(201).json({
      success: true,
      message: 'Expense submitted successfully',
      data: { expense, workflow: flowResult }
    });
  } catch (err) {
    await query('ROLLBACK');
    console.error('Create expense error:', err);
    res.status(500).json({ success: false, message: 'Server error submitting expense' });
  }
});

// GET /api/expenses — List expenses (role-based)
router.get('/', authenticateToken, async (req, res) => {
  try {
    const { role, id: userId, companyId } = req.user;

    let result;
    if (role === 'ADMIN' || role === 'MANAGER') {
      // Admin/Manager sees all company expenses
      result = await query(
        `SELECT e.*, u.first_name, u.last_name, u.email as user_email,
                ec.name as category_name
         FROM expenses e
         LEFT JOIN users u ON e.user_id = u.id
         LEFT JOIN expense_categories ec ON e.category_id = ec.id
         WHERE e.company_id = $1
         ORDER BY e.created_at DESC`,
        [companyId]
      );
    } else {
      // Employee sees only their own
      result = await query(
        `SELECT e.*, ec.name as category_name
         FROM expenses e
         LEFT JOIN expense_categories ec ON e.category_id = ec.id
         WHERE e.user_id = $1
         ORDER BY e.created_at DESC`,
        [userId]
      );
    }

    res.json({
      success: true,
      data: result.rows
    });
  } catch (err) {
    console.error('Fetch expenses error:', err);
    res.status(500).json({ success: false, message: 'Server error fetching expenses' });
  }
});

// PUT /api/expenses/:id — Update an expense (only if PENDING and owned by user)
router.put('/:id', authenticateToken, async (req, res) => {
  try {
    const expenseId = parseInt(req.params.id);
    const { title, description, amount, currency, categoryId } = req.body;
    const userId = req.user.id;

    // Check ownership and status
    const existing = await query(
      `SELECT * FROM expenses WHERE id = $1 AND user_id = $2`,
      [expenseId, userId]
    );

    if (existing.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Expense not found' });
    }

    if (existing.rows[0].status !== 'PENDING') {
      return res.status(400).json({ success: false, message: 'Can only edit PENDING expenses' });
    }

    const result = await query(
      `UPDATE expenses SET title = COALESCE($1, title), description = COALESCE($2, description),
       amount = COALESCE($3, amount), currency = COALESCE($4, currency),
       category_id = COALESCE($5, category_id), updated_at = NOW()
       WHERE id = $6 RETURNING *`,
      [title, description, amount ? parseFloat(amount) : null, currency, categoryId, expenseId]
    );

    res.json({
      success: true,
      message: 'Expense updated',
      data: result.rows[0]
    });
  } catch (err) {
    console.error('Update expense error:', err);
    res.status(500).json({ success: false, message: 'Server error updating expense' });
  }
});

// DELETE /api/expenses/:id — Delete an expense (only PENDING)
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const expenseId = parseInt(req.params.id);
    const userId = req.user.id;
    const role = req.user.role;

    // Admins can delete any company expense; employees only their own
    let existing;
    if (role === 'ADMIN') {
      existing = await query(
        `SELECT * FROM expenses WHERE id = $1 AND company_id = $2`,
        [expenseId, req.user.companyId]
      );
    } else {
      existing = await query(
        `SELECT * FROM expenses WHERE id = $1 AND user_id = $2`,
        [expenseId, userId]
      );
    }

    if (existing.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Expense not found' });
    }

    if (existing.rows[0].status !== 'PENDING' && role !== 'ADMIN') {
      return res.status(400).json({ success: false, message: 'Can only delete PENDING expenses' });
    }

    await query('DELETE FROM expenses WHERE id = $1', [expenseId]);

    res.json({ success: true, message: 'Expense deleted' });
  } catch (err) {
    console.error('Delete expense error:', err);
    res.status(500).json({ success: false, message: 'Server error deleting expense' });
  }
});

module.exports = router;
