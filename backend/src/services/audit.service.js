const { query } = require('../config/db');

const auditService = {
  async log({ userId, companyId, action, entityType, entityId, details, ipAddress }) {
    try {
      await query(
        `INSERT INTO audit_logs (user_id, company_id, action, entity_type, entity_id, details, ip_address)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [userId || null, companyId || null, action, entityType, entityId, details ? JSON.stringify(details) : null, ipAddress || null]
      );
    } catch (err) {
      console.error('Audit log error:', err.message);
    }
  }
};

module.exports = auditService;
