import React, { useEffect, useState } from 'react';
import { Link, useParams, useNavigate } from 'react-router';
import { Layout } from '../components/Layout';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { BookOpen, Plus, ArrowLeft, CheckCircle2, Pencil, Trash2, Key, ToggleLeft, Lock, Users, UserMinus, UserPlus, Sparkles } from 'lucide-react';
import { Button } from '../components/ui/button';
import { Card } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '../components/ui/dialog';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Textarea } from '../components/ui/textarea';
import { Switch } from '../components/ui/switch';
import { api, supabase } from '../lib/supabase';
import { toast } from 'sonner';
import { motion } from 'motion/react';

export function CourseView() {
  const { id } = useParams();
  const { user, userRole, loading } = useAuth();
  const { t } = useLanguage();
  const navigate = useNavigate();
  const [course, setCourse] = useState<any>(null);
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [editLesson, setEditLesson] = useState<any>(null);
  const [answerLesson, setAnswerLesson] = useState<any>(null);
  const [lessonForm, setLessonForm] = useState({
    title: '', description: '', content: '', order: 0,
    hasAssignment: false, checkMode: 'manual', answerKey: '',
  });
  const [answerKey, setAnswerKey] = useState('');
  const [checkMode, setCheckMode] = useState<'auto' | 'manual'>('manual');
  // Enrollment management (private courses)
  const [enrolledStudents, setEnrolledStudents] = useState<any[]>([]);
  const [enrollEmail, setEnrollEmail] = useState('');
  const [showEnroll, setShowEnroll] = useState(false);
  // Recommendations
  const [recommendations, setRecommendations] = useState<any[]>([]);
  const [courseComplete, setCourseComplete] = useState(false);

  useEffect(() => { if (!loading && !user) navigate('/login'); }, [user, loading, navigate]);
  useEffect(() => { if (id) loadCourse(); }, [id]);
  useEffect(() => {
    if (id && course?.isPrivate && (userRole === 'teacher' || userRole === 'superadmin')) {
      loadEnrolled();
    }
  }, [id, course, userRole]);

  useEffect(() => {
    if (id && user && userRole === 'student') loadRecommendations();
  }, [id, user, userRole]);

  const loadRecommendations = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const headers: Record<string, string> = {};
      if (session?.access_token) headers['Authorization'] = `Bearer ${session.access_token}`;
      const res = await fetch(`/api/courses/${id}/recommendations`, { headers });
      if (!res.ok) return;
      const data = await res.json();
      setCourseComplete(data.courseComplete || false);
      setRecommendations(data.recommendations || []);
    } catch {}
  };

  const loadCourse = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const headers: Record<string, string> = {};
      if (session?.access_token) headers['Authorization'] = `Bearer ${session.access_token}`;
      const res = await fetch(`/api/courses/${id}`, { headers });
      if (!res.ok) {
        const d = await res.json();
        toast.error(d.error || 'Ошибка загрузки курса');
        navigate('/courses');
        return;
      }
      const data = await res.json();
      setCourse(data);
    } catch { toast.error('Ошибка загрузки курса'); }
  };

  const loadEnrolled = async () => {
    try {
      const t = await getToken(); if (!t) return;
      const res = await fetch(`/api/courses/${id}/enrollments`, {
        headers: { Authorization: `Bearer ${t}` },
      });
      const d = await res.json();
      setEnrolledStudents(d.students || []);
    } catch {}
  };

  const handleEnroll = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const t = await getToken(); if (!t) return;
      const res = await fetch(`/api/courses/${id}/enroll`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${t}` },
        body: JSON.stringify({ studentEmail: enrollEmail }),
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error);
      toast.success('Ученик записан на курс');
      setEnrollEmail('');
      loadEnrolled();
    } catch (err: any) { toast.error(err.message || 'Ошибка записи'); }
  };

  const handleUnenroll = async (studentId: string) => {
    try {
      const t = await getToken(); if (!t) return;
      await fetch(`/api/courses/${id}/enroll/${studentId}`, {
        method: 'DELETE', headers: { Authorization: `Bearer ${t}` },
      });
      toast.success('Ученик удалён из курса');
      loadEnrolled();
    } catch { toast.error('Ошибка'); }
  };

  const getToken = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    return session?.access_token || null;
  };

  const handleAddLesson = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const t = await getToken(); if (!t) return;
      await api.createLesson({ ...lessonForm, courseId: id }, t);
      toast.success('Урок добавлен');
      setIsAddOpen(false);
      setLessonForm({ title:'', description:'', content:'', order:0, hasAssignment:false, checkMode:'manual', answerKey:'' });
      loadCourse();
    } catch { toast.error('Ошибка создания урока'); }
  };

  const handleEditLesson = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const t = await getToken(); if (!t) return;
      const res = await fetch(`/api/lessons/${editLesson.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${t}` },
        body: JSON.stringify(lessonForm),
      });
      if (!res.ok) throw new Error();
      toast.success('Урок обновлён');
      setEditLesson(null);
      loadCourse();
    } catch { toast.error('Ошибка обновления урока'); }
  };

  const handleDeleteLesson = async (lessonId: string) => {
    if (!confirm('Удалить урок?')) return;
    try {
      const t = await getToken(); if (!t) return;
      await fetch(`/api/lessons/${lessonId}`, {
        method: 'DELETE', headers: { Authorization: `Bearer ${t}` },
      });
      toast.success('Урок удалён');
      loadCourse();
    } catch { toast.error('Ошибка удаления'); }
  };

  const handleSaveAnswer = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const t = await getToken(); if (!t) return;
      await fetch(`/api/lessons/${answerLesson.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${t}` },
        body: JSON.stringify({ answerKey, checkMode }),
      });
      toast.success('Эталонный ответ сохранён');
      setAnswerLesson(null);
      loadCourse();
    } catch { toast.error('Ошибка сохранения'); }
  };

  if (loading || !course) return (
    <Layout>
      <div className="container mx-auto px-4 py-16 flex justify-center">
        <div className="animate-spin w-6 h-6 border-2 border-foreground border-t-transparent rounded-full" />
      </div>
    </Layout>
  );

  const lessons: any[] = (course.lessons || []).sort((a: any, b: any) => a.order - b.order);
  const isTeacher = userRole === 'teacher' || userRole === 'superadmin';

  return (
    <Layout>
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <Link to="/courses" className="inline-flex items-center gap-1.5 text-muted-foreground hover:text-foreground text-sm mb-6">
          <ArrowLeft className="w-4 h-4" /> Все курсы
        </Link>

        <div className="flex items-start justify-between mb-8">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <h1 className="text-3xl font-bold">{course.title}</h1>
              {course.isPrivate && (
                <Badge variant="outline" className="text-primary border-primary/30 flex items-center gap-1">
                  <Lock className="w-3 h-3" /> Индивидуальный
                </Badge>
              )}
            </div>
            <p className="text-muted-foreground">{course.description}</p>
            <p className="text-sm text-muted-foreground mt-1">{lessons.length} уроков</p>
          </div>
          {isTeacher && (
            <div className="flex gap-2 flex-shrink-0">
              {course.isPrivate && (
                <Button
                  variant="outline" size="sm"
                  className="gap-1.5"
                  onClick={() => { setShowEnroll(!showEnroll); if (!showEnroll) loadEnrolled(); }}
                >
                  <Users className="w-4 h-4" />
                  Ученики ({enrolledStudents.length})
                </Button>
              )}
              <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
                <DialogTrigger asChild>
                  <Button size="sm" className="gap-1.5">
                    <Plus className="w-4 h-4" /> Добавить урок
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
                  <DialogHeader><DialogTitle>Новый урок</DialogTitle></DialogHeader>
                  <LessonForm form={lessonForm} setForm={setLessonForm} onSubmit={handleAddLesson} submitLabel="Создать урок" />
                </DialogContent>
              </Dialog>
            </div>
          )}
        </div>

        {/* Enrollment panel for private courses */}
        {isTeacher && course.isPrivate && showEnroll && (
          <Card className="p-5 mb-6 border-primary/20">
            <h3 className="font-semibold mb-4 flex items-center gap-2">
              <Users className="w-4 h-4" /> Управление доступом
            </h3>
            <form onSubmit={handleEnroll} className="flex gap-2 mb-4">
              <Input
                type="email"
                placeholder="Email ученика..."
                value={enrollEmail}
                onChange={e => setEnrollEmail(e.target.value)}
                className="flex-1"
                required
              />
              <Button type="submit" size="sm" className="gap-1.5 flex-shrink-0">
                <UserPlus className="w-4 h-4" /> Добавить
              </Button>
            </form>
            {enrolledStudents.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-3">
                Нет записанных учеников. Добавьте вручную или через класс.
              </p>
            ) : (
              <div className="space-y-2">
                {enrolledStudents.map((s: any) => (
                  <div key={s.id} className="flex items-center justify-between p-2.5 rounded-md bg-muted/50">
                    <div>
                      <p className="text-sm font-medium">{s.name}</p>
                      <p className="text-xs text-muted-foreground">{s.email}</p>
                    </div>
                    <Button
                      variant="ghost" size="icon" className="w-7 h-7 text-destructive hover:text-destructive"
                      onClick={() => handleUnenroll(s.id)}
                    >
                      <UserMinus className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </Card>
        )}

        {lessons.length === 0 ? (
          <Card className="p-10 text-center">
            <BookOpen className="w-10 h-10 mx-auto mb-3 text-muted-foreground/40" />
            <p className="font-medium mb-1">Уроков пока нет</p>
            <p className="text-sm text-muted-foreground">
              {isTeacher ? 'Добавьте первый урок' : 'Преподаватель готовит уроки'}
            </p>
          </Card>
        ) : (
          <div className="space-y-3">
            {lessons.map((lesson, i) => (
              <motion.div key={lesson.id} initial={{ opacity:0, y:10 }} animate={{ opacity:1, y:0 }} transition={{ delay: i * 0.04 }}>
                <Card className="p-5 hover:shadow-sm transition-shadow group">
                  <div className="flex items-center gap-4">
                    <div className="w-8 h-8 rounded-md bg-muted flex items-center justify-center flex-shrink-0 text-sm font-semibold text-muted-foreground">
                      {i + 1}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        {isTeacher ? (
                          <span className="font-medium text-sm">{lesson.title}</span>
                        ) : (
                          <Link to={`/lesson/${lesson.id}`} className="font-medium text-sm hover:underline">{lesson.title}</Link>
                        )}
                        {lesson.hasAssignment && (
                          <Badge variant="outline" className="text-xs">Задание</Badge>
                        )}
                        {lesson.checkMode === 'auto' && (
                          <Badge variant="secondary" className="text-xs">Авто-проверка</Badge>
                        )}
                      </div>
                      {lesson.description && (
                        <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">{lesson.description}</p>
                      )}
                    </div>
                    <div className="flex items-center gap-1">
                      {/* Students see "open lesson" button */}
                      {!isTeacher && (
                        <Link to={`/lesson/${lesson.id}`}>
                          <Button variant="ghost" size="sm" className="text-xs gap-1.5">
                            Открыть <CheckCircle2 className="w-3.5 h-3.5" />
                          </Button>
                        </Link>
                      )}
                      {/* Teachers see edit / delete / answer key */}
                      {isTeacher && (
                        <>
                          <Button
                            variant="ghost" size="icon" className="w-8 h-8"
                            title="Эталонный ответ"
                            onClick={() => {
                              setAnswerLesson(lesson);
                              setAnswerKey(lesson.answerKey || '');
                              setCheckMode(lesson.checkMode === 'auto' ? 'auto' : 'manual');
                            }}
                          >
                            <Key className="w-3.5 h-3.5" />
                          </Button>
                          <Button
                            variant="ghost" size="icon" className="w-8 h-8"
                            onClick={() => {
                              setEditLesson(lesson);
                              setLessonForm({
                                title: lesson.title, description: lesson.description || '',
                                content: lesson.content || '', order: lesson.order || 0,
                                hasAssignment: lesson.hasAssignment || false,
                                checkMode: lesson.checkMode || 'manual', answerKey: lesson.answerKey || '',
                              });
                            }}
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </Button>
                          <Button
                            variant="ghost" size="icon" className="w-8 h-8 text-destructive hover:text-destructive"
                            onClick={() => handleDeleteLesson(lesson.id)}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </>
                      )}
                    </div>
                  </div>
                </Card>
              </motion.div>
            ))}
          </div>
        )}

        {/* Recommendations block — shown to students who completed the course */}
        {userRole === 'student' && courseComplete && recommendations.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="mt-8"
          >
            <Card className="p-6 border-primary/20 bg-primary/3">
              <div className="flex items-center gap-2 mb-1">
                <Sparkles className="w-5 h-5 text-primary" />
                <h2 className="font-bold text-lg">{t('rec_title')}</h2>
              </div>
              <p className="text-sm text-muted-foreground mb-5">{t('rec_subtitle')}</p>
              <div className="grid sm:grid-cols-2 gap-3">
                {recommendations.map((rec) => (
                  <Link to={`/course/${rec.id}`} key={rec.id}>
                    <div className="flex items-start gap-3 p-4 rounded-xl border bg-card hover:shadow-md transition-shadow group">
                      <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                        <BookOpen className="w-4 h-4 text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-sm group-hover:underline line-clamp-1">{rec.title}</p>
                        <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{rec.description}</p>
                        <p className="text-xs text-muted-foreground mt-1">{rec.lessonsCount || 0} {t('rec_lessons')}</p>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            </Card>
          </motion.div>
        )}

        {/* Edit lesson dialog */}
        <Dialog open={!!editLesson} onOpenChange={(o) => !o && setEditLesson(null)}>
          <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
            <DialogHeader><DialogTitle>Редактировать урок</DialogTitle></DialogHeader>
            <LessonForm form={lessonForm} setForm={setLessonForm} onSubmit={handleEditLesson} submitLabel="Сохранить" />
          </DialogContent>
        </Dialog>

        {/* Answer key dialog */}
        <Dialog open={!!answerLesson} onOpenChange={(o) => !o && setAnswerLesson(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Key className="w-4 h-4" /> Эталонный ответ
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSaveAnswer} className="space-y-4">
              <p className="text-sm text-muted-foreground">Урок: <strong>{answerLesson?.title}</strong></p>
              <div>
                <Label>Режим проверки</Label>
                <div className="flex items-center gap-3 mt-2">
                  <ToggleLeft className="w-4 h-4 text-muted-foreground" />
                  <span className="text-sm">Ручная</span>
                  <Switch
                    checked={checkMode === 'auto'}
                    onCheckedChange={v => setCheckMode(v ? 'auto' : 'manual')}
                  />
                  <span className="text-sm">Автоматическая</span>
                </div>
                {checkMode === 'auto' && (
                  <p className="text-xs text-muted-foreground mt-1">
                    Ответ будет сравниваться с ответом ученика. Совпадение = 100 баллов.
                  </p>
                )}
              </div>
              <div>
                <Label htmlFor="ak">Эталонный ответ / код</Label>
                <Textarea
                  id="ak"
                  value={answerKey}
                  onChange={e => setAnswerKey(e.target.value)}
                  rows={6}
                  className="mt-1 font-mono text-sm"
                  placeholder="Введите правильный ответ или код..."
                />
              </div>
              <Button type="submit" className="w-full">Сохранить</Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>
    </Layout>
  );
}

function LessonForm({ form, setForm, onSubmit, submitLabel }: any) {
  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div>
        <Label htmlFor="lf-title">Название урока</Label>
        <Input id="lf-title" value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} required className="mt-1" />
      </div>
      <div>
        <Label htmlFor="lf-desc">Краткое описание</Label>
        <Input id="lf-desc" value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} className="mt-1" />
      </div>
      <div>
        <Label htmlFor="lf-content">Содержание (Markdown)</Label>
        <Textarea
          id="lf-content" value={form.content}
          onChange={e => setForm({ ...form, content: e.target.value })}
          rows={8} className="mt-1 font-mono text-sm"
          placeholder="# Заголовок&#10;&#10;Текст урока..."
        />
      </div>
      <div className="flex items-center gap-3">
        <Label>Порядок</Label>
        <Input type="number" value={form.order} onChange={e => setForm({ ...form, order: Number(e.target.value) })} className="w-20" />
      </div>
      <div className="flex items-center gap-3">
        <Switch checked={form.hasAssignment} onCheckedChange={v => setForm({ ...form, hasAssignment: v })} />
        <Label>Есть задание</Label>
      </div>
      <Button type="submit" className="w-full">{submitLabel}</Button>
    </form>
  );
}
