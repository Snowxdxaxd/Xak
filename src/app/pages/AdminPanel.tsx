import React, { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router';
import { Layout } from '../components/Layout';
import { useAuth } from '../context/AuthContext';
import { GraduationCap, BookOpen, Users, FileCheck, CheckCircle2, XCircle, Shield, Trophy } from 'lucide-react';
import { Card } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { Textarea } from '../components/ui/textarea';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { supabase } from '../lib/supabase';
import { toast } from 'sonner';

export function AdminPanel() {
  const { user, userRole, loading } = useAuth();
  const navigate = useNavigate();
  const [pending, setPending] = useState<any[]>([]);
  const [grades, setGrades] = useState<Record<string, { grade: string; feedback: string }>>({});
  const [students, setStudents] = useState<any[]>([]);

  useEffect(() => {
    if (!loading && (!user || (userRole !== 'teacher' && userRole !== 'superadmin'))) navigate('/dashboard');
  }, [user, userRole, loading, navigate]);

  useEffect(() => {
    if (userRole === 'teacher' || userRole === 'superadmin') {
      loadPending();
      if (userRole === 'superadmin') loadStudents();
    }
  }, [userRole]);

  const getToken = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    return session?.access_token || null;
  };

  const loadStudents = async () => {
    try {
      const t = await getToken(); if (!t) return;
      const res = await fetch('/api/admin/students', { headers: { Authorization: `Bearer ${t}` } });
      const d = await res.json();
      setStudents(d.students || []);
    } catch { }
  };

  const loadPending = async () => {
    try {
      const t = await getToken(); if (!t) return;
      const res = await fetch('/api/submissions/pending', { headers: { Authorization: `Bearer ${t}` } });
      const d = await res.json();
      setPending(d.submissions || []);
    } catch { }
  };

  const handleGrade = async (subId: string) => {
    const g = grades[subId];
    if (!g?.grade) { toast.error('Укажите оценку'); return; }
    try {
      const t = await getToken(); if (!t) return;
      const res = await fetch(`/api/submissions/${subId}/grade`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${t}` },
        body: JSON.stringify({ grade: Number(g.grade), feedback: g.feedback || '' }),
      });
      if (!res.ok) throw new Error();
      toast.success('Оценка выставлена');
      setPending(prev => prev.filter(s => s.id !== subId));
    } catch { toast.error('Ошибка оценки'); }
  };

  if (loading || (userRole !== 'teacher' && userRole !== 'superadmin')) return (
    <Layout>
      <div className="container mx-auto px-4 py-16 flex justify-center">
        <div className="animate-spin w-6 h-6 border-2 border-foreground border-t-transparent rounded-full" />
      </div>
    </Layout>
  );

  const isSuperAdmin = userRole === 'superadmin';

  return (
    <Layout>
      <div className="container mx-auto px-4 py-8 max-w-5xl">
        <div className="flex items-center gap-3 mb-8">
          {isSuperAdmin ? <Shield className="w-5 h-5 text-muted-foreground" /> : <GraduationCap className="w-5 h-5 text-muted-foreground" />}
          <h1 className="text-2xl font-bold">{isSuperAdmin ? 'Панель главного администратора' : 'Панель преподавателя'}</h1>
        </div>

        <Tabs defaultValue="submissions">
          <TabsList className="mb-6">
            <TabsTrigger value="submissions" className="gap-1.5">
              <FileCheck className="w-4 h-4" /> Задания
              {pending.length > 0 && (
                <Badge className="ml-1 h-4 w-4 text-xs p-0 flex items-center justify-center">{pending.length}</Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="courses" className="gap-1.5">
              <BookOpen className="w-4 h-4" /> Курсы
            </TabsTrigger>
            <TabsTrigger value="students" className="gap-1.5">
              <Users className="w-4 h-4" /> Ученики
            </TabsTrigger>
            {isSuperAdmin && (
              <TabsTrigger value="tools" className="gap-1.5">
                <Trophy className="w-4 h-4" /> Инструменты
              </TabsTrigger>
            )}
          </TabsList>

          {/* Submissions */}
          <TabsContent value="submissions">
            {pending.length === 0 ? (
              <Card className="p-10 text-center">
                <CheckCircle2 className="w-10 h-10 mx-auto mb-3 text-muted-foreground/40" />
                <p className="font-medium mb-1">Нет заданий на проверку</p>
                <p className="text-sm text-muted-foreground">Когда ученики отправят решения — они появятся здесь</p>
              </Card>
            ) : (
              <div className="space-y-4">
                {pending.map(s => (
                  <Card key={s.id} className="p-6">
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <p className="font-semibold text-sm">{s.userName || s.userEmail}</p>
                        <p className="text-xs text-muted-foreground">
                          {s.courseTitle && <span>{s.courseTitle} → </span>}
                          {s.lessonTitle || 'Без урока'}
                        </p>
                      </div>
                      <Badge variant="outline" className="text-xs">
                        {new Date(s.createdAt).toLocaleDateString('ru-RU')}
                      </Badge>
                    </div>
                    <pre className="bg-muted rounded-lg p-3 text-xs font-mono overflow-x-auto mb-4 max-h-48">
                      {s.code}
                    </pre>
                    <div className="flex items-end gap-3">
                      <div className="flex-1">
                        <Label className="text-xs mb-1 block">Оценка (0–100)</Label>
                        <Input
                          type="number" min="0" max="100"
                          value={grades[s.id]?.grade || ''}
                          onChange={e => setGrades(prev => ({ ...prev, [s.id]: { ...prev[s.id], grade: e.target.value } }))}
                          className="h-8 text-sm"
                        />
                      </div>
                      <div className="flex-[2]">
                        <Label className="text-xs mb-1 block">Комментарий</Label>
                        <Textarea
                          value={grades[s.id]?.feedback || ''}
                          onChange={e => setGrades(prev => ({ ...prev, [s.id]: { ...prev[s.id], feedback: e.target.value } }))}
                          rows={1}
                          className="text-sm"
                          placeholder="Хорошая работа! / Исправь..."
                        />
                      </div>
                      <div className="flex gap-2">
                        <Button
                          size="sm" className="gap-1"
                          onClick={() => {
                            setGrades(prev => ({ ...prev, [s.id]: { grade: '100', feedback: 'Отлично!' } }));
                            setTimeout(() => handleGrade(s.id), 100);
                          }}
                          variant="outline"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5 text-green-600" />
                        </Button>
                        <Button
                          size="sm" className="gap-1"
                          onClick={() => {
                            setGrades(prev => ({ ...prev, [s.id]: { grade: '0', feedback: 'Не засчитано. Попробуй снова.' } }));
                            setTimeout(() => handleGrade(s.id), 100);
                          }}
                          variant="outline"
                        >
                          <XCircle className="w-3.5 h-3.5 text-red-600" />
                        </Button>
                        <Button size="sm" onClick={() => handleGrade(s.id)}>
                          Оценить
                        </Button>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          {/* Courses */}
          <TabsContent value="courses">
            <Card className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-semibold flex items-center gap-2">
                  <BookOpen className="w-4 h-4" /> Управление курсами
                </h2>
                <Link to="/courses">
                  <Button size="sm" variant="outline">Перейти к курсам</Button>
                </Link>
              </div>
              <p className="text-sm text-muted-foreground">
                Создавайте и редактируйте курсы, добавляйте уроки, эталонные ответы и задания.
                Для каждого урока можно настроить режим проверки: автоматический или ручной.
              </p>
            </Card>
          </TabsContent>

          {/* Students */}
          <TabsContent value="students">
            {!isSuperAdmin ? (
              <Card className="p-6 text-center">
                <Users className="w-10 h-10 mx-auto mb-3 text-muted-foreground/40" />
                <p className="font-medium mb-1">Статистика учеников</p>
                <p className="text-sm text-muted-foreground">
                  Для полной аналитики используйте раздел «Группы»
                </p>
              </Card>
            ) : (
              <Card className="p-6">
                <h2 className="font-semibold mb-4">Прогресс всех учеников</h2>
                {students.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Ученики пока не найдены.</p>
                ) : (
                  <div className="space-y-2">
                    {students.map((s) => (
                      <Link to={`/profile/${s.id}`} key={s.id} className="block">
                        <div className="border rounded-lg p-3 hover:bg-muted/40 transition-colors">
                          <div className="flex items-center justify-between gap-2">
                            <div className="min-w-0">
                              <p className="text-sm font-medium truncate">{s.user_metadata?.name || s.email}</p>
                              <p className="text-xs text-muted-foreground truncate">{s.email}</p>
                            </div>
                            <div className="flex items-center gap-2 text-xs">
                              <Badge variant="secondary">Ур. {s.level}</Badge>
                              <Badge variant="outline">XP: {s.xp}</Badge>
                              <Badge variant="outline">Уроков: {s.completedLessons}</Badge>
                              <Badge variant={Number(s.avgGrade || 0) >= 60 ? 'default' : 'destructive'}>
                                Ср. балл: {s.avgGrade ?? '—'}
                              </Badge>
                            </div>
                          </div>
                        </div>
                      </Link>
                    ))}
                  </div>
                )}
              </Card>
            )}
          </TabsContent>

          {isSuperAdmin && (
            <TabsContent value="tools">
              <Card className="p-6 space-y-4">
                <p className="text-sm text-muted-foreground">
                  Как главный администратор вы можете редактировать и удалять любые курсы/уроки,
                  модерировать чат и просматривать прогресс учеников.
                </p>
                <div className="flex flex-wrap gap-2">
                  <Link to="/courses"><Button size="sm" variant="outline">Управление курсами и уроками</Button></Link>
                  <Link to="/messenger"><Button size="sm" variant="outline">Модерация чата</Button></Link>
                  <Link to="/leaderboard"><Button size="sm" variant="outline">Рейтинг преподавателей</Button></Link>
                </div>
              </Card>
            </TabsContent>
          )}
        </Tabs>
      </div>
    </Layout>
  );
}
