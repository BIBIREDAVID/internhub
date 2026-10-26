import jwt from "jsonwebtoken";
import { query } from "../db.js";

const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  throw new Error("Set JWT_SECRET");
}

export const COOKIE_NAME = "internhub_token";

export function signToken(user) {
  return jwt.sign({ uid: user.uid }, JWT_SECRET, { expiresIn: "8h" });
}

export async function requireAuth(req, res, next) {
  const token = req.cookies?.[COOKIE_NAME];
  if (!token) return res.status(401).json({ error: "Not authenticated" });
  let payload;
  try {
    payload = jwt.verify(token, JWT_SECRET);
  } catch {
    return res.status(401).json({ error: "Invalid or expired session" });
  }
  const { rows } = await query(
    "SELECT uid, email, name, role, manager_id, active FROM users WHERE uid = $1",
    [payload.uid]
  );
  const user = rows[0];
  if (!user) return res.status(401).json({ error: "User not found" });
  if (!user.active) return res.status(403).json({ error: "Account deactivated" });
  req.user = user;
  next();
}
