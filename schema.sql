DROP TABLE IF EXISTS guestbook;
CREATE TABLE guestbook (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  message TEXT NOT NULL,
  timestamp TEXT NOT NULL,
  approved INTEGER DEFAULT 0,
  ip TEXT
);