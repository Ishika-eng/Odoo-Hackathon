const express = require('express');
const { query } = require('../config/db');
const { authenticateToken, authorizeRole } = require('../middleware/auth');
const approvalEngineService = require('../services/approvalEngine.service');
const auditService = require('../services/audit.service');

const router = express.Router();

// GET /api/approvals/pending — Get pending approvals for the current user
router.get('/pending', authenticateToken, authorizeRole(['MANAGER', 'ADMIN']), async (req, res) => {
  try {
    const approverId = req.user.id;

    const result = await query(
      `SELECT a.id, a.expense_id, a.status, a.comments, a.created_at,
              ws.step_order, ws.step_name, ws.approver_role,
              e.title, e.description, e.amount, e.currency, e.status as expense_status, e.submitted_at,
              u.first_name, u.last_name, u.email as submitter_email,
              ec.name as category_name
       FROM approvals a
       JOIN workflow_steps ws ON a.workflow_step_id = ws.id
       JOIN expenses e ON a.expense_id = e.id
       LEFT JOIN users u ON e.user_id = u.id
       LEFT JOIN expense_categories ec ON e.category_id = ec.id
       WHERE a.approver_id = $1 AND a.status = 'PENDING'
       ORDER BY a.created_at DESC`,
      [approverId]
    );

    res.json({
      success: true,
      data: result.rows
    });
  } catch (err) {
    console.error('Fetch pending approvals error:', err);
    res.status(500).json({ success: false, message: 'Server error fetching approvals' });
  }
});

// POST /api/approvals/:expenseId — Approve or reject an expense
router.post('/:expenseId', authenticateToken, authorizeRole(['MANAGER', 'ADMIN']), async (req, res) => {
  try {
    const expenseId = parseInt(req.params.expenseId);
    const { action, comment } = req.body;
    const approverId = req.user.id;

    if (!['APPROVED', 'REJECTED'].includes(action)) {
      return res.status(400).json({ success: false, message: 'Action must be APPROVED or REJECTED' });
    }

    const result = await approvalEngineService.processApprovalAction(expenseId, approverId, action, comment);

    const auditAction = action === 'APPROVED' ? 'APPROVE' : 'REJECT';
    await auditService.log({
      userId: approverId,
      companyId: req.user.companyId,
      action: auditAction,
      entityType: 'expense',
      entityId: expenseId,
      details: { action, comment }
    });

    res.json({
      success: true,
      message: result.message,
      data: result
    });
  } catch (err) {
    console.error('Process approval error:', err);
    res.status(500).json({ success: false, message: err.message || 'Server error processing approval' });
  }
});

// GET /api/approvals/:expenseId/trail — Get the approval trail for an expense
router.get('/:expenseId/trail', authenticateToken, async (req, res) => {
  try {
    const expenseId = parseInt(req.params.expenseId);

    const result = await query(
      `SELECT a.id, a.status, a.comments, a.acted_at, a.created_at,
              ws.step_order, ws.step_name,
              u.first_name, u.last_name, u.role
       FROM approvals a
       JOIN workflow_steps ws ON a.workflow_step_id = ws.id
       LEFT JOIN users u ON a.approver_id = u.id
       WHERE a.expense_id = $1
       ORDER BY ws.step_order ASC, a.created_at ASC`,
      [expenseId]
    );

    res.json({
      success: true,
      data: result.rows
    });
  } catch (err) {
    console.error('Fetch approval trail error:', err);
    res.status(500).json({ success: false, message: 'Server error fetching approval trail' });
  }
});

// PUT /api/approvals/:expenseId/override — Admin override
router.put('/:expenseId/override', authenticateToken, authorizeRole(['ADMIN']), async (req, res) => {
  try {
    const expenseId = parseInt(req.params.expenseId);
    const { action } = req.body;

    if (!['APPROVED', 'REJECTED'].includes(action)) {
      return res.status(400).json({ success: false, message: 'Action must be APPROVED or REJECTED' });
    }

    const result = await approvalEngineService.adminOverride(expenseId, req.user.id, action);

    await auditService.log({
      userId: req.user.id,
      companyId: req.user.companyId,
      action: action === 'APPROVED' ? 'APPROVE' : 'REJECT',
      entityType: 'expense',
      entityId: expenseId,
      details: { action, override: true }
    });

    res.json({
      success: true,
      message: result.message,
      data: result
    });
  } catch (err) {
    console.error('Admin override error:', err);
    res.status(500).json({ success: false, message: 'Server error processing override' });
  }
});

// GET /api/approvals/workflows — Get workflows for admin
router.get('/workflows', authenticateToken, authorizeRole(['ADMIN', 'MANAGER']), async (req, res) => {
  try {
    const companyId = req.user.companyId;

    const result = await query(
      `SELECT w.id as workflow_id, w.name as workflow_name, w.is_default,
              ws.id as step_id, ws.step_order, ws.approver_role, ws.step_name
       FROM workflows w
       LEFT JOIN workflow_steps ws ON w.id = ws.workflow_id
       WHERE w.company_id = $1 AND w.is_active = TRUE
       ORDER BY w.id, ws.step_order`,
      [companyId]
    );

    res.json({
      success: true,
      data: result.rows
    });
  } catch (err) {
    console.error('Fetch workflows error:', err);
    res.status(500).json({ success: false, message: 'Server error fetching workflows' });
  }
});

module.exports = router;
