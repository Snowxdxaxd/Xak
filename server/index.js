import 'dotenv/config';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
import vm from 'node:vm';
import express from 'express';
import cors from 'cors';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { randomUUID } from 'node:crypto';
import { query } from './db.js';

const app = express();
const PORT = Number(process.env.API_PORT || 4000);
const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-me';
const ROOT_ADMIN_EMAIL = process.env.ROOT_ADMIN_EMAIL || 'admin@codekids.local';
const ROOT_ADMIN_PASSWORD = process.env.ROOT_ADMIN_PASSWORD || 'Admin12345!';
const SMTP_HOST = process.env.SMTP_HOST || '';
const SMTP_PORT = Number(process.env.SMTP_PORT || 587);
const SMTP_USER = process.env.SMTP_USER || '';
const SMTP_PASS = process.env.SMTP_PASS || '';
const SMTP_FROM = process.env.SMTP_FROM || 'noreply@codekids.local';

app.use(cors({ origin: true, credentials: true }));
app.use(express.json());
app.use((req, _res, next) => {
  if (req.path.startsWith('/api/')) {
    req.url = req.url.slice(4);
  }
  next();
});

// ─── helpers ─────────────────────────────────────────────────────────────────

function mapUser(row) {
  return { id: row.id, email: row.email, user_metadata: row.user_metadata || {} };
}

function issueToken(user) {
  return jwt.sign(
    { sub: user.id, email: user.email, user_metadata: user.user_metadata || {} },
    JWT_SECRET,
    { expiresIn: '7d' }
  );
}

function authRequired(req, res, next) {
  try {
    const header = req.header('Authorization');
    if (!header) return res.status(401).json({ error: 'Unauthorized' });
    req.user = jwt.verify(header.replace('Bearer ', '').trim(), JWT_SECRET);
    next();
  } catch {
    return res.status(401).json({ error: 'Unauthorized' });
  }
}

function isTeacher(req)      { return req.user?.user_metadata?.role === 'teacher'; }
function isParent(req)       { return req.user?.user_metadata?.role === 'parent'; }
function isSuperAdmin(req)   { return req.user?.user_metadata?.role === 'superadmin'; }
function isTeacherOrAdmin(req) { return isTeacher(req) || isSuperAdmin(req); }

function canManageEntity(ownerId, req) {
  return isSuperAdmin(req) || ownerId === req.user?.sub;
}

async function canAccessGroup(groupId, req) {
  if (groupId === 'general') return true;
  if (isSuperAdmin(req)) return true;
  const g = await query('select teacher_id from groups where id=$1', [groupId]);
  if (!g.rowCount) return false;
  if (g.rows[0].teacher_id === req.user?.sub) return true;
  const m = await query('select 1 from group_members where group_id=$1 and student_id=$2', [groupId, req.user?.sub]);
  return m.rowCount > 0;
}

async function addNotification(userId, type, title, message, data = {}) {
  try {
    await query(
      'insert into notifications(user_id,type,title,message,data) values($1,$2,$3,$4,$5)',
      [userId, type, title, message, JSON.stringify(data)]
    );
  } catch (err) { console.error('[notification]', err); }
}

async function awardXP(userId, xp, reason) {
  const { rows, rowCount } = await query(
    'select level,xp,xp_to_next_level,completed_lessons,streak,achievements from user_progress where user_id=$1',
    [userId]
  );
  const p = rowCount ? rows[0] : { level:1, xp:0, xp_to_next_level:100, completed_lessons:0, streak:0, achievements:[] };
  p.xp = (Number(p.xp) || 0) + xp;
  let leveled = false;
  while (p.xp >= p.xp_to_next_level) {
    p.xp -= p.xp_to_next_level;
    p.level += 1;
    p.xp_to_next_level = Math.floor(p.xp_to_next_level * 1.5);
    leveled = true;
  }
  await query(
    `insert into user_progress(user_id,level,xp,xp_to_next_level,completed_lessons,streak,achievements,updated_at)
     values($1,$2,$3,$4,$5,$6,$7,now())
     on conflict(user_id) do update set level=excluded.level,xp=excluded.xp,
     xp_to_next_level=excluded.xp_to_next_level,completed_lessons=user_progress.completed_lessons,
     streak=user_progress.streak,achievements=user_progress.achievements,updated_at=now()`,
    [userId, p.level, p.xp, p.xp_to_next_level, p.completed_lessons, p.streak, JSON.stringify(p.achievements||[])]
  );
  if (leveled) {
    await addNotification(userId, 'achievement', 'Новый уровень!', `Поздравляем! Вы достигли уровня ${p.level}.`, { level: p.level });
  }
  if (p.level >= 5) {
    await grantAchievement(userId, {
      id: 'level-5',
      title: 'Пятый уровень',
      description: 'Достигнуть 5 уровня профиля',
      icon: 'crown',
    });
  }
  return p;
}

async function grantAchievement(userId, achievement) {
  const { rows, rowCount } = await query(
    'select achievements from user_progress where user_id=$1',
    [userId]
  );
  if (!rowCount) {
    await query('insert into user_progress(user_id) values($1) on conflict do nothing', [userId]);
  }
  const list = rowCount ? (rows[0].achievements || []) : [];
  if (list.some((a) => a?.id === achievement.id)) return false;
  const next = [...list, { ...achievement, earnedAt: new Date().toISOString() }];
  await query('update user_progress set achievements=$1, updated_at=now() where user_id=$2', [JSON.stringify(next), userId]);
  await addNotification(userId, 'achievement', 'Новая ачивка!', `Вы получили достижение "${achievement.title}"`, { achievementId: achievement.id });
  return true;
}

async function sendEmail(to, subject, html) {
  if (!SMTP_HOST || !SMTP_USER) {
    console.log(`[email] SMTP не настроен. Письмо для ${to}:\n${subject}\n${html}`);
    return;
  }
  try {
    const nodemailer = (await import('nodemailer')).default;
    const transporter = nodemailer.createTransport({
      host: SMTP_HOST,
      port: SMTP_PORT,
      secure: SMTP_PORT === 465,
      auth: { user: SMTP_USER, pass: SMTP_PASS },
      tls: {
        rejectUnauthorized: false,
        // если host — IP-адрес, указываем реальный домен для TLS SNI
        servername: 'smtp.mail.ru',
      },
    });
    await transporter.sendMail({ from: SMTP_FROM, to, subject, html });
    console.log(`[email] Отправлено на ${to}`);
  } catch (err) {
    console.error('[email] Ошибка отправки:', err);
  }
}

async function ensureRootAdmin() {
  try {
    const hash = await bcrypt.hash(ROOT_ADMIN_PASSWORD, 10);
    const meta = JSON.stringify({ name: 'Главный администратор', role: 'superadmin' });
    const { rowCount } = await query('select id from app_users where email=$1', [ROOT_ADMIN_EMAIL]);
    if (rowCount) {
      await query(
        'update app_users set password_hash=$1, user_metadata=$2, email_verified=true where email=$3',
        [hash, meta, ROOT_ADMIN_EMAIL]
      );
      console.log(`[bootstrap] Root admin credentials refreshed: ${ROOT_ADMIN_EMAIL}`);
    } else {
      await query(
        'insert into app_users(email,password_hash,user_metadata,email_verified) values($1,$2,$3,true)',
        [ROOT_ADMIN_EMAIL, hash, meta]
      );
      console.log(`[bootstrap] Root admin created: ${ROOT_ADMIN_EMAIL}`);
    }
  } catch (err) {
    console.error('[bootstrap] Failed to ensure root admin', err);
  }
}

// Creates any missing tables for existing deployments
async function ensureSchemaCompat() {
  const stmts = [
    // Messages: add edited_at column
    `alter table if exists messages add column if not exists edited_at timestamptz`,
    // app_users: add email_verified column
    `alter table if exists app_users add column if not exists email_verified boolean not null default false`,
    // courses: add is_private column
    `alter table if exists courses add column if not exists is_private boolean not null default false`,
    // email_verifications table
    `create table if not exists email_verifications (
      id uuid primary key default gen_random_uuid(),
      email text not null,
      code text not null,
      expires_at timestamptz not null,
      used boolean not null default false,
      created_at timestamptz not null default now()
    )`,
    // notifications table
    `create table if not exists notifications (
      id uuid primary key default gen_random_uuid(),
      user_id uuid references app_users(id) on delete cascade,
      type text not null default 'system',
      title text not null,
      message text not null,
      data jsonb not null default '{}'::jsonb,
      read boolean not null default false,
      created_at timestamptz not null default now()
    )`,
    // parent_student_links table
    `create table if not exists parent_student_links (
      id uuid primary key default gen_random_uuid(),
      parent_id uuid references app_users(id) on delete cascade,
      student_id uuid references app_users(id) on delete cascade,
      status text not null default 'pending',
      created_at timestamptz not null default now()
    )`,
    // Add unique constraint to parent_student_links if not exists (wrapped in do block)
    `do $$ begin
       if not exists (
         select 1 from pg_constraint where conname='parent_student_links_parent_id_student_id_key'
       ) then
         alter table parent_student_links add constraint parent_student_links_parent_id_student_id_key unique(parent_id, student_id);
       end if;
     end $$`,
    // groups table
    `create table if not exists groups (
      id uuid primary key default gen_random_uuid(),
      name text not null,
      description text not null default '',
      teacher_id uuid references app_users(id) on delete cascade,
      created_at timestamptz not null default now()
    )`,
    // group_members table
    `create table if not exists group_members (
      group_id uuid references groups(id) on delete cascade,
      student_id uuid references app_users(id) on delete cascade,
      joined_at timestamptz not null default now(),
      primary key (group_id, student_id)
    )`,
    // quiz_questions table
    `create table if not exists quiz_questions (
      id uuid primary key default gen_random_uuid(),
      lesson_id text references lessons(id) on delete cascade,
      question text not null,
      type text not null default 'single',
      options jsonb not null default '[]'::jsonb,
      correct_answer jsonb,
      points int not null default 10,
      order_num int not null default 0,
      created_at timestamptz not null default now()
    )`,
    // quiz_attempts table
    `create table if not exists quiz_attempts (
      id uuid primary key default gen_random_uuid(),
      lesson_id text,
      user_id uuid references app_users(id) on delete cascade,
      answers jsonb not null default '{}'::jsonb,
      score int not null default 0,
      max_score int not null default 0,
      created_at timestamptz not null default now()
    )`,
    // manual_grades table
    `create table if not exists manual_grades (
      id uuid primary key default gen_random_uuid(),
      student_id uuid references app_users(id) on delete cascade,
      teacher_id uuid references app_users(id),
      course_id text references courses(id),
      lesson_id text references lessons(id),
      grade int not null,
      comment text not null default '',
      created_at timestamptz not null default now()
    )`,
    // manual_grades unique constraint
    `do $$ begin
       if not exists (
         select 1 from pg_constraint where conname='manual_grades_student_id_lesson_id_key'
       ) then
         alter table manual_grades add constraint manual_grades_student_id_lesson_id_key unique(student_id, lesson_id);
       end if;
     end $$`,
    // course_enrollments table
    `create table if not exists course_enrollments (
      course_id text references courses(id) on delete cascade,
      student_id uuid references app_users(id) on delete cascade,
      enrolled_at timestamptz not null default now(),
      primary key (course_id, student_id)
    )`,
    // group_courses: class ↔ private course linking
    `create table if not exists group_courses (
      group_id uuid references groups(id) on delete cascade,
      course_id text references courses(id) on delete cascade,
      assigned_at timestamptz not null default now(),
      primary key (group_id, course_id)
    )`,
  ];
  for (const stmt of stmts) {
    try { await query(stmt); } catch (err) { console.error('[schema-compat]', err.message); }
  }
  console.log('[bootstrap] Schema compat check done');
}

// ─── health ──────────────────────────────────────────────────────────────────

app.get('/health', (_req, res) => res.json({ ok: true }));

// ─── auth ─────────────────────────────────────────────────────────────────────

