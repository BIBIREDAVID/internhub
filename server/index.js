import "dotenv/config";
import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";

import authRouter from "./routes/auth.js";
import usersRouter from "./routes/users.js";
import tasksRouter from "./routes/tasks.js";
import attendanceRouter from "./routes/attendance.js";
import applicationsRouter from "./routes/applications.js";
import invitesRouter from "./routes/invites.js";
import activityLogRouter from "./routes/activityLog.js";

const app = express();

app.use(
  cors({
    origin: process.env.CORS_ORIGIN || "http://localhost:5173",
    credentials: true,
  })
);
app.use(express.json());
app.use(cookieParser());

app.get("/health", (req, res) => res.status(200).json({ ok: true }));

app.use("/auth", authRouter);
app.use("/users", usersRouter);
app.use("/tasks", tasksRouter);
app.use("/attendance", attendanceRouter);
app.use("/applications", applicationsRouter);
app.use("/invites", invitesRouter);
app.use("/activity-log", activityLogRouter);

// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  console.error(err);
  const status = err.status || 500;
  const message = status === 500 ? "Internal server error" : err.message;
  res.status(status).json({ error: message });
});

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`InternHub API listening on port ${PORT}`);
});
