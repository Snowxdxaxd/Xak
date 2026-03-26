import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router';
import { Layout } from '../components/Layout';
import { useAuth } from '../context/AuthContext';
import { BookOpen, Plus, Pencil, Trash2, BarChart2 } from 'lucide-react';
import { Button } from '../components/ui/button';
import { Card } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '../components/ui/dialog';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Textarea } from '../components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { api, supabase } from '../lib/supabase';
import { toast } from 'sonner';
import { motion } from 'motion/react';

const LEVELS: Record<string, string> = {
  beginner: 'Начальный',
  intermediate: 'Средний',
  advanced: 'Продвинутый',
};

export function Courses() {
  const { user, userRole, loading } = useAuth();
  const navigate = useNavigate();
  const [courses, setCourses] = useState<any[]>([]);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editCourse, setEditCourse] = useState<any>(null);
  const [form, setForm] = useState({ title: '', description: '', level: 'beginner' });

  useEffect(() => { if (!loading && !user) navigate('/login'); }, [user, loading, navigate]);
  useEffect(() => { loadCourses(); }, []);

  const loadCourses = async () => {
    const data = await api.getCourses();
    setCourses(data.courses || []);
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
      await api.createCourse(form, t);
      toast.success('Курс создан');
      setIsCreateOpen(false);
      setForm({ title: '', description: '', level: 'beginner' });
      loadCourses();
    } catch { toast.error('Ошибка создания курса'); }
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
        method: 'DELETE',
        headers: { Authorization: `Bearer ${t}` },
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

  const isTeacher = userRole === 'teacher';

  return (
    <Layout>
      <div className="container mx-auto px-4 py-8 max-w-5xl">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold mb-1">Курсы</h1>
            <p className="text-muted-foreground text-sm">
              {isTeacher ? 'Управление учебными курсами' : 'Выбери курс и начни обучение'}
            </p>
          </div>
          {isTeacher && (
            <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
              <DialogTrigger asChild>
                <Button size="sm" className="gap-1.5">
                  <Plus className="w-4 h-4" /> Создать курс
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader><DialogTitle>Новый курс</DialogTitle></DialogHeader>
                <CourseForm form={form} setForm={setForm} onSubmit={handleCreate} submitLabel="Создать" />
              </DialogContent>
            </Dialog>
          )}
        </div>

        {courses.length === 0 ? (
          <Card className="p-12 text-center">
            <BookOpen className="w-10 h-10 mx-auto mb-3 text-muted-foreground/40" />
            <p className="font-medium mb-1">Курсов пока нет</p>
            <p className="text-sm text-muted-foreground">
              {isTeacher ? 'Создайте первый курс' : 'Скоро появятся новые курсы'}
            </p>
          </Card>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {courses.map((c, i) => (
              <motion.div key={c.id} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}>
                <Card className="p-5 hover:shadow-md transition-shadow group flex flex-col h-full">
                  <div className="flex items-start gap-3 mb-3 flex-1">
                    <div className="w-9 h-9 rounded-lg bg-muted flex items-center justify-center flex-shrink-0">
                      <BookOpen className="w-4 h-4 text-muted-foreground" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <Link to={`/course/${c.id}`}>
                        <h3 className="font-semibold text-sm group-hover:underline line-clamp-1">{c.title}</h3>
                      </Link>
                      <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{c.description}</p>
                    </div>
                  </div>
                  <div className="flex items-center justify-between pt-3 border-t">
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary" className="text-xs">{LEVELS[c.level] || c.level}</Badge>
                      <span className="flex items-center gap-1 text-xs text-muted-foreground">
                        <BarChart2 className="w-3 h-3" /> {c.lessonsCount || 0} ур.
                      </span>
                    </div>
                    {isTeacher && (
                      <div className="flex gap-1">
                        <Button
                          variant="ghost" size="icon" className="w-7 h-7"
                          onClick={() => { setEditCourse(c); setForm({ title: c.title, description: c.description, level: c.level }); }}
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </Button>
                        <Button
                          variant="ghost" size="icon" className="w-7 h-7 text-destructive hover:text-destructive"
                          onClick={() => handleDelete(c.id)}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    )}
                  </div>
                </Card>
              </motion.div>
            ))}
          </div>
        )}

        {/* Edit dialog */}
        <Dialog open={!!editCourse} onOpenChange={(o) => !o && setEditCourse(null)}>
          <DialogContent>
            <DialogHeader><DialogTitle>Редактировать курс</DialogTitle></DialogHeader>
            <CourseForm form={form} setForm={setForm} onSubmit={handleEdit} submitLabel="Сохранить" />
          </DialogContent>
        </Dialog>
      </div>
    </Layout>
  );
}

function CourseForm({ form, setForm, onSubmit, submitLabel }: any) {
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
            <SelectItem value="beginner">Начальный</SelectItem>
            <SelectItem value="intermediate">Средний</SelectItem>
            <SelectItem value="advanced">Продвинутый</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <Button type="submit" className="w-full">{submitLabel}</Button>
    </form>
  );
}
