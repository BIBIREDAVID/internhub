import { Router } from "express";
import { query } from "../db.js";
import { requireAuth } from "../middleware/auth.js";
import { logActivity } from "../utils/activityLog.js";

const router = Router();
router.use(requireAuth);

router.get("/", async (req, res, next) => {
  try {
    if (req.user.role !== "hr") return res.status(403).json({ error: "Forbidden" });
    const { rows } = await query("SELECT * FROM invites");
    res.json(rows);
  } catch (err) {
    next(err);
  }
});

router.get("/:email", async (req, res, next) => {
  try {
    const email = req.params.email.toLowerCase();
    const isSelf = req.user.email.toLowerCase() === email;
    if (req.user.role !== "hr" && !isSelf) return res.status(403).json({ error: "Forbidden" });
    const { rows } = await query("SELECT * FROM invites WHERE email = $1", [email]);
    if (!rows[0]) return res.status(404).json({ error: "Not found" });
    res.json(rows[0]);
  } catch (err) {
    next(err);
  }
});

router.post("/", async (req, res, next) => {
  try {
    if (req.user.role !== "hr") return res.status(403).json({ error: "Forbidden" });
    const { email, name, role, managerId } = req.body || {};
    if (!email || !name || !role) {
      return res.status(400).json({ error: "email, name and role are required" });
    }
    const normalizedEmail = String(email).toLowerCase();

    const { rows: existingRows } = await query("SELECT * FROM invites WHERE email = $1", [normalizedEmail]);
    const existed = !!existingRows[0];

    const { rows } = await query(
      `INSERT INTO invites (email, name, role, manager_id, invited_by, invited_at, expires_at)
       VALUES ($1, $2, $3, $4, $5, now(), now() + interval '7 days')
       ON CONFLICT (email) DO UPDATE SET
         name = EXCLUDED.name,
         role = EXCLUDED.role,
         manager_id = EXCLUDED.manager_id,
         invited_by = EXCLUDED.invited_by,
         invited_at = now(),
         expires_at = now() + interval '7 days'
       RETURNING *`,
      [normalizedEmail, name, role, managerId ?? null, req.user.uid]
    );

    await logActivity({
      action: existed ? "resend_invite" : "send_invite",
      actorId: req.user.uid,
      actorEmail: req.user.email,
      targetType: "invite",
      targetId: normalizedEmail,
      details: { name, role, managerId: managerId ?? null },
    });

    res.status(existed ? 200 : 201).json(rows[0]);
  } catch (err) {
    next(err);
  }
});

router.delete("/:email", async (req, res, next) => {
  try {
    const email = req.params.email.toLowerCase();
    const isSelf = req.user.email.toLowerCase() === email;
    if (req.user.role !== "hr" && !isSelf) return res.status(403).json({ error: "Forbidden" });
    const { rowCount } = await query("DELETE FROM invites WHERE email = $1", [email]);
    if (rowCount === 0) return res.status(404).json({ error: "Not found" });
    res.status(204).end();
  } catch (err) {
    next(err);
  }
});

export default router;
