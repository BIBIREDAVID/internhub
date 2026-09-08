import { addDoc, collection } from "firebase/firestore";
import { db } from "../firebase";

/**
 * Best-effort audit trail for HR actions. Never blocks or throws on the
 * caller — a logging failure shouldn't stop the actual action from
 * succeeding, so errors are swallowed after a console warning.
 */
export async function logActivity({ actor, action, targetType, targetId, details }) {
  try {
    await addDoc(collection(db, "activityLog"), {
      action,
      actorId: actor?.uid || null,
      actorEmail: actor?.email || null,
      targetType,
      targetId,
      details: details || {},
      createdAt: new Date().toISOString(),
    });
  } catch (error) {
    console.warn("Activity log write failed:", error);
  }
}
