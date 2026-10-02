CREATE TABLE alembic_version (
	version_num varchar(32) NOT NULL,
	CONSTRAINT alembic_version_pkc PRIMARY KEY (version_num)
);

CREATE TABLE modules (
	id varchar(80) NOT NULL,
	"name" varchar(120) NOT NULL,
	route varchar(180) DEFAULT ''::character varying NOT NULL,
	icon varchar(80) DEFAULT 'folder'::character varying NOT NULL,
	display_order int4 DEFAULT 0 NOT NULL,
	active bool DEFAULT true NOT NULL,
	CONSTRAINT modules_name_key UNIQUE (name),
	CONSTRAINT modules_pkey PRIMARY KEY (id)
);

CREATE TABLE profiles (
	id varchar(20) NOT NULL,
	"name" varchar(80) NOT NULL,
	description varchar(255) DEFAULT ''::character varying NOT NULL,
	created_at timestamptz DEFAULT now() NOT NULL,
	CONSTRAINT profiles_name_key UNIQUE (name),
	CONSTRAINT profiles_pkey PRIMARY KEY (id)
);

CREATE TABLE project_statuses (
	id varchar(40) NOT NULL,
	code varchar(40) NOT NULL,
	"name" varchar(100) NOT NULL,
	color varchar(20) DEFAULT 'slate'::character varying NOT NULL,
	display_order int4 DEFAULT 0 NOT NULL,
	active bool DEFAULT true NOT NULL,
	allows_edit bool DEFAULT true NOT NULL,
	CONSTRAINT project_statuses_code_key UNIQUE (code),
	CONSTRAINT project_statuses_pkey PRIMARY KEY (id)
);

CREATE TABLE projects (
	id varchar(36) NOT NULL,
	"name" varchar(200) NOT NULL,
	code varchar(50) NOT NULL,
	responsible_area varchar(160) NOT NULL,
	managers_ids jsonb DEFAULT '[]'::jsonb NOT NULL,
	write_group varchar(160) DEFAULT ''::character varying NOT NULL,
	read_group varchar(160) DEFAULT ''::character varying NOT NULL,
	write_identity_role varchar(160) DEFAULT ''::character varying NOT NULL,
	read_identity_role varchar(160) DEFAULT ''::character varying NOT NULL,
	snow_task_number varchar(120) DEFAULT ''::character varying NOT NULL,
	parent_folder varchar(500) DEFAULT ''::character varying NOT NULL,
	description text DEFAULT ''::text NOT NULL,
	status varchar(30) DEFAULT 'ativo'::character varying NOT NULL,
	participants_ids jsonb DEFAULT '[]'::jsonb NOT NULL,
	created_at timestamptz DEFAULT now() NOT NULL,
	updated_at timestamptz DEFAULT now() NOT NULL,
	CONSTRAINT projects_code_key UNIQUE (code),
	CONSTRAINT projects_pkey PRIMARY KEY (id)
);

CREATE TABLE report_types (
	id varchar(60) NOT NULL,
	code varchar(60) NOT NULL,
	"name" varchar(120) NOT NULL,
	description text DEFAULT ''::text NOT NULL,
	formats text DEFAULT 'csv,txt,pdf'::text NOT NULL,
	active bool DEFAULT true NOT NULL,
	CONSTRAINT report_types_code_key UNIQUE (code),
	CONSTRAINT report_types_pkey PRIMARY KEY (id)
);

CREATE TABLE responsible_areas (
	id varchar(40) NOT NULL,
	"name" varchar(160) NOT NULL,
	prefix varchar(20) NOT NULL,
	next_number int4 DEFAULT 1 NOT NULL,
	active bool DEFAULT true NOT NULL,
	created_at timestamptz DEFAULT now() NOT NULL,
	updated_at timestamptz DEFAULT now() NOT NULL,
	CONSTRAINT responsible_areas_name_key UNIQUE (name),
	CONSTRAINT responsible_areas_pkey PRIMARY KEY (id),
	CONSTRAINT responsible_areas_prefix_key UNIQUE (prefix)
);

