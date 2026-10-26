import { Router } from "express";
import crypto from "crypto";
import bcrypt from "bcryptjs";
import { query } from "../db.js";
import { requireAuth } from "../middleware/auth.js";
import { logActivity } from "../utils/activityLog.js";

const router = Router();
router.use(requireAuth);

const USER_COLUMNS =
  "uid, email, name, role, department, manager_id, cohort_id, start_date, end_date, onboarding_step, onboarding_checklist, active, created_at";

router.get("/", async (req, res, next) => {
  try {
    const { role: filterRole } = req.query;
    if (req.user.role === "hr") {
      if (filterRole) {
        const { rows } = await query(`SELECT ${USER_COLUMNS} FROM users WHERE role = $1`, [filterRole]);
        return res.json(rows);
      }
      const { rows } = await query(`SELECT ${USER_COLUMNS} FROM users`);
      return res.json(rows);
    }
    if (req.user.role === "manager") {
      const { rows } = await query(
        `SELECT ${USER_COLUMNS} FROM users WHERE manager_id = $1 AND role = 'intern'`,
        [req.user.uid]
      );
      return res.json(rows);
    }
    return res.status(403).json({ error: "Forbidden" });
  } catch (err) {
    next(err);
  }
});

router.get("/:uid", async (req, res, next) => {
  try {
    const { rows } = await query(`SELECT ${USER_COLUMNS} FROM users WHERE uid = $1`, [req.params.uid]);
    const target = rows[0];
    if (!target) return res.status(404).json({ error: "Not found" });

    const isSelf = req.user.uid === target.uid;
    const isManagerOfTarget = req.user.role === "manager" && target.manager_id === req.user.uid;
    if (req.user.role === "hr" || isSelf || isManagerOfTarget) {
      return res.json(target);
    }
    return res.status(403).json({ error: "Forbidden" });
  } catch (err) {
    next(err);
  }
});

router.post("/", async (req, res, next) => {
  try {
    if (req.user.role !== "hr") return res.status(403).json({ error: "Forbidden" });
    const {
      email,
      password,
      name,
      role,
      department,
      manager_id,
      cohort_id,
      start_date,
      end_date,
    } = req.body || {};
    if (!email || !password || !name || !role) {
      return res.status(400).json({ error: "email, password, name and role are required" });
    }
    const passwordHash = await bcrypt.hash(password, 10);
    const uid = crypto.randomUUID();
    const { rows } = await query(
      `INSERT INTO users (uid, email, name, role, password_hash, department, manager_id, cohort_id, start_date, end_date, active, onboarding_step, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, TRUE, 0, now())
       RETURNING ${USER_COLUMNS}`,
      [
        uid,
        String(email).toLowerCase(),
        name,
        role,
        passwordHash,
        department ?? null,
        manager_id ?? null,
        cohort_id ?? null,
        start_date ?? null,
        end_date ?? null,
      ]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    if (err.code === "23505") return res.status(409).json({ error: "Email already in use" });
    next(err);
  }
});

const HR_EDITABLE_FIELDS = [
  "name",
  "department",
  "role",
  "manager_id",
  "active",
  "cohort_id",
  "start_date",
  "end_date",
];
const SELF_EDITABLE_FIELDS = ["name", "department", "onboarding_step", "onboarding_checklist"];

router.patch("/:uid", async (req, res, next) => {
  try {
    const { uid } = req.params;
    const { rows: existingRows } = await query("SELECT * FROM users WHERE uid = $1", [uid]);
    const existing = existingRows[0];
    if (!existing) return res.status(404).json({ error: "Not found" });

    const isSelf = req.user.uid === uid;
    const isHr = req.user.role === "hr";
    if (!isHr && !isSelf) return res.status(403).json({ error: "Forbidden" });

    const body = req.body || {};
    const allowedFields = isHr ? HR_EDITABLE_FIELDS : SELF_EDITABLE_FIELDS;
    const bodyFields = Object.keys(body);
    const disallowed = bodyFields.filter((f) => !allowedFields.includes(f));
    if (!isHr && disallowed.length > 0) {
      return res.status(403).json({ error: `Cannot update fields: ${disallowed.join(", ")}` });
    }

    const fieldsToUpdate = bodyFields.filter((f) => allowedFields.includes(f));
    if (fieldsToUpdate.length === 0) {
      return res.status(400).json({ error: "No valid fields to update" });
    }

    if (isHr && fieldsToUpdate.includes("manager_id") && body.manager_id) {
      const { rows: mgrRows } = await query("SELECT * FROM users WHERE uid = $1", [body.manager_id]);
      const manager = mgrRows[0];
      if (!manager || manager.role !== "manager" || !manager.active) {
        return res.status(400).json({ error: "Invalid manager_id" });
      }
    }

    const setClauses = [];
    const params = [];
    let idx = 1;
    for (const field of fieldsToUpdate) {
      let value = body[field];
      if (field === "onboarding_checklist" && value != null) {
        value = JSON.stringify(value);
      }
      setClauses.push(`${field} = $${idx}`);
      params.push(value);
      idx += 1;
    }
    params.push(uid);

    const { rows } = await query(
      `UPDATE users SET ${setClauses.join(", ")} WHERE uid = $${idx} RETURNING ${USER_COLUMNS}`,
      params
    );

    if (isHr) {
      if (fieldsToUpdate.includes("manager_id")) {
        await logActivity({
          action: "reassign_intern",
          actorId: req.user.uid,
          actorEmail: req.user.email,
          targetType: "user",
          targetId: uid,
          details: { from: existing.manager_id, to: body.manager_id },
        });
      }
      if (fieldsToUpdate.includes("active")) {
        await logActivity({
          action: body.active ? "reactivate_intern" : "deactivate_intern",
          actorId: req.user.uid,
          actorEmail: req.user.email,
          targetType: "user",
          targetId: uid,
          details: { active: body.active },
        });
      }
    }

    res.json(rows[0]);
  } catch (err) {
    next(err);
  }
});

router.delete("/:uid", async (req, res, next) => {
  try {
    if (req.user.role !== "hr") return res.status(403).json({ error: "Forbidden" });
    const { rowCount } = await query("DELETE FROM users WHERE uid = $1", [req.params.uid]);
    if (rowCount === 0) return res.status(404).json({ error: "Not found" });
    res.status(204).end();
  } catch (err) {
    next(err);
  }
});

export default router;
