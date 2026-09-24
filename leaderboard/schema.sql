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

-- Wild Pond was removed: its shared pond, scores and first finds go too.
DROP TABLE IF EXISTS pond;
DELETE FROM scores WHERE game = 'wild-pond';

-- Potion Market: selling pressure per potion (decays over time, see market.js).
CREATE TABLE IF NOT EXISTS market (
  potion TEXT PRIMARY KEY,
  pressure REAL NOT NULL,
  updated INTEGER NOT NULL
);

-- The first player to find each rare thing, per game.
CREATE TABLE IF NOT EXISTS discoveries (
  game TEXT NOT NULL,
  key TEXT NOT NULL,
  name TEXT NOT NULL,
  client TEXT NOT NULL,
  at INTEGER NOT NULL,
  PRIMARY KEY (game, key)
);
DELETE FROM discoveries WHERE game = 'wild-pond';