// Send verification code to email before registration
app.post('/auth/send-code', async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ error: 'Email обязателен' });
    const exists = await query('select id from app_users where email=$1', [email]);
    if (exists.rowCount) return res.status(400).json({ error: 'Пользователь уже существует' });
    // Remove old codes for this email
    await query('delete from email_verifications where email=$1', [email]);
    const code = String(Math.floor(100000 + Math.random() * 900000));
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes
    await query(
      'insert into email_verifications(email,code,expires_at) values($1,$2,$3)',
      [email, code, expiresAt]
    );
    await sendEmail(
      email,
      'Код подтверждения CodeKids',
      `<div style="font-family:sans-serif;max-width:480px">
        <h2>Добро пожаловать в CodeKids!</h2>
        <p>Ваш код подтверждения:</p>
        <div style="font-size:36px;font-weight:bold;letter-spacing:8px;padding:16px 0;color:#111">${code}</div>
        <p style="color:#666">Код действует 15 минут. Не передавайте его никому.</p>
      </div>`
    );
    res.json({ ok: true, devCode: (!SMTP_HOST || !SMTP_USER) ? code : undefined });
  } catch (err) {
    console.error('[send-code]', err);
    res.status(500).json({ error: 'Ошибка отправки кода' });
  }
});

// Verify code and register
app.post('/auth/signup', async (req, res) => {
  try {
    const { email, password, userData, code } = req.body;
    if (!email || !password) return res.status(400).json({ error: 'Email и пароль обязательны' });
    const exists = await query('select id from app_users where email=$1', [email]);
    if (exists.rowCount) return res.status(400).json({ error: 'Пользователь уже существует' });

    let emailVerified = false;
    // If code is provided, verify it
    if (code) {
      const { rows: vr, rowCount } = await query(
        'select id from email_verifications where email=$1 and code=$2 and used=false and expires_at > now()',
        [email, String(code)]
      );
      if (!rowCount) return res.status(400).json({ error: 'Неверный или просроченный код' });
      await query('update email_verifications set used=true where id=$1', [vr[0].id]);
      emailVerified = true;
    }
    // If SMTP is not configured, skip verification requirement
    if (!SMTP_HOST || !SMTP_USER) emailVerified = true;

    const hash = await bcrypt.hash(password, 10);
    const { rows } = await query(
      'insert into app_users(email,password_hash,user_metadata,email_verified) values($1,$2,$3,$4) returning id,email,user_metadata',
      [email, hash, userData || {}, emailVerified]
    );
    const role = userData?.role || 'student';
    if (role === 'student') {
      await query('insert into user_progress(user_id) values($1) on conflict do nothing', [rows[0].id]);
      await addNotification(rows[0].id, 'system', 'Добро пожаловать!', 'Вы успешно зарегистрировались на платформе CodeKids. Начните с изучения первого курса!');
    }
    return res.json({ user: mapUser(rows[0]), emailVerified });
  } catch (err) {
    console.error('[signup]', err);
    return res.status(500).json({ error: 'Ошибка регистрации' });
  }
});

app.post('/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ error: 'Email и пароль обязательны' });
    const { rows, rowCount } = await query(
      'select id,email,password_hash,user_metadata,email_verified from app_users where email=$1', [email]
    );
    if (!rowCount) return res.status(401).json({ error: 'Неверный email или пароль' });
    const ok = await bcrypt.compare(password, rows[0].password_hash);
    if (!ok) return res.status(401).json({ error: 'Неверный email или пароль' });
    const safeUser = mapUser(rows[0]);
    return res.json({ token: issueToken(safeUser), user: safeUser });
  } catch (err) {
    console.error('[login]', err);
    return res.status(500).json({ error: 'Ошибка входа' });
  }
});

app.post('/auth/change-password', authRequired, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword) return res.status(400).json({ error: 'Оба пароля обязательны' });
    if (newPassword.length < 6) return res.status(400).json({ error: 'Новый пароль минимум 6 символов' });
    const { rows } = await query('select password_hash from app_users where id=$1', [req.user.sub]);
    const ok = await bcrypt.compare(currentPassword, rows[0].password_hash);
    if (!ok) return res.status(401).json({ error: 'Неверный текущий пароль' });
    const hash = await bcrypt.hash(newPassword, 10);
    await query('update app_users set password_hash=$1 where id=$2', [hash, req.user.sub]);
    return res.json({ ok: true });
  } catch (err) {
    console.error('[change-password]', err);
    return res.status(500).json({ error: 'Ошибка смены пароля' });
  }
});

app.post('/auth/change-email', authRequired, async (req, res) => {
  try {
    const { newEmail, password } = req.body;
    if (!newEmail || !password) return res.status(400).json({ error: 'Email и пароль обязательны' });
    const { rows } = await query('select password_hash from app_users where id=$1', [req.user.sub]);
    const ok = await bcrypt.compare(password, rows[0].password_hash);
    if (!ok) return res.status(401).json({ error: 'Неверный пароль' });
    const exists = await query('select id from app_users where email=$1 and id!=$2', [newEmail, req.user.sub]);
    if (exists.rowCount) return res.status(400).json({ error: 'Email уже занят' });
    await query('update app_users set email=$1 where id=$2', [newEmail, req.user.sub]);
    const { rows: updated } = await query('select id,email,user_metadata from app_users where id=$1', [req.user.sub]);
    const safeUser = mapUser(updated[0]);
    return res.json({ token: issueToken(safeUser), user: safeUser });
  } catch (err) {
    console.error('[change-email]', err);
    return res.status(500).json({ error: 'Ошибка смены email' });
  }
});

// ─── code runner (sandboxed JS execution) ────────────────────────────────────

app.post('/code/run', async (req, res) => {
  try {
    const { code, language = 'javascript' } = req.body;
    if (!code) return res.status(400).json({ error: 'Код обязателен' });
    if (language !== 'javascript') {
      return res.status(400).json({ error: 'На сервере поддерживается только JavaScript. Python выполняется в браузере.' });
    }
    const logs = [];
    const errors = [];
    const consoleMock = {
      log:   (...args) => logs.push(args.map(a => typeof a === 'object' ? JSON.stringify(a, null, 2) : String(a)).join(' ')),
      error: (...args) => logs.push('[stderr] ' + args.map(String).join(' ')),
      warn:  (...args) => logs.push('[warn] '   + args.map(String).join(' ')),
      info:  (...args) => logs.push(args.map(String).join(' ')),
    };
    const sandbox = {
      console: consoleMock,
      Math, JSON, Array, Object, String, Number, Boolean, Date, parseInt, parseFloat,
      isNaN, isFinite, encodeURIComponent, decodeURIComponent,
      setTimeout: undefined, setInterval: undefined, clearTimeout: undefined, clearInterval: undefined,
      fetch: undefined, require: undefined, process: undefined, global: undefined,
      __dirname: undefined, __filename: undefined, module: undefined, exports: undefined,
    };
    const ctx = vm.createContext(sandbox);
    let output = '';
    let error = null;
    try {
      vm.runInContext(code, ctx, { timeout: 5000, displayErrors: true });
      output = logs.join('\n') || '(нет вывода)';
    } catch (err) {
      error = err.message;
      output = logs.join('\n');
    }
    res.json({ output, error });
  } catch (err) {
    console.error('[code/run]', err);
    res.status(500).json({ error: 'Ошибка выполнения кода' });
  }
});

// ─── notifications ────────────────────────────────────────────────────────────

app.get('/notifications', authRequired, async (req, res) => {
  try {
    const { rows } = await query(
      `select id,type,title,message,data,read,created_at as "createdAt"
       from notifications where user_id=$1
       order by created_at desc limit 50`,
      [req.user.sub]
    );
    const unread = rows.filter(n => !n.read).length;
    res.json({ notifications: rows, unread });
  } catch (err) { console.error(err); res.status(500).json({ error: 'Ошибка' }); }
});

app.put('/notifications/read-all', authRequired, async (req, res) => {
  try {
    await query('update notifications set read=true where user_id=$1', [req.user.sub]);
    res.json({ ok: true });
  } catch (err) { res.status(500).json({ error: 'Ошибка' }); }
});

app.put('/notifications/:id/read', authRequired, async (req, res) => {
  try {
    await query('update notifications set read=true where id=$1 and user_id=$2', [req.params.id, req.user.sub]);
    res.json({ ok: true });
  } catch (err) { res.status(500).json({ error: 'Ошибка' }); }
});

// ─── parent-student links ─────────────────────────────────────────────────────

app.post('/parent/request', authRequired, async (req, res) => {
  try {
    if (!isParent(req)) return res.status(403).json({ error: 'Только для родителей' });
    const { studentEmail } = req.body;
    if (!studentEmail) return res.status(400).json({ error: 'Email ученика обязателен' });
    const { rows: sr, rowCount } = await query(
      `select id,email,user_metadata from app_users where email=$1 and user_metadata->>'role'='student'`,
      [studentEmail]
    );
    if (!rowCount) return res.status(404).json({ error: 'Ученик с таким email не найден' });
    const student = sr[0];
    const exists = await query('select id from parent_student_links where parent_id=$1 and student_id=$2', [req.user.sub, student.id]);
    if (exists.rowCount) return res.status(400).json({ error: 'Запрос уже отправлен или связь уже установлена' });
    const linkId = randomUUID();
    await query(
      'insert into parent_student_links(id,parent_id,student_id,status) values($1,$2,$3,$4)',
      [linkId, req.user.sub, student.id, 'pending']
    );
    const parentName = req.user.user_metadata?.name || req.user.email;
    await addNotification(
      student.id, 'parent_request',
      'Запрос от родителя',
      `${parentName} хочет привязать ваш аккаунт. Вы можете принять или отклонить запрос в настройках.`,
      { linkId, parentId: req.user.sub, parentName }
    );
    res.json({ ok: true, linkId });
  } catch (err) { console.error(err); res.status(500).json({ error: 'Ошибка отправки запроса' }); }
});

app.put('/parent/request/:id/accept', authRequired, async (req, res) => {
  try {
    const { rows, rowCount } = await query(
      'select * from parent_student_links where id=$1 and student_id=$2 and status=$3',
      [req.params.id, req.user.sub, 'pending']
    );
    if (!rowCount) return res.status(404).json({ error: 'Запрос не найден' });
    await query('update parent_student_links set status=$1 where id=$2', ['accepted', req.params.id]);
    const { rows: pr } = await query('select email,user_metadata from app_users where id=$1', [rows[0].parent_id]);
    await addNotification(
      rows[0].parent_id, 'system', 'Запрос принят',
      `${req.user.user_metadata?.name || req.user.email} принял(а) ваш запрос. Теперь вы можете следить за прогрессом.`,
      { studentId: req.user.sub }
    );
    res.json({ ok: true });
  } catch (err) { console.error(err); res.status(500).json({ error: 'Ошибка' }); }
});

app.put('/parent/request/:id/reject', authRequired, async (req, res) => {
  try {
    await query(
      'update parent_student_links set status=$1 where id=$2 and student_id=$3',
      ['rejected', req.params.id, req.user.sub]
    );
    res.json({ ok: true });
  } catch (err) { res.status(500).json({ error: 'Ошибка' }); }
});

app.get('/parent/students', authRequired, async (req, res) => {
  try {
    if (!isParent(req)) return res.status(403).json({ error: 'Только для родителей' });
    const { rows } = await query(
      `select l.id as "linkId", l.status, u.id, u.email, u.user_metadata,
        up.level, up.xp, up.xp_to_next_level as "xpToNextLevel",
        up.completed_lessons as "completedLessons", up.streak
       from parent_student_links l
       join app_users u on u.id=l.student_id
       left join user_progress up on up.user_id=l.student_id
       where l.parent_id=$1`,
      [req.user.sub]
    );
    res.json({ students: rows });
  } catch (err) { console.error(err); res.status(500).json({ error: 'Ошибка' }); }
});

