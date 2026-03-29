const { query } = require('../config/db');

class ApprovalEngineService {
  /**
   * Initiates the approval workflow when an expense is submitted.
   * Finds the default workflow, gets Step 1, and creates PENDING approvals.
   */
  async initiateApprovalFlow(expenseId, companyId) {
    // Find the default workflow for this company
    const wfResult = await query(
      `SELECT id FROM workflows WHERE company_id = $1 AND is_default = TRUE AND is_active = TRUE LIMIT 1`,
      [companyId]
    );

    if (wfResult.rows.length === 0) {
      // Auto-approve if no workflow configured
      await query(`UPDATE expenses SET status = 'APPROVED', resolved_at = NOW(), updated_at = NOW() WHERE id = $1`, [expenseId]);
      return { status: 'APPROVED', message: 'Auto-approved (no workflow configured)' };
    }

    const workflowId = wfResult.rows[0].id;

    // Link expense to workflow
    await query(
      `INSERT INTO expense_workflow (expense_id, workflow_id, current_step) VALUES ($1, $2, 1)`,
      [expenseId, workflowId]
    );

    // Get the first step
    const stepResult = await query(
      `SELECT id, approver_role FROM workflow_steps WHERE workflow_id = $1 AND step_order = 1`,
      [workflowId]
    );

    if (stepResult.rows.length === 0) {
      await query(`UPDATE expenses SET status = 'APPROVED', resolved_at = NOW(), updated_at = NOW() WHERE id = $1`, [expenseId]);
      return { status: 'APPROVED', message: 'Auto-approved (no workflow steps)' };
    }

    const step = stepResult.rows[0];

    // Find approvers with the required role in this company
    const approverResult = await query(
      `SELECT id FROM users WHERE company_id = $1 AND role = $2 AND is_active = TRUE LIMIT 1`,
      [companyId, step.approver_role]
    );

    if (approverResult.rows.length === 0) {
      await query(`UPDATE expenses SET status = 'APPROVED', resolved_at = NOW(), updated_at = NOW() WHERE id = $1`, [expenseId]);
      return { status: 'APPROVED', message: `Auto-approved (no ${step.approver_role} users found)` };
    }

    // Create pending approval record
    await query(
      `INSERT INTO approvals (expense_id, workflow_step_id, approver_id, status) VALUES ($1, $2, $3, 'PENDING')`,
      [expenseId, step.id, approverResult.rows[0].id]
    );

    return { status: 'PENDING', message: 'Approval flow initiated' };
  }

  /**
   * Process an approval/rejection action
   */
  async processApprovalAction(expenseId, approverId, action, comments) {
    // Find the pending approval for this approver
    const approvalResult = await query(
      `SELECT a.id, a.workflow_step_id, ws.step_order, ws.workflow_id
       FROM approvals a
       JOIN workflow_steps ws ON a.workflow_step_id = ws.id
       WHERE a.expense_id = $1 AND a.approver_id = $2 AND a.status = 'PENDING'
       LIMIT 1`,
      [expenseId, approverId]
    );

    if (approvalResult.rows.length === 0) {
      throw new Error('No pending approval found for this approver on this expense');
    }

    const approval = approvalResult.rows[0];

    // Update the approval record
    await query(
      `UPDATE approvals SET status = $1, comments = $2, acted_at = NOW() WHERE id = $3`,
      [action, comments || null, approval.id]
    );

    // If REJECTED, immediately reject the expense
    if (action === 'REJECTED') {
      await query(
        `UPDATE expenses SET status = 'REJECTED', resolved_at = NOW(), updated_at = NOW() WHERE id = $1`,
        [expenseId]
      );
      return { status: 'REJECTED', message: 'Expense rejected' };
    }

    // If APPROVED, check if there's a next step
    return this.advanceToNextStep(expenseId, approval.step_order, approval.workflow_id);
  }

  /**
   * Advances to the next workflow step or finalizes approval
   */
  async advanceToNextStep(expenseId, currentStepOrder, workflowId) {
    // Get the expense to find company_id
    const expResult = await query(`SELECT company_id FROM expenses WHERE id = $1`, [expenseId]);
    const companyId = expResult.rows[0].company_id;

    // Find next step
    const nextStepResult = await query(
      `SELECT id, approver_role, step_order FROM workflow_steps 
       WHERE workflow_id = $1 AND step_order > $2 
       ORDER BY step_order ASC LIMIT 1`,
      [workflowId, currentStepOrder]
    );

    if (nextStepResult.rows.length === 0) {
      // No more steps — fully approved
      await query(
        `UPDATE expenses SET status = 'APPROVED', resolved_at = NOW(), updated_at = NOW() WHERE id = $1`,
        [expenseId]
      );
      // Update expense_workflow current step
      await query(
        `UPDATE expense_workflow SET current_step = $1, updated_at = NOW() WHERE expense_id = $2`,
        [currentStepOrder, expenseId]
      );
      return { status: 'APPROVED', message: 'Expense fully approved' };
    }

    const nextStep = nextStepResult.rows[0];

    // Find next approver
    const approverResult = await query(
      `SELECT id FROM users WHERE company_id = $1 AND role = $2 AND is_active = TRUE LIMIT 1`,
      [companyId, nextStep.approver_role]
    );

    if (approverResult.rows.length === 0) {
      // No user for next role, auto-approve
      await query(
        `UPDATE expenses SET status = 'APPROVED', resolved_at = NOW(), updated_at = NOW() WHERE id = $1`,
        [expenseId]
      );
      return { status: 'APPROVED', message: `Auto-approved (no ${nextStep.approver_role} found for next step)` };
    }

    // Create next approval
    await query(
      `INSERT INTO approvals (expense_id, workflow_step_id, approver_id, status) VALUES ($1, $2, $3, 'PENDING')`,
      [expenseId, nextStep.id, approverResult.rows[0].id]
    );

    // Update expense_workflow current step
    await query(
      `UPDATE expense_workflow SET current_step = $1, updated_at = NOW() WHERE expense_id = $2`,
      [nextStep.step_order, expenseId]
    );

    return { status: 'PENDING', message: `Advanced to step ${nextStep.step_order}` };
  }

  /**
   * Admin override — directly approve or reject
   */
  async adminOverride(expenseId, adminId, action) {
    const newStatus = action === 'APPROVED' ? 'APPROVED' : 'REJECTED';

    await query(
      `UPDATE expenses SET status = $1, overridden_by_admin = TRUE, resolved_at = NOW(), updated_at = NOW() WHERE id = $2`,
      [newStatus, expenseId]
    );

    // Mark all pending approvals as overridden
    await query(
      `UPDATE approvals SET status = $1, comments = 'Admin override', acted_at = NOW() 
       WHERE expense_id = $2 AND status = 'PENDING'`,
      [newStatus, expenseId]
    );

    return { status: newStatus, message: `Admin override: expense ${newStatus.toLowerCase()}` };
  }
}

module.exports = new ApprovalEngineService();
