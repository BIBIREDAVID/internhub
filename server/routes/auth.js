import { Router } from "express";
import crypto from "crypto";
import bcrypt from "bcryptjs";
import rateLimit from "express-rate-limit";
import { query } from "../db.js";
import { COOKIE_NAME, signToken, requireAuth } from "../middleware/auth.js";

const router = Router();

// Throttle credential-guessing and mail-triggering endpoints per IP.
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many attempts, please wait a few minutes and try again" },
});

const COOKIE_OPTS = {
  httpOnly: true,
  sameSite: "strict",
  secure: process.env.NODE_ENV === "production",
};

function stripPassword(user) {
  if (!user) return user;
  // eslint-disable-next-line no-unused-vars
  const { password_hash, ...rest } = user;
  return rest;
}

router.post("/signup", authLimiter, async (req, res, next) => {
  try {
    const { email, password, name } = req.body || {};
    if (!email || !password || !name) {
      return res.status(400).json({ error: "email, password and name are required" });
    }
    const normalizedEmail = String(email).toLowerCase();

    const { rows: inviteRows } = await query(
      "SELECT * FROM invites WHERE email = $1",
      [normalizedEmail]
    );
    const invite = inviteRows[0];
    if (!invite) {
      return res.status(400).json({ error: "No invite found for this email" });
    }
    if (invite.expires_at && new Date(invite.expires_at) < new Date()) {
      return res.status(400).json({ error: "Invite has expired" });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const uid = crypto.randomUUID();

    const { rows } = await query(
      `INSERT INTO users (uid, email, name, role, password_hash, manager_id, active, onboarding_step, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, TRUE, 0, now())
       RETURNING *`,
      [uid, normalizedEmail, invite.name || name, invite.role, passwordHash, invite.manager_id]
    );

    await query("DELETE FROM invites WHERE email = $1", [normalizedEmail]);

    const user = rows[0];
    const token = signToken(user);
    res.cookie(COOKIE_NAME, token, { ...COOKIE_OPTS, maxAge: 8 * 60 * 60 * 1000 });
    res.status(201).json(stripPassword(user));
  } catch (err) {
    next(err);
  }
});

router.post("/login", authLimiter, async (req, res, next) => {
  try {
    const { email, password } = req.body || {};
    if (!email || !password) {
      return res.status(400).json({ error: "email and password are required" });
    }
    const normalizedEmail = String(email).toLowerCase();
    const { rows } = await query("SELECT * FROM users WHERE lower(email) = $1", [normalizedEmail]);
    const user = rows[0];
    if (!user) return res.status(401).json({ error: "Invalid credentials" });

    const match = await bcrypt.compare(password, user.password_hash);
    if (!match) return res.status(401).json({ error: "Invalid credentials" });

    if (!user.active) return res.status(403).json({ error: "Account deactivated" });

    const token = signToken(user);
    res.cookie(COOKIE_NAME, token, { ...COOKIE_OPTS, maxAge: 8 * 60 * 60 * 1000 });
    res.json(stripPassword(user));
  } catch (err) {
    next(err);
  }
});

router.post("/logout", (req, res) => {
  res.clearCookie(COOKIE_NAME, COOKIE_OPTS);
  res.status(204).end();
});

router.get("/me", requireAuth, (req, res) => {
  res.json(req.user);
});

// No email provider is configured for this app, so the reset link can't be
// emailed — it's logged to the server console instead. A real deployment
// should wire an email service into the spot marked below.
router.post("/forgot-password", authLimiter, async (req, res, next) => {
  try {
    const { email } = req.body || {};
    if (!email) return res.status(400).json({ error: "email is required" });
    const normalizedEmail = String(email).toLowerCase();

    const { rows } = await query("SELECT uid FROM users WHERE lower(email) = $1 AND active", [
      normalizedEmail,
    ]);
    const user = rows[0];
    if (user) {
      const token = crypto.randomBytes(32).toString("hex");
      const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1h
      await query(
        "INSERT INTO password_reset_tokens (token, uid, expires_at) VALUES ($1, $2, $3)",
        [token, user.uid, expiresAt]
      );
      const resetUrl = `${process.env.CORS_ORIGIN || "http://localhost:5173"}/reset-password?token=${token}`;
      // TODO: send `resetUrl` via a real email provider instead of logging it.
      console.log(`[password reset] ${normalizedEmail}: ${resetUrl}`);
    }

    // Always respond the same way, whether or not the account exists.
    res.status(204).end();
  } catch (err) {
    next(err);
  }
});

router.post("/reset-password", async (req, res, next) => {
  try {
    const { token, password } = req.body || {};
    if (!token || !password) {
      return res.status(400).json({ error: "token and password are required" });
    }

    const { rows } = await query(
      "SELECT * FROM password_reset_tokens WHERE token = $1",
      [token]
    );
    const resetToken = rows[0];
    if (
      !resetToken ||
      resetToken.used_at ||
      new Date(resetToken.expires_at) < new Date()
    ) {
      return res.status(400).json({ error: "This reset link is invalid or has expired" });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    await query("UPDATE users SET password_hash = $1 WHERE uid = $2", [
      passwordHash,
      resetToken.uid,
    ]);
    await query("UPDATE password_reset_tokens SET used_at = now() WHERE token = $1", [token]);

    res.status(204).end();
  } catch (err) {
    next(err);
  }
});

export default router;
