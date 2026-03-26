create extension if not exists pgcrypto;

create table if not exists app_users (
  id uuid primary key default gen_random_uuid(),
  email text unique not null,
  password_hash text not null,
  user_metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists courses (
  id text primary key,
  title text not null,
  description text not null,
  level text not null default 'beginner',
  lessons_count int not null default 0,
  created_by uuid references app_users(id),
  created_at timestamptz not null default now()
);

create table if not exists lessons (
  id text primary key,
  course_id text references courses(id),
  title text not null,
  description text,
  content text not null default '',
  order_num int not null default 0,
  has_assignment boolean not null default false,
  check_mode text not null default 'manual',
  answer_key text,
  created_by uuid references app_users(id),
  created_at timestamptz not null default now()
);

create table if not exists submissions (
  id text primary key,
  assignment_id text not null default '',
  lesson_id text,
  course_id text,
  user_id uuid references app_users(id),
  code text not null,
  status text not null default 'pending',
  grade int,
  feedback text,
  graded_by uuid references app_users(id),
  graded_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists lesson_completions (
  user_id uuid references app_users(id),
  lesson_id text not null,
  completed_at timestamptz not null default now(),
  primary key (user_id, lesson_id)
);

create table if not exists comments (
  id text primary key,
  lesson_id text not null,
  user_id uuid references app_users(id),
  user_name text not null,
  text text not null,
  rating int not null,
  created_at timestamptz not null default now()
);

create table if not exists messages (
  id text primary key,
  group_id text not null,
  user_id uuid references app_users(id),
  user_name text not null,
  text text not null,
  created_at timestamptz not null default now()
);

create table if not exists user_progress (
  user_id uuid primary key references app_users(id),
  level int not null default 1,
  xp int not null default 0,
  xp_to_next_level int not null default 100,
  completed_lessons int not null default 0,
  streak int not null default 0,
  achievements jsonb not null default '[]'::jsonb,
  updated_at timestamptz not null default now()
);
