export function requireRole(...roles) {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ error: "Forbidden" });
    }
    next();
  };
}

export function requireSelfOrHR(uidParam) {
  return (req, res, next) => {
    const targetUid = req.params[uidParam];
    if (req.user.role === "hr" || req.user.uid === targetUid) return next();
    return res.status(403).json({ error: "Forbidden" });
  };
}
