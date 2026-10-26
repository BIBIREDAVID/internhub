-- InternHub schema (PostgreSQL) — the app's system of record.

DROP TABLE IF EXISTS activity_log CASCADE;
DROP TABLE IF EXISTS invites CASCADE;
DROP TABLE IF EXISTS applications CASCADE;
DROP TABLE IF EXISTS attendance CASCADE;
DROP TABLE IF EXISTS task_comments CASCADE;
DROP TABLE IF EXISTS tasks CASCADE;
DROP TABLE IF EXISTS users CASCADE;

CREATE TABLE users (
    uid             TEXT PRIMARY KEY,
    email           TEXT NOT NULL UNIQUE,
    name            TEXT NOT NULL,
    role            TEXT NOT NULL CHECK (role IN ('hr', 'manager', 'intern')),
    password_hash   TEXT NOT NULL,
    department      TEXT,
    manager_id      TEXT REFERENCES users(uid) ON DELETE SET NULL,
    cohort_id       TEXT,
    start_date      DATE,
    end_date        DATE,
    onboarding_step INTEGER DEFAULT 0,
    onboarding_checklist JSONB,
    active          BOOLEAN NOT NULL DEFAULT TRUE,
    created_at      TIMESTAMPTZ
);

CREATE TABLE tasks (
    task_id     TEXT PRIMARY KEY,
    title       TEXT NOT NULL,
    description TEXT,
    due_date    DATE,
    priority    TEXT,
    status      TEXT NOT NULL CHECK (status IN ('pending', 'in-progress', 'completed')),
    intern_id   TEXT NOT NULL REFERENCES users(uid) ON DELETE CASCADE,
    manager_id  TEXT NOT NULL REFERENCES users(uid) ON DELETE CASCADE,
    created_at  TIMESTAMPTZ,
    updated_at  TIMESTAMPTZ
);

CREATE TABLE task_comments (
    comment_id  TEXT PRIMARY KEY,
    task_id     TEXT NOT NULL REFERENCES tasks(task_id) ON DELETE CASCADE,
    author_id   TEXT NOT NULL REFERENCES users(uid) ON DELETE CASCADE,
    author_name TEXT,
    author_role TEXT,
    text        TEXT NOT NULL,
    created_at  TIMESTAMPTZ
);

CREATE TABLE attendance (
    attendance_id TEXT PRIMARY KEY, -- "{internId}_{yyyy-mm-dd}", matches Firestore doc id
    intern_id     TEXT NOT NULL REFERENCES users(uid) ON DELETE CASCADE,
    date          DATE NOT NULL,
    status        TEXT NOT NULL CHECK (status IN ('present', 'late', 'absent')),
    check_in      TIMESTAMPTZ,
    check_out     TIMESTAMPTZ,
    note          TEXT,
    manager_comment TEXT,
    reviewed_by_manager_at TIMESTAMPTZ,
    UNIQUE (intern_id, date)
);

CREATE TABLE applications (
    application_id TEXT PRIMARY KEY,
    candidate_name  TEXT,
    candidate_email TEXT,
    department      TEXT,
    stage           TEXT,
    status          TEXT,
    reviewed_by     TEXT REFERENCES users(uid) ON DELETE SET NULL,
    reviewed_at     TIMESTAMPTZ,
    created_at      TIMESTAMPTZ
);

CREATE TABLE invites (
    email       TEXT PRIMARY KEY,
    name        TEXT,
    role        TEXT,
    manager_id  TEXT REFERENCES users(uid) ON DELETE SET NULL,
    invited_by  TEXT REFERENCES users(uid) ON DELETE SET NULL,
    invited_at  TIMESTAMPTZ,
    expires_at  TIMESTAMPTZ
);

CREATE TABLE activity_log (
    entry_id    TEXT PRIMARY KEY,
    action      TEXT NOT NULL,
    actor_id    TEXT REFERENCES users(uid) ON DELETE SET NULL,
    actor_email TEXT,
    target_type TEXT,
    target_id   TEXT,
    details     JSONB,
    created_at  TIMESTAMPTZ
);

CREATE TABLE password_reset_tokens (
    token       TEXT PRIMARY KEY,
    uid         TEXT NOT NULL REFERENCES users(uid) ON DELETE CASCADE,
    expires_at  TIMESTAMPTZ NOT NULL,
    used_at     TIMESTAMPTZ,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_tasks_intern ON tasks(intern_id);
CREATE INDEX idx_tasks_manager ON tasks(manager_id);
CREATE INDEX idx_attendance_intern ON attendance(intern_id);
CREATE INDEX idx_users_manager ON users(manager_id);
