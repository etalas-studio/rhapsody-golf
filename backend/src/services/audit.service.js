const supabase = require('../config/supabase');
const logger = require('../utils/logger');

/**
 * Write an audit log entry. Non-blocking — logs a warning on failure.
 * Call with: audit(req, 'action_name', { optional extra context })
 */
async function audit(req, action, meta = {}) {
  const entry = {
    actor_user_id: req.userId,
    actor_name: req.userName ?? req.userId,
    role: req.role,
    action: meta.detail ? `${action}: ${JSON.stringify(meta.detail)}` : action,
    club_id: req.clubId ?? meta.clubId ?? null,
    ip: req.ip ?? '0.0.0.0',
  };

  const { error } = await supabase.from('audit_logs').insert(entry);
  if (error) logger.warn('Audit log write failed', { message: error.message, action });
}

module.exports = { audit };
