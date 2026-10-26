import crypto from "crypto";
import { query } from "../db.js";

export async function logActivity({ action, actorId, actorEmail, targetType, targetId, details }) {
  const entryId = crypto.randomUUID();
  await query(
    `INSERT INTO activity_log (entry_id, action, actor_id, actor_email, target_type, target_id, details, created_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, now())`,
    [entryId, action, actorId ?? null, actorEmail ?? null, targetType ?? null, targetId ?? null, details ? JSON.stringify(details) : null]
  );
}
