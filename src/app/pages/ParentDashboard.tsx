import { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router';
import { Layout } from '../components/Layout';
import { useAuth } from '../context/AuthContext';
import { Card } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Progress } from '../components/ui/progress';
import { Button } from '../components/ui/button';
import { supabase } from '../lib/supabase';
import { useLanguage } from '../context/LanguageContext';
import {
  Users, BarChart3, CheckCircle2, TrendingUp, Settings,
  ChevronDown, ChevronRight, BookOpen, XCircle,
} from 'lucide-react';

function gradeColor(g: number) {
  if (g >= 90) return 'text-emerald-600 dark:text-emerald-400';
  if (g >= 75) return 'text-green-600 dark:text-green-400';
  if (g >= 60) return 'text-amber-600 dark:text-amber-400';
  return 'text-red-500';
}

export function ParentDashboard() {
  const { user, userRole, loading } = useAuth();
  const { t } = useLanguage();
  const navigate = useNavigate();
  const [students, setStudents] = useState<any[]>([]);
  const [expandedStudent, setExpandedStudent] = useState<string | null>(null);
  const [grades, setGrades] = useState<Record<string, any[]>>({});
  const [pageLoading, setPageLoading] = useState(true);

  useEffect(() => {
    if (!loading && (!user || userRole !== 'parent')) navigate('/dashboard');
  }, [user, userRole, loading, navigate]);

  useEffect(() => { if (user && userRole === 'parent') loadStudents(); }, [user, userRole]);

  const getToken = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    return session?.access_token || null;
  };

  const loadStudents = async () => {
    try {
      const t = await getToken(); if (!t) return;
      const res = await fetch('/api/parent/students', { headers: { Authorization: `Bearer ${t}` } });
      const d = await res.json();
      setStudents(d.students || []);
    } catch { }
    finally { setPageLoading(false); }
  };

  const loadGrades = async (studentId: string) => {
    if (grades[studentId]) return;
    const t = await getToken(); if (!t) return;
    const r = await fetch(`/api/parent/students/${studentId}/grades`, {
      headers: { Authorization: `Bearer ${t}` },
    });
    const d = await r.json();
    setGrades(prev => ({ ...prev, [studentId]: d.grades || [] }));
  };

  if (loading || pageLoading) return (
    <Layout>
      <div className="container mx-auto px-4 py-16 flex justify-center">
        <div className="animate-spin w-6 h-6 border-2 border-foreground border-t-transparent rounded-full" />
      </div>
    </Layout>
  );

  const accepted = students.filter(s => s.status === 'accepted');
  const pending  = students.filter(s => s.status === 'pending');

  const avg = (list: any[]) => {
    if (!list.length) return null;
    return Math.round(list.reduce((s, g) => s + (g.grade ?? 0), 0) / list.length);
  };

  // Group grades by course
  const groupByCourse = (list: any[]) => {
    const m: Record<string, any[]> = {};
    for (const g of list) {
      const k = g.courseTitle || 'Без курса';
      if (!m[k]) m[k] = [];
      m[k].push(g);
    }
    return m;
  };

  return (
    <Layout>
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <Users className="w-5 h-5 text-muted-foreground" />
            <h1 className="text-2xl font-bold">{t('parent_title')}</h1>
          </div>
          <Link to="/settings">
            <Button variant="outline" size="sm" className="gap-1.5">
              <Settings className="w-4 h-4" /> Привязать ученика
            </Button>
          </Link>
        </div>

        {pending.length > 0 && (
          <Card className="p-4 mb-4 border-dashed">
            <p className="text-sm text-muted-foreground">
              Ожидают подтверждения: {pending.length} запрос(ов)
            </p>
          </Card>
        )}

        {accepted.length === 0 ? (
          <Card className="p-12 text-center">
            <Users className="w-10 h-10 mx-auto mb-3 text-muted-foreground/40" />
            <p className="font-medium mb-1">{t('parent_no_students')}</p>
            <p className="text-sm text-muted-foreground mb-4">Отправьте запрос в настройках аккаунта</p>
            <Link to="/settings"><Button size="sm">Перейти в настройки</Button></Link>
          </Card>
        ) : (
          <div className="space-y-4">
            {accepted.map(s => {
              const xpPct = s.xp && s.xpToNextLevel ? Math.round((s.xp / s.xpToNextLevel) * 100) : 0;
              const sGrades = grades[s.id] || [];
              const sAvg = avg(sGrades);
              const isExpanded = expandedStudent === s.id;

              return (
                <Card key={s.linkId} className="overflow-hidden">
                  {/* Student header */}
                  <div className="p-5">
                    <div className="flex items-start gap-3 mb-4">
                      <div className="w-11 h-11 rounded-full bg-muted flex items-center justify-center text-sm font-bold flex-shrink-0">
                        {(s.user_metadata?.name || s.email || '?')[0].toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="font-semibold truncate">{s.user_metadata?.name || 'Ученик'}</p>
                          <Badge variant="secondary" className="text-xs">Ученик</Badge>
                          {sAvg !== null && (
                            <span className={`text-sm font-bold ml-auto ${gradeColor(sAvg)}`}>Ср. {sAvg}/100</span>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground">{s.email}</p>
                      </div>
                    </div>

                    {/* Stats */}
                    <div className="grid grid-cols-3 gap-3 mb-4">
                      {[
                        { icon: BarChart3,    label: 'Уровень',  value: s.level ?? 1 },
                        { icon: CheckCircle2, label: 'Уроков',   value: s.completedLessons ?? 0 },
                        { icon: TrendingUp,   label: 'XP',       value: s.xp ?? 0 },
                      ].map((stat, i) => (
                        <div key={i} className="text-center p-2 bg-muted rounded-lg">
                          <stat.icon className="w-3.5 h-3.5 mx-auto mb-1 text-muted-foreground" />
                          <p className="font-bold text-sm">{stat.value}</p>
                          <p className="text-xs text-muted-foreground">{stat.label}</p>
                        </div>
                      ))}
                    </div>

                    {s.xpToNextLevel && (
                      <div className="mb-3">
                        <div className="flex justify-between text-xs text-muted-foreground mb-1">
                          <span>До уровня {(s.level ?? 1) + 1}</span>
                          <span>{s.xp ?? 0} / {s.xpToNextLevel} XP</span>
                        </div>
                        <Progress value={xpPct} className="h-1.5" />
                      </div>
                    )}

                    {/* Toggle grades */}
                    <button
                      onClick={() => {
                        if (isExpanded) { setExpandedStudent(null); }
                        else { setExpandedStudent(s.id); loadGrades(s.id); }
                      }}
                      className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
                    >
                      <BarChart3 className="w-4 h-4" />
                      Оценки
                      {sAvg !== null && <span className="text-xs">({sGrades.length})</span>}
                      {isExpanded ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
                    </button>
                  </div>

                  {/* Grades section */}
                  {isExpanded && (
                    <div className="border-t px-5 pb-5 pt-4">
                      {!grades[s.id] ? (
                        <div className="flex justify-center py-4">
                          <div className="animate-spin w-5 h-5 border-2 border-foreground border-t-transparent rounded-full" />
                        </div>
                      ) : sGrades.length === 0 ? (
                        <p className="text-sm text-muted-foreground text-center py-4">Оценок пока нет</p>
                      ) : (
                        <div className="space-y-5">
                          {Object.entries(groupByCourse(sGrades)).map(([course, cGrades]) => {
                            const ca = avg(cGrades as any[]);
                            return (
                              <div key={course}>
                                <div className="flex items-center justify-between mb-2">
                                  <div className="flex items-center gap-1.5">
                                    <BookOpen className="w-3.5 h-3.5 text-muted-foreground" />
                                    <span className="text-sm font-medium">{course}</span>
                                  </div>
                                  {ca !== null && (
                                    <span className={`text-sm font-bold ${gradeColor(ca)}`}>{ca}/100</span>
                                  )}
                                </div>
                                <div className="space-y-1.5 ml-5">
                                  {(cGrades as any[]).map((g: any) => (
                                    <div key={g.id} className="flex items-center gap-2 text-sm py-1 border-b last:border-0">
                                      {(g.grade ?? 0) >= 60
                                        ? <CheckCircle2 className="w-3.5 h-3.5 text-green-600 dark:text-green-400 flex-shrink-0" />
                                        : <XCircle className="w-3.5 h-3.5 text-red-500 flex-shrink-0" />
                                      }
                                      <span className="flex-1 truncate text-muted-foreground">{g.lessonTitle || 'Урок'}</span>
                                      <span className={`font-semibold flex-shrink-0 ${gradeColor(g.grade ?? 0)}`}>{g.grade}/100</span>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  )}
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </Layout>
  );
}
