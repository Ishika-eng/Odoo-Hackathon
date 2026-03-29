const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

/**
 * 🧠 Rule Engine - Core Logic
 */
class RuleEngineService {
  /**
   * Evaluates the rules for a specific expense.
   * Runs after EVERY approval action.
   * 
   * @param {string} expenseId 
   * @param {string} companyId 
   * @returns {Promise<{ shouldApprove: boolean, reason: string }>}
   */
  async evaluate(expenseId, companyId) {
    // 1. Fetch the company's rule configuration
    const rule = await prisma.approvalRule.findFirst({
      where: { company_id: companyId }
    });

    if (!rule) {
      return { shouldApprove: false, reason: "No rule configured for company, defer to sequential flow" };
    }

    // 2. Fetch all approval actions for this expense
    const approvals = await prisma.expenseApproval.findMany({
      where: { expense_id: expenseId }
    });

    const approvedApprovals = approvals.filter(a => a.status === 'APPROVED');
    
    // We also need the total mandatory steps to calculate percentage
    const workflows = await prisma.approvalWorkflow.findMany({
      where: { company_id: companyId, is_mandatory: true }
    });
    const totalMandatorySteps = workflows.length || 1; // prevent div/0
    
    // 3. Evaluate based on rule type
    switch (rule.rule_type) {
      case 'PERCENTAGE':
        return this._evaluatePercentage(approvedApprovals.length, totalMandatorySteps, rule.percentage);
        
      case 'SPECIFIC':
        return this._evaluateSpecific(approvedApprovals, rule.specific_approver_id);
        
      case 'HYBRID':
        return this._evaluateHybrid(approvedApprovals, totalMandatorySteps, rule);
        
      default:
        return { shouldApprove: false, reason: `Unknown rule type: ${rule.rule_type}` };
    }
  }

  _evaluatePercentage(approvedCount, totalSteps, requiredPercentage) {
    if (!requiredPercentage) return { shouldApprove: false, reason: "Percentage rule missing threshold" };
    
    const currentPercentage = (approvedCount / totalSteps) * 100;
    const passes = currentPercentage >= requiredPercentage;
    
    return {
      shouldApprove: passes,
      reason: passes ? `Percentage met: ${currentPercentage.toFixed(2)}% >= ${requiredPercentage}%` : `Percentage not met`
    };
  }

  _evaluateSpecific(approvals, specificApproverId) {
    if (!specificApproverId) return { shouldApprove: false, reason: "Specific rule missing approver ID" };

    const specificApproved = approvals.some(a => 
      a.approver_id === specificApproverId && a.status === 'APPROVED'
    );
    
    return {
      shouldApprove: !!specificApproved,
      reason: specificApproved ? "Specific approver has approved" : "Specific approver has not approved yet"
    };
  }

  _evaluateHybrid(approvals, totalSteps, rule) {
    if (!rule.percentage || !rule.specific_approver_id || !rule.hybrid_logic) {
      return { shouldApprove: false, reason: "Hybrid rule missing required configuration (percentage/specific_approver_id/hybrid_logic)" };
    }

    const { shouldApprove: pctPasses } = this._evaluatePercentage(approvals.filter(a => a.status === 'APPROVED').length, totalSteps, rule.percentage);
    const { shouldApprove: specificPasses } = this._evaluateSpecific(approvals, rule.specific_approver_id);

    if (rule.hybrid_logic === 'AND') {
      const passes = pctPasses && specificPasses;
      return {
        shouldApprove: passes,
        reason: passes ? "Hybrid AND conditions met" : "Hybrid AND conditions not met"
      };
    } else if (rule.hybrid_logic === 'OR') {
      const passes = pctPasses || specificPasses;
      return {
        shouldApprove: passes,
        reason: passes ? "Hybrid OR conditions met" : "Hybrid OR conditions not met"
      };
    }

    return { shouldApprove: false, reason: "Invalid hybrid logic operator" };
  }
}

module.exports = new RuleEngineService();
