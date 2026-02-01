-- Global key-value configuration (e.g. filter_mode)
CREATE TABLE IF NOT EXISTS config (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
);

-- Per-command access list (blacklist / whitelist entries)
-- command_id = '*' means applies to all commands
CREATE TABLE IF NOT EXISTS access_list (
  command_id TEXT NOT NULL,
  target_id INTEGER NOT NULL,
  PRIMARY KEY (command_id, target_id)
);

-- Auto-delete bot replies per chat
CREATE TABLE IF NOT EXISTS auto_delete (
  chat_id INTEGER PRIMARY KEY,
  delay_seconds INTEGER NOT NULL DEFAULT 60
);
