import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router';
import { Layout } from '../components/Layout';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { BookOpen, Plus, Pencil, Trash2, BarChart2, Lock, Globe } from 'lucide-react';
import { Button } from '../components/ui/button';
import { Card } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '../components/ui/dialog';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Textarea } from '../components/ui/textarea';
import { Switch } from '../components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { api, supabase } from '../lib/supabase';
import { toast } from 'sonner';
import { motion } from 'motion/react';

export function Courses() {
  const { user, userRole, loading } = useAuth();
  const { t } = useLanguage();
  const navigate = useNavigate();
  const [courses, setCourses] = useState<any[]>([]);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editCourse, setEditCourse] = useState<any>(null);
  const [form, setForm] = useState({ title: '', description: '', level: 'beginner', isPrivate: false });

  useEffect(() => { if (!loading && !user) navigate('/login'); }, [user, loading, navigate]);
  useEffect(() => { loadCourses(); }, [user]);

  const loadCourses = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const headers: Record<string, string> = {};
      if (session?.access_token) headers['Authorization'] = `Bearer ${session.access_token}`;
      const res = await fetch('/api/courses', { headers });
      const data = await res.json();
      setCourses(data.courses || []);
    } catch { toast.error('Ошибка загрузки курсов'); }
  };

  const getToken = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    return session?.access_token || null;
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const t = await getToken();
      if (!t) { toast.error('Необходима авторизация'); return; }
      const res = await fetch('/api/courses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${t}` },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      toast.success(form.isPrivate ? 'Индивидуальный курс создан' : 'Курс создан');
      setIsCreateOpen(false);
      setForm({ title: '', description: '', level: 'beginner', isPrivate: false });
      loadCourses();
    } catch (err: any) { toast.error(err.message || 'Ошибка создания курса'); }
  };

  const handleEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const t = await getToken();
      if (!t) return;
      const res = await fetch(`/api/courses/${editCourse.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${t}` },
        body: JSON.stringify(form),
      });
      if (!res.ok) throw new Error();
      toast.success('Курс обновлён');
      setEditCourse(null);
      loadCourses();
    } catch { toast.error('Ошибка обновления'); }
  };

  const handleDelete = async (courseId: string) => {
    if (!confirm('Удалить курс? Все уроки будут удалены.')) return;
    try {
      const t = await getToken();
      if (!t) return;
      await fetch(`/api/courses/${courseId}`, {
        method: 'DELETE', headers: { Authorization: `Bearer ${t}` },
      });
      toast.success('Курс удалён');
      loadCourses();
    } catch { toast.error('Ошибка удаления'); }
  };

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="animate-spin w-6 h-6 border-2 border-foreground border-t-transparent rounded-full" />
    </div>
  );

  const LEVELS: Record<string, string> = {
    beginner:     t('courses_level_beginner'),
    intermediate: t('courses_level_intermediate'),
    advanced:     t('courses_level_advanced'),
  };

  const isTeacher = userRole === 'teacher' || userRole === 'superadmin';
  const publicCourses  = courses.filter(c => !c.isPrivate);
  const privateCourses = courses.filter(c => c.isPrivate);

  return (
    <Layout>
      <div className="container mx-auto px-4 py-8 max-w-5xl">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold mb-1">{t('courses_title')}</h1>
            <p className="text-muted-foreground text-sm">
              {isTeacher ? 'Управление учебными курсами' : 'Выбери курс и начни обучение'}
            </p>
          </div>
          {isTeacher && (
            <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
              <DialogTrigger asChild>
                <Button size="sm" className="gap-1.5">
                  <Plus className="w-4 h-4" /> {t('courses_create')}
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader><DialogTitle>{t('courses_create')}</DialogTitle></DialogHeader>
                <CourseForm form={form} setForm={setForm} onSubmit={handleCreate} submitLabel={t('save')} levels={LEVELS} t={t} />
              </DialogContent>
            </Dialog>
          )}
        </div>

        {courses.length === 0 ? (
          <Card className="p-12 text-center">
            <BookOpen className="w-10 h-10 mx-auto mb-3 text-muted-foreground/40" />
            <p className="font-medium mb-1">{t('courses_no_courses')}</p>
            <p className="text-sm text-muted-foreground">
              {isTeacher ? t('courses_no_courses_desc') : t('courses_no_courses_student')}
            </p>
          </Card>
        ) : (
          <div className="space-y-8">
            {publicCourses.length > 0 && (
              <section>
                <div className="flex items-center gap-2 mb-4">
                  <Globe className="w-4 h-4 text-muted-foreground" />
                  <h2 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">
                    {t('courses_public')}
                  </h2>
                  <Badge variant="secondary" className="text-xs">{publicCourses.length}</Badge>
                </div>
                <CourseGrid
                  courses={publicCourses} isTeacher={isTeacher} levels={LEVELS} t={t}
                  onEdit={c => { setEditCourse(c); setForm({ title: c.title, description: c.description, level: c.level, isPrivate: c.isPrivate }); }}
                  onDelete={handleDelete}
                />
              </section>
            )}

            {privateCourses.length > 0 && (
              <section>
                <div className="flex items-center gap-2 mb-4">
                  <Lock className="w-4 h-4 text-muted-foreground" />
                  <h2 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">
                    {t('courses_individual')}
                  </h2>
                  <Badge variant="outline" className="text-xs">{privateCourses.length}</Badge>
                  {isTeacher && (
                    <span className="text-xs text-muted-foreground ml-1">· Видны только записанным ученикам</span>
                  )}
                </div>
                <CourseGrid
                  courses={privateCourses} isTeacher={isTeacher} levels={LEVELS} t={t}
                  onEdit={c => { setEditCourse(c); setForm({ title: c.title, description: c.description, level: c.level, isPrivate: c.isPrivate }); }}
                  onDelete={handleDelete}
                />
              </section>
            )}
          </div>
        )}

        <Dialog open={!!editCourse} onOpenChange={(o) => !o && setEditCourse(null)}>
          <DialogContent>
            <DialogHeader><DialogTitle>{t('courses_edit')}</DialogTitle></DialogHeader>
            <CourseForm form={form} setForm={setForm} onSubmit={handleEdit} submitLabel={t('save')} levels={LEVELS} t={t} />
          </DialogContent>
        </Dialog>
      </div>
    </Layout>
  );
}

