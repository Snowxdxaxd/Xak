import { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router';
import { Layout } from '../components/Layout';
import { useAuth } from '../context/AuthContext';
import { Card } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { supabase } from '../lib/supabase';
import { toast } from 'sonner';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  LineChart, Line, PieChart, Pie, Cell, Legend,
} from 'recharts';
import {
  Users, BookOpen, BarChart3, AlertCircle, TrendingUp,
  GraduationCap, Clock, ArrowRight, Loader2, Trophy,
} from 'lucide-react';
import { motion } from 'motion/react';

const COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4'];

function StatCard({ icon: Icon, label, value, sub, color = '' }: any) {
  return (
    <Card className="p-5">
      <div className="flex items-start justify-between mb-3">
        <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${color || 'bg-muted'}`}>
          <Icon className="w-4 h-4 text-muted-foreground" />
        </div>
      </div>
      <div className="text-2xl font-bold">{value}</div>
      <div className="text-sm text-muted-foreground mt-0.5">{label}</div>
      {sub && <div className="text-xs text-muted-foreground mt-1">{sub}</div>}
    </Card>
  );
}

export function TeacherDashboard() {
  const { user, userRole, loading } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState<any>(null);
  const [statsLoading, setStatsLoading] = useState(true);

  useEffect(() => {
    if (!loading && (!user || (userRole !== 'teacher' && userRole !== 'superadmin'))) {
      navigate('/dashboard');
    }
  }, [user, userRole, loading, navigate]);

  useEffect(() => {
    if (user) loadStats();
  }, [user]);

  const loadStats = async () => {
    try {
      setStatsLoading(true);
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) return;
      const res = await fetch('/api/teacher/dashboard', {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      if (!res.ok) throw new Error('Ошибка загрузки');
      const data = await res.json();
      setStats(data);
    } catch (err: any) {
      toast.error(err.message || 'Ошибка загрузки статистики');
    } finally {
      setStatsLoading(false);
    }
  };

  if (loading || statsLoading) return (
    <Layout>
      <div className="container mx-auto px-4 py-16 flex justify-center">
        <Loader2 className="w-6 h-6 animate-spin" />
      </div>
    </Layout>
  );

  if (!stats) return (
    <Layout>
      <div className="container mx-auto px-4 py-16 text-center">
        <AlertCircle className="w-10 h-10 mx-auto mb-3 text-muted-foreground/40" />
        <p className="font-medium">Не удалось загрузить статистику</p>
        <Button variant="outline" size="sm" className="mt-4" onClick={loadStats}>Повторить</Button>
      </div>
    </Layout>
  );

  const courseChartData = (stats.courseStats || []).map((c: any) => ({
    name: c.title?.length > 16 ? c.title.slice(0, 16) + '…' : c.title,
    fullName: c.title,
    students: Number(c.studentCount || 0),
    avgGrade: Number(c.avgGrade || 0),
    completed: Number(c.completedCount || 0),
  }));

  const timelineData = (stats.submissionsOverTime || []).map((r: any) => ({
    day: new Date(r.day).toLocaleDateString('ru', { day: 'numeric', month: 'short' }),
    count: r.count,
  }));

  const groupPieData = (stats.groupStats || [])
    .filter((g: any) => Number(g.memberCount) > 0)
    .map((g: any, i: number) => ({
      name: g.name,
      value: Number(g.memberCount),
      color: COLORS[i % COLORS.length],
    }));

  return (
    <Layout>
      <div className="container mx-auto px-4 py-8 max-w-7xl">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <BarChart3 className="w-6 h-6 text-muted-foreground" />
              Дашборд преподавателя
            </h1>
            <p className="text-sm text-muted-foreground mt-1">Статистика ваших курсов и учеников</p>
          </div>
          <div className="flex gap-2">
            <Link to="/groups"><Button variant="outline" size="sm" className="gap-1.5"><Users className="w-3.5 h-3.5" /> Группы</Button></Link>
            <Link to="/admin"><Button variant="outline" size="sm" className="gap-1.5"><GraduationCap className="w-3.5 h-3.5" /> Задания</Button></Link>
          </div>
        </div>

        {/* Top stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0 }}>
            <StatCard icon={Users} label="Уникальных учеников" value={stats.totalStudents} sub="Сдали хотя бы одно задание" />
          </motion.div>
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.06 }}>
            <StatCard icon={GraduationCap} label="Учеников в группах" value={stats.groupStudents} sub={`${(stats.groupStats || []).length} групп`} />
          </motion.div>
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.12 }}>
            <StatCard icon={Clock} label="Ожидают проверки" value={stats.pendingSubmissions}
              sub={stats.pendingSubmissions > 0 ? 'Требует внимания' : 'Всё проверено'} />
          </motion.div>
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.18 }}>
            <StatCard icon={BookOpen} label="Записей на курсы" value={stats.totalEnrollments} sub="Индивидуальные курсы" />
          </motion.div>
        </div>

        <div className="grid lg:grid-cols-2 gap-6 mb-6">
          {/* Average grade per course */}
          {courseChartData.length > 0 && (
            <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.22 }}>
              <Card className="p-5">
                <h2 className="font-semibold mb-4 flex items-center gap-2">
                  <Trophy className="w-4 h-4 text-muted-foreground" />
                  Средний балл по курсам
                </h2>
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={courseChartData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                    <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} />
                    <Tooltip
                      contentStyle={{ background: 'hsl(var(--popover))', border: '1px solid hsl(var(--border))', borderRadius: 8, fontSize: 12 }}
                      formatter={(v: any, name: string) => [
                        name === 'avgGrade' ? `${v}/100` : v,
                        name === 'avgGrade' ? 'Ср. балл' : 'Учеников',
                      ]}
                      labelFormatter={(l, payload) => payload?.[0]?.payload?.fullName || l}
                    />
                    <Bar dataKey="avgGrade" fill="#6366f1" radius={[4, 4, 0, 0]} name="avgGrade" />
                  </BarChart>
                </ResponsiveContainer>
              </Card>
            </motion.div>
          )}

          {/* Submissions over time */}
          {timelineData.length > 0 ? (
            <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.26 }}>
              <Card className="p-5">
                <h2 className="font-semibold mb-4 flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-muted-foreground" />
                  Активность за 30 дней
                </h2>
                <ResponsiveContainer width="100%" height={220}>
                  <LineChart data={timelineData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="day" tick={{ fontSize: 10 }} />
                    <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                    <Tooltip contentStyle={{ background: 'hsl(var(--popover))', border: '1px solid hsl(var(--border))', borderRadius: 8, fontSize: 12 }}
                      formatter={(v: any) => [v, 'Сдано заданий']} />
                    <Line type="monotone" dataKey="count" stroke="#10b981" strokeWidth={2} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              </Card>
            </motion.div>
          ) : (
            <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.26 }}>
              <Card className="p-5 flex items-center justify-center" style={{ minHeight: 280 }}>
                <div className="text-center text-muted-foreground">
                  <TrendingUp className="w-8 h-8 mx-auto mb-2 opacity-30" />
                  <p className="text-sm">Нет активности за последние 30 дней</p>
                </div>
              </Card>
            </motion.div>
          )}
        </div>

        <div className="grid lg:grid-cols-2 gap-6 mb-6">
          {/* Students per course */}
          {courseChartData.length > 0 && (
            <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
              <Card className="p-5">
                <h2 className="font-semibold mb-4 flex items-center gap-2">
                  <Users className="w-4 h-4 text-muted-foreground" />
                  Учеников по курсам
                </h2>
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={courseChartData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                    <Tooltip
                      contentStyle={{ background: 'hsl(var(--popover))', border: '1px solid hsl(var(--border))', borderRadius: 8, fontSize: 12 }}
                      formatter={(v: any) => [v, 'Учеников']}
                      labelFormatter={(l, payload) => payload?.[0]?.payload?.fullName || l}
                    />
                    <Bar dataKey="students" fill="#10b981" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </Card>
            </motion.div>
          )}

          {/* Groups pie chart */}
          {groupPieData.length > 0 ? (
            <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.34 }}>
              <Card className="p-5">
                <h2 className="font-semibold mb-4 flex items-center gap-2">
                  <Users className="w-4 h-4 text-muted-foreground" />
                  Распределение по группам
                </h2>
                <ResponsiveContainer width="100%" height={220}>
                  <PieChart>
                    <Pie data={groupPieData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label={({ name, value }) => `${name}: ${value}`}>
                      {groupPieData.map((entry: any, i: number) => (
                        <Cell key={i} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={{ background: 'hsl(var(--popover))', border: '1px solid hsl(var(--border))', borderRadius: 8, fontSize: 12 }} />
                  </PieChart>
                </ResponsiveContainer>
              </Card>
            </motion.div>
          ) : (
            <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.34 }}>
              <Card className="p-5 flex items-center justify-center" style={{ minHeight: 280 }}>
                <div className="text-center text-muted-foreground">
                  <Users className="w-8 h-8 mx-auto mb-2 opacity-30" />
                  <p className="text-sm">Нет групп с учениками</p>
                  <Link to="/groups">
                    <Button variant="outline" size="sm" className="mt-3 gap-1.5">
                      Создать группу <ArrowRight className="w-3 h-3" />
                    </Button>
                  </Link>
                </div>
              </Card>
            </motion.div>
          )}
        </div>

        {/* Course detail table */}
        {courseChartData.length > 0 && (
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.38 }}>
            <Card className="overflow-hidden">
              <div className="p-5 border-b flex items-center justify-between">
                <h2 className="font-semibold flex items-center gap-2">
                  <BookOpen className="w-4 h-4 text-muted-foreground" />
                  Детализация по курсам
                </h2>
                <Link to="/courses">
                  <Button variant="ghost" size="sm" className="gap-1 text-sm">
                    Все курсы <ArrowRight className="w-3.5 h-3.5" />
                  </Button>
                </Link>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b bg-muted/30">
                      <th className="text-left px-5 py-3 font-medium text-muted-foreground">Курс</th>
                      <th className="text-right px-5 py-3 font-medium text-muted-foreground">Уроков</th>
                      <th className="text-right px-5 py-3 font-medium text-muted-foreground">Учеников</th>
                      <th className="text-right px-5 py-3 font-medium text-muted-foreground">Завершили</th>
                      <th className="text-right px-5 py-3 font-medium text-muted-foreground">Ср. балл</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(stats.courseStats || []).map((c: any, i: number) => (
                      <tr key={c.id} className={`border-b last:border-0 ${i % 2 === 0 ? '' : 'bg-muted/20'}`}>
                        <td className="px-5 py-3 font-medium">{c.title}</td>
                        <td className="px-5 py-3 text-right text-muted-foreground">{c.lessonsCount}</td>
                        <td className="px-5 py-3 text-right">{Number(c.studentCount || 0)}</td>
                        <td className="px-5 py-3 text-right">{Number(c.completedCount || 0)}</td>
                        <td className="px-5 py-3 text-right">
                          {c.avgGrade ? (
                            <span className={`font-semibold ${Number(c.avgGrade) >= 60 ? 'text-green-600 dark:text-green-400' : 'text-red-500'}`}>
                              {c.avgGrade}/100
                            </span>
                          ) : (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          </motion.div>
        )}

        {/* Groups table */}
        {(stats.groupStats || []).length > 0 && (
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.42 }} className="mt-6">
            <Card className="overflow-hidden">
              <div className="p-5 border-b flex items-center justify-between">
                <h2 className="font-semibold flex items-center gap-2">
                  <Users className="w-4 h-4 text-muted-foreground" />
                  Статистика по группам
                </h2>
                <Link to="/groups">
                  <Button variant="ghost" size="sm" className="gap-1 text-sm">
                    Управление <ArrowRight className="w-3.5 h-3.5" />
                  </Button>
                </Link>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b bg-muted/30">
                      <th className="text-left px-5 py-3 font-medium text-muted-foreground">Группа</th>
                      <th className="text-right px-5 py-3 font-medium text-muted-foreground">Учеников</th>
                      <th className="text-right px-5 py-3 font-medium text-muted-foreground">Сдано работ</th>
                      <th className="text-right px-5 py-3 font-medium text-muted-foreground">Ср. балл</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(stats.groupStats || []).map((g: any, i: number) => (
                      <tr key={g.id} className={`border-b last:border-0 ${i % 2 === 0 ? '' : 'bg-muted/20'}`}>
                        <td className="px-5 py-3 font-medium">{g.name}</td>
                        <td className="px-5 py-3 text-right">{Number(g.memberCount || 0)}</td>
                        <td className="px-5 py-3 text-right text-muted-foreground">{Number(g.gradedCount || 0)}</td>
                        <td className="px-5 py-3 text-right">
                          {g.avgGrade ? (
                            <Badge variant={Number(g.avgGrade) >= 60 ? 'secondary' : 'destructive'} className="text-xs">
                              {g.avgGrade}/100
                            </Badge>
                          ) : (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          </motion.div>
        )}

        {/* Empty state */}
        {courseChartData.length === 0 && (stats.groupStats || []).length === 0 && (
          <Card className="p-12 text-center mt-4">
            <BarChart3 className="w-10 h-10 mx-auto mb-3 text-muted-foreground/30" />
            <p className="font-medium mb-1">Нет данных для отображения</p>
            <p className="text-sm text-muted-foreground mb-4">
              Создайте курсы и добавьте учеников, чтобы видеть статистику
            </p>
            <div className="flex justify-center gap-3">
              <Link to="/courses"><Button size="sm">Создать курс</Button></Link>
              <Link to="/groups"><Button size="sm" variant="outline">Создать группу</Button></Link>
            </div>
          </Card>
        )}
      </div>
    </Layout>
  );
}
