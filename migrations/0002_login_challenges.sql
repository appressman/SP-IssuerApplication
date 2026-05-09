-- OTP auth: replace magic links with 6-digit login codes
-- Scanners cannot type the code, so they cannot complete login

CREATE TABLE IF NOT EXISTS login_challenges (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id),
    email TEXT NOT NULL,
    code_hash TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    expires_at TEXT NOT NULL,
    used_at TEXT,
    attempts INTEGER NOT NULL DEFAULT 0,
    request_ip TEXT,
    request_user_agent TEXT,
    consumed_ip TEXT,
    consumed_user_agent TEXT
);

CREATE INDEX IF NOT EXISTS idx_login_challenges_email ON login_challenges(email);
CREATE INDEX IF NOT EXISTS idx_login_challenges_expires ON login_challenges(expires_at);
