-- PostgreSQL: usuários, perfis e projetos
create extension if not exists pgcrypto;

create table if not exists profiles (
  id uuid primary key default gen_random_uuid(),
  name varchar(100) not null unique,
  description text,
  created_at timestamptz not null default now()
);

create table if not exists users (
  id uuid primary key default gen_random_uuid(),
  external_id varchar(150) unique,
  name varchar(160) not null,
  email varchar(255) not null unique,
  profile_id uuid references profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists projects (
  id uuid primary key default gen_random_uuid(),
  code varchar(50) not null unique,
  name varchar(200) not null,
  created_at timestamptz not null default now(),
  responsible_area varchar(150) not null,
  snow_task_number varchar(50) not null,
  parent_folder_name varchar(500) not null,
  created_by uuid references users(id) on delete set null,
  updated_at timestamptz not null default now()
);

create table if not exists project_managers (
  project_id uuid not null references projects(id) on delete cascade,
  user_id uuid not null references users(id) on delete cascade,
  primary key (project_id, user_id)
);

create table if not exists project_access_groups (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects(id) on delete cascade,
  provider varchar(30) not null default 'azure_ad',
  group_name varchar(255) not null,
  access_level varchar(10) not null check (access_level in ('read', 'write')),
  unique (project_id, provider, group_name, access_level)
);

create table if not exists project_access_roles (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects(id) on delete cascade,
  provider varchar(30) not null default 'identidade',
  role_name varchar(255) not null,
  access_level varchar(10) not null check (access_level in ('read', 'write')),
  unique (project_id, provider, role_name, access_level)
);

create index if not exists idx_projects_area on projects(responsible_area);
create index if not exists idx_projects_snow on projects(snow_task_number);
create index if not exists idx_project_groups_project on project_access_groups(project_id);
create index if not exists idx_project_roles_project on project_access_roles(project_id);

-- Arquivos, compartilhamentos, visualizações e trilha de auditoria
create table if not exists files (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects(id) on delete cascade,
  parent_id uuid references files(id) on delete cascade,
  kind varchar(20) not null check (kind in ('folder', 'file')),
  name varchar(500) not null,
  size_bytes bigint not null default 0,
  mime_type varchar(150),
  created_by uuid references users(id) on delete set null,
  last_viewed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists file_shares (
  file_id uuid not null references files(id) on delete cascade,
  user_id uuid not null references users(id) on delete cascade,
  access_level varchar(10) not null check (access_level in ('read', 'write')),
  shared_by uuid references users(id) on delete set null,
  created_at timestamptz not null default now(),
  primary key (file_id, user_id)
);

create table if not exists activity_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references users(id) on delete set null,
  action varchar(80) not null,
  entity varchar(80) not null,
  entity_id varchar(150) not null,
  details text not null default '',
  ip_address inet,
  user_agent text,
  created_at timestamptz not null default now()
);

create index if not exists idx_files_project_parent on files(project_id, parent_id);
create index if not exists idx_file_shares_user on file_shares(user_id);
create index if not exists idx_activity_logs_user_created on activity_logs(user_id, created_at desc);
create index if not exists idx_activity_logs_entity_created on activity_logs(entity, created_at desc);
