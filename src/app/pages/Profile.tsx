import React, { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router';
import { Layout } from '../components/Layout';
import { useAuth } from '../context/AuthContext';
import { Card } from '../components/ui/card';
import { Progress } from '../components/ui/progress';
import { Badge } from '../components/ui/badge';
import { supabase, api } from '../lib/supabase';
import { BarChart3, BookOpen, CheckCircle2, Flame, TrendingUp, Award, Trophy, GraduationCap, Star, Crown, Sparkles, Footprints, Medal } from 'lucide-react';

export function Profile() {
  const params = useParams();
  const { user, userRole, loading } = useAuth();
  const navigate = useNavigate();
  const viewedUserId = params.id;
  const isOwnProfile = !viewedUserId || viewedUserId === user?.id;
  const [progress, setProgress] = useState<any>({ level:1,xp:0,xpToNextLevel:100,completedLessons:0,streak:0,achievements:[] });
  const [grades, setGrades] = useState<any[]>([]);
  const [myCourses, setMyCourses] = useState<any[]>([]);
  const [publicProfile, setPublicProfile] = useState<any>(null);
  const [pageLoading, setPageLoading] = useState(true);

  useEffect(() => { if (!loading && !user) navigate('/login'); }, [user, loading, navigate]);

  useEffect(() => {
    if (user) loadAll();
  }, [user, viewedUserId]);

  const loadAll = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) return;
      const t = session.access_token;
      if (!isOwnProfile && viewedUserId) {
        const pd = await api.getPublicProfile(viewedUserId, t);
        if (pd?.profile) {
          setPublicProfile(pd.profile);
          setProgress(pd.profile.progress || progress);
          setMyCourses(pd.profile.courses || []);
        }
        setGrades([]);
        setPageLoading(false);
        return;
      }
      const [pd, gd, cd] = await Promise.allSettled([
        api.getUserProgress(t),
        fetch(`/api/grades`, { headers: { Authorization: `Bearer ${t}` } }).then(r => r.json()),
        fetch(`/api/my-courses`, { headers: { Authorization: `Bearer ${t}` } }).then(r => r.json()),
      ]);
      if (pd.status === 'fulfilled' && pd.value && !pd.value.error) setProgress(pd.value);
      if (gd.status === 'fulfilled' && gd.value?.grades) setGrades(gd.value.grades);
      if (cd.status === 'fulfilled' && cd.value?.courses) setMyCourses(cd.value.courses);
    } catch (err) { console.error(err); }
    finally { setPageLoading(false); }
  };

  if (loading || pageLoading) return (
    <Layout>
      <div className="container mx-auto px-4 py-16 flex justify-center">
        <div className="animate-spin w-6 h-6 border-2 border-foreground border-t-transparent rounded-full" />
      </div>
    </Layout>
  );

  const xpPct = Math.round((progress.xp / progress.xpToNextLevel) * 100);
  const isTeacher = (isOwnProfile ? userRole : publicProfile?.role) === 'teacher' || (isOwnProfile ? userRole : publicProfile?.role) === 'superadmin';
  const displayName = isOwnProfile ? (user?.user_metadata?.name || user?.email) : (publicProfile?.name || 'Пользователь');
  const displayEmail = isOwnProfile ? user?.email : publicProfile?.email;
  const profileRole = isOwnProfile ? userRole : publicProfile?.role;

  // Group grades by course
  const byCourse: Record<string, any[]> = {};
  for (const g of grades) {
    const key = g.courseTitle || 'Без курса';
    if (!byCourse[key]) byCourse[key] = [];
    byCourse[key].push(g);
  }

  // Overall completion
  const totalLessons = myCourses.reduce((acc, c) => acc + Number(c.lessonsCount || 0), 0);
  const totalCompleted = myCourses.reduce((acc, c) => acc + Number(c.completedCount || 0), 0);
  const overallPct = totalLessons > 0 ? Math.round((totalCompleted / totalLessons) * 100) : 0;

  return (
    <Layout>
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        {/* Header */}
        <div className="flex items-start gap-5 mb-8">
          <div className="w-14 h-14 rounded-full bg-muted flex items-center justify-center text-xl font-bold flex-shrink-0">
            {(displayName || '?')[0].toUpperCase()}
          </div>
          <div>
            <h1 className="text-2xl font-bold">{displayName}</h1>
            <p className="text-muted-foreground text-sm">{displayEmail}</p>
            <Badge variant="secondary" className="mt-1 text-xs">
              {profileRole === 'superadmin' ? 'Главный администратор' : isTeacher ? 'Преподаватель' : profileRole === 'parent' ? 'Родитель' : 'Ученик'}
            </Badge>
          </div>
        </div>

        {!isTeacher && (
          <>
            {/* Stats cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              {[
                { icon: BarChart3,    label: 'Уровень',         value: progress.level },
                { icon: TrendingUp,   label: 'Очки XP',          value: progress.xp },
                { icon: CheckCircle2, label: 'Уроков пройдено',  value: progress.completedLessons },
                { icon: Flame,        label: 'Серия дней',       value: progress.streak },
              ].map((s, i) => (
                <Card key={i} className="p-4">
                  <s.icon className="w-4 h-4 text-muted-foreground mb-2" />
                  <div className="text-2xl font-bold">{s.value}</div>
                  <div className="text-xs text-muted-foreground">{s.label}</div>
                </Card>
              ))}
            </div>

            {/* XP progress */}
            <Card className="p-5 mb-6">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium">Уровень {progress.level} → {progress.level + 1}</span>
                <span className="text-sm text-muted-foreground">{progress.xp} / {progress.xpToNextLevel} XP</span>
              </div>
              <Progress value={xpPct} className="h-2" />
            </Card>

            {/* Achievements */}
            <Card className="p-5 mb-6">
              <h2 className="font-semibold mb-4 flex items-center gap-2">
                <Award className="w-4 h-4 text-yellow-500" /> Достижения
                {(progress.achievements || []).length > 0 && (
                  <Badge variant="secondary" className="ml-auto text-xs">{(progress.achievements || []).length}</Badge>
                )}
              </h2>
              {(progress.achievements || []).length === 0 ? (
                <div className="text-center py-6">
                  <Trophy className="w-10 h-10 mx-auto mb-2 text-muted-foreground/30" />
                  <p className="text-sm text-muted-foreground">Пока нет достижений. Проходи уроки и курсы!</p>
                </div>
              ) : (
                <div className="grid sm:grid-cols-2 gap-3">
                  {(progress.achievements || []).map((a: any) => {
                    const IconMap: Record<string, any> = {
                      'crown': Crown,
                      'sparkles': Sparkles,
                      'graduation-cap': GraduationCap,
                      'trophy': Trophy,
                      'star': Star,
                      'footprints': Footprints,
                    };
                    const Icon = IconMap[a.icon] || Medal;
                    return (
                      <div key={a.id} className="flex items-start gap-3 border rounded-xl p-3 bg-muted/30 hover:bg-muted/50 transition-colors">
                        <div className="w-9 h-9 rounded-full bg-yellow-100 dark:bg-yellow-900/30 flex items-center justify-center flex-shrink-0">
                          <Icon className="w-4 h-4 text-yellow-600 dark:text-yellow-400" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-semibold">{a.title}</p>
                          <p className="text-xs text-muted-foreground">{a.description}</p>
                          {a.earnedAt && (
                            <p className="text-xs text-muted-foreground/60 mt-0.5">
                              {new Date(a.earnedAt).toLocaleDateString('ru-RU')}
                            </p>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </Card>

            {/* My courses with progress */}
            {myCourses.length > 0 && (
              <Card className="p-5 mb-6">
                <h2 className="font-semibold mb-4 flex items-center gap-2">
                  <BookOpen className="w-4 h-4 text-muted-foreground" /> Мои курсы
                </h2>
                {totalLessons > 0 && (
                  <div className="mb-4 pb-4 border-b">
                    <div className="flex justify-between text-sm mb-1.5">
                      <span className="text-muted-foreground">Общий прогресс</span>
                      <span className="font-medium">{overallPct}%</span>
                    </div>
                    <Progress value={overallPct} className="h-1.5" />
                    <p className="text-xs text-muted-foreground mt-1">{totalCompleted} из {totalLessons} уроков</p>
                  </div>
                )}
                <div className="space-y-3">
                  {myCourses.map((c) => {
                    const cnt = Number(c.lessonsCount || 0);
                    const done = Number(c.completedCount || 0);
                    const pct = cnt > 0 ? Math.round((done / cnt) * 100) : 0;
                    return (
                      <Link to={`/course/${c.id}`} key={c.id} className="block group">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-sm font-medium group-hover:underline">{c.title}</span>
                          <span className="text-xs text-muted-foreground">{done}/{cnt}</span>
                        </div>
                        <Progress value={pct} className="h-1" />
                      </Link>
                    );
                  })}
                </div>
              </Card>
            )}

            {/* Grades by course */}
            {Object.keys(byCourse).length > 0 && (
              <Card className="p-5">
                <h2 className="font-semibold mb-4">Оценки по курсам</h2>
                <div className="space-y-6">
                  {Object.entries(byCourse).map(([course, courseGrades]) => {
                    const avg = Math.round(courseGrades.reduce((s, g) => s + (g.grade || 0), 0) / courseGrades.length);
                    return (
                      <div key={course}>
                        <div className="flex items-center justify-between mb-2">
                          <h3 className="text-sm font-medium">{course}</h3>
                          <Badge variant={avg >= 60 ? 'default' : 'destructive'} className="text-xs">
                            Средний балл: {avg}
                          </Badge>
                        </div>
                        <div className="space-y-1.5">
                          {courseGrades.map((g) => (
                            <div key={g.id} className="flex items-center justify-between text-sm py-1.5 border-b last:border-0">
                              <div>
                                <span className="text-muted-foreground">{g.lessonTitle || 'Урок'}</span>
                                {g.checkMode === 'auto' && (
                                  <Badge variant="outline" className="ml-2 text-xs">Авто</Badge>
                                )}
                                {g.checkMode === 'manual' && (
                                  <Badge variant="outline" className="ml-2 text-xs">Ручная</Badge>
                                )}
                              </div>
                              <div className="flex items-center gap-2">
                                <span className={`font-semibold ${g.grade >= 60 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                                  {g.grade}
                                </span>
                                <Badge variant={g.status === 'passed' ? 'default' : 'destructive'} className="text-xs">
                                  {g.status === 'passed' ? 'Сдано' : 'Не сдано'}
                                </Badge>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </Card>
            )}

            {grades.length === 0 && myCourses.length === 0 && (
              <Card className="p-10 text-center">
                <BookOpen className="w-10 h-10 mx-auto mb-3 text-muted-foreground/40" />
                <p className="font-medium mb-1">Начни обучение</p>
                <p className="text-sm text-muted-foreground">Пройди первый урок — здесь появится твоя статистика</p>
              </Card>
            )}
          </>
        )}

        {isTeacher && (
          <Card className="p-6 text-center">
            <p className="text-muted-foreground">Страница прогресса ориентирована на учеников. Используйте панель преподавателя для управления курсами.</p>
          </Card>
        )}
      </div>
    </Layout>
  );
}
