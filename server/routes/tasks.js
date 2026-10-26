import { Router } from "express";
import crypto from "crypto";
import { query } from "../db.js";
import { requireAuth } from "../middleware/auth.js";

const router = Router();
router.use(requireAuth);

async function getTask(taskId) {
  const { rows } = await query("SELECT * FROM tasks WHERE task_id = $1", [taskId]);
  return rows[0];
}

function canReadTask(user, task) {
  if (!task) return false;
  if (user.role === "hr") return true;
  if (user.role === "manager") return task.manager_id === user.uid;
  if (user.role === "intern") return task.intern_id === user.uid;
  return false;
}

router.get("/", async (req, res, next) => {
  try {
    const { internId, managerId } = req.query;
    if (req.user.role === "hr") {
      const clauses = [];
      const params = [];
      if (internId) {
        params.push(internId);
        clauses.push(`intern_id = $${params.length}`);
      }
      if (managerId) {
        params.push(managerId);
        clauses.push(`manager_id = $${params.length}`);
      }
      const where = clauses.length ? `WHERE ${clauses.join(" AND ")}` : "";
      const { rows } = await query(`SELECT * FROM tasks ${where} ORDER BY created_at DESC`, params);
      return res.json(rows);
    }
    if (req.user.role === "manager") {
      const params = [req.user.uid];
      let where = "WHERE manager_id = $1";
      if (internId) {
        params.push(internId);
        where += ` AND intern_id = $${params.length}`;
      }
      const { rows } = await query(`SELECT * FROM tasks ${where} ORDER BY created_at DESC`, params);
      return res.json(rows);
    }
    // intern
    const { rows } = await query(
      "SELECT * FROM tasks WHERE intern_id = $1 ORDER BY created_at DESC",
      [req.user.uid]
    );
    return res.json(rows);
  } catch (err) {
    next(err);
  }
});

router.get("/:taskId", async (req, res, next) => {
  try {
    const task = await getTask(req.params.taskId);
    if (!task) return res.status(404).json({ error: "Not found" });
    if (!canReadTask(req.user, task)) return res.status(403).json({ error: "Forbidden" });
    res.json(task);
  } catch (err) {
    next(err);
  }
});

router.post("/", async (req, res, next) => {
  try {
    if (req.user.role !== "hr" && req.user.role !== "manager") {
      return res.status(403).json({ error: "Forbidden" });
    }
    const { title, description, due_date, priority, intern_id } = req.body || {};
    if (!title || !intern_id) {
      return res.status(400).json({ error: "title and intern_id are required" });
    }
    let managerId = req.body.manager_id;
    if (req.user.role === "manager") {
      managerId = req.user.uid;
      const { rows } = await query(
        "SELECT * FROM users WHERE uid = $1 AND manager_id = $2 AND role = 'intern'",
        [intern_id, req.user.uid]
      );
      if (!rows[0]) return res.status(400).json({ error: "Not one of your interns" });
    } else if (!managerId) {
      return res.status(400).json({ error: "manager_id is required" });
    }

    const taskId = crypto.randomUUID();
    const { rows } = await query(
      `INSERT INTO tasks (task_id, title, description, due_date, priority, status, intern_id, manager_id, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, 'pending', $6, $7, now(), now())
       RETURNING *`,
      [taskId, title, description ?? null, due_date ?? null, priority ?? null, intern_id, managerId]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    next(err);
  }
});

router.patch("/:taskId", async (req, res, next) => {
  try {
    const task = await getTask(req.params.taskId);
    if (!task) return res.status(404).json({ error: "Not found" });

    const isHr = req.user.role === "hr";
    const isOwningManager = req.user.role === "manager" && task.manager_id === req.user.uid;
    const isOwningIntern = req.user.role === "intern" && task.intern_id === req.user.uid;

    if (!isHr && !isOwningManager && !isOwningIntern) {
      return res.status(403).json({ error: "Forbidden" });
    }

    const body = req.body || {};
    let fields = Object.keys(body);

    if (isOwningIntern) {
      const disallowed = fields.filter((f) => f !== "status");
      if (disallowed.length > 0) {
        return res.status(403).json({ error: `Cannot update fields: ${disallowed.join(", ")}` });
      }
    }

    if (fields.length === 0) {
      return res.status(400).json({ error: "No fields to update" });
    }

    const setClauses = [];
    const params = [];
    let idx = 1;
    for (const field of fields) {
      setClauses.push(`${field} = $${idx}`);
      params.push(body[field]);
      idx += 1;
    }
    setClauses.push(`updated_at = now()`);
    params.push(req.params.taskId);

    const { rows } = await query(
      `UPDATE tasks SET ${setClauses.join(", ")} WHERE task_id = $${idx} RETURNING *`,
      params
    );
    res.json(rows[0]);
  } catch (err) {
    next(err);
  }
});

router.delete("/:taskId", async (req, res, next) => {
  try {
    const task = await getTask(req.params.taskId);
    if (!task) return res.status(404).json({ error: "Not found" });
    const isHr = req.user.role === "hr";
    const isOwningManager = req.user.role === "manager" && task.manager_id === req.user.uid;
    if (!isHr && !isOwningManager) return res.status(403).json({ error: "Forbidden" });
    await query("DELETE FROM tasks WHERE task_id = $1", [req.params.taskId]);
    res.status(204).end();
  } catch (err) {
    next(err);
  }
});

router.get("/:taskId/comments", async (req, res, next) => {
  try {
    const task = await getTask(req.params.taskId);
    if (!task) return res.status(404).json({ error: "Not found" });
    if (!canReadTask(req.user, task)) return res.status(403).json({ error: "Forbidden" });
    const { rows } = await query(
      "SELECT * FROM task_comments WHERE task_id = $1 ORDER BY created_at ASC",
      [req.params.taskId]
    );
    res.json(rows);
  } catch (err) {
    next(err);
  }
});

router.post("/:taskId/comments", async (req, res, next) => {
  try {
    const task = await getTask(req.params.taskId);
    if (!task) return res.status(404).json({ error: "Not found" });
    if (!canReadTask(req.user, task)) return res.status(403).json({ error: "Forbidden" });
    const { text } = req.body || {};
    if (!text) return res.status(400).json({ error: "text is required" });

    const commentId = crypto.randomUUID();
    const { rows } = await query(
      `INSERT INTO task_comments (comment_id, task_id, author_id, author_name, author_role, text, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, now())
       RETURNING *`,
      [commentId, req.params.taskId, req.user.uid, req.user.name, req.user.role, text]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    next(err);
  }
});

export default router;
