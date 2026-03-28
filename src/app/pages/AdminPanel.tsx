import React, { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router';
import { Layout } from '../components/Layout';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import {
  GraduationCap, BookOpen, Users, FileCheck, CheckCircle2, XCircle,
  Shield, Trophy, Pencil, Trash2, Ban, X, Check,
} from 'lucide-react';
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
  const { t } = useLanguage();
  const navigate = useNavigate();
  const [pending, setPending] = useState<any[]>([]);
  const [grades, setGrades] = useState<Record<string, { grade: string; feedback: string }>>({});
  const [students, setStudents] = useState<any[]>([]);
  const [allUsers, setAllUsers] = useState<any[]>([]);
  const [bannedEmails, setBannedEmails] = useState<any[]>([]);
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState('');

  useEffect(() => {
    if (!loading && (!user || (userRole !== 'teacher' && userRole !== 'superadmin'))) navigate('/dashboard');
  }, [user, userRole, loading, navigate]);

  useEffect(() => {
    if (userRole === 'teacher' || userRole === 'superadmin') {
      loadPending();
      if (userRole === 'superadmin') {
        loadStudents();
        loadAllUsers();
        loadBannedEmails();
      }
    }
  }, [userRole]);

  const getToken = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    return session?.access_token || null;
  };

  const loadStudents = async () => {
    try {
      const tk = await getToken(); if (!tk) return;
      const res = await fetch('/api/admin/students', { headers: { Authorization: `Bearer ${tk}` } });
      const d = await res.json();
      setStudents(d.students || []);
    } catch { }
  };

  const loadAllUsers = async () => {
    try {
      const tk = await getToken(); if (!tk) return;
      const res = await fetch('/api/admin/users', { headers: { Authorization: `Bearer ${tk}` } });
      const d = await res.json();
      setAllUsers(d.users || []);
    } catch { }
  };

  const loadBannedEmails = async () => {
    try {
      const tk = await getToken(); if (!tk) return;
      const res = await fetch('/api/admin/banned-emails', { headers: { Authorization: `Bearer ${tk}` } });
      const d = await res.json();
      setBannedEmails(d.bannedEmails || []);
    } catch { }
  };

  const loadPending = async () => {
    try {
      const tk = await getToken(); if (!tk) return;
      const res = await fetch('/api/submissions/pending', { headers: { Authorization: `Bearer ${tk}` } });
      const d = await res.json();
      setPending(d.submissions || []);
    } catch { }
  };

  const handleGrade = async (subId: string) => {
    const g = grades[subId];
    if (!g?.grade) { toast.error('Укажите оценку'); return; }
    try {
      const tk = await getToken(); if (!tk) return;
      const res = await fetch(`/api/submissions/${subId}/grade`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${tk}` },
        body: JSON.stringify({ grade: Number(g.grade), feedback: g.feedback || '' }),
      });
      if (!res.ok) throw new Error();
      toast.success('Оценка выставлена');
      setPending(prev => prev.filter(s => s.id !== subId));
    } catch { toast.error('Ошибка оценки'); }
  };

  const handleRename = async (userId: string) => {
    if (!renameValue.trim()) return;
    try {
      const tk = await getToken(); if (!tk) return;
      const res = await fetch(`/api/admin/users/${userId}/name`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${tk}` },
        body: JSON.stringify({ name: renameValue.trim() }),
      });
      if (!res.ok) throw new Error((await res.json()).error);
      toast.success('Имя изменено');
      setRenamingId(null);
      setRenameValue('');
      loadAllUsers();
    } catch (err: any) { toast.error(err.message || 'Ошибка'); }
  };

  const handleDeleteUser = async (userId: string, email: string, ban: boolean) => {
    const msg = ban
      ? `${t('admin_confirm_delete_ban')}\n${email}`
      : `${t('admin_confirm_delete')}: ${email}?`;
    if (!confirm(msg)) return;
    try {
      const tk = await getToken(); if (!tk) return;
      const res = await fetch(`/api/admin/users/${userId}?ban=${ban}`, {
        method: 'DELETE', headers: { Authorization: `Bearer ${tk}` },
      });
      if (!res.ok) throw new Error((await res.json()).error);
      toast.success(ban ? `Аккаунт удалён, email ${email} заблокирован` : 'Аккаунт удалён');
      loadAllUsers();
      if (ban) loadBannedEmails();
    } catch (err: any) { toast.error(err.message || 'Ошибка'); }
  };

  const handleUnban = async (email: string) => {
    try {
      const tk = await getToken(); if (!tk) return;
      await fetch(`/api/admin/banned-emails/${encodeURIComponent(email)}`, {
        method: 'DELETE', headers: { Authorization: `Bearer ${tk}` },
      });
      toast.success(`Email ${email} разблокирован`);
      loadBannedEmails();
    } catch { toast.error('Ошибка'); }
  };

  if (loading || (userRole !== 'teacher' && userRole !== 'superadmin')) return (
    <Layout>
      <div className="container mx-auto px-4 py-16 flex justify-center">
        <div className="animate-spin w-6 h-6 border-2 border-foreground border-t-transparent rounded-full" />
      </div>
    </Layout>
  );

  const isSuperAdmin = userRole === 'superadmin';
  const roleLabel = (meta: any) => {
    const r = meta?.role;
    if (r === 'superadmin') return t('role_superadmin');
    if (r === 'teacher')    return t('role_teacher');
    if (r === 'parent')     return t('role_parent');
    return t('role_student');
  };

  return (
    <Layout>
      <div className="container mx-auto px-4 py-8 max-w-5xl">
        <div className="flex items-center gap-3 mb-8">
          {isSuperAdmin ? <Shield className="w-5 h-5 text-muted-foreground" /> : <GraduationCap className="w-5 h-5 text-muted-foreground" />}
          <h1 className="text-2xl font-bold">{isSuperAdmin ? t('admin_title_superadmin') : t('admin_title_teacher')}</h1>
        </div>

        <Tabs defaultValue="submissions">
          <TabsList className="mb-6 flex-wrap h-auto gap-1">
            <TabsTrigger value="submissions" className="gap-1.5">
              <FileCheck className="w-4 h-4" /> {t('admin_tab_tasks')}
              {pending.length > 0 && (
                <Badge className="ml-1 h-4 w-4 text-xs p-0 flex items-center justify-center">{pending.length}</Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="courses" className="gap-1.5">
              <BookOpen className="w-4 h-4" /> {t('admin_tab_courses')}
            </TabsTrigger>
            <TabsTrigger value="students" className="gap-1.5">
              <Users className="w-4 h-4" /> {t('admin_tab_students')}
            </TabsTrigger>
            {isSuperAdmin && (
              <TabsTrigger value="users" className="gap-1.5">
                <Shield className="w-4 h-4" /> {t('admin_tab_users')}
              </TabsTrigger>
            )}
            {isSuperAdmin && (
              <TabsTrigger value="tools" className="gap-1.5">
                <Trophy className="w-4 h-4" /> {t('admin_tab_tools')}
              </TabsTrigger>
            )}
          </TabsList>

          {/* Submissions */}
          <TabsContent value="submissions">
            {pending.length === 0 ? (
              <Card className="p-10 text-center">
                <CheckCircle2 className="w-10 h-10 mx-auto mb-3 text-muted-foreground/40" />
                <p className="font-medium mb-1">{t('admin_no_tasks')}</p>
                <p className="text-sm text-muted-foreground">{t('admin_no_tasks_desc')}</p>
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
                        <Label className="text-xs mb-1 block">{t('admin_grade_label')}</Label>
                        <Input
                          type="number" min="0" max="100"
                          value={grades[s.id]?.grade || ''}
                          onChange={e => setGrades(prev => ({ ...prev, [s.id]: { ...prev[s.id], grade: e.target.value } }))}
                          className="h-8 text-sm"
                        />
                      </div>
                      <div className="flex-[2]">
                        <Label className="text-xs mb-1 block">{t('admin_feedback_label')}</Label>
                        <Textarea
                          value={grades[s.id]?.feedback || ''}
                          onChange={e => setGrades(prev => ({ ...prev, [s.id]: { ...prev[s.id], feedback: e.target.value } }))}
                          rows={1} className="text-sm"
                          placeholder={t('admin_feedback_placeholder')}
                        />
                      </div>
                      <div className="flex gap-2">
                        <Button size="sm" variant="outline"
                          onClick={() => {
                            setGrades(prev => ({ ...prev, [s.id]: { grade: '100', feedback: 'Отлично!' } }));
                            setTimeout(() => handleGrade(s.id), 100);
                          }}
                        >
                          <CheckCircle2 className="w-3.5 h-3.5 text-green-600" />
                        </Button>
                        <Button size="sm" variant="outline"
                          onClick={() => {
                            setGrades(prev => ({ ...prev, [s.id]: { grade: '0', feedback: 'Не засчитано. Попробуй снова.' } }));
                            setTimeout(() => handleGrade(s.id), 100);
                          }}
                        >
                          <XCircle className="w-3.5 h-3.5 text-red-600" />
                        </Button>
                        <Button size="sm" onClick={() => handleGrade(s.id)}>{t('admin_grade')}</Button>
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
                  <BookOpen className="w-4 h-4" /> {t('admin_manage_courses')}
                </h2>
                <Link to="/courses">
                  <Button size="sm" variant="outline">{t('admin_go_courses')}</Button>
                </Link>
              </div>
              <p className="text-sm text-muted-foreground">{t('admin_manage_courses_desc')}</p>
            </Card>
          </TabsContent>

          {/* Students progress */}
          <TabsContent value="students">
            {!isSuperAdmin ? (
              <Card className="p-6 text-center">
                <Users className="w-10 h-10 mx-auto mb-3 text-muted-foreground/40" />
                <p className="font-medium mb-1">{t('admin_tab_students')}</p>
                <p className="text-sm text-muted-foreground">{t('admin_students_stat_desc')}</p>
              </Card>
            ) : (
              <Card className="p-6">
                <h2 className="font-semibold mb-4">{t('admin_all_students')}</h2>
                {students.length === 0 ? (
                  <p className="text-sm text-muted-foreground">{t('admin_no_students')}</p>
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

          {/* All Users — superadmin user management */}
          {isSuperAdmin && (
            <TabsContent value="users">
              <div className="space-y-4">
                <Card className="p-6">
                  <h2 className="font-semibold mb-4 flex items-center gap-2">
                    <Users className="w-4 h-4" /> {t('admin_all_users')}
                  </h2>
                  <div className="space-y-2">
                    {allUsers.map((u) => (
                      <div key={u.id} className="border rounded-lg p-3">
                        {renamingId === u.id ? (
                          <div className="flex items-center gap-2">
                            <Input
                              value={renameValue}
                              onChange={e => setRenameValue(e.target.value)}
                              placeholder={t('admin_new_name')}
                              className="flex-1 h-8 text-sm"
                              autoFocus
                              onKeyDown={e => {
                                if (e.key === 'Enter') handleRename(u.id);
                                if (e.key === 'Escape') { setRenamingId(null); setRenameValue(''); }
                              }}
                            />
                            <Button size="icon" className="w-8 h-8" onClick={() => handleRename(u.id)}>
                              <Check className="w-3.5 h-3.5" />
                            </Button>
                            <Button size="icon" variant="ghost" className="w-8 h-8"
                              onClick={() => { setRenamingId(null); setRenameValue(''); }}>
                              <X className="w-3.5 h-3.5" />
                            </Button>
                          </div>
                        ) : (
                          <div className="flex items-center justify-between gap-2">
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-2">
                                <p className="text-sm font-medium truncate">
                                  {u.user_metadata?.name || '—'}
                                </p>
                                <Badge variant="outline" className="text-xs flex-shrink-0">
                                  {roleLabel(u.user_metadata)}
                                </Badge>
                                {!u.email_verified && (
                                  <Badge variant="secondary" className="text-xs flex-shrink-0">не подтверждён</Badge>
                                )}
                              </div>
                              <p className="text-xs text-muted-foreground truncate">{u.email}</p>
                            </div>
                            {u.id !== user?.id && (
                              <div className="flex gap-1.5 flex-shrink-0 flex-wrap justify-end">
                                <Button
                                  size="sm" variant="outline" className="h-7 px-2 text-xs gap-1"
                                  onClick={() => {
                                    setRenamingId(u.id);
                                    setRenameValue(u.user_metadata?.name || '');
                                  }}
                                >
                                  <Pencil className="w-3 h-3" /> {t('admin_user_rename')}
                                </Button>
                                <Button
                                  size="sm" variant="outline"
                                  className="h-7 px-2 text-xs gap-1 text-destructive border-destructive/40 hover:bg-destructive/10"
                                  onClick={() => handleDeleteUser(u.id, u.email, false)}
                                >
                                  <Trash2 className="w-3 h-3" /> {t('admin_user_delete')}
                                </Button>
                                <Button
                                  size="sm" variant="outline"
                                  className="h-7 px-2 text-xs gap-1 text-orange-600 border-orange-400/40 hover:bg-orange-50 dark:hover:bg-orange-950/30"
                                  onClick={() => handleDeleteUser(u.id, u.email, true)}
                                >
                                  <Ban className="w-3 h-3" /> {t('admin_user_delete_ban')}
                                </Button>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </Card>

                {/* Banned emails */}
                <Card className="p-6">
                  <h2 className="font-semibold mb-4 flex items-center gap-2">
                    <Ban className="w-4 h-4 text-orange-500" /> {t('admin_banned_emails')}
                  </h2>
                  {bannedEmails.length === 0 ? (
                    <p className="text-sm text-muted-foreground">{t('admin_no_banned')}</p>
                  ) : (
                    <div className="space-y-2">
                      {bannedEmails.map((b) => (
                        <div key={b.email} className="flex items-center justify-between p-2.5 rounded-lg bg-orange-50 dark:bg-orange-950/20 border border-orange-200 dark:border-orange-800">
                          <div>
                            <p className="text-sm font-medium">{b.email}</p>
                            <p className="text-xs text-muted-foreground">
                              {new Date(b.bannedAt).toLocaleDateString('ru-RU')}
                            </p>
                          </div>
                          <Button
                            size="sm" variant="outline"
                            onClick={() => handleUnban(b.email)}
                            className="text-xs"
                          >
                            {t('admin_unban')}
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                </Card>
              </div>
            </TabsContent>
          )}

          {isSuperAdmin && (
            <TabsContent value="tools">
              <Card className="p-6 space-y-4">
                <p className="text-sm text-muted-foreground">{t('admin_tools_desc')}</p>
                <div className="flex flex-wrap gap-2">
                  <Link to="/courses"><Button size="sm" variant="outline">{t('admin_tools_courses')}</Button></Link>
                  <Link to="/messenger"><Button size="sm" variant="outline">{t('admin_tools_chat')}</Button></Link>
                  <Link to="/leaderboard"><Button size="sm" variant="outline">{t('admin_tools_leaderboard')}</Button></Link>
                </div>
              </Card>
            </TabsContent>
          )}
        </Tabs>
      </div>
    </Layout>
  );
}
