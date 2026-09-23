-- Safe to run again: the deploy workflow applies it on every deploy.
CREATE TABLE IF NOT EXISTS scores (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  game TEXT NOT NULL,
  name TEXT NOT NULL,
  score INTEGER NOT NULL,
  client TEXT NOT NULL,
  created_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS scores_by_game ON scores (game, score DESC, created_at ASC);

-- Recent submissions, for rate limiting only. Rows older than an hour are deleted.
CREATE TABLE IF NOT EXISTS recent (
  key TEXT NOT NULL,
  at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS recent_by_key ON recent (key, at);
