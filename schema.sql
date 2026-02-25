CREATE TABLE IF NOT EXISTS bookmarks (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  url TEXT NOT NULL,
  tags TEXT DEFAULT '[]',
  created_at TEXT NOT NULL
);
