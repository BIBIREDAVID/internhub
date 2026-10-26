import { Router } from "express";
import { query } from "../db.js";
import { requireAuth } from "../middleware/auth.js";

const router = Router();
router.use(requireAuth);

async function getAttendance(id) {
  const { rows } = await query("SELECT * FROM attendance WHERE attendance_id = $1", [id]);
  return rows[0];
}

async function getOwningManagerId(internId) {
  const { rows } = await query("SELECT manager_id FROM users WHERE uid = $1", [internId]);
  return rows[0]?.manager_id ?? null;
}

router.get("/", async (req, res, next) => {
  try {
    const { internId } = req.query;
    if (req.user.role === "hr") {
      if (internId) {
        const { rows } = await query("SELECT * FROM attendance WHERE intern_id = $1 ORDER BY date DESC", [internId]);
        return res.json(rows);
      }
      const { rows } = await query("SELECT * FROM attendance ORDER BY date DESC");
      return res.json(rows);
    }
    if (req.user.role === "manager") {
      const params = [req.user.uid];
      let sql = `SELECT a.* FROM attendance a
                 JOIN users u ON u.uid = a.intern_id
                 WHERE u.manager_id = $1`;
      if (internId) {
        params.push(internId);
        sql += ` AND a.intern_id = $${params.length}`;
      }
      sql += " ORDER BY a.date DESC";
      const { rows } = await query(sql, params);
      return res.json(rows);
    }
    // intern
    const { rows } = await query(
      "SELECT * FROM attendance WHERE intern_id = $1 ORDER BY date DESC",
      [req.user.uid]
    );
    return res.json(rows);
  } catch (err) {
    next(err);
  }
});

router.get("/:id", async (req, res, next) => {
  try {
    const record = await getAttendance(req.params.id);
    if (!record) return res.status(404).json({ error: "Not found" });
    const isHr = req.user.role === "hr";
    const isOwningIntern = req.user.role === "intern" && record.intern_id === req.user.uid;
    let isOwningManager = false;
    if (req.user.role === "manager") {
      const mgrId = await getOwningManagerId(record.intern_id);
      isOwningManager = mgrId === req.user.uid;
    }
    if (!isHr && !isOwningIntern && !isOwningManager) return res.status(403).json({ error: "Forbidden" });
    res.json(record);
  } catch (err) {
    next(err);
  }
});

router.post("/", async (req, res, next) => {
  try {
    const { intern_id, date, status, check_in, check_out, note } = req.body || {};
    if (!intern_id || !date || !status) {
      return res.status(400).json({ error: "intern_id, date and status are required" });
    }
    const isHr = req.user.role === "hr";
    const isSelf = req.user.role === "intern" && req.user.uid === intern_id;
    if (!isHr && !isSelf) return res.status(403).json({ error: "Forbidden" });

    const attendanceId = `${intern_id}_${date}`;
    const existing = await getAttendance(attendanceId);
    if (existing) return res.status(409).json({ error: "Attendance record already exists" });

    const { rows } = await query(
      `INSERT INTO attendance (attendance_id, intern_id, date, status, check_in, check_out, note)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [attendanceId, intern_id, date, status, check_in ?? null, check_out ?? null, note ?? null]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    if (err.code === "23505") return res.status(409).json({ error: "Attendance record already exists" });
    next(err);
  }
});

const INTERN_FIELDS = ["check_in", "check_out", "note"];
const MANAGER_FIELDS = ["status", "manager_comment", "reviewed_by_manager_at"];

router.patch("/:id", async (req, res, next) => {
  try {
    const record = await getAttendance(req.params.id);
    if (!record) return res.status(404).json({ error: "Not found" });

    const isHr = req.user.role === "hr";
    const isOwningIntern = req.user.role === "intern" && record.intern_id === req.user.uid;
    let isOwningManager = false;
    if (req.user.role === "manager") {
      const mgrId = await getOwningManagerId(record.intern_id);
      isOwningManager = mgrId === req.user.uid;
    }
    if (!isHr && !isOwningIntern && !isOwningManager) return res.status(403).json({ error: "Forbidden" });

    const body = req.body || {};
    const fields = Object.keys(body);
    if (fields.length === 0) return res.status(400).json({ error: "No fields to update" });

    if (isOwningIntern) {
      const disallowed = fields.filter((f) => !INTERN_FIELDS.includes(f));
      if (disallowed.length > 0) return res.status(403).json({ error: `Cannot update fields: ${disallowed.join(", ")}` });
    } else if (isOwningManager) {
      const disallowed = fields.filter((f) => !MANAGER_FIELDS.includes(f));
      if (disallowed.length > 0) return res.status(403).json({ error: `Cannot update fields: ${disallowed.join(", ")}` });
    }

    const setClauses = [];
    const params = [];
    let idx = 1;
    for (const field of fields) {
      setClauses.push(`${field} = $${idx}`);
      params.push(body[field]);
      idx += 1;
    }
    params.push(req.params.id);

    const { rows } = await query(
      `UPDATE attendance SET ${setClauses.join(", ")} WHERE attendance_id = $${idx} RETURNING *`,
      params
    );
    res.json(rows[0]);
  } catch (err) {
    next(err);
  }
});

router.delete("/:id", async (req, res, next) => {
  try {
    if (req.user.role !== "hr") return res.status(403).json({ error: "Forbidden" });
    const { rowCount } = await query("DELETE FROM attendance WHERE attendance_id = $1", [req.params.id]);
    if (rowCount === 0) return res.status(404).json({ error: "Not found" });
    res.status(204).end();
  } catch (err) {
    next(err);
  }
});

export default router;
