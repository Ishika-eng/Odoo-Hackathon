const { query } = require('../config/db');

/**
 * Rule Engine — evaluates approval rules after each approval action.
 * Uses the approval_rules table from the SQL schema.
 */
class RuleEngineService {
  async evaluate(expenseId, workflowStepId) {
    // Get the rule for this workflow step
    const ruleResult = await query(
      `SELECT * FROM approval_rules WHERE workflow_step_id = $1 LIMIT 1`,
      [workflowStepId]
    );

    if (ruleResult.rows.length === 0) {
      return { shouldApprove: false, reason: 'No rule configured, defer to sequential flow' };
    }

    const rule = ruleResult.rows[0];

    // Get all approvals for this expense at this step
    const approvalsResult = await query(
      `SELECT * FROM approvals WHERE expense_id = $1 AND workflow_step_id = $2`,
      [expenseId, workflowStepId]
    );

    const approvals = approvalsResult.rows;
    const approvedCount = approvals.filter(a => a.status === 'APPROVED').length;
    const totalCount = approvals.length || 1;

    switch (rule.rule_type) {
      case 'PERCENTAGE':
        return this._evaluatePercentage(approvedCount, totalCount, parseFloat(rule.percentage_required));

      case 'SPECIFIC':
        return this._evaluateSpecific(approvals, rule.specific_approver_id);

      case 'HYBRID': {
        const pctResult = this._evaluatePercentage(approvedCount, totalCount, parseFloat(rule.percentage_required));
        const specResult = this._evaluateSpecific(approvals, rule.specific_approver_id);
        // Default hybrid logic: both must pass
        const passes = pctResult.shouldApprove && specResult.shouldApprove;
        return { shouldApprove: passes, reason: passes ? 'Hybrid conditions met' : 'Hybrid conditions not met' };
      }

      default:
        return { shouldApprove: false, reason: `Unknown rule type: ${rule.rule_type}` };
    }
  }

  _evaluatePercentage(approvedCount, totalCount, requiredPercentage) {
    if (!requiredPercentage) return { shouldApprove: false, reason: 'Percentage rule missing threshold' };
    const currentPct = (approvedCount / totalCount) * 100;
    const passes = currentPct >= requiredPercentage;
    return {
      shouldApprove: passes,
      reason: passes ? `Percentage met: ${currentPct.toFixed(0)}% >= ${requiredPercentage}%` : 'Percentage not met'
    };
  }

  _evaluateSpecific(approvals, specificApproverId) {
    if (!specificApproverId) return { shouldApprove: false, reason: 'Specific rule missing approver ID' };
    const found = approvals.some(a => a.approver_id === specificApproverId && a.status === 'APPROVED');
    return {
      shouldApprove: found,
      reason: found ? 'Specific approver has approved' : 'Specific approver has not approved yet'
    };
  }
}

module.exports = new RuleEngineService();