app.get('/student/parents', authRequired, async (req, res) => {
  try {
    const { rows } = await query(
      `select l.id as "linkId", l.status, u.id, u.email, u.user_metadata
       from parent_student_links l
       join app_users u on u.id=l.parent_id
       where l.student_id=$1`,
      [req.user.sub]
    );
    res.json({ parents: rows });
  } catch (err) { res.status(500).json({ error: 'Ошибка' }); }
});

// ─── courses ──────────────────────────────────────────────────────────────────

const COURSE_SELECT = `select id,title,description,level,
  lessons_count as "lessonsCount", is_private as "isPrivate",
  created_by as "createdBy", created_at as "createdAt"
  from courses`;

app.get('/courses', async (req, res) => {
  try {
    // For authenticated users, also return enrollment info and filter private courses
    let userId = null;
    let role = 'guest';
    try {
      const header = req.header('Authorization');
      if (header) {
        const decoded = jwt.verify(header.replace('Bearer ', '').trim(), JWT_SECRET);
        userId = decoded.sub;
        role = decoded.user_metadata?.role || 'student';
      }
    } catch {}

    let rows;
    if (role === 'teacher' || role === 'superadmin') {
      // Teachers see all their courses + public courses
      const q = role === 'superadmin'
        ? await query(`${COURSE_SELECT} order by created_at desc`)
        : await query(`${COURSE_SELECT} where (is_private=false or created_by=$1) order by created_at desc`, [userId]);
      rows = q.rows;
    } else if (userId) {
      // Students see public courses + directly enrolled + class-assigned private courses
      const { rows: r } = await query(
        `${COURSE_SELECT}
         where is_private=false
            or id in (select course_id from course_enrollments where student_id=$1)
            or id in (
              select gc.course_id from group_courses gc
              join group_members gm on gm.group_id=gc.group_id
              where gm.student_id=$1
            )
         order by created_at desc`,
        [userId]
      );
      rows = r;
    } else {
      const { rows: r } = await query(`${COURSE_SELECT} where is_private=false order by created_at desc`);
      rows = r;
    }

    // Attach enrollment/access status for authenticated students
    if (userId && role === 'student') {
      const { rows: enrolled } = await query(
        `select course_id from course_enrollments where student_id=$1
         union
         select gc.course_id from group_courses gc
         join group_members gm on gm.group_id=gc.group_id
         where gm.student_id=$1`,
        [userId]
      );
      const enrolledSet = new Set(enrolled.map(e => e.course_id));
      rows = rows.map(c => ({ ...c, enrolled: enrolledSet.has(c.id) }));
    }
    res.json({ courses: rows });
  } catch (err) { console.error(err); res.status(500).json({ error: 'Ошибка загрузки курсов' }); }
});

app.get('/courses/:id', async (req, res) => {
  try {
    const { rows: cr, rowCount } = await query(`${COURSE_SELECT} where id=$1`, [req.params.id]);
    if (!rowCount) return res.status(404).json({ error: 'Курс не найден' });

    // Check access for private courses
    let userId = null, role = 'guest';
    try {
      const header = req.header('Authorization');
      if (header) {
        const decoded = jwt.verify(header.replace('Bearer ', '').trim(), JWT_SECRET);
        userId = decoded.sub;
        role = decoded.user_metadata?.role || 'student';
      }
    } catch {}

    const course = cr[0];
    if (course.isPrivate && role !== 'teacher' && role !== 'superadmin') {
      if (!userId) return res.status(403).json({ error: 'Доступ запрещён' });
      if (course.createdBy !== userId) {
        const directEnroll = await query(
          'select 1 from course_enrollments where course_id=$1 and student_id=$2',
          [req.params.id, userId]
        );
        if (!directEnroll.rowCount) {
          const groupAccess = await query(
            `select 1 from group_courses gc
             join group_members gm on gm.group_id=gc.group_id
             where gc.course_id=$1 and gm.student_id=$2`,
            [req.params.id, userId]
          );
          if (!groupAccess.rowCount) return res.status(403).json({ error: 'Вы не записаны на этот курс' });
        }
      }
    }

    const { rows: lr } = await query(
      `select id,course_id as "courseId",title,description,content,
        order_num as "order",has_assignment as "hasAssignment",
        check_mode as "checkMode",created_by as "createdBy",created_at as "createdAt"
       from lessons where course_id=$1 order by order_num asc, created_at asc`,
      [req.params.id]
    );
    // Enrollment members count
    const { rows: members } = await query(
      'select count(*) as cnt from course_enrollments where course_id=$1', [req.params.id]
    );
    const enrolled = userId ? (await query('select 1 from course_enrollments where course_id=$1 and student_id=$2', [req.params.id, userId])).rowCount > 0 : false;
    res.json({ ...course, lessons: lr, enrolledCount: Number(members[0]?.cnt || 0), enrolled });
  } catch (err) { console.error(err); res.status(500).json({ error: 'Ошибка загрузки курса' }); }
});

app.post('/courses', authRequired, async (req, res) => {
  try {
    if (!isTeacherOrAdmin(req)) return res.status(403).json({ error: 'Только преподаватель или администратор' });
    const { title, description, level = 'beginner', isPrivate = false } = req.body;
    if (!title || !description) return res.status(400).json({ error: 'Название и описание обязательны' });
    const id = `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
    await query('insert into courses(id,title,description,level,is_private,created_by) values($1,$2,$3,$4,$5,$6)',
      [id, title, description, level, Boolean(isPrivate), req.user.sub]);
    const { rows } = await query(`${COURSE_SELECT} where id=$1`, [id]);
    res.json({ course: rows[0] });
  } catch (err) { console.error(err); res.status(500).json({ error: 'Ошибка создания курса' }); }
});

app.put('/courses/:id', authRequired, async (req, res) => {
  try {
    if (!isTeacherOrAdmin(req)) return res.status(403).json({ error: 'Только преподаватель или администратор' });
    const check = await query('select created_by from courses where id=$1', [req.params.id]);
    if (!check.rowCount) return res.status(404).json({ error: 'Курс не найден' });
    if (!canManageEntity(check.rows[0].created_by, req)) return res.status(403).json({ error: 'Недостаточно прав' });
    const { title, description, level, isPrivate } = req.body;
    await query(
      `update courses set title=coalesce($1,title), description=coalesce($2,description),
       level=coalesce($3,level), is_private=coalesce($4,is_private) where id=$5`,
      [title||null, description||null, level||null, isPrivate!=null?Boolean(isPrivate):null, req.params.id]
    );
    const { rows } = await query(`${COURSE_SELECT} where id=$1`, [req.params.id]);
    res.json({ course: rows[0] });
  } catch (err) { console.error(err); res.status(500).json({ error: 'Ошибка обновления курса' }); }
});

app.delete('/courses/:id', authRequired, async (req, res) => {
  try {
    if (!isTeacherOrAdmin(req)) return res.status(403).json({ error: 'Только преподаватель или администратор' });
    const check = await query('select created_by from courses where id=$1', [req.params.id]);
    if (!check.rowCount) return res.status(404).json({ error: 'Курс не найден' });
    if (!canManageEntity(check.rows[0].created_by, req)) return res.status(403).json({ error: 'Недостаточно прав' });
    await query('delete from quiz_questions where lesson_id in (select id from lessons where course_id=$1)', [req.params.id]);
    await query('delete from lesson_completions where lesson_id in (select id from lessons where course_id=$1)', [req.params.id]);
    await query('delete from course_enrollments where course_id=$1', [req.params.id]);
    await query('delete from lessons where course_id=$1', [req.params.id]);
    await query('delete from courses where id=$1', [req.params.id]);
    res.json({ ok: true });
  } catch (err) { console.error(err); res.status(500).json({ error: 'Ошибка удаления курса' }); }
});

// ─── course enrollment ─────────────────────────────────────────────────────────

app.post('/courses/:id/enroll', authRequired, async (req, res) => {
  try {
    if (!isTeacherOrAdmin(req)) return res.status(403).json({ error: 'Только преподаватель или администратор' });
    const own = await query('select created_by, is_private from courses where id=$1', [req.params.id]);
    if (!own.rowCount) return res.status(404).json({ error: 'Курс не найден' });
    if (!canManageEntity(own.rows[0].created_by, req)) return res.status(403).json({ error: 'Недостаточно прав' });
    const { studentEmail, studentId: directId } = req.body;
    let sid = directId;
    if (!sid && studentEmail) {
      const { rows: sr, rowCount } = await query(
        `select id from app_users where email=$1 and user_metadata->>'role'='student'`, [studentEmail]
      );
      if (!rowCount) return res.status(404).json({ error: 'Ученик не найден' });
      sid = sr[0].id;
    }
    if (!sid) return res.status(400).json({ error: 'Email или ID ученика обязателен' });
    await query(
      'insert into course_enrollments(course_id,student_id) values($1,$2) on conflict do nothing',
      [req.params.id, sid]
    );
    const { rows: cr } = await query('select title from courses where id=$1', [req.params.id]);
    await addNotification(sid, 'system', 'Запись на курс',
      `Вас записали на курс «${cr[0]?.title}»`, { courseId: req.params.id });
    res.json({ ok: true });
  } catch (err) { console.error(err); res.status(500).json({ error: 'Ошибка записи на курс' }); }
});

app.delete('/courses/:id/enroll/:studentId', authRequired, async (req, res) => {
  try {
    if (!isTeacherOrAdmin(req)) return res.status(403).json({ error: 'Только преподаватель или администратор' });
    const own = await query('select created_by from courses where id=$1', [req.params.id]);
    if (!own.rowCount) return res.status(404).json({ error: 'Курс не найден' });
    if (!canManageEntity(own.rows[0].created_by, req)) return res.status(403).json({ error: 'Недостаточно прав' });
    await query('delete from course_enrollments where course_id=$1 and student_id=$2', [req.params.id, req.params.studentId]);
    res.json({ ok: true });
  } catch (err) { res.status(500).json({ error: 'Ошибка' }); }
});

app.get('/courses/:id/enrollments', authRequired, async (req, res) => {
  try {
    if (!isTeacherOrAdmin(req)) return res.status(403).json({ error: 'Только преподаватель или администратор' });
    const own = await query('select created_by from courses where id=$1', [req.params.id]);
    if (!own.rowCount) return res.status(404).json({ error: 'Курс не найден' });
    if (!canManageEntity(own.rows[0].created_by, req)) return res.status(403).json({ error: 'Недостаточно прав' });
    const { rows } = await query(
      `select u.id, u.email, u.user_metadata, ce.enrolled_at as "enrolledAt",
        up.level, up.completed_lessons as "completedLessons",
        round(avg(s.grade) filter (where s.grade is not null), 1) as "avgGrade"
       from course_enrollments ce
       join app_users u on u.id=ce.student_id
       left join user_progress up on up.user_id=u.id
       left join submissions s on s.user_id=u.id and s.course_id=$1
       where ce.course_id=$1
       group by u.id, u.email, u.user_metadata, ce.enrolled_at, up.level, up.completed_lessons
       order by u.user_metadata->>'name' asc`,
      [req.params.id]
    );
    res.json({ students: rows });
  } catch (err) { console.error(err); res.status(500).json({ error: 'Ошибка' }); }
});

// ─── lessons ──────────────────────────────────────────────────────────────────

const LESSON_SELECT = `select id,course_id as "courseId",title,description,content,
  order_num as "order",has_assignment as "hasAssignment",
  check_mode as "checkMode",created_by as "createdBy",created_at as "createdAt"
  from lessons`;

app.get('/lessons/:id', async (req, res) => {
  try {
    const { rows, rowCount } = await query(`${LESSON_SELECT} where id=$1`, [req.params.id]);
    if (!rowCount) return res.status(404).json({ error: 'Урок не найден' });
    res.json(rows[0]);
  } catch (err) { console.error(err); res.status(500).json({ error: 'Ошибка загрузки урока' }); }
});

app.post('/lessons', authRequired, async (req, res) => {
  try {
    if (!isTeacherOrAdmin(req)) return res.status(403).json({ error: 'Только преподаватель или администратор' });
    const { courseId, title, description='', content='', order=0, hasAssignment=false, checkMode='manual', answerKey='' } = req.body;
    if (!title) return res.status(400).json({ error: 'Название обязательно' });
    if (courseId) {
      const owns = await query('select id,created_by from courses where id=$1', [courseId]);
      if (!owns.rowCount) return res.status(404).json({ error: 'Курс не найден' });
      if (!canManageEntity(owns.rows[0].created_by, req)) return res.status(403).json({ error: 'Недостаточно прав для курса' });
    }
    const id = `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
    await query(
      `insert into lessons(id,course_id,title,description,content,order_num,has_assignment,check_mode,answer_key,created_by)
       values($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`,
      [id, courseId||null, title, description, String(content), Number(order), Boolean(hasAssignment), checkMode, answerKey||null, req.user.sub]
    );
    if (courseId) await query('update courses set lessons_count=lessons_count+1 where id=$1', [courseId]);
    const { rows } = await query(`${LESSON_SELECT} where id=$1`, [id]);
    res.json({ lesson: rows[0] });
  } catch (err) { console.error(err); res.status(500).json({ error: 'Ошибка создания урока' }); }
});

