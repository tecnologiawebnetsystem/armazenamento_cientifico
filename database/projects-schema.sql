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
