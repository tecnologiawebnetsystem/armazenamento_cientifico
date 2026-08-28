-- Schema SQLite canônico para desenvolvimento e testes locais.
PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS perfis (id TEXT PRIMARY KEY, nome TEXT NOT NULL UNIQUE, descricao TEXT DEFAULT '', criado_em TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS groups (id TEXT PRIMARY KEY, name TEXT NOT NULL UNIQUE, description TEXT DEFAULT '', created_at TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS user_groups (user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE, group_id TEXT NOT NULL REFERENCES groups(id) ON DELETE CASCADE, source TEXT NOT NULL DEFAULT 'manual', created_at TEXT NOT NULL, PRIMARY KEY (user_id, group_id));
CREATE TABLE IF NOT EXISTS project_members (project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE, user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE, papel TEXT NOT NULL, created_at TEXT NOT NULL, PRIMARY KEY (project_id, user_id));
CREATE TABLE IF NOT EXISTS project_groups (project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE, group_id TEXT NOT NULL REFERENCES groups(id) ON DELETE CASCADE, papel TEXT NOT NULL, created_at TEXT NOT NULL, PRIMARY KEY (project_id, group_id));
CREATE TABLE IF NOT EXISTS file_permissions (file_id TEXT NOT NULL REFERENCES files(id) ON DELETE CASCADE, user_id TEXT REFERENCES users(id) ON DELETE CASCADE, group_id TEXT REFERENCES groups(id) ON DELETE CASCADE, nivel TEXT NOT NULL, inherited_from TEXT, created_at TEXT NOT NULL, CHECK (user_id IS NOT NULL OR group_id IS NOT NULL));
CREATE INDEX IF NOT EXISTS idx_user_groups_group ON user_groups(group_id);
CREATE INDEX IF NOT EXISTS idx_project_groups_group ON project_groups(group_id);
CREATE INDEX IF NOT EXISTS idx_file_permissions_file ON file_permissions(file_id);
