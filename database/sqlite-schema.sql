-- Schema SQLite canônico para desenvolvimento e testes locais.
PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS app_groups (id TEXT PRIMARY KEY, name TEXT NOT NULL UNIQUE, description TEXT DEFAULT '', created_at TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS app_user_groups (user_id TEXT NOT NULL REFERENCES app_users(id) ON DELETE CASCADE, group_id TEXT NOT NULL REFERENCES app_groups(id) ON DELETE CASCADE, source TEXT NOT NULL DEFAULT 'manual', created_at TEXT NOT NULL, PRIMARY KEY (user_id, group_id));
CREATE TABLE IF NOT EXISTS app_project_members (project_id TEXT NOT NULL REFERENCES app_projects(id) ON DELETE CASCADE, user_id TEXT NOT NULL REFERENCES app_users(id) ON DELETE CASCADE, papel TEXT NOT NULL, created_at TEXT NOT NULL, PRIMARY KEY (project_id, user_id));
CREATE TABLE IF NOT EXISTS app_project_groups (project_id TEXT NOT NULL REFERENCES app_projects(id) ON DELETE CASCADE, group_id TEXT NOT NULL REFERENCES app_groups(id) ON DELETE CASCADE, papel TEXT NOT NULL, created_at TEXT NOT NULL, PRIMARY KEY (project_id, group_id));
CREATE TABLE IF NOT EXISTS app_file_permissions (file_id TEXT NOT NULL REFERENCES app_files(id) ON DELETE CASCADE, user_id TEXT REFERENCES app_users(id) ON DELETE CASCADE, group_id TEXT REFERENCES app_groups(id) ON DELETE CASCADE, nivel TEXT NOT NULL, inherited_from TEXT, created_at TEXT NOT NULL, CHECK (user_id IS NOT NULL OR group_id IS NOT NULL));
CREATE INDEX IF NOT EXISTS idx_app_user_groups_group ON app_user_groups(group_id);
CREATE INDEX IF NOT EXISTS idx_app_project_groups_group ON app_project_groups(group_id);
CREATE INDEX IF NOT EXISTS idx_app_file_permissions_file ON app_file_permissions(file_id);
