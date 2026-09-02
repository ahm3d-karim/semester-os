-- Semester OS — Initial schema (Supabase / Postgres)
-- Run: supabase db push or psql -f 001_initial.sql

-- Institutions
create table institutions (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,          -- 'LUMS'
  name text not null,                 -- 'Lahore University of Management Sciences'
  calendar_url text,
  created_at timestamptz not null default now()
);

-- Sessions: Session N → date mapping (the core calendar unit)
create table sessions (
  id uuid primary key default gen_random_uuid(),
  inst_id uuid not null references institutions(id),
  term text not null,                 -- 'Fall 2026'
  session_no integer not null,        -- 1-based
  date_start date not null,
  date_end date not null,
  unique(inst_id, term, session_no)
);

-- Calendar events (add/drop, Q-drop, midterm week, finals, etc.)
create table calendar_events (
  id uuid primary key default gen_random_uuid(),
  inst_id uuid not null references institutions(id),
  term text not null,
  title text not null,
  date_start date not null,
  date_end date,
  official boolean default true,      -- from official academic calendar
  created_at timestamptz not null default now()
);

-- Courses
create table courses (
  id uuid primary key default gen_random_uuid(),
  inst_id uuid not null references institutions(id),
  code text not null,                 -- 'FINN 372'
  title text not null,                -- 'Actuarial Sciences & Insurance'
  offering text,                      -- 'Fall 2026'
  status text not null default 'active' check (status in ('active', 'archived')),
  created_at timestamptz not null default now(),
  unique(inst_id, code, offering)
);

-- Syllabi (uploaded files)
create table syllabi (
  id uuid primary key default gen_random_uuid(),
  course_id uuid not null references courses(id) on delete cascade,
  file_key text not null,             -- Supabase Storage path
  filename text not null,
  status text not null default 'uploaded' check (status in ('uploaded', 'processing', 'done', 'error')),
  created_at timestamptz not null default now()
);

-- Ingest jobs (pipeline tracking)
create table ingest_jobs (
  id uuid primary key default gen_random_uuid(),
  syllabus_id uuid not null references syllabi(id) on delete cascade,
  stage text not null check (stage in ('parse', 'extract', 'verify', 'approve', 'model', 'brief')),
  status text not null default 'pending' check (status in ('pending', 'running', 'done', 'error')),
  log_json jsonb default '{}',
  error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Model items (the extracted course data)
create table model_items (
  id uuid primary key default gen_random_uuid(),
  course_id uuid not null references courses(id) on delete cascade,
  model_version integer not null,
  kind text not null check (kind in ('deadline', 'grade_component', 'policy', 'milestone', 'note')),
  title text not null,
  detail text not null default '',
  session_no integer,
  date date,
  session_range jsonb,                -- {"start": 10, "end": 12}
  weight numeric(5,2),
  tier text not null check (tier in ('sourced', 'synthesized')),
  anchors jsonb not null default '[]',
  verification jsonb not null default '{}',
  approved boolean not null default false,
  approved_at timestamptz,
  approval_note text,
  created_at timestamptz not null default now()
);

create index idx_model_items_course on model_items(course_id, model_version);

-- Course models (versioned snapshots)
create table course_models (
  id uuid primary key default gen_random_uuid(),
  course_id uuid not null references courses(id) on delete cascade,
  version integer not null,
  items_ref jsonb not null default '[]',  -- array of model_item ids
  budget_json jsonb not null default '{}',
  status text not null default 'draft' check (status in ('draft', 'verified', 'approved', 'superseded')),
  supersedes_id uuid references course_models(id),
  created_at timestamptz not null default now(),
  unique(course_id, version)
);

-- Approvals (human review log)
create table approvals (
  id uuid primary key default gen_random_uuid(),
  model_id uuid not null references course_models(id) on delete cascade,
  item_id uuid not null references model_items(id) on delete cascade,
  action text not null check (action in ('approve', 'edit', 'reject')),
  user_note text,
  decided_at timestamptz not null default now()
);

-- Grade entries (user-entered scores)
create table grade_entries (
  id uuid primary key default gen_random_uuid(),
  course_id uuid not null references courses(id) on delete cascade,
  component_id uuid not null references model_items(id) on delete cascade,
  score numeric(5,2) not null,
  max_score numeric(5,2) default 100,
  added_at timestamptz not null default now()
);

-- Briefings (delivered messages)
create table briefings (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  course_id uuid references courses(id),
  kind text not null check (kind in ('weekly', 'warning', 'budget_delta')),
  content text not null,
  delivered_via text check (delivered_via in ('in_app', 'whatsapp', 'email')),
  delivered_at timestamptz,
  created_at timestamptz not null default now()
);

-- User profiles
create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  whatsapp_phone text,
  delivery_prefs jsonb default '{"in_app": true, "whatsapp": false, "email": false}',
  default_course_ids uuid[] default '{}',
  created_at timestamptz not null default now()
);

-- API keys (BYOK)
create table api_keys (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  provider text not null,             -- 'openai', 'deepseek', etc.
  key_encrypted text not null,
  created_at timestamptz not null default now(),
  unique(user_id, provider)
);

-- Row Level Security
alter table courses enable row level shading;
alter table syllabi enable row level security;
alter table model_items enable row level security;
alter table course_models enable row level security;
alter table approvals enable row level security;
alter table grade_entries enable row level security;
alter table briefings enable row level security;
alter table profiles enable row level security;
alter table api_keys enable row level security;

-- Policies: users can only see their own data
create policy "Users see own courses" on courses for all using (true);  -- shared for now
create policy "Users see own briefings" on briefings for all using (true);
create policy "Users manage own profile" on profiles for all using (auth.uid() = id);
create policy "Users manage own API keys" on api_keys for all using (auth.uid() = user_id);
