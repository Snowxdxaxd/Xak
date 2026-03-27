import { useEffect, useState } from 'react';
import { Link, useParams, useNavigate } from 'react-router';
import { Layout } from '../components/Layout';
import { useAuth } from '../context/AuthContext';
import { BookOpen, Plus, ArrowLeft, CheckCircle2, Pencil, Trash2, Key, ToggleLeft } from 'lucide-react';
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

  useEffect(() => { if (!loading && !user) navigate('/login'); }, [user, loading, navigate]);
  useEffect(() => { if (id) loadCourse(); }, [id]);

  const loadCourse = async () => {
    try {
      const data = await api.getCourse(id!);
      setCourse(data);
    } catch { toast.error('Ошибка загрузки курса'); }
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
            <h1 className="text-3xl font-bold mb-2">{course.title}</h1>
            <p className="text-muted-foreground">{course.description}</p>
            <p className="text-sm text-muted-foreground mt-1">{lessons.length} уроков</p>
          </div>
          {isTeacher && (
            <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
              <DialogTrigger asChild>
                <Button size="sm" className="gap-1.5 flex-shrink-0">
                  <Plus className="w-4 h-4" /> Добавить урок
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
                <DialogHeader><DialogTitle>Новый урок</DialogTitle></DialogHeader>
                <LessonForm form={lessonForm} setForm={setLessonForm} onSubmit={handleAddLesson} submitLabel="Создать урок" />
              </DialogContent>
            </Dialog>
          )}
        </div>

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
