import { useEffect, useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router';
import { Layout } from '../components/Layout';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { BookOpen, Flame, CheckCircle2, BarChart3, ArrowRight, Video, CircleDollarSign, ShoppingBag } from 'lucide-react';
import { Button } from '../components/ui/button';
import { Card } from '../components/ui/card';
import { Progress } from '../components/ui/progress';
import { api, supabase, API_BASE } from '../lib/supabase';
import { motion } from 'motion/react';

export function Dashboard() {
  const { user, userRole, loading } = useAuth();
  const { t } = useLanguage();
  const navigate = useNavigate();
  const location = useLocation();
  const [progress, setProgress] = useState<any>(null);
  const [courses, setCourses] = useState<any[]>([]);
  const [activeMeetings, setActiveMeetings] = useState<any[]>([]);

  useEffect(() => { if (!loading && !user) navigate('/login'); }, [user, loading, navigate]);
  useEffect(() => {
    if (!user || location.pathname !== '/dashboard') return;
    loadData();
  }, [user, location.pathname]);

  const loadData = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.access_token) {
        const pd = await api.getUserProgress(session.access_token);
        if (pd && !pd.error) {
          const merged = {
            level: 1,
            xp: 0,
            xpToNextLevel: 100,
            completedLessons: 0,
            streak: 0,
            achievements: [] as any[],
            coins: 0,
            ...pd,
          };
          merged.achievements = Array.isArray(pd.achievements) ? pd.achievements : [];
          merged.coins = pd.coins ?? 0;
          setProgress(merged);
        }
        if (userRole === 'student') {
          try {
            const mr = await fetch(`${API_BASE}/student/active-meetings`, {
              headers: { Authorization: `Bearer ${session.access_token}` },
            });
            if (mr.ok) { const md = await mr.json(); setActiveMeetings(md.meetings || []); }
          } catch {}
        }
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

  const p = progress || { level: 1, xp: 0, xpToNextLevel: 100, completedLessons: 0, streak: 0, coins: 0 };
  const xpPct = Math.round((p.xp / p.xpToNextLevel) * 100);
  const isTeacher = userRole === 'teacher' || userRole === 'superadmin';

  const stats = [
    { icon: BarChart3,          label: t('dashboard_level'),             value: p.level },
    { icon: CheckCircle2,       label: t('dashboard_completed_lessons'), value: p.completedLessons },
    { icon: Flame,              label: t('dashboard_streak'),            value: p.streak },
    { icon: CircleDollarSign,   label: t('dashboard_coins'),             value: p.coins || 0 },
  ];

  return (
    <Layout>
      <div className="container mx-auto px-4 py-8 max-w-5xl">
        {/* Welcome */}
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
          <h1 className="text-3xl font-bold mb-1">
            {isTeacher
              ? t('dashboard_teacher_title')
              : `${t('dashboard_student_greeting')} ${user.user_metadata?.name || 'Программист'}`}
          </h1>
          <p className="text-muted-foreground">
            {isTeacher ? t('dashboard_teacher_subtitle') : t('dashboard_student_subtitle')}
          </p>
        </motion.div>

        {/* Active meeting banners for students */}
        {!isTeacher && activeMeetings.length > 0 && (
          <div className="mb-6 space-y-2">
            {activeMeetings.map((m: any) => (
              <motion.div key={m.groupId} initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}>
                <div className="flex items-center justify-between p-4 rounded-xl border border-green-500/30 bg-green-500/5">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-lg bg-green-500/10 flex items-center justify-center flex-shrink-0">
                      <Video className="w-4 h-4 text-green-500" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="font-semibold text-sm">{t('dashboard_lesson_live')}</p>
                        <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                      </div>
                      <p className="text-xs text-muted-foreground">{t('dashboard_class_label')} {m.groupName}</p>
                    </div>
                  </div>
                  <Link to={`/meeting/${m.groupId}`}>
                    <Button size="sm" className="gap-1.5 bg-green-600 hover:bg-green-700 text-white">
                      <Video className="w-3.5 h-3.5" /> {t('dashboard_join')}
                    </Button>
                  </Link>
                </div>
              </motion.div>
            ))}
          </div>
        )}

        {/* Stats — only for students */}
        {!isTeacher && (
          <>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
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
                  <span className="text-sm font-medium">{t('dashboard_xp_level')} {p.level}</span>
                  <span className="text-sm text-muted-foreground">{p.xp} / {p.xpToNextLevel} XP</span>
                </div>
                <Progress value={xpPct} className="h-2" />
                <div className="flex items-center justify-between mt-2">
                  <p className="text-xs text-muted-foreground">{t('dashboard_xp_to_next')} {p.level + 1}: {p.xpToNextLevel - p.xp} {t('dashboard_xp_remaining')}</p>
                  <Link to="/shop" className="text-xs text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1">
                    <ShoppingBag className="w-3 h-3" /> {t('nav_shop')}
                  </Link>
                </div>
              </Card>
            </motion.div>
          </>
        )}

        {/* Courses */}
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.28 }}>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold">
              {isTeacher ? t('dashboard_all_courses') : t('dashboard_courses')}
            </h2>
            <Link to="/courses">
              <Button variant="ghost" size="sm" className="gap-1 text-sm">
                {t('dashboard_all_courses')} <ArrowRight className="w-3.5 h-3.5" />
              </Button>
            </Link>
          </div>

          {courses.length === 0 ? (
            <Card className="p-10 text-center">
              <BookOpen className="w-10 h-10 mx-auto mb-3 text-muted-foreground/40" />
              <p className="font-medium mb-1">{t('dashboard_no_courses')}</p>
              <p className="text-sm text-muted-foreground">
                {isTeacher ? t('dashboard_no_courses_teacher') : t('dashboard_no_courses_student')}
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
                          <p className="text-xs text-muted-foreground mt-2">{c.lessonsCount || 0} {t('dashboard_lessons_count')}</p>
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
              <h3 className="font-semibold mb-3">{t('dashboard_quick_actions')}</h3>
              <div className="flex gap-3 flex-wrap">
                <Link to="/courses"><Button variant="outline" size="sm">{t('dashboard_manage_courses')}</Button></Link>
                <Link to="/admin"><Button variant="outline" size="sm">{t('dashboard_check_tasks')}</Button></Link>
              </div>
            </Card>
          </motion.div>
        )}
      </div>
    </Layout>
  );
}
