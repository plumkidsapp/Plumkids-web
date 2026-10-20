-- OPCIONAL: las Functions v16 crean estas tablas automáticamente.
CREATE TABLE IF NOT EXISTS child_app_progress (
  id TEXT PRIMARY KEY,
  child_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  app_slug TEXT NOT NULL,
  level INTEGER NOT NULL DEFAULT 1,
  activity INTEGER NOT NULL DEFAULT 1,
  stars INTEGER NOT NULL DEFAULT 0,
  total_score INTEGER NOT NULL DEFAULT 0,
  completed_activities INTEGER NOT NULL DEFAULT 0,
  last_activity TEXT,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(child_id, app_slug)
);

CREATE TABLE IF NOT EXISTS activity_attempts (
  id TEXT PRIMARY KEY,
  child_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  app_slug TEXT NOT NULL,
  activity_id TEXT NOT NULL,
  score INTEGER NOT NULL DEFAULT 0,
  stars INTEGER NOT NULL DEFAULT 0,
  correct_answers INTEGER NOT NULL DEFAULT 0,
  total_questions INTEGER NOT NULL DEFAULT 0,
  duration_seconds INTEGER,
  completed INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
