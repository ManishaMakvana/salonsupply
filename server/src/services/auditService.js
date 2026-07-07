const db = require('../config/db');

async function logAudit({ user, action, entityType, entityId, details }) {
    try {
        await db.execute(
            `INSERT INTO audit_logs (user_id, user_role, action, entity_type, entity_id, details)
             VALUES (?, ?, ?, ?, ?, ?)`,
            [
                user?.id ?? null,
                user?.role ?? null,
                action,
                entityType ?? null,
                entityId ?? null,
                details ? JSON.stringify(details) : null,
            ]
        );
    } catch (err) {
        console.error('[audit]', err.message);
    }
}

module.exports = { logAudit };
