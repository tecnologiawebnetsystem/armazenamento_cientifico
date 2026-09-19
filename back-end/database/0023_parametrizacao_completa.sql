-- Parametrização de menus e dashboard. Executar no Aurora/PostgreSQL.
-- Não contém permission_matrix nem SQL executável armazenado em parâmetros.

CREATE TABLE IF NOT EXISTS menu_permissions (
  menu_id VARCHAR(80) NOT NULL REFERENCES menus(id) ON DELETE CASCADE,
  permission_id VARCHAR(80) NOT NULL REFERENCES permissions(id) ON DELETE CASCADE,
  allowed BOOLEAN NOT NULL DEFAULT TRUE,
  PRIMARY KEY (menu_id, permission_id)
);

CREATE TABLE IF NOT EXISTS dashboard_cards (
  id VARCHAR(80) PRIMARY KEY,
  module_id VARCHAR(80) REFERENCES modules(id) ON DELETE SET NULL,
  key VARCHAR(80) NOT NULL UNIQUE,
  title VARCHAR(140) NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  metric_key VARCHAR(80) NOT NULL,
  route VARCHAR(180) NOT NULL DEFAULT '',
  profile_ids TEXT NOT NULL DEFAULT '',
  display_order INTEGER NOT NULL DEFAULT 0,
  active BOOLEAN NOT NULL DEFAULT TRUE
);

CREATE INDEX IF NOT EXISTS ix_dashboard_cards_module_id ON dashboard_cards(module_id);

INSERT INTO dashboard_cards (id, key, title, description, metric_key, route, profile_ids, display_order)
VALUES
 ('dashboard-projetos','projetos','Projetos','Projetos disponíveis no seu escopo.','total_projetos','/projetos','admin,gerente,patrocinador,auditor',10),
 ('dashboard-pendencias','pendencias','Pendências','Itens que precisam de atenção.','pendencias','/relatorios','admin,gerente',20),
 ('dashboard-auditoria','auditoria','Auditoria','Eventos recentes para acompanhamento.','eventos_auditoria','/logs','admin,auditor',30)
ON CONFLICT (key) DO NOTHING;