app.put('/lessons/:id', authRequired, async (req, res) => {
  try {
    if (!isTeacherOrAdmin(req)) return res.status(403).json({ error: 'Только преподаватель или администратор' });
    const check = await query('select created_by from lessons where id=$1', [req.params.id]);
    if (!check.rowCount) return res.status(404).json({ error: 'Урок не найден' });
    if (!canManageEntity(check.rows[0].created_by, req)) return res.status(403).json({ error: 'Недостаточно прав' });
    const { title, description, content, order, hasAssignment, checkMode, answerKey } = req.body;
    await query(
      `update lessons set
        title=coalesce($1,title), description=coalesce($2,description),
        content=coalesce($3,content), order_num=coalesce($4,order_num),
        has_assignment=coalesce($5,has_assignment), check_mode=coalesce($6,check_mode),
        answer_key=coalesce($7,answer_key)
       where id=$8`,
      [title||null, description||null, content!=null?String(content):null,
       order!=null?Number(order):null, hasAssignment!=null?Boolean(hasAssignment):null,
       checkMode||null, answerKey!=null?answerKey:null, req.params.id]
    );
    const { rows } = await query(`${LESSON_SELECT} where id=$1`, [req.params.id]);
    res.json({ lesson: rows[0] });
  } catch (err) { console.error(err); res.status(500).json({ error: 'Ошибка обновления урока' }); }
});

app.delete('/lessons/:id', authRequired, async (req, res) => {
  try {
    if (!isTeacherOrAdmin(req)) return res.status(403).json({ error: 'Только преподаватель или администратор' });
    const { rows } = await query('select course_id,created_by from lessons where id=$1', [req.params.id]);
    if (!rows.length) return res.status(404).json({ error: 'Урок не найден' });
    if (!canManageEntity(rows[0].created_by, req)) return res.status(403).json({ error: 'Недостаточно прав' });
    if (rows[0].course_id) await query('update courses set lessons_count=greatest(0,lessons_count-1) where id=$1', [rows[0].course_id]);
    await query('delete from quiz_questions where lesson_id=$1', [req.params.id]);
    await query('delete from lesson_completions where lesson_id=$1', [req.params.id]);
    await query('delete from lessons where id=$1', [req.params.id]);
    res.json({ ok: true });
  } catch (err) { console.error(err); res.status(500).json({ error: 'Ошибка удаления урока' }); }
});

// ─── quiz questions ───────────────────────────────────────────────────────────

app.get('/lessons/:id/quiz', async (req, res) => {
  try {
    const { rows } = await query(
      `select id,question,type,options,points,order_num as "orderNum"
       from quiz_questions where lesson_id=$1 order by order_num asc`,
      [req.params.id]
    );
    res.json({ questions: rows });
  } catch (err) { res.status(500).json({ error: 'Ошибка' }); }
});

app.get('/lessons/:id/quiz-full', authRequired, async (req, res) => {
  try {
    if (!isTeacherOrAdmin(req)) return res.status(403).json({ error: 'Только преподаватель или администратор' });
    const { rows } = await query(
      `select id,question,type,options,correct_answer as "correctAnswer",points,order_num as "orderNum"
       from quiz_questions where lesson_id=$1 order by order_num asc`,
      [req.params.id]
    );
    res.json({ questions: rows });
  } catch (err) { res.status(500).json({ error: 'Ошибка' }); }
});

app.post('/lessons/:id/quiz', authRequired, async (req, res) => {
  try {
    if (!isTeacherOrAdmin(req)) return res.status(403).json({ error: 'Только преподаватель или администратор' });
    const { question, type='single', options=[], correctAnswer, points=10, orderNum=0 } = req.body;
    if (!question || correctAnswer === undefined) return res.status(400).json({ error: 'Вопрос и правильный ответ обязательны' });
    const id = randomUUID();
    await query(
      'insert into quiz_questions(id,lesson_id,question,type,options,correct_answer,points,order_num) values($1,$2,$3,$4,$5,$6,$7,$8)',
      [id, req.params.id, question, type, JSON.stringify(options), JSON.stringify(correctAnswer), points, orderNum]
    );
    res.json({ ok: true, id });
  } catch (err) { console.error(err); res.status(500).json({ error: 'Ошибка' }); }
});

app.delete('/lessons/:lessonId/quiz/:questionId', authRequired, async (req, res) => {
  try {
    if (!isTeacherOrAdmin(req)) return res.status(403).json({ error: 'Только преподаватель или администратор' });
    await query('delete from quiz_questions where id=$1 and lesson_id=$2', [req.params.questionId, req.params.lessonId]);
    res.json({ ok: true });
  } catch (err) { res.status(500).json({ error: 'Ошибка' }); }
});

app.post('/lessons/:id/quiz-attempt', authRequired, async (req, res) => {
  try {
    const { answers } = req.body;
    const { rows: questions } = await query(
      'select id,type,correct_answer as "correctAnswer",points from quiz_questions where lesson_id=$1',
      [req.params.id]
    );
    let score = 0;
    let maxScore = 0;
    const results = questions.map(q => {
      maxScore += q.points;
      const userAnswer = answers?.[q.id];
      const correct = JSON.stringify(userAnswer) === JSON.stringify(q.correctAnswer);
      if (correct) score += q.points;
      return { questionId: q.id, correct, points: correct ? q.points : 0 };
    });
    const id = randomUUID();
    await query(
      'insert into quiz_attempts(id,lesson_id,user_id,answers,score,max_score) values($1,$2,$3,$4,$5,$6)',
      [id, req.params.id, req.user.sub, JSON.stringify(answers), score, maxScore]
    );
    if (maxScore > 0 && score > 0) {
      await awardXP(req.user.sub, score, 'quiz');
    }
    if (maxScore > 0 && score === maxScore) {
      await grantAchievement(req.user.sub, {
        id: 'perfect-score',
        title: 'Идеальный балл',
        description: 'Получить оценку 100 за задание или тест',
        icon: 'sparkles',
      });
    }
    res.json({ score, maxScore, results, percentage: maxScore > 0 ? Math.round((score/maxScore)*100) : 0 });
  } catch (err) { console.error(err); res.status(500).json({ error: 'Ошибка' }); }
});

// ─── submissions ──────────────────────────────────────────────────────────────

app.post('/submissions', authRequired, async (req, res) => {
  try {
    const { assignmentId, lessonId, courseId, code } = req.body;
    if (!code) return res.status(400).json({ error: 'Код обязателен' });
    let status = 'pending';
    let grade = null;
    let feedback = null;
    if (lessonId) {
      const { rows: lr } = await query('select answer_key,check_mode,title from lessons where id=$1', [lessonId]);
      if (lr.length && lr[0].check_mode === 'auto' && lr[0].answer_key) {
        const isCorrect = code.trim() === lr[0].answer_key.trim();
        status = isCorrect ? 'passed' : 'failed';
        grade = isCorrect ? 100 : 0;
        feedback = isCorrect ? 'Верно! Отличная работа!' : 'Неверно. Попробуй ещё раз.';
        if (isCorrect) {
          await awardXP(req.user.sub, 30, 'assignment_passed');
          await addNotification(req.user.sub, 'grade', 'Задание проверено', `Ваше задание "${lr[0].title}" выполнено верно! Оценка: 100/100`, { grade: 100, lessonId });
        } else {
          await addNotification(req.user.sub, 'grade', 'Задание проверено', `Ваше задание "${lr[0].title}" выполнено неверно. Попробуйте ещё раз.`, { grade: 0, lessonId });
        }
      }
    }
    const id = `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
    await query(
      `insert into submissions(id,assignment_id,lesson_id,course_id,user_id,code,status,grade,feedback)
       values($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
      [id, assignmentId||'', lessonId||null, courseId||null, req.user.sub, code, status, grade, feedback]
    );
    const { rows } = await query(
      `select id,lesson_id as "lessonId",course_id as "courseId",user_id as "userId",
        code,status,grade,feedback,created_at as "createdAt" from submissions where id=$1`, [id]
    );
    res.json({ submission: rows[0] });
  } catch (err) { console.error(err); res.status(500).json({ error: 'Ошибка отправки задания' }); }
});

app.get('/submissions/pending', authRequired, async (req, res) => {
  try {
    if (!isTeacherOrAdmin(req)) return res.status(403).json({ error: 'Только преподаватель или администратор' });
    const isAdmin = isSuperAdmin(req);
    const { rows } = await query(
      `select s.id,s.lesson_id as "lessonId",s.course_id as "courseId",
        s.user_id as "userId",s.code,s.status,s.grade,s.feedback,s.created_at as "createdAt",
        u.email as "userEmail",u.user_metadata->>'name' as "userName",
        l.title as "lessonTitle",c.title as "courseTitle"
       from submissions s
       left join app_users u on u.id=s.user_id
       left join lessons l on l.id=s.lesson_id
       left join courses c on c.id=s.course_id
       where s.status='pending'${isAdmin ? '' : ' and c.created_by=$1'}
       order by s.created_at desc`,
      isAdmin ? [] : [req.user.sub]
    );
    res.json({ submissions: rows });
  } catch (err) { console.error(err); res.status(500).json({ error: 'Ошибка загрузки заданий' }); }
});

app.post('/submissions/:id/grade', authRequired, async (req, res) => {
  try {
    if (!isTeacherOrAdmin(req)) return res.status(403).json({ error: 'Только преподаватель или администратор' });
    const { grade, feedback } = req.body;
    const { rows: sr, rowCount } = await query('select user_id,lesson_id,course_id from submissions where id=$1', [req.params.id]);
    if (!rowCount) return res.status(404).json({ error: 'Задание не найдено' });
    if (!isSuperAdmin(req) && sr[0].course_id) {
      const owner = await query('select created_by from courses where id=$1', [sr[0].course_id]);
      if (owner.rowCount && owner.rows[0].created_by !== req.user.sub) {
        return res.status(403).json({ error: 'Это не ваш курс' });
      }
    }
    const status = Number(grade) >= 60 ? 'passed' : 'failed';
    await query(
      'update submissions set grade=$1,feedback=$2,status=$3,graded_by=$4,graded_at=now() where id=$5',
      [grade, feedback, status, req.user.sub, req.params.id]
    );
    const { rows: lr } = await query('select title from lessons where id=$1', [sr[0].lesson_id]);
    const lessonTitle = lr[0]?.title || 'Задание';
    const xpGain = status === 'passed' ? 30 : 0;
    if (xpGain > 0) await awardXP(sr[0].user_id, xpGain, 'assignment_graded');
    if (Number(grade) === 100) {
      await grantAchievement(sr[0].user_id, {
        id: 'perfect-score',
        title: 'Идеальный балл',
        description: 'Получить оценку 100 за задание или тест',
        icon: 'sparkles',
      });
    }
    await addNotification(
      sr[0].user_id, 'grade',
      status === 'passed' ? 'Задание принято!' : 'Задание возвращено',
      `Преподаватель проверил "${lessonTitle}". Оценка: ${grade}/100. ${feedback ? feedback : ''}`,
      { grade: Number(grade), status, lessonId: sr[0].lesson_id }
    );
    const { rows } = await query(
      `select id,lesson_id as "lessonId",course_id as "courseId",user_id as "userId",
        code,status,grade,feedback,created_at as "createdAt" from submissions where id=$1`,
      [req.params.id]
    );
    res.json({ submission: rows[0] });
  } catch (err) { console.error(err); res.status(500).json({ error: 'Ошибка оценки' }); }
});

