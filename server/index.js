import 'dotenv/config';
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

app.use(cors({ origin: true, credentials: true }));
app.use(express.json());

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

function isTeacher(req) { return req.user?.user_metadata?.role === 'teacher'; }
function isParent(req)  { return req.user?.user_metadata?.role === 'parent'; }
function isSuperAdmin(req) { return req.user?.user_metadata?.role === 'superadmin'; }
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

async function ensureRootAdmin() {
  try {
    const hash = await bcrypt.hash(ROOT_ADMIN_PASSWORD, 10);
    const meta = JSON.stringify({ name: 'Главный администратор', role: 'superadmin' });
    const { rowCount } = await query('select id from app_users where email=$1', [ROOT_ADMIN_EMAIL]);
    if (rowCount) {
      // Always keep credentials and role in sync with env vars
      await query(
        'update app_users set password_hash=$1, user_metadata=$2 where email=$3',
        [hash, meta, ROOT_ADMIN_EMAIL]
      );
      console.log(`[bootstrap] Root admin credentials refreshed: ${ROOT_ADMIN_EMAIL}`);
    } else {
      await query(
        'insert into app_users(email,password_hash,user_metadata) values($1,$2,$3)',
        [ROOT_ADMIN_EMAIL, hash, meta]
      );
      console.log(`[bootstrap] Root admin created: ${ROOT_ADMIN_EMAIL}`);
    }
  } catch (err) {
    console.error('[bootstrap] Failed to ensure root admin', err);
  }
}

async function ensureSchemaCompat() {
  try {
    await query('alter table if exists messages add column if not exists edited_at timestamptz');
  } catch (err) {
    console.error('[bootstrap] schema compat failed', err);
  }
}

// ─── health ──────────────────────────────────────────────────────────────────

app.get('/health', (_req, res) => res.json({ ok: true }));

// ─── auth ─────────────────────────────────────────────────────────────────────

