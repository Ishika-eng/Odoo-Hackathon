const express = require('express');
const router = express.Router();
const approvalController = require('../controllers/approval.controller');

const { authenticateToken, authorizeRole } = require('../middlewares/auth');

// Manager / Approver Routes
router.get('/pending', authenticateToken, authorizeRole(['MANAGER', 'ADMIN']), approvalController.getPendingApprovals);
router.post('/:expenseId/action', authenticateToken, authorizeRole(['MANAGER', 'ADMIN']), approvalController.processAction);
router.get('/:expenseId/trail', authenticateToken, approvalController.getApprovalTrail);

// Admin Routing (Admin Dashboard Configuration)
router.post('/workflows', authenticateToken, authorizeRole(['ADMIN']), approvalController.configureWorkflow);
router.get('/workflows', authenticateToken, authorizeRole(['ADMIN', 'MANAGER']), approvalController.getWorkflows);
router.post('/rules', authenticateToken, authorizeRole(['ADMIN']), approvalController.configureRule);
router.get('/rules', authenticateToken, authorizeRole(['ADMIN', 'MANAGER']), approvalController.getRule);
router.put('/:expenseId/override', authenticateToken, authorizeRole(['ADMIN']), approvalController.adminOverride);

module.exports = router;