app.get('/grades', authRequired, async (req, res) => {
  try {
    const { rows } = await query(
      `select s.id,s.lesson_id as "lessonId",s.course_id as "courseId",
        s.status,s.grade,s.feedback,s.created_at as "createdAt",
        l.title as "lessonTitle",c.title as "courseTitle",l.check_mode as "checkMode"
       from submissions s
       left join lessons l on l.id=s.lesson_id
       left join courses c on c.id=s.course_id
       where s.user_id=$1 and s.grade is not null
       order by s.created_at desc`,
      [req.user.sub]
    );
    res.json({ grades: rows });
  } catch (err) { console.error(err); res.status(500).json({ error: 'Ошибка загрузки оценок' }); }
});

// ─── lesson completions ───────────────────────────────────────────────────────

app.post('/lessons/:id/complete', authRequired, async (req, res) => {
  try {
    const already = await query('select 1 from lesson_completions where user_id=$1 and lesson_id=$2', [req.user.sub, req.params.id]);
    if (already.rowCount) return res.json({ xpGained: 0, alreadyCompleted: true });
    await query('insert into lesson_completions(user_id,lesson_id) values($1,$2)', [req.user.sub, req.params.id]);
    const p = await awardXP(req.user.sub, 50, 'lesson_complete');
    await query('update user_progress set completed_lessons=completed_lessons+1 where user_id=$1', [req.user.sub]);
    const { rows: pr } = await query('select completed_lessons from user_progress where user_id=$1', [req.user.sub]);
    const completedLessons = Number(pr[0]?.completed_lessons || 0);
    if (completedLessons >= 1) await grantAchievement(req.user.sub, { id: 'first-lesson', title: 'Первый шаг', description: 'Пройти первый урок', icon: 'flag' });
    if (completedLessons >= 5) await grantAchievement(req.user.sub, { id: 'five-lessons', title: 'В ритме обучения', description: 'Пройти 5 уроков', icon: 'zap' });
    if (completedLessons >= 10) await grantAchievement(req.user.sub, { id: 'ten-lessons', title: 'Десять из десяти', description: 'Пройти 10 уроков', icon: 'award' });
    const { rows: lr } = await query('select title,course_id from lessons where id=$1', [req.params.id]);
    await addNotification(req.user.sub, 'system', 'Урок пройден!', `Вы завершили урок "${lr[0]?.title || ''}" и получили 50 XP!`, { xp: 50 });
    const courseId = lr[0]?.course_id;
    if (courseId) {
      const { rows: courseRows } = await query('select lessons_count, title from courses where id=$1', [courseId]);
      if (courseRows.length && courseRows[0].lessons_count > 0) {
        const { rows: doneRows } = await query(
          `select count(*) as cnt from lesson_completions lc join lessons l on l.id=lc.lesson_id
           where lc.user_id=$1 and l.course_id=$2`,
          [req.user.sub, courseId]
        );
        const doneCnt = Number(doneRows[0]?.cnt || 0);
        if (doneCnt >= courseRows[0].lessons_count) {
          await grantAchievement(req.user.sub, { id: `course-${courseId}`, title: 'Курс пройден!', description: `Пройден курс «${courseRows[0].title}»`, icon: 'graduation-cap' });
          await awardXP(req.user.sub, 100, 'course_complete');
          await addNotification(req.user.sub, 'achievement', 'Курс завершён!', `Вы полностью прошли курс «${courseRows[0].title}» и получили 100 XP!`, { courseId });
        }
      }
    }
    res.json({ xpGained: 50, level: p.level, xp: p.xp, xpToNextLevel: p.xp_to_next_level });
  } catch (err) { console.error(err); res.status(500).json({ error: 'Ошибка завершения урока' }); }
});

app.get('/lessons/:id/completed', authRequired, async (req, res) => {
  try {
    const { rowCount } = await query(
      'select 1 from lesson_completions where user_id=$1 and lesson_id=$2',
      [req.user.sub, req.params.id]
    );
    res.json({ completed: rowCount > 0 });
  } catch (err) { res.status(500).json({ error: 'Ошибка' }); }
});

app.get('/my-courses', authRequired, async (req, res) => {
  try {
    const { rows } = await query(
      `select c.id,c.title,c.description,c.level,c.lessons_count as "lessonsCount",c.is_private as "isPrivate",c.created_at as "createdAt",
        count(lc.lesson_id) as "completedCount"
       from courses c
       left join lessons l on l.course_id=c.id
       left join lesson_completions lc on lc.lesson_id=l.id and lc.user_id=$1
       group by c.id order by c.created_at desc`,
      [req.user.sub]
    );
    res.json({ courses: rows });
  } catch (err) { console.error(err); res.status(500).json({ error: 'Ошибка' }); }
});

// ─── comments ─────────────────────────────────────────────────────────────────

app.get('/comments/:lessonId', async (req, res) => {
  try {
    const { rows } = await query(
      `select id,lesson_id as "lessonId",user_id as "userId",user_name as "userName",
        text,rating,created_at as "createdAt" from comments where lesson_id=$1 order by created_at desc`,
      [req.params.lessonId]
    );
    res.json({ comments: rows });
  } catch (err) { console.error(err); res.status(500).json({ error: 'Ошибка загрузки комментариев' }); }
});

app.post('/comments', authRequired, async (req, res) => {
  try {
    const { lessonId, text, rating } = req.body;
    if (!lessonId || !text) return res.status(400).json({ error: 'Урок и текст обязательны' });
    const id = randomUUID();
    const userName = req.user?.user_metadata?.name || 'Аноним';
    await query('insert into comments(id,lesson_id,user_id,user_name,text,rating) values($1,$2,$3,$4,$5,$6)',
      [id, lessonId, req.user.sub, userName, text, Number(rating)||5]);
    const { rows } = await query(
      `select id,lesson_id as "lessonId",user_id as "userId",user_name as "userName",
        text,rating,created_at as "createdAt" from comments where id=$1`, [id]
    );
    res.json({ comment: rows[0] });
  } catch (err) { console.error(err); res.status(500).json({ error: 'Ошибка добавления комментария' }); }
});

// ─── messages ─────────────────────────────────────────────────────────────────

app.get('/messages/:groupId', authRequired, async (req, res) => {
  try {
    const access = await canAccessGroup(req.params.groupId, req);
    if (!access) return res.status(403).json({ error: 'Нет доступа к этому чату' });
    const { rows } = await query(
      `select id,group_id as "groupId",user_id as "userId",user_name as "userName",
        text,created_at as "createdAt", edited_at as "editedAt"
       from messages where group_id=$1 order by created_at asc`,
      [req.params.groupId]
    );
    res.json({ messages: rows });
  } catch (err) { console.error(err); res.status(500).json({ error: 'Ошибка загрузки сообщений' }); }
});

app.post('/messages', authRequired, async (req, res) => {
  try {
    const { groupId, text } = req.body;
    if (!groupId || !text) return res.status(400).json({ error: 'groupId и text обязательны' });
    const access = await canAccessGroup(groupId, req);
    if (!access) return res.status(403).json({ error: 'Нет доступа к этому чату' });
    const id = randomUUID();
    const userName = req.user?.user_metadata?.name || 'Аноним';
    await query('insert into messages(id,group_id,user_id,user_name,text) values($1,$2,$3,$4,$5)',
      [id, groupId, req.user.sub, userName, text]);
    const { rows } = await query(
      `select id,group_id as "groupId",user_id as "userId",user_name as "userName",
        text,created_at as "createdAt", edited_at as "editedAt"
       from messages where id=$1`, [id]
    );
    res.json({ message: rows[0] });
  } catch (err) { console.error(err); res.status(500).json({ error: 'Ошибка отправки сообщения' }); }
});

app.put('/messages/:id', authRequired, async (req, res) => {
  try {
    const { text } = req.body;
    if (!text?.trim()) return res.status(400).json({ error: 'Текст обязателен' });
    const { rows, rowCount } = await query('select user_id from messages where id=$1', [req.params.id]);
    if (!rowCount) return res.status(404).json({ error: 'Сообщение не найдено' });
    if (!isSuperAdmin(req) && rows[0].user_id !== req.user.sub) {
      return res.status(403).json({ error: 'Недостаточно прав' });
    }
    await query('update messages set text=$1, edited_at=now() where id=$2', [text.trim(), req.params.id]);
    const { rows: mr } = await query(
      `select id,group_id as "groupId",user_id as "userId",user_name as "userName",
        text,created_at as "createdAt", edited_at as "editedAt" from messages where id=$1`,
      [req.params.id]
    );
    res.json({ message: mr[0] });
  } catch (err) { console.error(err); res.status(500).json({ error: 'Ошибка редактирования сообщения' }); }
});

app.delete('/messages/:id', authRequired, async (req, res) => {
  try {
    const { rows, rowCount } = await query('select user_id from messages where id=$1', [req.params.id]);
    if (!rowCount) return res.status(404).json({ error: 'Сообщение не найдено' });
    if (!isSuperAdmin(req) && rows[0].user_id !== req.user.sub) {
      return res.status(403).json({ error: 'Недостаточно прав' });
    }
    await query('delete from messages where id=$1', [req.params.id]);
    res.json({ ok: true });
  } catch (err) { console.error(err); res.status(500).json({ error: 'Ошибка удаления сообщения' }); }
});

// ─── progress ─────────────────────────────────────────────────────────────────

app.get('/progress', authRequired, async (req, res) => {
  try {
    const { rows, rowCount } = await query(
      `select level,xp,xp_to_next_level as "xpToNextLevel",
        completed_lessons as "completedLessons",streak,achievements
       from user_progress where user_id=$1`, [req.user.sub]
    );
    if (!rowCount) return res.json({ level:1,xp:0,xpToNextLevel:100,completedLessons:0,streak:0,achievements:[] });
    res.json(rows[0]);
  } catch (err) { console.error(err); res.status(500).json({ error: 'Ошибка прогресса' }); }
});

// ─── leaderboard ─────────────────────────────────────────────────────────────

app.get('/leaderboard', async (_req, res) => {
  try {
    const { rows } = await query(
      `select up.level,up.xp,up.completed_lessons as "completedLessons",
        u.user_metadata->>'name' as "userName",u.id as "userId"
       from user_progress up
       join app_users u on u.id=up.user_id
       where u.user_metadata->>'role'='student' or u.user_metadata->>'role' is null
       order by up.level desc, up.xp desc limit 100`
    );
    res.json({ leaderboard: rows });
  } catch (err) { console.error(err); res.status(500).json({ error: 'Ошибка лидерборда' }); }
});

app.get('/teacher/popularity', async (_req, res) => {
  try {
    const { rows } = await query(
      `select
        t.id as "teacherId",
        coalesce(t.user_metadata->>'name', t.email) as "teacherName",
        t.email as "teacherEmail",
        count(distinct c.id) as "courseCount",
        count(distinct lc.user_id) as "activeStudents",
        count(lc.lesson_id) as "completedLessons",
        (count(distinct c.id) * 10 + count(distinct lc.user_id) * 5 + count(lc.lesson_id))::int as "popularityScore"
       from app_users t
       left join courses c on c.created_by=t.id
       left join lessons l on l.course_id=c.id
       left join lesson_completions lc on lc.lesson_id=l.id
       where t.user_metadata->>'role'='teacher'
       group by t.id, t.email, t.user_metadata
       order by "popularityScore" desc limit 100`
    );
    res.json({ teachers: rows });
  } catch (err) { console.error(err); res.status(500).json({ error: 'Ошибка рейтинга преподавателей' }); }
});