app.post('/auth/signup', async (req, res) => {
  try {
    const { email, password, userData } = req.body;
    if (!email || !password) return res.status(400).json({ error: 'Email и пароль обязательны' });
    const exists = await query('select id from app_users where email=$1', [email]);
    if (exists.rowCount) return res.status(400).json({ error: 'Пользователь уже существует' });
    const hash = await bcrypt.hash(password, 10);
    const { rows } = await query(
      'insert into app_users(email,password_hash,user_metadata) values($1,$2,$3) returning id,email,user_metadata',
      [email, hash, userData || {}]
    );
    const role = userData?.role || 'student';
    if (role === 'student') {
      await query('insert into user_progress(user_id) values($1) on conflict do nothing', [rows[0].id]);
      await addNotification(rows[0].id, 'system', 'Добро пожаловать!', 'Вы успешно зарегистрировались на платформе CodeKids. Начните с изучения первого курса!');
    }
    return res.json({ user: mapUser(rows[0]) });
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
      'select id,email,password_hash,user_metadata from app_users where email=$1', [email]
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
    const parentName = pr[0]?.user_metadata?.name || pr[0]?.email;
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
  lessons_count as "lessonsCount", created_by as "createdBy", created_at as "createdAt"
  from courses`;

app.get('/courses', async (_req, res) => {
  try {
    const { rows } = await query(`${COURSE_SELECT} order by created_at desc`);
    res.json({ courses: rows });
  } catch (err) { console.error(err); res.status(500).json({ error: 'Ошибка загрузки курсов' }); }
});

app.get('/courses/:id', async (req, res) => {
  try {
    const { rows: cr, rowCount } = await query(`${COURSE_SELECT} where id=$1`, [req.params.id]);
    if (!rowCount) return res.status(404).json({ error: 'Курс не найден' });
    const { rows: lr } = await query(
      `select id,course_id as "courseId",title,description,content,
        order_num as "order",has_assignment as "hasAssignment",
        check_mode as "checkMode",created_by as "createdBy",created_at as "createdAt"
       from lessons where course_id=$1 order by order_num asc, created_at asc`,
      [req.params.id]
    );
    res.json({ ...cr[0], lessons: lr });
  } catch (err) { console.error(err); res.status(500).json({ error: 'Ошибка загрузки курса' }); }
});

app.post('/courses', authRequired, async (req, res) => {
  try {
    if (!isTeacherOrAdmin(req)) return res.status(403).json({ error: 'Только преподаватель или администратор' });
    const { title, description, level = 'beginner' } = req.body;
    if (!title || !description) return res.status(400).json({ error: 'Название и описание обязательны' });
    const id = `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
    await query('insert into courses(id,title,description,level,created_by) values($1,$2,$3,$4,$5)',
      [id, title, description, level, req.user.sub]);
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
    const { title, description, level } = req.body;
    await query(
      'update courses set title=coalesce($1,title), description=coalesce($2,description), level=coalesce($3,level) where id=$4',
      [title||null, description||null, level||null, req.params.id]
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
    await query('delete from lessons where course_id=$1', [req.params.id]);
    await query('delete from courses where id=$1', [req.params.id]);
    res.json({ ok: true });
  } catch (err) { console.error(err); res.status(500).json({ error: 'Ошибка удаления курса' }); }
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
    if (completedLessons >= 1) {
      await grantAchievement(req.user.sub, {
        id: 'first-lesson',
        title: 'Первый шаг',
        description: 'Пройти первый урок',
        icon: 'flag',
      });
    }
    if (completedLessons >= 5) {
      await grantAchievement(req.user.sub, {
        id: 'five-lessons',
        title: 'В ритме обучения',
        description: 'Пройти 5 уроков',
        icon: 'zap',
      });
    }
    if (completedLessons >= 10) {
      await grantAchievement(req.user.sub, {
        id: 'ten-lessons',
        title: 'Десять из десяти',
        description: 'Пройти 10 уроков',
        icon: 'award',
      });
    }
    const { rows: lr } = await query('select title,course_id from lessons where id=$1', [req.params.id]);
    await addNotification(req.user.sub, 'system', 'Урок пройден!', `Вы завершили урок "${lr[0]?.title || ''}" и получили 50 XP!`, { xp: 50 });

    // Check if the whole course is now complete
    const courseId = lr[0]?.course_id;
    if (courseId) {
      const { rows: courseRows } = await query('select lessons_count, title from courses where id=$1', [courseId]);
      if (courseRows.length && courseRows[0].lessons_count > 0) {
        const { rows: doneRows } = await query(
          `select count(*) as cnt from lesson_completions lc
           join lessons l on l.id=lc.lesson_id
           where lc.user_id=$1 and l.course_id=$2`,
          [req.user.sub, courseId]
        );
        const doneCnt = Number(doneRows[0]?.cnt || 0);
        if (doneCnt >= courseRows[0].lessons_count) {
          await grantAchievement(req.user.sub, {
            id: `course-${courseId}`,
            title: 'Курс пройден!',
            description: `Пройден курс «${courseRows[0].title}»`,
            icon: 'graduation-cap',
          });
          await awardXP(req.user.sub, 100, 'course_complete');
          await addNotification(req.user.sub, 'achievement', 'Курс завершён!',
            `Вы полностью прошли курс «${courseRows[0].title}» и получили 100 XP!`, { courseId });
          // Check multi-course achievement
          const { rows: multiCourse } = await query(
            `select count(distinct l.course_id) as cnt
             from lesson_completions lc
             join lessons l on l.id=lc.lesson_id
             join courses c on c.id=l.course_id
             where lc.user_id=$1
               and c.lessons_count > 0
               and c.lessons_count = (
                 select count(*) from lesson_completions lc2
                 join lessons l2 on l2.id=lc2.lesson_id
                 where lc2.user_id=$1 and l2.course_id=c.id
               )`,
            [req.user.sub]
          );
          const completedCourses = Number(multiCourse[0]?.cnt || 0);
          if (completedCourses >= 3) {
            await grantAchievement(req.user.sub, {
              id: 'three-courses',
              title: 'Трижды победитель',
              description: 'Полностью пройти 3 курса',
              icon: 'trophy',
            });
          }
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
      `select c.id,c.title,c.description,c.level,c.lessons_count as "lessonsCount",c.created_at as "createdAt",
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
        text,created_at as "createdAt", edited_at as "editedAt"
       from messages where id=$1`,
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

// ─── leaderboard — only students ─────────────────────────────────────────────

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
       order by "popularityScore" desc, "activeStudents" desc, "courseCount" desc
       limit 100`
    );
    res.json({ teachers: rows });
  } catch (err) { console.error(err); res.status(500).json({ error: 'Ошибка рейтинга преподавателей' }); }
});

app.get('/users/:id/public-profile', authRequired, async (req, res) => {
  try {
    const { rows: ur, rowCount } = await query(
      `select id,email,user_metadata from app_users where id=$1`,
      [req.params.id]
    );
    if (!rowCount) return res.status(404).json({ error: 'Пользователь не найден' });
    const user = ur[0];
    const role = user.user_metadata?.role || 'student';
    const { rows: pr } = await query(
      `select level,xp,xp_to_next_level as "xpToNextLevel",
        completed_lessons as "completedLessons",streak,achievements
       from user_progress where user_id=$1`,
      [req.params.id]
    );
    const progress = pr[0] || { level: 1, xp: 0, xpToNextLevel: 100, completedLessons: 0, streak: 0, achievements: [] };
    const { rows: cr } = await query(
      `select c.id,c.title,c.lessons_count as "lessonsCount",
        count(lc.lesson_id) as "completedCount"
       from courses c
       left join lessons l on l.course_id=c.id
       left join lesson_completions lc on lc.lesson_id=l.id and lc.user_id=$1
       group by c.id
       order by c.created_at desc
       limit 8`,
      [req.params.id]
    );
    res.json({
      profile: {
        id: user.id,
        email: user.email,
        name: user.user_metadata?.name || user.email,
        role,
        progress,
        courses: cr,
      },
    });
  } catch (err) { console.error(err); res.status(500).json({ error: 'Ошибка загрузки профиля' }); }
});

app.get('/admin/students', authRequired, async (req, res) => {
  try {
    if (!isSuperAdmin(req)) return res.status(403).json({ error: 'Только главный администратор' });
    const { rows } = await query(
      `select
        u.id,
        u.email,
        u.user_metadata,
        coalesce(up.level, 1) as level,
        coalesce(up.xp, 0) as xp,
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
          g.created_at as "createdAt",
          u.user_metadata->>'name' as "teacherName",
          count(gm.student_id) as "memberCount"
         from groups g
         left join app_users u on u.id=g.teacher_id
         left join group_members gm on gm.group_id=g.id
         group by g.id, u.user_metadata
         order by g.created_at desc`
      );
      rows = d.rows;
    } else if (isTeacher(req)) {
      const d = await query(
        `select g.id, g.name, g.description, g.teacher_id as "teacherId",
          g.created_at as "createdAt",
          u.user_metadata->>'name' as "teacherName",
          count(gm.student_id) as "memberCount"
         from groups g
         left join app_users u on u.id=g.teacher_id
         left join group_members gm on gm.group_id=g.id
         where g.teacher_id=$1
         group by g.id, u.user_metadata
         order by g.created_at desc`,
        [req.user.sub]
      );
      rows = d.rows;
    } else {
      const d = await query(
        `select g.id, g.name, g.description, g.teacher_id as "teacherId",
          g.created_at as "createdAt",
          u.user_metadata->>'name' as "teacherName",
          count(gm2.student_id) as "memberCount"
         from group_members gm
         join groups g on g.id=gm.group_id
         left join app_users u on u.id=g.teacher_id
         left join group_members gm2 on gm2.group_id=g.id
         where gm.student_id=$1
         group by g.id, u.user_metadata
         order by g.created_at desc`,
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
        gm.joined_at as "joinedAt"
       from group_members gm
       join app_users u on u.id=gm.student_id
       left join user_progress up on up.user_id=u.id
       where gm.group_id=$1
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
      `select id from app_users where email=$1 and user_metadata->>'role'='student'`,
      [studentEmail]
    );
    if (!rowCount) return res.status(404).json({ error: 'Ученик не найден' });
    await query(
      'insert into group_members(group_id,student_id) values($1,$2) on conflict do nothing',
      [req.params.id, sr[0].id]
    );
    await addNotification(sr[0].id, 'system', 'Добавлен в группу',
      `Преподаватель добавил вас в группу.`, { groupId: req.params.id });
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

// Grades overview for teacher (all students in teacher's courses)
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

// Teacher: get all students in their courses/groups with grades
app.get('/teacher/students', authRequired, async (req, res) => {
  try {
    if (!isTeacherOrAdmin(req)) return res.status(403).json({ error: 'Только преподаватель или администратор' });
    // All students who submitted to teacher's courses
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

// Teacher: grades for a specific student
app.get('/teacher/students/:studentId/grades', authRequired, async (req, res) => {
  try {
    if (!isTeacherOrAdmin(req)) return res.status(403).json({ error: 'Только преподаватель или администратор' });
    const { rows } = await query(
      `select s.id, s.lesson_id as "lessonId", s.course_id as "courseId",
        s.grade, s.status, s.feedback, s.created_at as "createdAt",
        l.title as "lessonTitle", c.title as "courseTitle", l.check_mode as "checkMode"
       from submissions s
       join courses c on c.id=s.course_id
       left join lessons l on l.id=s.lesson_id
       where s.user_id=$1 and ${isSuperAdmin(req) ? '1=1' : 'c.created_by=$2'}
       order by s.created_at desc`,
      isSuperAdmin(req) ? [req.params.studentId] : [req.params.studentId, req.user.sub]
    );
    // Manual grades too
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

// Teacher: manually set grade (direct, not from submission)
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
    await addNotification(studentId, 'grade',
      'Новая оценка',
      `Преподаватель выставил оценку ${grade}/100 за "${lessonTitle}". ${comment}`,
      { grade, lessonId, courseId }
    );
    if (grade >= 60) await awardXP(studentId, 30, 'manual_grade');
    res.json({ ok: true });
  } catch (err) { console.error(err); res.status(500).json({ error: 'Ошибка' }); }
});

// Student: get all grades including manual
app.get('/student/all-grades', authRequired, async (req, res) => {
  try {
    const { rows: sub } = await query(
      `select s.id, s.lesson_id as "lessonId", s.course_id as "courseId",
        s.grade, s.status, s.feedback, s.created_at as "createdAt",
        l.title as "lessonTitle", c.title as "courseTitle", l.check_mode as "checkMode",
        'submission' as "source"
       from submissions s
       left join lessons l on l.id=s.lesson_id
       left join courses c on c.id=s.course_id
       where s.user_id=$1 and s.grade is not null
       order by s.created_at desc`,
      [req.user.sub]
    );
    const { rows: mg } = await query(
      `select mg.id, mg.lesson_id as "lessonId", mg.course_id as "courseId",
        mg.grade, 'passed' as status, mg.comment as feedback, mg.created_at as "createdAt",
        l.title as "lessonTitle", c.title as "courseTitle", 'manual' as "checkMode",
        'manual' as "source"
       from manual_grades mg
       left join lessons l on l.id=mg.lesson_id
       left join courses c on c.id=mg.course_id
       where mg.student_id=$1
       order by mg.created_at desc`,
      [req.user.sub]
    );
    res.json({ grades: [...sub, ...mg] });
  } catch (err) { console.error(err); res.status(500).json({ error: 'Ошибка' }); }
});

// Parent: get grades for their student
app.get('/parent/students/:studentId/grades', authRequired, async (req, res) => {
  try {
    if (!isParent(req)) return res.status(403).json({ error: 'Только для родителей' });
    // Verify link
    const link = await query('select id from parent_student_links where parent_id=$1 and student_id=$2 and status=$3',
      [req.user.sub, req.params.studentId, 'accepted']);
    if (!link.rowCount) return res.status(403).json({ error: 'Нет доступа' });
    const { rows: sub } = await query(
      `select s.id, s.lesson_id as "lessonId", s.course_id as "courseId",
        s.grade, s.status, s.feedback, s.created_at as "createdAt",
        l.title as "lessonTitle", c.title as "courseTitle", l.check_mode as "checkMode"
       from submissions s
       left join lessons l on l.id=s.lesson_id
       left join courses c on c.id=s.course_id
       where s.user_id=$1 and s.grade is not null order by s.created_at desc`,
      [req.params.studentId]
    );
    const { rows: mg } = await query(
      `select mg.id, mg.lesson_id as "lessonId", mg.course_id as "courseId",
        mg.grade, 'passed' as status, mg.comment as feedback, mg.created_at as "createdAt",
        l.title as "lessonTitle", c.title as "courseTitle", 'manual' as "checkMode"
       from manual_grades mg
       left join lessons l on l.id=mg.lesson_id
       left join courses c on c.id=mg.course_id
       where mg.student_id=$1 order by mg.created_at desc`,
      [req.params.studentId]
    );
    res.json({ grades: [...sub, ...mg] });
  } catch (err) { console.error(err); res.status(500).json({ error: 'Ошибка' }); }
});

// ─── global error handler ─────────────────────────────────────────────────────

app.use((err, _req, res, _next) => {
  console.error('[unhandled]', err);
  res.status(500).json({ error: 'Внутренняя ошибка сервера' });
});

app.listen(PORT, () => console.log(`API server running at http://localhost:${PORT}`));
ensureSchemaCompat();
ensureRootAdmin();
