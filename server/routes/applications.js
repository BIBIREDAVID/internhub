import { Router } from "express";
import crypto from "crypto";
import { query } from "../db.js";
import { requireAuth } from "../middleware/auth.js";
import { requireRole } from "../middleware/authorize.js";
import { logActivity } from "../utils/activityLog.js";

const router = Router();
router.use(requireAuth, requireRole("hr"));

router.get("/", async (req, res, next) => {
  try {
    const { rows } = await query("SELECT * FROM applications ORDER BY created_at DESC");
    res.json(rows);
  } catch (err) {
    next(err);
  }
});

router.get("/:id", async (req, res, next) => {
  try {
    const { rows } = await query("SELECT * FROM applications WHERE application_id = $1", [req.params.id]);
    if (!rows[0]) return res.status(404).json({ error: "Not found" });
    res.json(rows[0]);
  } catch (err) {
    next(err);
  }
});

router.post("/", async (req, res, next) => {
  try {
    const { candidate_name, candidate_email, department, stage, status } = req.body || {};
    if (!candidate_name || !candidate_email) {
      return res.status(400).json({ error: "candidate_name and candidate_email are required" });
    }
    const applicationId = crypto.randomUUID();
    const { rows } = await query(
      `INSERT INTO applications (application_id, candidate_name, candidate_email, department, stage, status, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, now())
       RETURNING *`,
      [applicationId, candidate_name, candidate_email, department ?? null, stage ?? null, status ?? null]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    next(err);
  }
});

router.patch("/:id", async (req, res, next) => {
  try {
    const { rows: existingRows } = await query("SELECT * FROM applications WHERE application_id = $1", [req.params.id]);
    const existing = existingRows[0];
    if (!existing) return res.status(404).json({ error: "Not found" });

    const body = req.body || {};
    const fields = Object.keys(body);
    if (fields.length === 0) return res.status(400).json({ error: "No fields to update" });

    const setClauses = [];
    const params = [];
    let idx = 1;
    for (const field of fields) {
      setClauses.push(`${field} = $${idx}`);
      params.push(body[field]);
      idx += 1;
    }
    if (fields.includes("status") || fields.includes("stage")) {
      setClauses.push(`reviewed_by = $${idx}`);
      params.push(req.user.uid);
      idx += 1;
      setClauses.push(`reviewed_at = now()`);
    }
    params.push(req.params.id);

    const { rows } = await query(
      `UPDATE applications SET ${setClauses.join(", ")} WHERE application_id = $${idx} RETURNING *`,
      params
    );

    if (fields.includes("status") || fields.includes("stage")) {
      await logActivity({
        action: "update_application_status",
        actorId: req.user.uid,
        actorEmail: req.user.email,
        targetType: "application",
        targetId: req.params.id,
        details: { status: body.status, stage: body.stage },
      });
    }

    res.json(rows[0]);
  } catch (err) {
    next(err);
  }
});

router.delete("/:id", async (req, res, next) => {
  try {
    const { rowCount } = await query("DELETE FROM applications WHERE application_id = $1", [req.params.id]);
    if (rowCount === 0) return res.status(404).json({ error: "Not found" });
    res.status(204).end();
  } catch (err) {
    next(err);
  }
});

export default router;