// ─── teacher dashboard ────────────────────────────────────────────────────────

app.get('/teacher/dashboard', authRequired, async (req, res) => {
  try {
    if (!isTeacherOrAdmin(req)) return res.status(403).json({ error: 'Только преподаватель или администратор' });
    const teacherId = req.user.sub;
    const isAdmin = isSuperAdmin(req);
    const filterTeacher = isAdmin ? '1=1' : 'c.created_by=$1';
    const params = isAdmin ? [] : [teacherId];

    // Total unique students who submitted to teacher's courses
    const { rows: studentsR } = await query(
      `select count(distinct s.user_id) as cnt
       from submissions s join courses c on c.id=s.course_id
       where ${filterTeacher}`, params
    );

    // Students from groups
    const { rows: groupStudentsR } = await query(
      `select count(distinct gm.student_id) as cnt
       from group_members gm
       join groups g on g.id=gm.group_id
       where ${isAdmin ? '1=1' : 'g.teacher_id=$1'}`, params
    );

    // Avg grade per course
    const { rows: courseGrades } = await query(
      `select c.id, c.title,
        count(distinct s.user_id) as "studentCount",
        round(avg(s.grade) filter (where s.grade is not null), 1) as "avgGrade",
        count(distinct lc.user_id) filter (
          where (select count(*) from lessons l2 where l2.course_id=c.id) > 0
            and (select count(*) from lesson_completions lc2 join lessons l3 on l3.id=lc2.lesson_id
                 where lc2.user_id=lc.user_id and l3.course_id=c.id)
              >= (select count(*) from lessons l4 where l4.course_id=c.id)
        ) as "completedCount",
        c.lessons_count as "lessonsCount"
       from courses c
       left join submissions s on s.course_id=c.id
       left join lesson_completions lc on lc.lesson_id in (select id from lessons where course_id=c.id)
       where ${filterTeacher}
       group by c.id order by c.created_at desc`, params
    );

    // Submissions over last 30 days
    const { rows: submissionsOverTime } = await query(
      `select date_trunc('day', s.created_at) as day, count(*) as cnt
       from submissions s join courses c on c.id=s.course_id
       where ${filterTeacher} and s.created_at > now() - interval '30 days'
       group by day order by day asc`,
      params
    );

    // Groups with member count and avg grade
    const { rows: groupsStats } = await query(
      `select g.id, g.name, count(gm.student_id) as "memberCount",
        round(avg(s.grade) filter (where s.grade is not null), 1) as "avgGrade",
        count(s.id) filter (where s.grade is not null) as "gradedCount"
       from groups g
       left join group_members gm on gm.group_id=g.id
       left join submissions s on s.user_id=gm.student_id
       where ${isAdmin ? '1=1' : 'g.teacher_id=$1'}
       group by g.id order by g.created_at desc`, params
    );

    // Pending submissions
    const { rows: pendingR } = await query(
      `select count(*) as cnt from submissions s join courses c on c.id=s.course_id
       where ${filterTeacher} and s.status='pending'`, params
    );

    // Course completion %
    const { rows: enrollR } = await query(
      `select count(*) as cnt from course_enrollments ce
       join courses c on c.id=ce.course_id
       where ${filterTeacher}`, params
    );

    res.json({
      totalStudents: Number(studentsR[0]?.cnt || 0),
      groupStudents: Number(groupStudentsR[0]?.cnt || 0),
      pendingSubmissions: Number(pendingR[0]?.cnt || 0),
      totalEnrollments: Number(enrollR[0]?.cnt || 0),
      courseStats: courseGrades,
      groupStats: groupsStats,
      submissionsOverTime: submissionsOverTime.map(r => ({
        day: r.day,
        count: Number(r.cnt),
      })),
    });
  } catch (err) { console.error('[teacher/dashboard]', err); res.status(500).json({ error: 'Ошибка' }); }
});

// ─── users & public profiles ──────────────────────────────────────────────────

app.get('/users/:id/public-profile', authRequired, async (req, res) => {
  try {
    const { rows: ur, rowCount } = await query(`select id,email,user_metadata from app_users where id=$1`, [req.params.id]);
    if (!rowCount) return res.status(404).json({ error: 'Пользователь не найден' });
    const user = ur[0];
    const { rows: pr } = await query(
      `select level,xp,xp_to_next_level as "xpToNextLevel",
        completed_lessons as "completedLessons",streak,achievements
       from user_progress where user_id=$1`, [req.params.id]
    );
    const progress = pr[0] || { level: 1, xp: 0, xpToNextLevel: 100, completedLessons: 0, streak: 0, achievements: [] };
    const { rows: cr } = await query(
      `select c.id,c.title,c.lessons_count as "lessonsCount",
        count(lc.lesson_id) as "completedCount"
       from courses c left join lessons l on l.course_id=c.id
       left join lesson_completions lc on lc.lesson_id=l.id and lc.user_id=$1
       group by c.id order by c.created_at desc limit 8`,
      [req.params.id]
    );
    res.json({
      profile: {
        id: user.id, email: user.email,
        name: user.user_metadata?.name || user.email,
        role: user.user_metadata?.role || 'student',
        progress, courses: cr,
      },
    });
  } catch (err) { console.error(err); res.status(500).json({ error: 'Ошибка загрузки профиля' }); }
});

app.get('/admin/students', authRequired, async (req, res) => {
  try {
    if (!isSuperAdmin(req)) return res.status(403).json({ error: 'Только главный администратор' });
    const { rows } = await query(
      `select u.id, u.email, u.user_metadata,
        coalesce(up.level, 1) as level, coalesce(up.xp, 0) as xp,
        coalesce(up.xp_to_next_level, 100) as "xpToNextLevel",
        coalesce(up.completed_lessons, 0) as "completedLessons",
        coalesce(up.achievements, '[]'::jsonb) as achievements,
        round(avg(s.grade) filter (where s.grade is not null), 1) as "avgGrade"
       from app_users u
       left join user_progress up on up.user_id=u.id
       left join submissions s on s.user_id=u.id
       where coalesce(u.user_metadata->>'role','student')='student'
       group by u.id, up.level, up.xp, up.xp_to_next_level, up.completed_lessons, up.achievements
       order by coalesce(up.completed_lessons,0) desc, coalesce(up.xp,0) desc`
    );
    res.json({ students: rows });
  } catch (err) { console.error(err); res.status(500).json({ error: 'Ошибка загрузки учеников' }); }
});

// ─── groups ──────────────────────────────────────────────────────────────────

app.get('/groups', authRequired, async (req, res) => {
  try {
    let rows = [];
    if (isSuperAdmin(req)) {
      const d = await query(
        `select g.id, g.name, g.description, g.teacher_id as "teacherId",
          g.created_at as "createdAt", u.user_metadata->>'name' as "teacherName",
          count(gm.student_id) as "memberCount"
         from groups g left join app_users u on u.id=g.teacher_id
         left join group_members gm on gm.group_id=g.id
         group by g.id, u.user_metadata order by g.created_at desc`
      );
      rows = d.rows;
    } else if (isTeacher(req)) {
      const d = await query(
        `select g.id, g.name, g.description, g.teacher_id as "teacherId",
          g.created_at as "createdAt", u.user_metadata->>'name' as "teacherName",
          count(gm.student_id) as "memberCount"
         from groups g left join app_users u on u.id=g.teacher_id
         left join group_members gm on gm.group_id=g.id
         where g.teacher_id=$1
         group by g.id, u.user_metadata order by g.created_at desc`,
        [req.user.sub]
      );
      rows = d.rows;
    } else {
      const d = await query(
        `select g.id, g.name, g.description, g.teacher_id as "teacherId",
          g.created_at as "createdAt", u.user_metadata->>'name' as "teacherName",
          count(gm2.student_id) as "memberCount"
         from group_members gm
         join groups g on g.id=gm.group_id
         left join app_users u on u.id=g.teacher_id
         left join group_members gm2 on gm2.group_id=g.id
         where gm.student_id=$1
         group by g.id, u.user_metadata order by g.created_at desc`,
        [req.user.sub]
      );
      rows = d.rows;
    }
    const withGeneral = [
      { id: 'general', name: 'Общий чат', description: 'Общий канал платформы', teacherId: null, createdAt: null, teacherName: null, memberCount: 0 },
      ...rows,
    ];
    res.json({ groups: withGeneral });
  } catch (err) { console.error(err); res.status(500).json({ error: 'Ошибка' }); }
});

app.post('/groups', authRequired, async (req, res) => {
  try {
    if (!isTeacherOrAdmin(req)) return res.status(403).json({ error: 'Только преподаватель или администратор' });
    const { name, description = '' } = req.body;
    if (!name) return res.status(400).json({ error: 'Название группы обязательно' });
    const { rows } = await query(
      'insert into groups(name,description,teacher_id) values($1,$2,$3) returning id,name,description,teacher_id as "teacherId",created_at as "createdAt"',
      [name, description, req.user.sub]
    );
    res.json({ group: rows[0] });
  } catch (err) { console.error(err); res.status(500).json({ error: 'Ошибка создания группы' }); }
});

app.put('/groups/:id', authRequired, async (req, res) => {
  try {
    if (!isTeacherOrAdmin(req)) return res.status(403).json({ error: 'Только преподаватель или администратор' });
    const { name, description } = req.body;
    const own = await query('select teacher_id from groups where id=$1', [req.params.id]);
    if (!own.rowCount) return res.status(404).json({ error: 'Группа не найдена' });
    if (!canManageEntity(own.rows[0].teacher_id, req)) return res.status(403).json({ error: 'Недостаточно прав' });
    await query('update groups set name=coalesce($1,name),description=coalesce($2,description) where id=$3', [name||null, description||null, req.params.id]);
    const { rows } = await query('select id,name,description,teacher_id as "teacherId",created_at as "createdAt" from groups where id=$1', [req.params.id]);
    res.json({ group: rows[0] });
  } catch (err) { res.status(500).json({ error: 'Ошибка' }); }
});

app.delete('/groups/:id', authRequired, async (req, res) => {
  try {
    if (!isTeacherOrAdmin(req)) return res.status(403).json({ error: 'Только преподаватель или администратор' });
    const own = await query('select teacher_id from groups where id=$1', [req.params.id]);
    if (!own.rowCount) return res.status(404).json({ error: 'Группа не найдена' });
    if (!canManageEntity(own.rows[0].teacher_id, req)) return res.status(403).json({ error: 'Недостаточно прав' });
    await query('delete from groups where id=$1', [req.params.id]);
    res.json({ ok: true });
  } catch (err) { res.status(500).json({ error: 'Ошибка' }); }
});

app.get('/groups/:id/members', authRequired, async (req, res) => {
  try {
    if (req.params.id === 'general') return res.json({ members: [] });
    const own = await query('select teacher_id from groups where id=$1', [req.params.id]);
    if (!own.rowCount) return res.status(404).json({ error: 'Группа не найдена' });
    if (!canManageEntity(own.rows[0].teacher_id, req)) return res.status(403).json({ error: 'Недостаточно прав' });
    const { rows } = await query(
      `select u.id, u.email, u.user_metadata,
        up.level, up.xp, up.completed_lessons as "completedLessons",
        gm.joined_at as "joinedAt",
        round(avg(s.grade) filter (where s.grade is not null), 1) as "avgGrade"
       from group_members gm
       join app_users u on u.id=gm.student_id
       left join user_progress up on up.user_id=u.id
       left join submissions s on s.user_id=u.id
       where gm.group_id=$1
       group by u.id, u.email, u.user_metadata, up.level, up.xp, up.completed_lessons, gm.joined_at
       order by u.user_metadata->>'name' asc`,
      [req.params.id]
    );
    res.json({ members: rows });
  } catch (err) { console.error(err); res.status(500).json({ error: 'Ошибка' }); }
});

