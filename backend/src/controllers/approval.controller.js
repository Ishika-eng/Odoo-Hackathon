const approvalEngineService = require('../services/approvalEngine.service');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// In a real app, `req.user` would be set by the Auth middleware.
// We assume it's set as `{ id: 'uuid', role: 'MANAGER', company_id: 'uuid' }`

exports.getPendingApprovals = async (req, res) => {
  try {
    const approverId = req.user.id;
    const pending = await prisma.expenseApproval.findMany({
      where: {
        approver_id: parseInt(approverId),
        status: 'PENDING'
      },
      include: {
        expense: {
          include: { user: true, items: true }
        }
      }
    });
    res.json(pending);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.getApprovalTrail = async (req, res) => {
  try {
    const { expenseId } = req.params;
    const trail = await prisma.expenseApproval.findMany({
      where: { expense_id: parseInt(expenseId) },
      orderBy: { step_order: 'asc' },
      include: { approver: true }
    });
    res.json(trail);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.processAction = async (req, res) => {
  try {
    const { expenseId } = req.params;
    const { action, comment } = req.body; // 'APPROVED' or 'REJECTED'
    const approverId = req.user.id;

    if (!['APPROVED', 'REJECTED'].includes(action)) {
      return res.status(400).json({ error: "Action must be APPROVED or REJECTED" });
    }

    const result = await approvalEngineService.processApprovalAction(expenseId, approverId, action, comment);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.adminOverride = async (req, res) => {
  try {
    const { expenseId } = req.params;
    const { action } = req.body;
    const adminId = req.user.id;

    if (req.user.role !== 'ADMIN') {
      return res.status(403).json({ error: "Only ADMIN can override approvals" });
    }

    const result = await approvalEngineService.adminOverrideApproval(expenseId, adminId, action);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Admin configuration controllers
exports.configureWorkflow = async (req, res) => {
  try {
    const companyId = parseInt(req.user.company_id);
    const { steps } = req.body; // Array of { role, step_order, is_mandatory, is_manager_approver }
    
    // Replace all workflows (simplest for a hackathon)
    await prisma.approvalWorkflow.deleteMany({ where: { company_id: companyId } });
    
    const createdSteps = await prisma.$transaction(
      steps.map(step => prisma.approvalWorkflow.create({
        data: {
          company_id: companyId,
          ...step
        }
      }))
    );
    
    res.json({ message: "Workflows updated", steps: createdSteps });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.getWorkflows = async (req, res) => {
  try {
    const companyId = parseInt(req.user.company_id);
    const steps = await prisma.approvalWorkflow.findMany({
      where: { company_id: companyId },
      orderBy: { step_order: 'asc' }
    });
    res.json(steps);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.configureRule = async (req, res) => {
  try {
    const companyId = parseInt(req.user.company_id);
    const { rule_type, percentage, specific_approver_id, hybrid_logic } = req.body;

    // Remove existing rule
    await prisma.approvalRule.deleteMany({ where: { company_id: companyId } });

    const newRule = await prisma.approvalRule.create({
      data: {
        company_id: companyId,
        rule_type,
        percentage,
        specific_approver_id,
        hybrid_logic
      }
    });

    res.json({ message: "Rule configured", rule: newRule });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.getRule = async (req, res) => {
  try {
    const companyId = parseInt(req.user.company_id);
    const rule = await prisma.approvalRule.findFirst({
      where: { company_id: companyId }
    });
    res.json(rule);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