CREATE TABLE dashboard_cards (
	id varchar(80) NOT NULL,
	module_id varchar(80) NULL,
	"key" varchar(80) NOT NULL,
	title varchar(140) NOT NULL,
	description text DEFAULT ''::text NOT NULL,
	metric_key varchar(80) NOT NULL,
	route varchar(180) DEFAULT ''::character varying NOT NULL,
	profile_ids text DEFAULT ''::text NOT NULL,
	display_order int4 DEFAULT 0 NOT NULL,
	active bool DEFAULT true NOT NULL,
	CONSTRAINT dashboard_cards_key_key UNIQUE (key),
	CONSTRAINT dashboard_cards_pkey PRIMARY KEY (id),
	CONSTRAINT dashboard_cards_module_id_fkey FOREIGN KEY (module_id) REFERENCES modules(id) ON DELETE SET NULL
);

CREATE TABLE menus (
	id varchar(80) NOT NULL,
	module_id varchar(80) NULL,
	parent_id varchar(80) NULL,
	"name" varchar(120) NOT NULL,
	route varchar(180) DEFAULT ''::character varying NOT NULL,
	icon varchar(80) DEFAULT 'circle'::character varying NOT NULL,
	display_order int4 DEFAULT 0 NOT NULL,
	active bool DEFAULT true NOT NULL,
	CONSTRAINT menus_pkey PRIMARY KEY (id),
	CONSTRAINT menus_module_id_fkey FOREIGN KEY (module_id) REFERENCES modules(id) ON DELETE SET NULL,
	CONSTRAINT menus_parent_id_fkey FOREIGN KEY (parent_id) REFERENCES menus(id) ON DELETE SET NULL
);

CREATE TABLE permissions (
	id varchar(80) NOT NULL,
	module_id varchar(80) NOT NULL,
	"name" varchar(120) NOT NULL,
	description text DEFAULT ''::text NOT NULL,
	active bool DEFAULT true NOT NULL,
	CONSTRAINT permissions_pkey PRIMARY KEY (id),
	CONSTRAINT permissions_module_id_fkey FOREIGN KEY (module_id) REFERENCES modules(id) ON DELETE CASCADE
);

CREATE TABLE profile_modules (
	profile_id varchar(20) NOT NULL,
	module_id varchar(80) NOT NULL,
	can_view bool DEFAULT true NOT NULL,
	CONSTRAINT profile_modules_pkey PRIMARY KEY (profile_id, module_id),
	CONSTRAINT profile_modules_module_id_fkey FOREIGN KEY (module_id) REFERENCES modules(id) ON DELETE CASCADE,
	CONSTRAINT profile_modules_profile_id_fkey FOREIGN KEY (profile_id) REFERENCES profiles(id) ON DELETE CASCADE
);

CREATE TABLE profile_permissions (
	profile_id varchar(20) NOT NULL,
	permission_id varchar(80) NOT NULL,
	allowed bool DEFAULT true NOT NULL,
	CONSTRAINT profile_permissions_pkey PRIMARY KEY (profile_id, permission_id),
	CONSTRAINT profile_permissions_permission_id_fkey FOREIGN KEY (permission_id) REFERENCES permissions(id) ON DELETE CASCADE,
	CONSTRAINT profile_permissions_profile_id_fkey FOREIGN KEY (profile_id) REFERENCES profiles(id) ON DELETE CASCADE
);

CREATE TABLE report_fields (
	id varchar(60) NOT NULL,
	report_code varchar(60) NOT NULL,
	field_key varchar(100) NOT NULL,
	"label" varchar(160) NOT NULL,
	source_key varchar(160) NOT NULL,
	display_order int4 DEFAULT 0 NOT NULL,
	active bool DEFAULT true NOT NULL,
	CONSTRAINT report_fields_pkey PRIMARY KEY (id),
	CONSTRAINT report_fields_report_code_field_key_key UNIQUE (report_code, field_key),
	CONSTRAINT report_fields_report_code_fkey FOREIGN KEY (report_code) REFERENCES report_types(code) ON DELETE CASCADE
);

