import { Router } from "express";
import { query } from "../db.js";
import { requireAuth } from "../middleware/auth.js";
import { requireRole } from "../middleware/authorize.js";

const router = Router();
router.use(requireAuth, requireRole("hr"));

router.get("/", async (req, res, next) => {
  try {
    const limit = Number.parseInt(req.query.limit, 10) || 100;
    const offset = Number.parseInt(req.query.offset, 10) || 0;
    const { rows } = await query(
      "SELECT * FROM activity_log ORDER BY created_at DESC LIMIT $1 OFFSET $2",
      [limit, offset]
    );
    res.json(rows);
  } catch (err) {
    next(err);
  }
});

export default router;
