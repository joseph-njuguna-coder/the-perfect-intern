import { db } from '../config/db.js';

export async function audit({ actorId = null, action, entityType = null, entityId = null, before = null, after = null, ip = null }, trx = db) {
  await trx('audit_logs').insert({
    actor_id: actorId, action, entity_type: entityType,
    entity_id: entityId == null ? null : String(entityId),
    before: before ? JSON.stringify(before) : null,
    after: after ? JSON.stringify(after) : null, ip,
  });
}
