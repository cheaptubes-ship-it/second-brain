-- Second Brain (Supabase)
-- Run in Supabase SQL editor.

create extension if not exists pgcrypto;

-- One row per captured message (audit trail)
create table if not exists public.sb_inbox_log (
  id uuid primary key default gen_random_uuid(),
  owner_key text not null default 'default',

  source text not null, -- slack|telegram|web|api
  source_message_id text,
  source_thread_id text,
  source_channel_id text,
  source_user_id text,

  original_text text not null,

  filed_to text not null default 'needs_review' check (filed_to in ('people','projects','ideas','admin','needs_review')),
  destination_table text,
  destination_id uuid,

  confidence numeric,
  status text not null default 'filed' check (status in ('filed','needs_review','fixed')),
  error text,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists sb_inbox_log_owner_created_idx on public.sb_inbox_log (owner_key, created_at desc);

-- People
create table if not exists public.sb_people (
  id uuid primary key default gen_random_uuid(),
  owner_key text not null default 'default',

  name text not null,
  context text,
  follow_ups text,
  tags text[] not null default '{}',

  last_touched date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists sb_people_owner_name_idx on public.sb_people (owner_key, name);

-- Projects
create table if not exists public.sb_projects (
  id uuid primary key default gen_random_uuid(),
  owner_key text not null default 'default',

  name text not null,
  status text not null default 'active' check (status in ('active','waiting','blocked','someday','done')),
  next_action text,
  notes text,
  tags text[] not null default '{}',

  last_touched date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists sb_projects_owner_status_idx on public.sb_projects (owner_key, status);

-- Ideas
create table if not exists public.sb_ideas (
  id uuid primary key default gen_random_uuid(),
  owner_key text not null default 'default',

  name text not null,
  one_liner text,
  notes text,
  tags text[] not null default '{}',

  last_touched date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists sb_ideas_owner_created_idx on public.sb_ideas (owner_key, created_at desc);

-- Admin tasks
create table if not exists public.sb_admin (
  id uuid primary key default gen_random_uuid(),
  owner_key text not null default 'default',

  name text not null,
  due_date date,
  status text not null default 'todo' check (status in ('todo','done')),
  notes text,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists sb_admin_owner_status_due_idx on public.sb_admin (owner_key, status, due_date);

-- Simple API tokens for ingestion endpoints
create table if not exists public.sb_api_tokens (
  token text primary key,
  owner_key text not null default 'default',
  label text,
  created_at timestamptz not null default now(),
  revoked_at timestamptz
);

create index if not exists sb_api_tokens_owner_idx on public.sb_api_tokens (owner_key);
