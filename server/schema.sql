create extension if not exists pgcrypto;

-- ─── Core users ───────────────────────────────────────────────────────────────
create table if not exists app_users (
  id uuid primary key default gen_random_uuid(),
  email text unique not null,
  password_hash text not null,
  email_verified boolean not null default false,
  user_metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

-- ─── Email verifications ──────────────────────────────────────────────────────
create table if not exists email_verifications (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  code text not null,
  expires_at timestamptz not null,
  used boolean not null default false,
  created_at timestamptz not null default now()
);

-- ─── Courses ──────────────────────────────────────────────────────────────────
create table if not exists courses (
  id text primary key,
  title text not null,
  description text not null,
  level text not null default 'beginner',
  lessons_count int not null default 0,
  is_private boolean not null default false,
  created_by uuid references app_users(id),
  created_at timestamptz not null default now()
);

-- ─── Course enrollments (for private courses) ─────────────────────────────────
create table if not exists course_enrollments (
  course_id text references courses(id) on delete cascade,
  student_id uuid references app_users(id) on delete cascade,
  enrolled_at timestamptz not null default now(),
  primary key (course_id, student_id)
);

-- ─── Lessons ──────────────────────────────────────────────────────────────────
create table if not exists lessons (
  id text primary key,
  course_id text references courses(id) on delete cascade,
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

-- ─── Submissions ──────────────────────────────────────────────────────────────
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

-- ─── Manual grades ────────────────────────────────────────────────────────────
create table if not exists manual_grades (
  id uuid primary key default gen_random_uuid(),
  student_id uuid references app_users(id) on delete cascade,
  teacher_id uuid references app_users(id),
  course_id text references courses(id),
  lesson_id text references lessons(id),
  grade int not null,
  comment text not null default '',
  created_at timestamptz not null default now(),
  unique(student_id, lesson_id)
);

-- ─── Lesson completions ───────────────────────────────────────────────────────
create table if not exists lesson_completions (
  user_id uuid references app_users(id) on delete cascade,
  lesson_id text not null,
  completed_at timestamptz not null default now(),
  primary key (user_id, lesson_id)
);

-- ─── Comments ─────────────────────────────────────────────────────────────────
create table if not exists comments (
  id text primary key,
  lesson_id text not null,
  user_id uuid references app_users(id),
  user_name text not null,
  text text not null,
  rating int not null,
  created_at timestamptz not null default now()
);

-- ─── Groups (classes) ─────────────────────────────────────────────────────────
create table if not exists groups (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text not null default '',
  teacher_id uuid references app_users(id) on delete cascade,
  created_at timestamptz not null default now()
);

-- ─── Group members ────────────────────────────────────────────────────────────
create table if not exists group_members (
  group_id uuid references groups(id) on delete cascade,
  student_id uuid references app_users(id) on delete cascade,
  joined_at timestamptz not null default now(),
  primary key (group_id, student_id)
);

-- ─── Messages (group chat) ────────────────────────────────────────────────────
create table if not exists messages (
  id text primary key,
  group_id text not null,
  user_id uuid references app_users(id),
  user_name text not null,
  text text not null,
  edited_at timestamptz,
  created_at timestamptz not null default now()
);

-- ─── User progress & gamification ────────────────────────────────────────────
create table if not exists user_progress (
  user_id uuid primary key references app_users(id) on delete cascade,
  level int not null default 1,
  xp int not null default 0,
  xp_to_next_level int not null default 100,
  completed_lessons int not null default 0,
  streak int not null default 0,
  achievements jsonb not null default '[]'::jsonb,
  updated_at timestamptz not null default now()
);

-- ─── Notifications ────────────────────────────────────────────────────────────
create table if not exists notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references app_users(id) on delete cascade,
  type text not null default 'system',
  title text not null,
  message text not null,
  data jsonb not null default '{}'::jsonb,
  read boolean not null default false,
  created_at timestamptz not null default now()
);

-- ─── Parent–student links ─────────────────────────────────────────────────────
create table if not exists parent_student_links (
  id uuid primary key default gen_random_uuid(),
  parent_id uuid references app_users(id) on delete cascade,
  student_id uuid references app_users(id) on delete cascade,
  status text not null default 'pending',
  created_at timestamptz not null default now(),
  unique(parent_id, student_id)
);

-- ─── Quiz questions ───────────────────────────────────────────────────────────
create table if not exists quiz_questions (
  id uuid primary key default gen_random_uuid(),
  lesson_id text references lessons(id) on delete cascade,
  question text not null,
  type text not null default 'single',
  options jsonb not null default '[]'::jsonb,
  correct_answer jsonb,
  points int not null default 10,
  order_num int not null default 0,
  created_at timestamptz not null default now()
);

-- ─── Quiz attempts ────────────────────────────────────────────────────────────
create table if not exists quiz_attempts (
  id uuid primary key default gen_random_uuid(),
  lesson_id text,
  user_id uuid references app_users(id) on delete cascade,
  answers jsonb not null default '{}'::jsonb,
  score int not null default 0,
  max_score int not null default 0,
  created_at timestamptz not null default now()
);

-- ─── Class meetings (video calls via Jitsi) ──────────────────────────────────
create table if not exists class_meetings (
  id uuid primary key default gen_random_uuid(),
  group_id uuid references groups(id) on delete cascade,
  room_id text not null,
  started_by uuid references app_users(id) on delete set null,
  started_at timestamptz not null default now(),
  ended_at timestamptz,
  is_active boolean not null default true
);

-- ─── Banned emails (registration block after account deletion) ───────────────
create table if not exists banned_emails (
  email text primary key,
  banned_by uuid references app_users(id) on delete set null,
  banned_at timestamptz not null default now(),
  reason text
);

-- ─── Media files (chat attachments) ─────────────────────────────────────────
create table if not exists media_files (
  id uuid primary key default gen_random_uuid(),
  message_id text references messages(id) on delete cascade,
  user_id uuid references app_users(id) on delete set null,
  group_id text not null,
  original_name text not null,
  stored_name text not null,
  mime_type text not null,
  media_type text not null,
  file_size bigint not null,
  thumbnail_name text,
  width int,
  height int,
  created_at timestamptz not null default now()
);
create index if not exists idx_media_message on media_files(message_id);
create index if not exists idx_media_user    on media_files(user_id);

-- ─── Group ↔ Course assignments ───────────────────────────────────────────────
-- Linking a class (group) to a private course grants all class members access
create table if not exists group_courses (
  group_id uuid references groups(id) on delete cascade,
  course_id text references courses(id) on delete cascade,
  assigned_at timestamptz not null default now(),
  primary key (group_id, course_id)
);