app.post('/groups/:id/members', authRequired, async (req, res) => {
  try {
    if (!isTeacherOrAdmin(req)) return res.status(403).json({ error: 'Только преподаватель или администратор' });
    const own = await query('select teacher_id from groups where id=$1', [req.params.id]);
    if (!own.rowCount) return res.status(404).json({ error: 'Группа не найдена' });
    if (!canManageEntity(own.rows[0].teacher_id, req)) return res.status(403).json({ error: 'Недостаточно прав' });
    const { studentEmail } = req.body;
    if (!studentEmail) return res.status(400).json({ error: 'Email ученика обязателен' });
    const { rows: sr, rowCount } = await query(
      `select id from app_users where email=$1 and user_metadata->>'role'='student'`, [studentEmail]
    );
    if (!rowCount) return res.status(404).json({ error: 'Ученик не найден' });
    await query(
      'insert into group_members(group_id,student_id) values($1,$2) on conflict do nothing',
      [req.params.id, sr[0].id]
    );
    // Auto-enroll the student in all private courses assigned to this group
    const { rows: groupCourses } = await query(
      'select course_id from group_courses where group_id=$1', [req.params.id]
    );
    for (const gc of groupCourses) {
      await query(
        'insert into course_enrollments(course_id,student_id) values($1,$2) on conflict do nothing',
        [gc.course_id, sr[0].id]
      );
    }
    const { rows: gr } = await query('select name from groups where id=$1', [req.params.id]);
    await addNotification(sr[0].id, 'system', 'Добавлен в класс',
      `Вас добавили в класс «${gr[0]?.name}»`, { groupId: req.params.id });
    res.json({ ok: true });
  } catch (err) { console.error(err); res.status(500).json({ error: 'Ошибка' }); }
});

app.delete('/groups/:id/members/:studentId', authRequired, async (req, res) => {
  try {
    if (!isTeacherOrAdmin(req)) return res.status(403).json({ error: 'Только преподаватель или администратор' });
    const own = await query('select teacher_id from groups where id=$1', [req.params.id]);
    if (!own.rowCount) return res.status(404).json({ error: 'Группа не найдена' });
    if (!canManageEntity(own.rows[0].teacher_id, req)) return res.status(403).json({ error: 'Недостаточно прав' });
    await query('delete from group_members where group_id=$1 and student_id=$2', [req.params.id, req.params.studentId]);
    res.json({ ok: true });
  } catch (err) { res.status(500).json({ error: 'Ошибка' }); }
});

// ─── group ↔ course assignments ───────────────────────────────────────────────

// List courses assigned to a group/class
app.get('/groups/:id/courses', authRequired, async (req, res) => {
  try {
    if (!isTeacherOrAdmin(req)) return res.status(403).json({ error: 'Только преподаватель или администратор' });
    const own = await query('select teacher_id from groups where id=$1', [req.params.id]);
    if (!own.rowCount) return res.status(404).json({ error: 'Класс не найден' });
    if (!canManageEntity(own.rows[0].teacher_id, req)) return res.status(403).json({ error: 'Недостаточно прав' });
    const { rows } = await query(
      `select c.id, c.title, c.description, c.level, c.lessons_count as "lessonsCount",
        c.is_private as "isPrivate", gc.assigned_at as "assignedAt"
       from group_courses gc
       join courses c on c.id=gc.course_id
       where gc.group_id=$1 order by gc.assigned_at desc`,
      [req.params.id]
    );
    res.json({ courses: rows });
  } catch (err) { console.error(err); res.status(500).json({ error: 'Ошибка' }); }
});

// Assign a course to a group/class (and auto-enroll all current members)
app.post('/groups/:id/courses', authRequired, async (req, res) => {
  try {
    if (!isTeacherOrAdmin(req)) return res.status(403).json({ error: 'Только преподаватель или администратор' });
    const own = await query('select teacher_id from groups where id=$1', [req.params.id]);
    if (!own.rowCount) return res.status(404).json({ error: 'Класс не найден' });
    if (!canManageEntity(own.rows[0].teacher_id, req)) return res.status(403).json({ error: 'Недостаточно прав' });

    const { courseId } = req.body;
    if (!courseId) return res.status(400).json({ error: 'courseId обязателен' });

    const courseCheck = await query('select id, title, created_by from courses where id=$1', [courseId]);
    if (!courseCheck.rowCount) return res.status(404).json({ error: 'Курс не найден' });
    if (!canManageEntity(courseCheck.rows[0].created_by, req)) {
      return res.status(403).json({ error: 'Можно привязывать только свои курсы' });
    }

    // Link course to group
    await query(
      'insert into group_courses(group_id,course_id) values($1,$2) on conflict do nothing',
      [req.params.id, courseId]
    );

    // Make course private automatically
    await query('update courses set is_private=true where id=$1', [courseId]);

    // Auto-enroll all current group members in this course
    const { rows: members } = await query(
      'select student_id from group_members where group_id=$1', [req.params.id]
    );
    for (const m of members) {
      await query(
        'insert into course_enrollments(course_id,student_id) values($1,$2) on conflict do nothing',
        [courseId, m.student_id]
      );
      await addNotification(m.student_id, 'system', 'Новый курс',
        `Вам открыт доступ к курсу «${courseCheck.rows[0].title}»`, { courseId }
      );
    }
    res.json({ ok: true });
  } catch (err) { console.error(err); res.status(500).json({ error: 'Ошибка' }); }
});

// Unassign course from group/class
app.delete('/groups/:id/courses/:courseId', authRequired, async (req, res) => {
  try {
    if (!isTeacherOrAdmin(req)) return res.status(403).json({ error: 'Только преподаватель или администратор' });
    const own = await query('select teacher_id from groups where id=$1', [req.params.id]);
    if (!own.rowCount) return res.status(404).json({ error: 'Класс не найден' });
    if (!canManageEntity(own.rows[0].teacher_id, req)) return res.status(403).json({ error: 'Недостаточно прав' });

    await query('delete from group_courses where group_id=$1 and course_id=$2', [req.params.id, req.params.courseId]);

    // Remove course_enrollments for group members who have no other access
    const { rows: members } = await query(
      'select student_id from group_members where group_id=$1', [req.params.id]
    );
    for (const m of members) {
      // Check if they have direct enrollment or via another group
      const otherAccess = await query(
        `select 1 from group_courses gc2
         join group_members gm2 on gm2.group_id=gc2.group_id
         where gc2.course_id=$1 and gm2.student_id=$2 and gc2.group_id!=$3`,
        [req.params.courseId, m.student_id, req.params.id]
      );
      if (!otherAccess.rowCount) {
        await query(
          'delete from course_enrollments where course_id=$1 and student_id=$2',
          [req.params.courseId, m.student_id]
        );
      }
    }
    res.json({ ok: true });
  } catch (err) { console.error(err); res.status(500).json({ error: 'Ошибка' }); }
});

// ─── grades (teacher & student) ───────────────────────────────────────────────

app.get('/teacher/grades', authRequired, async (req, res) => {
  try {
    if (!isTeacherOrAdmin(req)) return res.status(403).json({ error: 'Только преподаватель или администратор' });
    const { rows } = await query(
      `select s.id, s.user_id as "userId", s.lesson_id as "lessonId", s.course_id as "courseId",
        s.grade, s.status, s.feedback, s.created_at as "createdAt",
        u.email as "userEmail", u.user_metadata->>'name' as "userName",
        l.title as "lessonTitle", c.title as "courseTitle"
       from submissions s
       join app_users u on u.id=s.user_id
       join courses c on c.id=s.course_id
       left join lessons l on l.id=s.lesson_id
       where ${isSuperAdmin(req) ? '1=1' : 'c.created_by=$1'} and s.grade is not null
       order by s.created_at desc`,
      isSuperAdmin(req) ? [] : [req.user.sub]
    );
    res.json({ grades: rows });
  } catch (err) { console.error(err); res.status(500).json({ error: 'Ошибка' }); }
});

app.get('/teacher/students', authRequired, async (req, res) => {
  try {
    if (!isTeacherOrAdmin(req)) return res.status(403).json({ error: 'Только преподаватель или администратор' });
    const { rows } = await query(
      `select distinct u.id, u.email, u.user_metadata,
        up.level, up.xp, up.completed_lessons as "completedLessons"
       from submissions s
       join courses c on c.id=s.course_id
       join app_users u on u.id=s.user_id
       left join user_progress up on up.user_id=u.id
       where ${isSuperAdmin(req) ? '1=1' : 'c.created_by=$1'}
       order by u.user_metadata->>'name' asc`,
      isSuperAdmin(req) ? [] : [req.user.sub]
    );
    res.json({ students: rows });
  } catch (err) { console.error(err); res.status(500).json({ error: 'Ошибка' }); }
});

app.get('/teacher/students/:studentId/grades', authRequired, async (req, res) => {
  try {
    if (!isTeacherOrAdmin(req)) return res.status(403).json({ error: 'Только преподаватель или администратор' });
    const { rows } = await query(
      `select s.id, s.lesson_id as "lessonId", s.course_id as "courseId",
        s.grade, s.status, s.feedback, s.created_at as "createdAt",
        l.title as "lessonTitle", c.title as "courseTitle", l.check_mode as "checkMode"
       from submissions s join courses c on c.id=s.course_id
       left join lessons l on l.id=s.lesson_id
       where s.user_id=$1 and ${isSuperAdmin(req) ? '1=1' : 'c.created_by=$2'}
       order by s.created_at desc`,
      isSuperAdmin(req) ? [req.params.studentId] : [req.params.studentId, req.user.sub]
    );
    const { rows: mg } = await query(
      `select mg.id, mg.lesson_id as "lessonId", mg.course_id as "courseId",
        mg.grade, 'passed' as status, mg.comment as feedback, mg.created_at as "createdAt",
        l.title as "lessonTitle", c.title as "courseTitle", 'manual' as "checkMode"
       from manual_grades mg
       join courses c on c.id=mg.course_id
       left join lessons l on l.id=mg.lesson_id
       where mg.student_id=$1 and ${isSuperAdmin(req) ? '1=1' : 'mg.teacher_id=$2'}`,
      isSuperAdmin(req) ? [req.params.studentId] : [req.params.studentId, req.user.sub]
    );
    res.json({ grades: [...rows, ...mg] });
  } catch (err) { console.error(err); res.status(500).json({ error: 'Ошибка' }); }
});

app.post('/manual-grades', authRequired, async (req, res) => {
  try {
    if (!isTeacherOrAdmin(req)) return res.status(403).json({ error: 'Только преподаватель или администратор' });
    const { studentId, courseId, lessonId, grade, comment = '' } = req.body;
    if (!studentId || !grade || grade < 0 || grade > 100) return res.status(400).json({ error: 'Некорректные данные' });
    await query(
      `insert into manual_grades(student_id,teacher_id,course_id,lesson_id,grade,comment)
       values($1,$2,$3,$4,$5,$6)
       on conflict(student_id,lesson_id) do update set grade=$5,comment=$6,teacher_id=$2`,
      [studentId, req.user.sub, courseId||null, lessonId||null, grade, comment]
    );
    const { rows: lr } = await query('select title from lessons where id=$1', [lessonId]);
    const lessonTitle = lr[0]?.title || 'задание';
    await addNotification(studentId, 'grade', 'Новая оценка',
      `Преподаватель выставил оценку ${grade}/100 за "${lessonTitle}". ${comment}`,
      { grade, lessonId, courseId }
    );
    if (grade >= 60) await awardXP(studentId, 30, 'manual_grade');
    res.json({ ok: true });
  } catch (err) { console.error(err); res.status(500).json({ error: 'Ошибка' }); }
});

