const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const ruleEngineService = require('./ruleEngine.service');

/**
 * 🔁 Approval Engine - Multi-Step Sequential Flow
 */
class ApprovalEngineService {
  /**
   * Initializes the approval flow when an expense is submitted.
   * Finds the first approver and creates the Pending ExpenseApproval.
   * @param {string} expenseId 
   */
  async initiateApprovalFlow(expenseId) {
    const expense = await prisma.expense.findUnique({
      where: { id: expenseId },
      include: { user: true }
    });

    if (!expense) throw new Error("Expense not found");

    const workflows = await prisma.approvalWorkflow.findMany({
      where: { company_id: expense.company_id },
      orderBy: { step_order: 'asc' }
    });

    if (workflows.length === 0) {
      // Auto-approve if no workflows configured
      await prisma.expense.update({
        where: { id: expenseId },
        data: { status: 'APPROVED' }
      });
      await this.logAudit(expense.user_id, `Expense ${expenseId} auto-approved (no workflow)`);
      return { status: 'APPROVED', message: "Auto-approved since no workflows configured" };
    }

    // Step 0 check: Does this company workflow require manager approval first?
    // We check if the FIRST workflow step requires manager, or if the employee has a manager that MUST review
    const managerFirstStep = workflows.find(w => w.is_manager_approver);
    let firstApproverId = null;
    let initialStepOrder = 1;

    if (managerFirstStep && expense.user.manager_id) {
      firstApproverId = expense.user.manager_id;
      initialStepOrder = managerFirstStep.step_order;
    } else {
      // Find the first matching role users in the company
      const firstStepRoleUsers = await prisma.user.findMany({
        where: { company_id: expense.company_id, role: workflows[0].role }
      });
      if (firstStepRoleUsers.length === 0) {
        throw new Error(`No users found for initial workflow role: ${workflows[0].role}`);
      }
      firstApproverId = firstStepRoleUsers[0].id; // Simplified: picks first user with role
      initialStepOrder = workflows[0].step_order;
    }

    // Create the first approval step
    await prisma.expenseApproval.create({
      data: {
        expense_id: expenseId,
        approver_id: firstApproverId,
        step_order: initialStepOrder,
        status: 'PENDING'
      }
    });

    await prisma.expense.update({
      where: { id: expenseId },
      data: { status: 'PENDING' }
    });

    await this.logAudit(expense.user_id, `Initiated approval flow for Expense ${expenseId}, pending approver: ${firstApproverId}`);
    return { status: 'PENDING', message: "Approval flow initiated" };
  }

  /**
   * Process a manager/admin's action (APPROVE/REJECT) on a specific expense
   * @param {string} expenseId 
   * @param {string} approverId 
   * @param {string} action 'APPROVED' or 'REJECTED'
   * @param {string} comment 
   */
  async processApprovalAction(expenseId, approverId, action, comment) {
    if (!['APPROVED', 'REJECTED'].includes(action)) {
      throw new Error(`Invalid action: ${action}`);
    }

    // 1. Find the pending approval record for this expense + approver
    const pendingApproval = await prisma.expenseApproval.findFirst({
      where: {
        expense_id: expenseId,
        approver_id: approverId,
        status: 'PENDING'
      }
    });

    if (!pendingApproval) {
      throw new Error("No pending approval found for this approver on this expense");
    }

    // 2. Update the specific approval record
    await prisma.expenseApproval.update({
      where: { id: pendingApproval.id },
      data: {
        status: action,
        comment: comment,
        action_date: new Date()
      }
    });

    await this.logAudit(approverId, `${action} expense ${expenseId} at step ${pendingApproval.step_order}`);

    // Fetch expense to get company_id
    const expense = await prisma.expense.findUnique({
      where: { id: expenseId }
    });

    // 3. Short-circuit if REJECTED
    if (action === 'REJECTED') {
      await prisma.expense.update({
        where: { id: expenseId },
        data: { status: 'REJECTED' }
      });
      await this.logAudit(approverId, `Expense ${expenseId} marked REJECTED due to approver rejection`);
      return { status: 'REJECTED', message: "Expense rejected" };
    }

    // 4. Rule Engine Evaluation after an APPROVED action
    try {
      const evaluation = await ruleEngineService.evaluate(expenseId, expense.company_id);
      
      if (evaluation.shouldApprove) {
        // Engine returned early approval!
        await prisma.expense.update({
          where: { id: expenseId },
          data: { status: 'APPROVED' }
        });
        await this.logAudit(approverId, `Expense ${expenseId} auto-approved by Rule Engine: ${evaluation.reason}`);
        return { status: 'APPROVED', message: `Expense approved by Rule Engine: ${evaluation.reason}` };
      }
    } catch(err) {
      console.error("Rule engine evaluation error:", err);
      // Fallback to sequential flow if rule evaluation fails or isn't set up yet
    }

    // 5. Normal Sequential Flow - Advance to next step
    return this.advanceToNextStep(expenseId, pendingApproval.step_order, expense.company_id);
  }

  /**
   * Advances the approval flow to the next step
   */
  async advanceToNextStep(expenseId, currentStepOrder, companyId) {
    // Determine the next step by looking at the workflow configurations
    const workflows = await prisma.approvalWorkflow.findMany({
      where: { company_id: companyId },
      orderBy: { step_order: 'asc' }
    });

    const nextWorkflowStep = workflows.find(w => w.step_order > currentStepOrder);

    if (!nextWorkflowStep) {
      // Reached the end of the workflows! Final approval.
      await prisma.expense.update({
        where: { id: expenseId },
        data: { status: 'APPROVED' }
      });
      return { status: 'APPROVED', message: "Expense fully approved sequentially" };
    }

    // Find next approver
    // Simple logic: Find first user with that role
    const nextApprovers = await prisma.user.findMany({
      where: { company_id: companyId, role: nextWorkflowStep.role }
    });

    if (nextApprovers.length === 0) {
      // If no user found for role but step is mandatory, we have a problem.
      throw new Error(`Next step required ${nextWorkflowStep.role} but no users found`);
    }

    await prisma.expenseApproval.create({
      data: {
        expense_id: expenseId,
        approver_id: nextApprovers[0].id,
        step_order: nextWorkflowStep.step_order,
        status: 'PENDING'
      }
    });

    await this.logAudit("SYSTEM", `Expense ${expenseId} advanced to step ${nextWorkflowStep.step_order}`);
    return { status: 'PENDING', message: "Advanced to next step" };
  }

  /**
   * Admin direct override
   */
  async adminOverrideApproval(expenseId, adminId, action) {
    if (!['APPROVED', 'REJECTED'].includes(action)) throw new Error("Invalid action");

    await prisma.expense.update({
      where: { id: expenseId },
      data: { status: action }
    });

    await this.logAudit(adminId, `ADMIN OVERRIDE: Expense ${expenseId} set to ${action}`);
    return { status: action, message: `Admin override applied: ${action}` };
  }

  // Audit Logs
  async logAudit(userId, actionMsg) {
    await prisma.auditLog.create({
      data: { user_id: userId, action: actionMsg }
    });
  }
}

module.exports = new ApprovalEngineService();