CREATE TABLE users (
	id varchar(255) NOT NULL,
	"name" varchar(200) NOT NULL,
	email varchar(320) NOT NULL,
	job_title varchar(120) NULL,
	area varchar(120) NULL,
	"role" varchar(40) DEFAULT 'solicitante'::character varying NOT NULL,
	profile_id varchar(20) NULL,
	avatar_url varchar(500) NULL,
	last_login_at timestamptz NULL,
	created_at timestamptz DEFAULT now() NOT NULL,
	CONSTRAINT users_email_key UNIQUE (email),
	CONSTRAINT users_pkey PRIMARY KEY (id),
	CONSTRAINT users_profile_id_fkey FOREIGN KEY (profile_id) REFERENCES profiles(id) ON DELETE SET NULL
);

CREATE TABLE activity_logs (
	id varchar(36) NOT NULL,
	user_id varchar(255) NULL,
	"action" varchar(100) NOT NULL,
	entity varchar(100) NOT NULL,
	entity_id varchar(36) NULL,
	details text DEFAULT ''::text NOT NULL,
	"result" varchar(40) NULL,
	created_at timestamptz DEFAULT now() NOT NULL,
	project_id varchar(36) NULL,
	CONSTRAINT activity_logs_pkey PRIMARY KEY (id),
	CONSTRAINT activity_logs_project_id_fkey FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE SET NULL,
	CONSTRAINT activity_logs_user_id_fkey FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
);
CREATE INDEX ix_activity_logs_project_id ON a25034.activity_logs USING btree (project_id);

CREATE TABLE folders (
	id varchar(36) NOT NULL,
	project_id varchar(36) NOT NULL,
	parent_id varchar(36) NULL,
	kind varchar(20) DEFAULT 'pasta'::character varying NOT NULL,
	"name" varchar(500) NOT NULL,
	size_bytes int8 DEFAULT 0 NOT NULL,
	mime_type varchar(160) NULL,
	created_by varchar(255) NOT NULL,
	last_viewed_at timestamptz NULL,
	created_at timestamptz DEFAULT now() NOT NULL,
	updated_at timestamptz DEFAULT now() NOT NULL,
	CONSTRAINT folders_kind_check CHECK (((kind)::text = 'pasta'::text)),
	CONSTRAINT folders_pkey PRIMARY KEY (id),
	CONSTRAINT folders_created_by_fkey FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE RESTRICT,
	CONSTRAINT folders_parent_id_fkey FOREIGN KEY (parent_id) REFERENCES folders(id) ON DELETE CASCADE,
	CONSTRAINT folders_project_id_fkey FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
);

CREATE TABLE menu_permissions (
	menu_id varchar(80) NOT NULL,
	permission_id varchar(80) NOT NULL,
	allowed bool DEFAULT true NOT NULL,
	CONSTRAINT menu_permissions_pkey PRIMARY KEY (menu_id, permission_id),
	CONSTRAINT menu_permissions_menu_id_fkey FOREIGN KEY (menu_id) REFERENCES menus(id) ON DELETE CASCADE,
	CONSTRAINT menu_permissions_permission_id_fkey FOREIGN KEY (permission_id) REFERENCES permissions(id) ON DELETE CASCADE
);

CREATE TABLE project_members (
	project_id varchar(36) NOT NULL,
	user_id varchar(255) NOT NULL,
	"role" varchar(40) NULL,
	created_at timestamptz DEFAULT now() NOT NULL,
	CONSTRAINT project_members_pkey PRIMARY KEY (project_id, user_id),
	CONSTRAINT project_members_project_id_fkey FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
	CONSTRAINT project_members_user_id_fkey FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE sessions (
	id varchar(128) NOT NULL,
	user_id varchar(255) NULL,
	email varchar(320) NOT NULL,
	display_name varchar(255) NULL,
	profile_id varchar(20) NULL,
	expires_at timestamp NOT NULL,
	created_at timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL,
	CONSTRAINT sessions_pkey PRIMARY KEY (id),
	CONSTRAINT sessions_profile_id_fkey FOREIGN KEY (profile_id) REFERENCES profiles(id) ON DELETE RESTRICT,
	CONSTRAINT sessions_user_id_fkey FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
