const express = require('express');
const router = express.Router();
const approvalController = require('../controllers/approval.controller');

// DUMMY AUTH MIDDLEWARE (For Hackathon integration purposes)
// Person 2 will replace this with real JWT verification.
const mockAuth = (req, res, next) => {
  // Mocking `req.user` for development
  const authHeader = req.headers.authorization;
  if (!authHeader) return res.status(401).json({ error: "No auth header provided" });
  
  try {
    // Expected format for mock: 'Bearer {"id":"...","role":"MANAGER","company_id":"..."}'
    const tokenData = authHeader.split(' ')[1];
    req.user = JSON.parse(tokenData);
    next();
  } catch (err) {
    res.status(401).json({ error: "Invalid mock token structure" });
  }
};

// Manager / Approver Routes
router.get('/pending', mockAuth, approvalController.getPendingApprovals);
router.post('/:expenseId/action', mockAuth, approvalController.processAction);
router.get('/:expenseId/trail', mockAuth, approvalController.getApprovalTrail);

// Admin Routing (Admin Dashboard Configuration)
router.post('/workflows', mockAuth, approvalController.configureWorkflow);
router.get('/workflows', mockAuth, approvalController.getWorkflows);
router.post('/rules', mockAuth, approvalController.configureRule);
router.get('/rules', mockAuth, approvalController.getRule);
router.put('/:expenseId/override', mockAuth, approvalController.adminOverride);

module.exports = router;