app.get('/student/all-grades', authRequired, async (req, res) => {
  try {
    const { rows: sub } = await query(
      `select s.id, s.lesson_id as "lessonId", s.course_id as "courseId",
        s.grade, s.status, s.feedback, s.created_at as "createdAt",
        l.title as "lessonTitle", c.title as "courseTitle", l.check_mode as "checkMode", 'submission' as "source"
       from submissions s left join lessons l on l.id=s.lesson_id left join courses c on c.id=s.course_id
       where s.user_id=$1 and s.grade is not null order by s.created_at desc`,
      [req.user.sub]
    );
    const { rows: mg } = await query(
      `select mg.id, mg.lesson_id as "lessonId", mg.course_id as "courseId",
        mg.grade, 'passed' as status, mg.comment as feedback, mg.created_at as "createdAt",
        l.title as "lessonTitle", c.title as "courseTitle", 'manual' as "checkMode", 'manual' as "source"
       from manual_grades mg left join lessons l on l.id=mg.lesson_id left join courses c on c.id=mg.course_id
       where mg.student_id=$1 order by mg.created_at desc`,
      [req.user.sub]
    );
    res.json({ grades: [...sub, ...mg] });
  } catch (err) { console.error(err); res.status(500).json({ error: 'Ошибка' }); }
});

app.get('/parent/students/:studentId/grades', authRequired, async (req, res) => {
  try {
    if (!isParent(req)) return res.status(403).json({ error: 'Только для родителей' });
    const link = await query('select id from parent_student_links where parent_id=$1 and student_id=$2 and status=$3',
      [req.user.sub, req.params.studentId, 'accepted']);
    if (!link.rowCount) return res.status(403).json({ error: 'Нет доступа' });
    const { rows: sub } = await query(
      `select s.id, s.lesson_id as "lessonId", s.course_id as "courseId",
        s.grade, s.status, s.feedback, s.created_at as "createdAt",
        l.title as "lessonTitle", c.title as "courseTitle", l.check_mode as "checkMode"
       from submissions s left join lessons l on l.id=s.lesson_id left join courses c on c.id=s.course_id
       where s.user_id=$1 and s.grade is not null order by s.created_at desc`,
      [req.params.studentId]
    );
    const { rows: mg } = await query(
      `select mg.id, mg.lesson_id as "lessonId", mg.course_id as "courseId",
        mg.grade, 'passed' as status, mg.comment as feedback, mg.created_at as "createdAt",
        l.title as "lessonTitle", c.title as "courseTitle", 'manual' as "checkMode"
       from manual_grades mg left join lessons l on l.id=mg.lesson_id left join courses c on c.id=mg.course_id
       where mg.student_id=$1 order by mg.created_at desc`,
      [req.params.studentId]
    );
    res.json({ grades: [...sub, ...mg] });
  } catch (err) { console.error(err); res.status(500).json({ error: 'Ошибка' }); }
});

// ─── DB export (superadmin only) ──────────────────────────────────────────────

app.get('/admin/export-db', authRequired, async (req, res) => {
  try {
    if (!isSuperAdmin(req)) return res.status(403).json({ error: 'Только главный администратор' });
    const tables = ['app_users', 'courses', 'lessons', 'groups', 'group_members',
      'submissions', 'manual_grades', 'lesson_completions', 'user_progress',
      'notifications', 'parent_student_links', 'quiz_questions', 'quiz_attempts',
      'course_enrollments', 'comments', 'messages'];
    const dump = {};
    for (const table of tables) {
      try {
        const { rows } = await query(`select * from ${table}`);
        dump[table] = rows;
      } catch { dump[table] = []; }
    }
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename="codekids-backup-${Date.now()}.json"`);
    res.json({ exportedAt: new Date().toISOString(), tables: dump });
  } catch (err) { console.error(err); res.status(500).json({ error: 'Ошибка экспорта' }); }
});

// ─── serve frontend in production ────────────────────────────────────────────
if (process.env.NODE_ENV === 'production') {
  const __dirname_server = path.dirname(fileURLToPath(import.meta.url));
  const distPath = path.join(__dirname_server, '..', 'dist');
  app.use(express.static(distPath));
  app.get('/{*splat}', (_req, res) => {
    res.sendFile(path.join(distPath, 'index.html'));
  });
}

app.use((err, _req, res, _next) => {
  console.error('[unhandled]', err);
  res.status(500).json({ error: 'Внутренняя ошибка сервера' });
});

// ─── Demo seed data (runs once if DB is empty) ────────────────────────────────

async function ensureSeedData() {
  try {
    const { rowCount } = await query(
      `select 1 from app_users where email='teacher1@codekids.demo' limit 1`
    );
    if (rowCount) { console.log('[seed] Demo data already present, skipping'); return; }

    console.log('[seed] Creating demo data...');

    // Passwords: all demo accounts use "Demo1234!"
    const demoPass = await bcrypt.hash('Demo1234!', 10);

    // ── Demo teachers ──
    const { rows: [t1] } = await query(
      `insert into app_users(email,password_hash,user_metadata,email_verified)
       values('teacher1@codekids.demo',$1,$2,true) returning id`,
      [demoPass, JSON.stringify({ name: 'Александр Петров', role: 'teacher' })]
    );
    const { rows: [t2] } = await query(
      `insert into app_users(email,password_hash,user_metadata,email_verified)
       values('teacher2@codekids.demo',$1,$2,true) returning id`,
      [demoPass, JSON.stringify({ name: 'Мария Иванова', role: 'teacher' })]
    );

    // ── Demo students ──
    const students = [];
    const studentData = [
      { email: 'student1@codekids.demo', name: 'Иван Сидоров' },
      { email: 'student2@codekids.demo', name: 'Анна Козлова' },
      { email: 'student3@codekids.demo', name: 'Дмитрий Новиков' },
      { email: 'student4@codekids.demo', name: 'Елена Морозова' },
      { email: 'student5@codekids.demo', name: 'Алексей Волков' },
    ];
    for (const s of studentData) {
      const { rows: [st] } = await query(
        `insert into app_users(email,password_hash,user_metadata,email_verified)
         values($1,$2,$3,true) returning id`,
        [s.email, demoPass, JSON.stringify({ name: s.name, role: 'student' })]
      );
      await query('insert into user_progress(user_id) values($1) on conflict do nothing', [st.id]);
      students.push({ ...st, ...s });
    }

    // ── Demo courses ──
    const c1id = `demo-${Date.now()}-1`;
    const c2id = `demo-${Date.now()}-2`;
    const c3id = `demo-${Date.now()}-3`;

    await query(
      `insert into courses(id,title,description,level,lessons_count,is_private,created_by)
       values($1,$2,$3,$4,$5,$6,$7)`,
      [c1id, 'Основы Python', 'Введение в программирование на Python для начинающих', 'beginner', 3, false, t1.id]
    );
    await query(
      `insert into courses(id,title,description,level,lessons_count,is_private,created_by)
       values($1,$2,$3,$4,$5,$6,$7)`,
      [c2id, 'Основы JavaScript', 'Изучаем JavaScript с нуля: переменные, функции, DOM', 'beginner', 2, false, t1.id]
    );
    await query(
      `insert into courses(id,title,description,level,lessons_count,is_private,created_by)
       values($1,$2,$3,$4,$5,$6,$7)`,
      [c3id, 'Индивидуальный: Алгоритмы', 'Индивидуальный курс по алгоритмам и структурам данных', 'intermediate', 2, true, t1.id]
    );

    // ── Lessons for c1 (Python) ──
    const lessons = [
      { cid: c1id, title: 'Введение в Python', desc: 'Что такое Python и как его запустить', content: '# Введение в Python\n\nPython — это простой и мощный язык программирования.\n\n## Первая программа\n\n```python\nprint("Привет, мир!")\n```\n\nЗапустите эту программу и посмотрите результат!', order: 1 },
      { cid: c1id, title: 'Переменные и типы данных', desc: 'int, str, float, bool', content: '# Переменные\n\nПеременные хранят данные:\n\n```python\nname = "Иван"\nage = 15\ngpa = 4.8\nis_student = True\n\nprint(f"Меня зовут {name}, мне {age} лет")\n```', order: 2 },
      { cid: c1id, title: 'Условия и циклы', desc: 'if/elif/else и циклы for/while', content: '# Условия\n\n```python\nscore = 85\nif score >= 90:\n    print("Отлично!")\nelif score >= 70:\n    print("Хорошо")\nelse:\n    print("Нужно постараться")\n```\n\n# Цикл\n\n```python\nfor i in range(1, 6):\n    print(f"{i} * 2 = {i * 2}")\n```', order: 3, hasAssignment: true },
      { cid: c2id, title: 'Переменные в JavaScript', desc: 'var, let, const', content: '# Переменные в JavaScript\n\n```javascript\nlet name = "Иван";\nconst PI = 3.14159;\nvar age = 15; // устаревший способ\n\nconsole.log(`Привет, ${name}!`);\n```', order: 1 },
      { cid: c2id, title: 'Функции', desc: 'Объявление и вызов функций', content: '# Функции\n\n```javascript\nfunction greet(name) {\n  return `Привет, ${name}!`;\n}\n\nconst square = (x) => x * x;\n\nconsole.log(greet("Иван"));\nconsole.log(square(5));\n```', order: 2, hasAssignment: true },
      { cid: c3id, title: 'Сортировка пузырьком', desc: 'Классический алгоритм сортировки', content: '# Сортировка пузырьком\n\nАлгоритм сравнивает соседние элементы и меняет их местами.\n\n```python\ndef bubble_sort(arr):\n    n = len(arr)\n    for i in range(n):\n        for j in range(0, n-i-1):\n            if arr[j] > arr[j+1]:\n                arr[j], arr[j+1] = arr[j+1], arr[j]\n    return arr\n\nprint(bubble_sort([64, 34, 25, 12, 22, 11, 90]))\n```', order: 1 },
      { cid: c3id, title: 'Бинарный поиск', desc: 'Эффективный поиск в отсортированном массиве', content: '# Бинарный поиск\n\nБинарный поиск работает за O(log n).\n\n```python\ndef binary_search(arr, target):\n    left, right = 0, len(arr) - 1\n    while left <= right:\n        mid = (left + right) // 2\n        if arr[mid] == target:\n            return mid\n        elif arr[mid] < target:\n            left = mid + 1\n        else:\n            right = mid - 1\n    return -1\n```', order: 2, hasAssignment: true },
    ];

    for (const l of lessons) {
      const lid = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
      await query(
        `insert into lessons(id,course_id,title,description,content,order_num,has_assignment,check_mode,created_by)
         values($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
        [lid, l.cid, l.title, l.desc, l.content, l.order, l.hasAssignment || false, 'manual', t1.id]
      );
    }

    // ── Demo class (group) ──
    const { rows: [g1] } = await query(
      `insert into groups(name,description,teacher_id)
       values($1,$2,$3) returning id`,
      ['9А — Базовый Python', 'Класс по изучению Python для 9А', t1.id]
    );

    // Add 3 students to the class
    for (const s of students.slice(0, 3)) {
      await query(
        'insert into group_members(group_id,student_id) values($1,$2) on conflict do nothing',
        [g1.id, s.id]
      );
      await query('insert into user_progress(user_id) values($1) on conflict do nothing', [s.id]);
    }

    // ── Assign individual course to the class ──
    await query(
      'insert into group_courses(group_id,course_id) values($1,$2) on conflict do nothing',
      [g1.id, c3id]
    );
    // Enroll class members in the private course
    for (const s of students.slice(0, 3)) {
      await query(
        'insert into course_enrollments(course_id,student_id) values($1,$2) on conflict do nothing',
        [c3id, s.id]
      );
    }

    console.log('[seed] Demo data created successfully!');
    console.log('[seed] Demo accounts (password: Demo1234!):');
    console.log('[seed]   teacher1@codekids.demo (Преподаватель)');
    console.log('[seed]   student1@codekids.demo ... student5@codekids.demo (Ученики)');
  } catch (err) {
    console.error('[seed] Error creating seed data:', err.message);
  }
}

app.listen(PORT, () => console.log(`API server running at http://localhost:${PORT}`));
ensureSchemaCompat().then(() => Promise.all([ensureRootAdmin(), ensureSeedData()]));