function CourseGrid({ courses, isTeacher, onEdit, onDelete, levels, t }: any) {
  return (
    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
      {courses.map((c: any, i: number) => (
        <motion.div key={c.id} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}>
          <Card className={`p-5 hover:shadow-md transition-shadow group flex flex-col h-full ${c.isPrivate ? 'border-primary/20' : ''}`}>
            <div className="flex items-start gap-3 mb-3 flex-1">
              <div className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 ${c.isPrivate ? 'bg-primary/10' : 'bg-muted'}`}>
                {c.isPrivate
                  ? <Lock className="w-4 h-4 text-primary/70" />
                  : <BookOpen className="w-4 h-4 text-muted-foreground" />
                }
              </div>
              <div className="flex-1 min-w-0">
                <Link to={`/course/${c.id}`}>
                  <h3 className="font-semibold text-sm group-hover:underline line-clamp-1">{c.title}</h3>
                </Link>
                <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{c.description}</p>
              </div>
            </div>
            <div className="flex items-center justify-between pt-3 border-t">
              <div className="flex items-center gap-2 flex-wrap">
                <Badge variant="secondary" className="text-xs">{levels[c.level] || c.level}</Badge>
                {c.isPrivate && (
                  <Badge variant="outline" className="text-xs text-primary border-primary/30">
                    {t('courses_individual')}
                  </Badge>
                )}
                <span className="flex items-center gap-1 text-xs text-muted-foreground">
                  <BarChart2 className="w-3 h-3" /> {c.lessonsCount || 0} {t('courses_lessons')}
                </span>
              </div>
              {isTeacher && (
                <div className="flex gap-1 flex-shrink-0">
                  <Button variant="ghost" size="icon" className="w-7 h-7" onClick={() => onEdit(c)} title={t('courses_edit')}>
                    <Pencil className="w-3.5 h-3.5" />
                  </Button>
                  <Button variant="ghost" size="icon" className="w-7 h-7 text-destructive hover:text-destructive" onClick={() => onDelete(c.id)} title={t('courses_delete')}>
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </div>
              )}
            </div>
          </Card>
        </motion.div>
      ))}
    </div>
  );
}

function CourseForm({ form, setForm, onSubmit, submitLabel, levels, t }: any) {
  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div>
        <Label htmlFor="cf-title">Название</Label>
        <Input id="cf-title" value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} required className="mt-1" placeholder="Основы Python" />
      </div>
      <div>
        <Label htmlFor="cf-desc">Описание</Label>
        <Textarea id="cf-desc" value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} required rows={3} className="mt-1" />
      </div>
      <div>
        <Label>Уровень</Label>
        <Select value={form.level} onValueChange={v => setForm({ ...form, level: v })}>
          <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
          <SelectContent>
            {Object.entries(levels).map(([k, v]: any) => (
              <SelectItem key={k} value={k}>{v}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className={`flex items-start gap-3 p-3 rounded-lg border transition-colors ${form.isPrivate ? 'border-primary/30 bg-primary/5' : 'border-border'}`}>
        <Switch id="cf-private" checked={form.isPrivate} onCheckedChange={v => setForm({ ...form, isPrivate: v })} className="mt-0.5" />
        <div>
          <Label htmlFor="cf-private" className="font-medium cursor-pointer flex items-center gap-1.5">
            <Lock className="w-3.5 h-3.5" /> {t('courses_individual')}
          </Label>
          <p className="text-xs text-muted-foreground mt-0.5">
            Курс будет скрыт от других учеников. Доступ — только через класс или ручную запись.
          </p>
        </div>
      </div>
      <Button type="submit" className="w-full">{submitLabel}</Button>
    </form>
  );
}
