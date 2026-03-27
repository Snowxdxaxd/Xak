import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router';
import { Layout } from '../components/Layout';
import { useAuth } from '../context/AuthContext';
import { Card } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Badge } from '../components/ui/badge';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from '../components/ui/dialog';
import { supabase } from '../lib/supabase';
import { toast } from 'sonner';
import {
  Users, Plus, Pencil, Trash2, UserPlus, UserMinus,
  BarChart3, BookOpen, ChevronDown, ChevronRight, Loader2,
  Lock, Link2Off, Video, PhoneOff,
} from 'lucide-react';
import { motion } from 'motion/react';

type Tab = 'students' | 'courses';

export function GroupsPage() {
  const { user, userRole, loading } = useAuth();
  const navigate = useNavigate();

  const [groups, setGroups] = useState<any[]>([]);
  const [expandedGroup, setExpandedGroup] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<Record<string, Tab>>({});
  const [members, setMembers] = useState<Record<string, any[]>>({});
  const [groupCourses, setGroupCourses] = useState<Record<string, any[]>>({});
  const [meetingStatus, setMeetingStatus] = useState<Record<string, any>>({});
  const [meetingLoading, setMeetingLoading] = useState<Record<string, boolean>>({});

  // Grade management
  const [gradeStudent, setGradeStudent] = useState<any | null>(null);
  const [studentGrades, setStudentGrades] = useState<any[]>([]);
  const [gradeForm, setGradeForm] = useState({ lessonId: '', courseId: '', grade: '', comment: '' });
  const [allCourses, setAllCourses] = useState<any[]>([]);
  const [courseLessons, setCourseLessons] = useState<any[]>([]);

  // Dialogs
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editGroup, setEditGroup] = useState<any>(null);
  const [groupForm, setGroupForm] = useState({ name: '', description: '' });
  const [addMemberGroupId, setAddMemberGroupId] = useState<string | null>(null);
  const [addMemberEmail, setAddMemberEmail] = useState('');

  // Assign course dialog
  const [assignCourseGroupId, setAssignCourseGroupId] = useState<string | null>(null);
  const [assignCourseId, setAssignCourseId] = useState('');

  useEffect(() => {
    if (!loading && (!user || (userRole !== 'teacher' && userRole !== 'superadmin'))) navigate('/dashboard');
  }, [user, userRole, loading, navigate]);

  useEffect(() => { if (user) { loadGroups(); loadAllCourses(); } }, [user]);

  // Poll meeting statuses every 15s for all loaded groups
  useEffect(() => {
    if (!groups.length) return;
    loadAllMeetingStatuses();
    const timer = setInterval(loadAllMeetingStatuses, 15000);
    return () => clearInterval(timer);
  }, [groups.length]);

  const getToken = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    return session?.access_token || null;
  };

  const loadGroups = async () => {
    const t = await getToken(); if (!t) return;
    const r = await fetch('/api/groups', { headers: { Authorization: `Bearer ${t}` } });
    const d = await r.json();
    setGroups(d.groups || []);
  };

  const loadAllMeetingStatuses = async () => {
    const t = await getToken(); if (!t) return;
    const statuses: Record<string, any> = {};
    await Promise.all(
      groups.map(async (g) => {
        try {
          const r = await fetch(`/api/groups/${g.id}/meeting`, { headers: { Authorization: `Bearer ${t}` } });
          if (r.ok) { const d = await r.json(); statuses[g.id] = d.meeting || null; }
          else statuses[g.id] = null;
        } catch { statuses[g.id] = null; }
      })
    );
    setMeetingStatus(statuses);
  };

  const handleStartMeeting = async (groupId: string) => {
    const t = await getToken(); if (!t) return;
    setMeetingLoading(p => ({ ...p, [groupId]: true }));
    try {
      const r = await fetch(`/api/groups/${groupId}/meeting`, {
        method: 'POST', headers: { Authorization: `Bearer ${t}` },
      });
      const d = await r.json();
      if (!r.ok) { toast.error(d.error); return; }
      toast.success('Урок начат! Ученики получили уведомление.');
      navigate(`/meeting/${groupId}`);
    } catch { toast.error('Ошибка'); }
    finally { setMeetingLoading(p => ({ ...p, [groupId]: false })); }
  };

  const handleEndMeeting = async (groupId: string) => {
    const t = await getToken(); if (!t) return;
    setMeetingLoading(p => ({ ...p, [groupId]: true }));
    try {
      await fetch(`/api/groups/${groupId}/meeting`, {
        method: 'DELETE', headers: { Authorization: `Bearer ${t}` },
      });
      toast.success('Урок завершён');
      setMeetingStatus(p => ({ ...p, [groupId]: null }));
    } catch { toast.error('Ошибка'); }
    finally { setMeetingLoading(p => ({ ...p, [groupId]: false })); }
  };

  const loadAllCourses = async () => {
    const t = await getToken(); if (!t) return;
    const r = await fetch('/api/courses', { headers: { Authorization: `Bearer ${t}` } });
    const d = await r.json();
    setAllCourses(d.courses || []);
  };

  const loadMembers = async (groupId: string) => {
    const t = await getToken(); if (!t) return;
    const r = await fetch(`/api/groups/${groupId}/members`, { headers: { Authorization: `Bearer ${t}` } });
    const d = await r.json();
    setMembers(prev => ({ ...prev, [groupId]: d.members || [] }));
  };

  const loadGroupCourses = async (groupId: string) => {
    const t = await getToken(); if (!t) return;
    const r = await fetch(`/api/groups/${groupId}/courses`, { headers: { Authorization: `Bearer ${t}` } });
    const d = await r.json();
    setGroupCourses(prev => ({ ...prev, [groupId]: d.courses || [] }));
  };

  const loadStudentGrades = async (studentId: string) => {
    const t = await getToken(); if (!t) return;
    const r = await fetch(`/api/teacher/students/${studentId}/grades`, { headers: { Authorization: `Bearer ${t}` } });
    const d = await r.json();
    setStudentGrades(d.grades || []);
  };

  const loadLessonsForCourse = async (courseId: string) => {
    const t = await getToken(); if (!t) return;
    const r = await fetch(`/api/courses/${courseId}`, { headers: { Authorization: `Bearer ${t}` } });
    const d = await r.json();
    setCourseLessons(d.lessons || []);
  };

  const handleExpand = (g: any) => {
    if (expandedGroup === g.id) {
      setExpandedGroup(null);
    } else {
      setExpandedGroup(g.id);
      const tab = activeTab[g.id] || 'students';
      if (tab === 'students') loadMembers(g.id);
      else loadGroupCourses(g.id);
    }
  };

  const handleTabChange = (groupId: string, tab: Tab) => {
    setActiveTab(prev => ({ ...prev, [groupId]: tab }));
    if (tab === 'students') loadMembers(groupId);
    else loadGroupCourses(groupId);
  };

  const handleCreateGroup = async (e: React.FormEvent) => {
    e.preventDefault();
    const t = await getToken(); if (!t) return;
    const r = await fetch('/api/groups', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${t}` },
      body: JSON.stringify(groupForm),
    });
    const d = await r.json();
    if (!r.ok) { toast.error(d.error); return; }
    toast.success('Класс создан');
    setIsCreateOpen(false);
    setGroupForm({ name: '', description: '' });
    loadGroups();
  };

  const handleEditGroup = async (e: React.FormEvent) => {
    e.preventDefault();
    const t = await getToken(); if (!t) return;
    const r = await fetch(`/api/groups/${editGroup.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${t}` },
      body: JSON.stringify(groupForm),
    });
    if (!r.ok) { toast.error('Ошибка'); return; }
    toast.success('Класс обновлён');
    setEditGroup(null);
    loadGroups();
  };

  const handleDeleteGroup = async (groupId: string) => {
    if (!confirm('Удалить класс? Все ученики будут откреплены.')) return;
    const t = await getToken(); if (!t) return;
    await fetch(`/api/groups/${groupId}`, { method: 'DELETE', headers: { Authorization: `Bearer ${t}` } });
    toast.success('Класс удалён');
    if (expandedGroup === groupId) setExpandedGroup(null);
    loadGroups();
  };

  const handleAddMember = async (e: React.FormEvent) => {
    e.preventDefault();
    const t = await getToken(); if (!t) return;
    const r = await fetch(`/api/groups/${addMemberGroupId}/members`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${t}` },
      body: JSON.stringify({ studentEmail: addMemberEmail }),
    });
    const d = await r.json();
    if (!r.ok) { toast.error(d.error); return; }
    toast.success('Ученик добавлен в класс');
    setAddMemberEmail('');
    setAddMemberGroupId(null);
    if (expandedGroup === addMemberGroupId) loadMembers(addMemberGroupId!);
    loadGroups();
  };

  const handleRemoveMember = async (groupId: string, studentId: string) => {
    const t = await getToken(); if (!t) return;
    await fetch(`/api/groups/${groupId}/members/${studentId}`, {
      method: 'DELETE', headers: { Authorization: `Bearer ${t}` },
    });
    toast.success('Ученик удалён из класса');
    loadMembers(groupId);
    loadGroups();
  };

  const handleAssignCourse = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!assignCourseId) return;
    const t = await getToken(); if (!t) return;
    const r = await fetch(`/api/groups/${assignCourseGroupId}/courses`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${t}` },
      body: JSON.stringify({ courseId: assignCourseId }),
    });
    const d = await r.json();
    if (!r.ok) { toast.error(d.error); return; }
    toast.success('Курс назначен классу. Ученики автоматически записаны.');
    setAssignCourseGroupId(null);
    setAssignCourseId('');
    if (expandedGroup === assignCourseGroupId) loadGroupCourses(assignCourseGroupId!);
  };

  const handleUnassignCourse = async (groupId: string, courseId: string) => {
    if (!confirm('Убрать курс из класса? Доступ учеников к этому курсу будет закрыт.')) return;
    const t = await getToken(); if (!t) return;
    const r = await fetch(`/api/groups/${groupId}/courses/${courseId}`, {
      method: 'DELETE', headers: { Authorization: `Bearer ${t}` },
    });
    if (!r.ok) { toast.error('Ошибка'); return; }
    toast.success('Курс убран из класса');
    loadGroupCourses(groupId);
  };

  const handleGradeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!gradeStudent) return;
    const t = await getToken(); if (!t) return;
    const r = await fetch('/api/manual-grades', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${t}` },
      body: JSON.stringify({
        studentId: gradeStudent.id,
        courseId: gradeForm.courseId || null,
        lessonId: gradeForm.lessonId || null,
        grade: Number(gradeForm.grade),
        comment: gradeForm.comment,
      }),
    });
    const d = await r.json();
    if (!r.ok) { toast.error(d.error); return; }
    toast.success('Оценка выставлена');
    setGradeForm({ lessonId: '', courseId: '', grade: '', comment: '' });
    loadStudentGrades(gradeStudent.id);
  };

  if (loading) return (
    <Layout>
      <div className="container mx-auto px-4 py-16 flex justify-center">
        <Loader2 className="w-6 h-6 animate-spin" />
      </div>
    </Layout>
  );

  // Courses not yet assigned to any group (for the dropdown)
  const getUnassignedCourses = (groupId: string) => {
    const assigned = new Set((groupCourses[groupId] || []).map((c: any) => c.id));
    return allCourses.filter(c => !assigned.has(c.id));
  };

  return (
    <Layout>
      <div className="container mx-auto px-4 py-8 max-w-5xl">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <Users className="w-5 h-5 text-muted-foreground" />
              <h1 className="text-2xl font-bold">Классы</h1>
            </div>
            <p className="text-sm text-muted-foreground">
              Создавайте классы, добавляйте учеников и назначайте индивидуальные курсы
            </p>
          </div>
          <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
            <DialogTrigger asChild>
              <Button size="sm" className="gap-1.5">
                <Plus className="w-4 h-4" /> Новый класс
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Создать класс</DialogTitle></DialogHeader>
              <GroupForm form={groupForm} setForm={setGroupForm} onSubmit={handleCreateGroup} submitLabel="Создать" />
            </DialogContent>
          </Dialog>
        </div>

        {/* Groups list */}
        {groups.length === 0 ? (
          <Card className="p-12 text-center">
            <Users className="w-10 h-10 mx-auto mb-3 text-muted-foreground/40" />
            <p className="font-medium mb-1">Классов пока нет</p>
            <p className="text-sm text-muted-foreground">Создайте первый класс и добавьте в него учеников</p>
          </Card>
        ) : (
          <div className="space-y-4">
            {groups.map((g, i) => {
              const tab = activeTab[g.id] || 'students';
              return (
                <motion.div key={g.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}>
                  <Card className="overflow-hidden">
                    {/* Class header */}
                    <div className="p-4 flex items-center gap-3">
                      <button
                        className="flex-1 flex items-center gap-3 text-left min-w-0"
                        onClick={() => handleExpand(g)}
                      >
                        <div className="w-9 h-9 rounded-lg bg-muted flex items-center justify-center flex-shrink-0">
                          <Users className="w-4 h-4 text-muted-foreground" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="font-semibold text-sm">{g.name}</p>
                            {meetingStatus[g.id] && (
                              <span className="flex items-center gap-1 text-xs text-green-500 font-medium">
                                <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                                В эфире
                              </span>
                            )}
                          </div>
                          {g.description && <p className="text-xs text-muted-foreground truncate">{g.description}</p>}
                        </div>
                        <Badge variant="secondary" className="text-xs flex-shrink-0">
                          {g.memberCount} уч.
                        </Badge>
                        {expandedGroup === g.id
                          ? <ChevronDown className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                          : <ChevronRight className="w-4 h-4 text-muted-foreground flex-shrink-0" />}
                      </button>
                      {/* Actions */}
                      <div className="flex items-center gap-1 flex-shrink-0">
                        {/* Meeting button */}
                        {meetingStatus[g.id] ? (
                          <div className="flex items-center gap-1">
                            <Link to={`/meeting/${g.id}`}>
                              <Button size="sm" variant="default" className="h-7 gap-1.5 text-xs bg-green-600 hover:bg-green-700">
                                <Video className="w-3.5 h-3.5" />
                                <span className="hidden sm:inline">Войти</span>
                              </Button>
                            </Link>
                            <Button
                              size="sm" variant="ghost"
                              className="h-7 w-7 p-0 text-destructive hover:text-destructive"
                              title="Завершить урок"
                              disabled={meetingLoading[g.id]}
                              onClick={() => handleEndMeeting(g.id)}
                            >
                              <PhoneOff className="w-3.5 h-3.5" />
                            </Button>
                          </div>
                        ) : (
                          <Button
                            size="sm" variant="outline"
                            className="h-7 gap-1.5 text-xs"
                            title="Начать онлайн-урок"
                            disabled={meetingLoading[g.id]}
                            onClick={() => handleStartMeeting(g.id)}
                          >
                            {meetingLoading[g.id]
                              ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                              : <Video className="w-3.5 h-3.5" />
                            }
                            <span className="hidden sm:inline">Урок</span>
                          </Button>
                        )}
                        <Button variant="ghost" size="icon" className="w-8 h-8" title="Добавить ученика"
                          onClick={() => setAddMemberGroupId(g.id)}>
                          <UserPlus className="w-3.5 h-3.5" />
                        </Button>
                        <Button variant="ghost" size="icon" className="w-8 h-8" title="Назначить курс"
                          onClick={() => { setAssignCourseGroupId(g.id); loadGroupCourses(g.id); }}>
                          <BookOpen className="w-3.5 h-3.5" />
                        </Button>
                        <Button variant="ghost" size="icon" className="w-8 h-8" title="Редактировать"
                          onClick={() => { setEditGroup(g); setGroupForm({ name: g.name, description: g.description || '' }); }}>
                          <Pencil className="w-3.5 h-3.5" />
                        </Button>
                        <Button variant="ghost" size="icon" className="w-8 h-8 text-destructive hover:text-destructive" title="Удалить"
                          onClick={() => handleDeleteGroup(g.id)}>
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </div>

                    {/* Expanded panel */}
                    {expandedGroup === g.id && (
                      <div className="border-t">
                        {/* Tabs */}
                        <div className="flex border-b">
                          <button
                            className={`px-4 py-2.5 text-sm font-medium flex items-center gap-1.5 border-b-2 transition-colors ${tab === 'students' ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'}`}
                            onClick={() => handleTabChange(g.id, 'students')}
                          >
                            <Users className="w-3.5 h-3.5" /> Ученики
                            {members[g.id] && (
                              <Badge variant="secondary" className="text-xs ml-1">{members[g.id].length}</Badge>
                            )}
                          </button>
                          <button
                            className={`px-4 py-2.5 text-sm font-medium flex items-center gap-1.5 border-b-2 transition-colors ${tab === 'courses' ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'}`}
                            onClick={() => handleTabChange(g.id, 'courses')}
                          >
                            <BookOpen className="w-3.5 h-3.5" /> Курсы класса
                            {groupCourses[g.id] && (
                              <Badge variant="secondary" className="text-xs ml-1">{groupCourses[g.id].length}</Badge>
                            )}
                          </button>
                        </div>

                        {/* Students tab */}
                        {tab === 'students' && (
                          <>
                            {!members[g.id] ? (
                              <div className="p-4 flex justify-center"><Loader2 className="w-4 h-4 animate-spin" /></div>
                            ) : members[g.id].length === 0 ? (
                              <div className="p-6 text-center">
                                <Users className="w-8 h-8 mx-auto mb-2 text-muted-foreground/40" />
                                <p className="text-sm text-muted-foreground">Нет учеников</p>
                                <Button size="sm" variant="outline" className="mt-3 gap-1.5"
                                  onClick={() => setAddMemberGroupId(g.id)}>
                                  <UserPlus className="w-3.5 h-3.5" /> Добавить ученика
                                </Button>
                              </div>
                            ) : (
                              <div className="divide-y">
                                {members[g.id].map(m => (
                                  <div key={m.id} className="flex items-center gap-3 px-4 py-3">
                                    <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center text-xs font-bold flex-shrink-0">
                                      {(m.user_metadata?.name || m.email || '?')[0].toUpperCase()}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                      <p className="text-sm font-medium truncate">{m.user_metadata?.name || m.email}</p>
                                      <p className="text-xs text-muted-foreground">{m.email}</p>
                                    </div>
                                    <div className="flex items-center gap-2 flex-shrink-0">
                                      <span className="text-xs text-muted-foreground">{m.completedLessons ?? 0} ур.</span>
                                      <Button variant="outline" size="sm" className="h-7 text-xs gap-1"
                                        onClick={() => { setGradeStudent(m); loadStudentGrades(m.id); }}>
                                        <BarChart3 className="w-3 h-3" /> Оценки
                                      </Button>
                                      <Button variant="ghost" size="icon" className="w-7 h-7 text-destructive hover:text-destructive"
                                        onClick={() => handleRemoveMember(g.id, m.id)}>
                                        <UserMinus className="w-3.5 h-3.5" />
                                      </Button>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            )}
                          </>
                        )}

                        {/* Courses tab */}
                        {tab === 'courses' && (
                          <>
                            {!groupCourses[g.id] ? (
                              <div className="p-4 flex justify-center"><Loader2 className="w-4 h-4 animate-spin" /></div>
                            ) : groupCourses[g.id].length === 0 ? (
                              <div className="p-6 text-center">
                                <BookOpen className="w-8 h-8 mx-auto mb-2 text-muted-foreground/40" />
                                <p className="text-sm text-muted-foreground mb-1">Нет назначенных курсов</p>
                                <p className="text-xs text-muted-foreground mb-3">
                                  Назначьте индивидуальный курс — ученики класса получат автоматический доступ
                                </p>
                                <Button size="sm" variant="outline" className="gap-1.5"
                                  onClick={() => setAssignCourseGroupId(g.id)}>
                                  <BookOpen className="w-3.5 h-3.5" /> Назначить курс
                                </Button>
                              </div>
                            ) : (
                              <div className="divide-y">
                                {groupCourses[g.id].map((c: any) => (
                                  <div key={c.id} className="flex items-center gap-3 px-4 py-3">
                                    <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                                      <Lock className="w-3.5 h-3.5 text-primary/70" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                      <Link to={`/course/${c.id}`} className="text-sm font-medium hover:underline truncate block">
                                        {c.title}
                                      </Link>
                                      <p className="text-xs text-muted-foreground">
                                        {c.lessonsCount || 0} уроков · Индивидуальный
                                      </p>
                                    </div>
                                    <Button variant="ghost" size="icon" className="w-7 h-7 text-destructive hover:text-destructive"
                                      title="Убрать курс из класса"
                                      onClick={() => handleUnassignCourse(g.id, c.id)}>
                                      <Link2Off className="w-3.5 h-3.5" />
                                    </Button>
                                  </div>
                                ))}
                                <div className="px-4 py-2">
                                  <Button size="sm" variant="ghost" className="gap-1.5 text-xs h-7"
                                    onClick={() => setAssignCourseGroupId(g.id)}>
                                    <Plus className="w-3 h-3" /> Добавить курс
                                  </Button>
                                </div>
                              </div>
                            )}
                          </>
                        )}
                      </div>
                    )}
                  </Card>
                </motion.div>
              );
            })}
          </div>
        )}

        {/* Edit group dialog */}
        <Dialog open={!!editGroup} onOpenChange={o => !o && setEditGroup(null)}>
          <DialogContent>
            <DialogHeader><DialogTitle>Редактировать класс</DialogTitle></DialogHeader>
            <GroupForm form={groupForm} setForm={setGroupForm} onSubmit={handleEditGroup} submitLabel="Сохранить" />
          </DialogContent>
        </Dialog>

        {/* Add member dialog */}
        <Dialog open={!!addMemberGroupId} onOpenChange={o => !o && setAddMemberGroupId(null)}>
          <DialogContent>
            <DialogHeader><DialogTitle>Добавить ученика в класс</DialogTitle></DialogHeader>
            <form onSubmit={handleAddMember} className="space-y-4">
              <div>
                <Label>Email ученика</Label>
                <Input type="email" value={addMemberEmail}
                  onChange={e => setAddMemberEmail(e.target.value)}
                  placeholder="student@example.com" required className="mt-1" />
              </div>
              <p className="text-xs text-muted-foreground">
                Ученик автоматически получит доступ ко всем курсам этого класса.
              </p>
              <Button type="submit" className="w-full">Добавить</Button>
            </form>
          </DialogContent>
        </Dialog>

        {/* Assign course dialog */}
        <Dialog open={!!assignCourseGroupId} onOpenChange={o => !o && setAssignCourseGroupId(null)}>
          <DialogContent>
            <DialogHeader><DialogTitle>Назначить курс классу</DialogTitle></DialogHeader>
            <form onSubmit={handleAssignCourse} className="space-y-4">
              <div>
                <Label>Выберите курс</Label>
                <select
                  className="w-full mt-1 text-sm border rounded-md px-3 py-2 bg-background"
                  value={assignCourseId}
                  onChange={e => setAssignCourseId(e.target.value)}
                  required
                >
                  <option value="">— выберите курс —</option>
                  {getUnassignedCourses(assignCourseGroupId || '').map(c => (
                    <option key={c.id} value={c.id}>
                      {c.isPrivate ? '🔒 ' : '🌐 '}{c.title}
                    </option>
                  ))}
                </select>
              </div>
              <div className="p-3 rounded-lg bg-muted/50 text-xs text-muted-foreground space-y-1">
                <p>· Курс автоматически станет индивидуальным (🔒)</p>
                <p>· Все текущие ученики класса получат доступ</p>
                <p>· Новые ученики будут добавляться автоматически</p>
              </div>
              <Button type="submit" className="w-full" disabled={!assignCourseId}>
                Назначить курс
              </Button>
            </form>
          </DialogContent>
        </Dialog>

        {/* Student grades dialog */}
        <Dialog open={!!gradeStudent} onOpenChange={o => !o && setGradeStudent(null)}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                Оценки: {gradeStudent?.user_metadata?.name || gradeStudent?.email}
              </DialogTitle>
            </DialogHeader>

            <form onSubmit={handleGradeSubmit} className="p-4 border rounded-lg space-y-3 bg-muted/30">
              <p className="text-sm font-medium">Выставить оценку</p>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs">Курс</Label>
                  <select
                    className="w-full mt-1 text-sm border rounded-md px-2 py-1.5 bg-background"
                    value={gradeForm.courseId}
                    onChange={e => { setGradeForm(f => ({ ...f, courseId: e.target.value, lessonId: '' })); loadLessonsForCourse(e.target.value); }}
                  >
                    <option value="">— выберите курс —</option>
                    {allCourses.map(c => <option key={c.id} value={c.id}>{c.title}</option>)}
                  </select>
                </div>
                <div>
                  <Label className="text-xs">Урок</Label>
                  <select
                    className="w-full mt-1 text-sm border rounded-md px-2 py-1.5 bg-background"
                    value={gradeForm.lessonId}
                    onChange={e => setGradeForm(f => ({ ...f, lessonId: e.target.value }))}
                  >
                    <option value="">— выберите урок —</option>
                    {courseLessons.map((l: any) => <option key={l.id} value={l.id}>{l.title}</option>)}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs">Оценка (0–100)</Label>
                  <Input type="number" min="0" max="100" value={gradeForm.grade}
                    onChange={e => setGradeForm(f => ({ ...f, grade: e.target.value }))}
                    required className="mt-1" />
                </div>
                <div>
                  <Label className="text-xs">Комментарий</Label>
                  <Input value={gradeForm.comment}
                    onChange={e => setGradeForm(f => ({ ...f, comment: e.target.value }))}
                    placeholder="Необязательно" className="mt-1" />
                </div>
              </div>
              <Button type="submit" size="sm" disabled={!gradeForm.grade}>Выставить оценку</Button>
            </form>

            <div>
              <p className="text-sm font-medium mb-3">История оценок</p>
              {studentGrades.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">Оценок пока нет</p>
              ) : (
                <div className="space-y-2">
                  {studentGrades.map(g => (
                    <div key={g.id} className="flex items-center justify-between p-3 border rounded-lg text-sm">
                      <div className="min-w-0 flex-1">
                        <p className="font-medium truncate">{g.lessonTitle || 'Урок'}</p>
                        <p className="text-xs text-muted-foreground truncate">{g.courseTitle}</p>
                        {g.feedback && <p className="text-xs text-muted-foreground mt-0.5 truncate">{g.feedback}</p>}
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0 ml-2">
                        <Badge variant={g.source === 'manual' ? 'outline' : 'secondary'} className="text-xs">
                          {g.source === 'manual' ? 'Ручная' : 'Авто'}
                        </Badge>
                        <span className={`font-bold ${g.grade >= 60 ? 'text-green-600 dark:text-green-400' : 'text-red-500'}`}>
                          {g.grade}/100
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </Layout>
  );
}

function GroupForm({ form, setForm, onSubmit, submitLabel }: any) {
  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div>
        <Label>Название класса</Label>
        <Input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })}
          placeholder="9А / Группа Python / Вторник 14:00" required className="mt-1" />
      </div>
      <div>
        <Label>Описание (необязательно)</Label>
        <Input value={form.description} onChange={e => setForm({ ...form, description: e.target.value })}
          placeholder="Описание класса" className="mt-1" />
      </div>
      <Button type="submit" className="w-full">{submitLabel}</Button>
    </form>
  );
}
