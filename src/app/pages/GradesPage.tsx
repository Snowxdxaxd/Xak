import { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router';
import { Layout } from '../components/Layout';
import { useAuth } from '../context/AuthContext';
import { Card } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Progress } from '../components/ui/progress';
import { supabase } from '../lib/supabase';
import { BarChart3, BookOpen, CheckCircle2, XCircle, Clock, TrendingUp, Star } from 'lucide-react';
import { motion } from 'motion/react';

function gradeColor(g: number) {
  if (g >= 90) return 'text-emerald-600 dark:text-emerald-400';
  if (g >= 75) return 'text-green-600 dark:text-green-400';
  if (g >= 60) return 'text-amber-600 dark:text-amber-400';
  return 'text-red-500';
}

function gradeLabel(g: number) {
  if (g >= 90) return 'Отлично';
  if (g >= 75) return 'Хорошо';
  if (g >= 60) return 'Удовл.';
  return 'Неуд.';
}

export function GradesPage() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [grades, setGrades] = useState<any[]>([]);
  const [pageLoading, setPageLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'all' | string>('all');

  useEffect(() => { if (!loading && !user) navigate('/login'); }, [user, loading, navigate]);
  useEffect(() => { if (user) loadGrades(); }, [user]);

  const loadGrades = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) return;
      const res = await fetch('/api/student/all-grades', {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      const d = await res.json();
      setGrades(d.grades || []);
    } catch { }
    finally { setPageLoading(false); }
  };

  if (loading || pageLoading) return (
    <Layout>
      <div className="container mx-auto px-4 py-16 flex justify-center">
        <div className="animate-spin w-6 h-6 border-2 border-foreground border-t-transparent rounded-full" />
      </div>
    </Layout>
  );

  // Group by course
  const byCourse: Record<string, { title: string; grades: any[] }> = {};
  for (const g of grades) {
    const key = g.courseTitle || 'Без курса';
    if (!byCourse[key]) byCourse[key] = { title: key, grades: [] };
    byCourse[key].grades.push(g);
  }

  const avg = (list: any[]) => {
    const graded = list.filter(g => g.grade != null);
    if (!graded.length) return null;
    return Math.round(graded.reduce((s, g) => s + g.grade, 0) / graded.length);
  };

  const overallAvg = avg(grades);
  const passed = grades.filter(g => g.status === 'passed' || g.grade >= 60).length;
  const courses = Object.keys(byCourse);

  const filtered = activeTab === 'all' ? grades : byCourse[activeTab]?.grades || [];
  const filteredByCourse = activeTab === 'all' ? Object.entries(byCourse) : [[activeTab, byCourse[activeTab]]];

  const statusIcon = (g: any) => {
    const grade = g.grade ?? 0;
    if (grade >= 60) return <CheckCircle2 className="w-4 h-4 text-green-600 dark:text-green-400" />;
    if (g.status === 'pending') return <Clock className="w-4 h-4 text-amber-500" />;
    return <XCircle className="w-4 h-4 text-red-500" />;
  };

  return (
    <Layout>
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <div className="flex items-center gap-3 mb-6">
          <BarChart3 className="w-5 h-5 text-muted-foreground" />
          <h1 className="text-2xl font-bold">Мои оценки</h1>
        </div>

        {/* Summary */}
        {grades.length > 0 && (
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
            className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
            {[
              { icon: TrendingUp,   label: 'Средний балл', value: overallAvg ?? '—' },
              { icon: CheckCircle2, label: 'Сдано',        value: passed },
              { icon: BookOpen,     label: 'Предметов',    value: courses.length },
              { icon: Star,         label: 'Всего оценок', value: grades.length },
            ].map((s, i) => (
              <Card key={i} className="p-4">
                <s.icon className="w-4 h-4 text-muted-foreground mb-2" />
                <div className={`text-2xl font-bold ${typeof s.value === 'number' && s.label === 'Средний балл' ? gradeColor(s.value as number) : ''}`}>
                  {s.value}
                </div>
                <div className="text-xs text-muted-foreground">{s.label}</div>
              </Card>
            ))}
          </motion.div>
        )}

        {/* Tabs by course */}
        {courses.length > 1 && (
          <div className="flex gap-2 flex-wrap mb-6">
            <button onClick={() => setActiveTab('all')}
              className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${activeTab === 'all' ? 'bg-foreground text-background' : 'bg-muted hover:bg-muted/80'}`}>
              Все
            </button>
            {courses.map(c => (
              <button key={c} onClick={() => setActiveTab(c)}
                className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${activeTab === c ? 'bg-foreground text-background' : 'bg-muted hover:bg-muted/80'}`}>
                {c}
              </button>
            ))}
          </div>
        )}

        {grades.length === 0 ? (
          <Card className="p-12 text-center">
            <BarChart3 className="w-10 h-10 mx-auto mb-3 text-muted-foreground/40" />
            <p className="font-medium mb-1">Оценок пока нет</p>
            <p className="text-sm text-muted-foreground">Выполняйте задания — здесь появятся оценки</p>
            <Link to="/courses" className="inline-block mt-4 text-sm font-medium hover:underline">
              Перейти к курсам
            </Link>
          </Card>
        ) : (
          <div className="space-y-5">
            {(filteredByCourse as [string, { title: string; grades: any[] }][]).map(([courseName, courseData]) => {
              if (!courseData) return null;
              const courseAvg = avg(courseData.grades);
              const coursePassed = courseData.grades.filter(g => (g.grade ?? 0) >= 60).length;
              return (
                <motion.div key={courseName} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
                  <Card className="p-5">
                    {/* Course header */}
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-2 min-w-0">
                        <BookOpen className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                        <h2 className="font-semibold truncate">{courseName}</h2>
                      </div>
                      {courseAvg !== null && (
                        <div className="flex items-center gap-3 flex-shrink-0">
                          <Badge variant="outline" className="text-xs">{coursePassed}/{courseData.grades.length}</Badge>
                          <span className={`text-lg font-bold ${gradeColor(courseAvg)}`}>{courseAvg}</span>
                          <span className="text-xs text-muted-foreground">{gradeLabel(courseAvg)}</span>
                        </div>
                      )}
                    </div>

                    {/* Progress */}
                    {courseData.grades.length > 0 && (
                      <div className="mb-4">
                        <div className="flex justify-between text-xs text-muted-foreground mb-1">
                          <span>Сдано</span>
                          <span>{coursePassed}/{courseData.grades.length}</span>
                        </div>
                        <Progress value={Math.round((coursePassed / courseData.grades.length) * 100)} className="h-1.5" />
                      </div>
                    )}

                    {/* Grades table */}
                    <div className="space-y-1.5">
                      {courseData.grades.map(g => (
                        <div key={g.id} className="flex items-center gap-3 py-2 border-b last:border-0">
                          {statusIcon(g)}
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">{g.lessonTitle || 'Задание'}</p>
                            <div className="flex items-center gap-2 mt-0.5">
                              {g.checkMode === 'auto' && <Badge variant="outline" className="text-[10px] py-0">Авто</Badge>}
                              {g.checkMode === 'manual' && <Badge variant="outline" className="text-[10px] py-0">Ручная</Badge>}
                              {g.source === 'manual' && <Badge variant="secondary" className="text-[10px] py-0">Преподаватель</Badge>}
                              {g.feedback && <p className="text-xs text-muted-foreground truncate max-w-[180px]">{g.feedback}</p>}
                            </div>
                          </div>
                          <div className="flex items-center gap-2 flex-shrink-0">
                            <span className={`font-bold text-sm ${gradeColor(g.grade ?? 0)}`}>{g.grade ?? '—'}</span>
                            <span className="text-xs text-muted-foreground">/100</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </Card>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>
    </Layout>
  );
}
