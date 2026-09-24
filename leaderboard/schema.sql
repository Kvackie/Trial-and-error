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

-- Removed games: Wild Pond (shared pond) and Potion Market (shared market, first finds).
-- Their tables and scores go too.
DROP TABLE IF EXISTS pond;
DROP TABLE IF EXISTS market;
DROP TABLE IF EXISTS discoveries;
DELETE FROM scores WHERE game IN ('wild-pond', 'potion-market');
