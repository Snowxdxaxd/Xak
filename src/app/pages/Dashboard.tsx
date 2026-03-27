import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router';
import { Layout } from '../components/Layout';
import { useAuth } from '../context/AuthContext';
import { BookOpen, Flame, CheckCircle2, BarChart3, ArrowRight } from 'lucide-react';
import { Button } from '../components/ui/button';
import { Card } from '../components/ui/card';
import { Progress } from '../components/ui/progress';
import { api } from '../lib/supabase';
import { supabase } from '../lib/supabase';
import { motion } from 'motion/react';

export function Dashboard() {
  const { user, userRole, loading } = useAuth();
  const navigate = useNavigate();
  const [progress, setProgress] = useState<any>(null);
  const [courses, setCourses] = useState<any[]>([]);

  useEffect(() => { if (!loading && !user) navigate('/login'); }, [user, loading, navigate]);

  useEffect(() => { if (user) loadData(); }, [user]);

  const loadData = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.access_token) {
        const pd = await api.getUserProgress(session.access_token);
        if (pd && !pd.error) setProgress(pd);
      }
      const cd = await api.getCourses();
      setCourses(cd.courses || []);
    } catch (err) { console.error(err); }
  };

  if (loading || !user) return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="animate-spin w-6 h-6 border-2 border-foreground border-t-transparent rounded-full" />
    </div>
  );

  const p = progress || { level: 1, xp: 0, xpToNextLevel: 100, completedLessons: 0, streak: 0 };
  const xpPct = Math.round((p.xp / p.xpToNextLevel) * 100);
  const isTeacher = userRole === 'teacher' || userRole === 'superadmin';

  const stats = [
    { icon: BarChart3,    label: 'Уровень',        value: p.level },
    { icon: CheckCircle2, label: 'Уроков пройдено', value: p.completedLessons },
    { icon: Flame,        label: 'Серия дней',      value: p.streak },
  ];

  return (
    <Layout>
      <div className="container mx-auto px-4 py-8 max-w-5xl">
        {/* Welcome */}
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
          <h1 className="text-3xl font-bold mb-1">
            {isTeacher ? 'Панель преподавателя' : `Привет, ${user.user_metadata?.name || 'Программист'}`}
          </h1>
          <p className="text-muted-foreground">
            {isTeacher ? 'Управляй курсами и проверяй задания' : 'Продолжи с того места, где остановился'}
          </p>
        </motion.div>

        {/* Stats — только для учеников */}
        {!isTeacher && (
          <>
            <div className="grid grid-cols-3 gap-4 mb-6">
              {stats.map((s, i) => (
                <motion.div key={i} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.06 }}>
                  <Card className="p-5">
                    <s.icon className="w-4 h-4 text-muted-foreground mb-3" />
                    <div className="text-2xl font-bold">{s.value}</div>
                    <div className="text-xs text-muted-foreground mt-0.5">{s.label}</div>
                  </Card>
                </motion.div>
              ))}
            </div>

            {/* XP Progress */}
            <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
              <Card className="p-5 mb-8">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-sm font-medium">Уровень {p.level}</span>
                  <span className="text-sm text-muted-foreground">{p.xp} / {p.xpToNextLevel} XP</span>
                </div>
                <Progress value={xpPct} className="h-2" />
                <p className="text-xs text-muted-foreground mt-2">До уровня {p.level + 1}: {p.xpToNextLevel - p.xp} XP</p>
              </Card>
            </motion.div>
          </>
        )}

        {/* Courses */}
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.28 }}>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold">
              {isTeacher ? 'Все курсы' : 'Курсы'}
            </h2>
            <Link to="/courses">
              <Button variant="ghost" size="sm" className="gap-1 text-sm">
                Все курсы <ArrowRight className="w-3.5 h-3.5" />
              </Button>
            </Link>
          </div>

          {courses.length === 0 ? (
            <Card className="p-10 text-center">
              <BookOpen className="w-10 h-10 mx-auto mb-3 text-muted-foreground/40" />
              <p className="font-medium mb-1">Курсов пока нет</p>
              <p className="text-sm text-muted-foreground">
                {isTeacher ? 'Создайте первый курс в разделе «Курсы»' : 'Скоро появятся новые курсы'}
              </p>
            </Card>
          ) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
              {courses.slice(0, 6).map((c, i) => (
                <motion.div key={c.id} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.32 + i * 0.04 }}>
                  <Link to={`/course/${c.id}`}>
                    <Card className="p-5 h-full hover:shadow-md transition-shadow group">
                      <div className="flex items-start gap-3">
                        <div className="w-9 h-9 rounded-lg bg-muted flex items-center justify-center flex-shrink-0">
                          <BookOpen className="w-4 h-4 text-muted-foreground" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="font-semibold text-sm group-hover:text-foreground transition-colors line-clamp-1">{c.title}</h3>
                          <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{c.description}</p>
                          <p className="text-xs text-muted-foreground mt-2">{c.lessonsCount || 0} уроков</p>
                        </div>
                      </div>
                    </Card>
                  </Link>
                </motion.div>
              ))}
            </div>
          )}
        </motion.div>

        {/* Teacher quick actions */}
        {isTeacher && (
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.36 }} className="mt-8">
            <Card className="p-6 border-dashed">
              <h3 className="font-semibold mb-3">Быстрые действия</h3>
              <div className="flex gap-3 flex-wrap">
                <Link to="/courses"><Button variant="outline" size="sm">Управление курсами</Button></Link>
                <Link to="/admin"><Button variant="outline" size="sm">Проверить задания</Button></Link>
              </div>
            </Card>
          </motion.div>
        )}
      </div>
    </Layout>
  );
}
