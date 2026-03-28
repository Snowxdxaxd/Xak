import { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router';
import { Layout } from '../components/Layout';
import { useAuth } from '../context/AuthContext';
import {
  ArrowLeft, Star, Send, CheckCircle2, BookOpen,
  ClipboardList, HelpCircle, Plus, Trash2, Loader2, Volume2,
} from 'lucide-react';
import { Button } from '../components/ui/button';
import { Card } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Textarea } from '../components/ui/textarea';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Progress } from '../components/ui/progress';
import { api, supabase } from '../lib/supabase';
import { toast } from 'sonner';
import ReactMarkdown from 'react-markdown';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { AvatarPlayer } from '../components/AvatarPlayer';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';

export function LessonView() {
  const { id } = useParams();
  const { user, userRole, loading } = useAuth();
  const navigate = useNavigate();

  const [lesson, setLesson] = useState<any>(null);
  const [comments, setComments] = useState<any[]>([]);
  const [newComment, setNewComment] = useState('');
  const [rating, setRating] = useState(5);
  const [code, setCode] = useState('');
  const [completed, setCompleted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [lastResult, setLastResult] = useState<any>(null);

  // Quiz
  const [quizQuestions, setQuizQuestions] = useState<any[]>([]);
  const [quizAnswers, setQuizAnswers] = useState<Record<string, any>>({});
  const [quizResult, setQuizResult] = useState<any>(null);
  const [quizSubmitting, setQuizSubmitting] = useState(false);
  const [showQuiz, setShowQuiz] = useState(false);
  const [lessonMode, setLessonMode] = useState<'text' | 'avatar'>('text');

  // Teacher: add quiz question
  const [newQ, setNewQ] = useState({ question: '', type: 'single', options: ['', '', '', ''], correctAnswer: '', points: 10 });
  const [showAddQ, setShowAddQ] = useState(false);

  useEffect(() => { if (!loading && !user) navigate('/login'); }, [user, loading, navigate]);
  useEffect(() => { if (id) { loadLesson(); loadComments(); checkCompleted(); loadQuiz(); } }, [id]);

  const getToken = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    return session?.access_token || null;
  };

  const loadLesson   = async () => { const d = await api.getLesson(id!); setLesson(d); };
  const loadComments = async () => { const d = await api.getComments(id!); setComments(d.comments || []); };

  const checkCompleted = async () => {
    const t = await getToken(); if (!t) return;
    const r = await fetch(`/api/lessons/${id}/completed`, { headers: { Authorization: `Bearer ${t}` } });
    const d = await r.json();
    setCompleted(d.completed || false);
  };

  const loadQuiz = async () => {
    const r = await fetch(`/api/lessons/${id}/quiz`);
    const d = await r.json();
    setQuizQuestions(d.questions || []);
  };

  const handleCompleteLesson = async () => {
    const t = await getToken(); if (!t) return;
    const r = await fetch(`/api/lessons/${id}/complete`, { method: 'POST', headers: { Authorization: `Bearer ${t}` } });
    const d = await r.json();
    if (!r.ok) { toast.error(d.error); return; }
    if (d.alreadyCompleted) { toast.info('Урок уже пройден'); return; }
    setCompleted(true);
    toast.success(`Урок завершён! +${d.xpGained} XP`);
  };

  const handleSubmitCode = async () => {
    if (!code.trim()) { toast.error('Введи код'); return; }
    setSubmitting(true);
    try {
      const t = await getToken(); if (!t) return;
      const r = await fetch('/api/submissions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${t}` },
        body: JSON.stringify({ lessonId: id, courseId: lesson?.courseId, code }),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error);
      setLastResult(d.submission);
      if (d.submission.status === 'passed') toast.success('Задание выполнено правильно!');
      else if (d.submission.status === 'failed') toast.error(d.submission.feedback || 'Неверно. Попробуй ещё раз.');
      else toast.info('Задание отправлено на проверку преподавателю');
    } catch (err: any) { toast.error(err.message); }
    finally { setSubmitting(false); }
  };

  const handleSubmitQuiz = async () => {
    if (!quizQuestions.length) return;
    setQuizSubmitting(true);
    try {
      const t = await getToken(); if (!t) return;
      const r = await fetch(`/api/lessons/${id}/quiz-attempt`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${t}` },
        body: JSON.stringify({ answers: quizAnswers }),
      });
      const d = await r.json();
      setQuizResult(d);
      toast.success(`Результат: ${d.score}/${d.maxScore} (${d.percentage}%)`);
    } catch { toast.error('Ошибка'); }
    finally { setQuizSubmitting(false); }
  };

  const handleAddQuestion = async () => {
    const t = await getToken(); if (!t) return;
    const opts = newQ.options.filter(o => o.trim());
    const r = await fetch(`/api/lessons/${id}/quiz`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${t}` },
      body: JSON.stringify({
        question: newQ.question,
        type: newQ.type,
        options: opts,
        correctAnswer: newQ.correctAnswer,
        points: newQ.points,
      }),
    });
    if (!r.ok) { toast.error('Ошибка'); return; }
    toast.success('Вопрос добавлен');
    setNewQ({ question: '', type: 'single', options: ['', '', '', ''], correctAnswer: '', points: 10 });
    setShowAddQ(false);
    loadQuiz();
  };

  const handleDeleteQuestion = async (qId: string) => {
    const t = await getToken(); if (!t) return;
    await fetch(`/api/lessons/${id}/quiz/${qId}`, { method: 'DELETE', headers: { Authorization: `Bearer ${t}` } });
    loadQuiz();
  };

  const handleAddComment = async () => {
    if (!newComment.trim()) return;
    const t = await getToken(); if (!t) return;
    await api.addComment(id!, newComment, rating, t);
    setNewComment(''); setRating(5);
    toast.success('Комментарий добавлен');
    loadComments();
  };

  if (loading || !lesson) return (
    <Layout>
      <div className="container mx-auto px-4 py-16 flex justify-center">
        <div className="animate-spin w-6 h-6 border-2 border-foreground border-t-transparent rounded-full" />
      </div>
    </Layout>
  );

  const isTeacher = userRole === 'teacher' || userRole === 'superadmin';
  const backUrl = lesson.courseId ? `/course/${lesson.courseId}` : '/courses';

  return (
    <Layout>
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <Link to={backUrl} className="inline-flex items-center gap-1.5 text-muted-foreground hover:text-foreground text-sm mb-6">
          <ArrowLeft className="w-4 h-4" /> Назад к курсу
        </Link>

        <div className="flex items-start justify-between mb-6">
          <h1 className="text-3xl font-bold leading-tight">{lesson.title}</h1>
          {completed && <Badge className="flex items-center gap-1.5 flex-shrink-0 mt-1"><CheckCircle2 className="w-3.5 h-3.5" /> Пройден</Badge>}
        </div>

        {/* Learning mode toggle */}
        <div className="flex items-center gap-1 p-1 bg-muted rounded-full mb-6 w-fit">
          <button
            onClick={() => setLessonMode('text')}
            className={`flex items-center gap-1.5 px-4 py-1.5 rounded-full text-sm font-medium transition-all ${
              lessonMode === 'text'
                ? 'bg-background text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <BookOpen className="w-3.5 h-3.5" /> Текст
          </button>
          <button
            onClick={() => setLessonMode('avatar')}
            className={`flex items-center gap-1.5 px-4 py-1.5 rounded-full text-sm font-medium transition-all ${
              lessonMode === 'avatar'
                ? 'bg-gradient-to-r from-purple-600 to-fuchsia-500 text-white shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <Volume2 className="w-3.5 h-3.5" /> Озвучка с Кирой ✦
          </button>
        </div>

        {/* Content */}
        <Card className="p-8 mb-6">
          {lessonMode === 'text' ? (
            <>
              <div className="flex items-center gap-2 mb-5">
                <BookOpen className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm font-medium text-muted-foreground">Материал урока</span>
              </div>
              <div className="prose prose-sm dark:prose-invert max-w-none">
                <ReactMarkdown
                  components={{
                    code({ node, inline, className, children, ...props }: any) {
                      const match = /language-(\w+)/.exec(className || '');
                      return !inline && match ? (
                        <SyntaxHighlighter style={vscDarkPlus} language={match[1]} PreTag="div" {...props}>
                          {String(children).replace(/\n$/, '')}
                        </SyntaxHighlighter>
                      ) : (
                        <code className={className} {...props}>{children}</code>
                      );
                    },
                  }}
                >
                  {lesson.content || '*Содержимое урока не добавлено*'}
                </ReactMarkdown>
              </div>
            </>
          ) : (
            <AvatarPlayer content={lesson.content || ''} lessonTitle={lesson.title} />
          )}
        </Card>

        {/* Quiz section */}
        {(quizQuestions.length > 0 || isTeacher) && (
          <Card className="p-6 mb-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <HelpCircle className="w-4 h-4 text-muted-foreground" />
                <span className="font-semibold">Тест</span>
                <Badge variant="secondary" className="text-xs">{quizQuestions.length} вопросов</Badge>
              </div>
              {isTeacher && (
                <Button variant="outline" size="sm" className="gap-1.5" onClick={() => setShowAddQ(!showAddQ)}>
                  <Plus className="w-3.5 h-3.5" /> Добавить вопрос
                </Button>
              )}
            </div>

            {/* Teacher: add question form */}
            {isTeacher && showAddQ && (
              <div className="p-4 border rounded-lg mb-4 space-y-3 bg-muted/30">
                <div>
                  <Label className="text-sm">Вопрос</Label>
                  <Input value={newQ.question} onChange={e => setNewQ(q => ({ ...q, question: e.target.value }))}
                    placeholder="Что такое переменная?" className="mt-1" />
                </div>
                <div>
                  <Label className="text-sm">Варианты ответов (по одному в строке)</Label>
                  {newQ.options.map((o, i) => (
                    <Input key={i} value={o} className="mt-1"
                      placeholder={`Вариант ${i + 1}`}
                      onChange={e => setNewQ(q => ({ ...q, options: q.options.map((op, j) => j === i ? e.target.value : op) }))} />
                  ))}
                </div>
                <div>
                  <Label className="text-sm">Правильный ответ (точно как в вариантах)</Label>
                  <Input value={newQ.correctAnswer}
                    onChange={e => setNewQ(q => ({ ...q, correctAnswer: e.target.value }))}
                    placeholder="Контейнер для хранения данных" className="mt-1" />
                </div>
                <div className="flex items-center gap-2">
                  <Label className="text-sm">Баллы:</Label>
                  <Input type="number" value={newQ.points} min="1" max="100" className="w-20"
                    onChange={e => setNewQ(q => ({ ...q, points: Number(e.target.value) }))} />
                </div>
                <Button size="sm" onClick={handleAddQuestion} disabled={!newQ.question || !newQ.correctAnswer}>
                  Добавить
                </Button>
              </div>
            )}

            {/* Teacher: list questions */}
            {isTeacher && quizQuestions.length > 0 && (
              <div className="space-y-2 mb-4">
                {quizQuestions.map((q, i) => (
                  <div key={q.id} className="flex items-center justify-between p-3 border rounded-lg text-sm">
                    <span className="flex-1 truncate"><span className="font-medium text-muted-foreground mr-2">{i+1}.</span>{q.question}</span>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <Badge variant="outline" className="text-xs">{q.points} б.</Badge>
                      <Button variant="ghost" size="icon" className="w-7 h-7 text-destructive hover:text-destructive"
                        onClick={() => handleDeleteQuestion(q.id)}>
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Student: quiz */}
            {!isTeacher && quizQuestions.length > 0 && !quizResult && (
              <>
                {!showQuiz ? (
                  <Button variant="outline" onClick={() => setShowQuiz(true)}>Пройти тест</Button>
                ) : (
                  <div className="space-y-5">
                    {quizQuestions.map((q, i) => (
                      <div key={q.id}>
                        <p className="text-sm font-medium mb-2"><span className="text-muted-foreground mr-1">{i+1}.</span>{q.question}</p>
                        {q.options && q.options.length > 0 ? (
                          <div className="space-y-1.5">
                            {q.options.map((opt: string) => (
                              <button key={opt} type="button"
                                onClick={() => setQuizAnswers(a => ({ ...a, [q.id]: opt }))}
                                className={`w-full text-left text-sm px-3 py-2 rounded-md border transition-colors ${
                                  quizAnswers[q.id] === opt
                                    ? 'border-foreground bg-foreground text-background'
                                    : 'border-border hover:border-foreground/40'
                                }`}>
                                {opt}
                              </button>
                            ))}
                          </div>
                        ) : (
                          <Input placeholder="Ваш ответ" value={quizAnswers[q.id] || ''}
                            onChange={e => setQuizAnswers(a => ({ ...a, [q.id]: e.target.value }))} />
                        )}
                      </div>
                    ))}
                    <Button onClick={handleSubmitQuiz} disabled={quizSubmitting} className="w-full gap-2">
                      {quizSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                      Отправить ответы
                    </Button>
                  </div>
                )}
              </>
            )}

            {/* Quiz result */}
            {!isTeacher && quizResult && (
              <div className={`p-4 rounded-lg ${quizResult.percentage >= 60 ? 'bg-green-50 dark:bg-green-950/40 border border-green-200 dark:border-green-900' : 'bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900'}`}>
                <p className="font-semibold mb-1">
                  {quizResult.percentage >= 60 ? 'Тест пройден!' : 'Попробуй ещё раз'}
                </p>
                <p className="text-sm text-muted-foreground mb-2">{quizResult.score} / {quizResult.maxScore} баллов ({quizResult.percentage}%)</p>
                <Progress value={quizResult.percentage} className="h-2" />
              </div>
            )}
          </Card>
        )}

        {/* Assignment — only for students */}
        {lesson.hasAssignment && !isTeacher && (
          <Card className="p-6 mb-6">
            <div className="flex items-center gap-2 mb-4">
              <ClipboardList className="w-4 h-4 text-muted-foreground" />
              <span className="font-semibold">Практическое задание</span>
              <Badge variant="outline" className="text-xs">
                {lesson.checkMode === 'auto' ? 'Автопроверка' : 'Ручная проверка'}
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground mb-4">Напиши код и отправь на проверку.</p>
            <Textarea value={code} onChange={e => setCode(e.target.value)}
              placeholder="# Напиши свой код здесь" rows={8} className="font-mono text-sm mb-4" />
            {lastResult && (
              <div className={`p-3 rounded-lg mb-4 text-sm border ${
                lastResult.status === 'passed' ? 'bg-green-50 dark:bg-green-950/40 border-green-200 dark:border-green-900 text-green-700 dark:text-green-300'
                : lastResult.status === 'failed' ? 'bg-red-50 dark:bg-red-950/40 border-red-200 dark:border-red-900 text-red-700 dark:text-red-300'
                : 'bg-muted border-border'
              }`}>
                {lastResult.status === 'passed' && <CheckCircle2 className="w-4 h-4 inline mr-2" />}
                <strong>{lastResult.status === 'passed' ? 'Верно!' : lastResult.status === 'failed' ? 'Неверно' : 'Отправлено'}</strong>
                {lastResult.feedback && ` — ${lastResult.feedback}`}
                {lastResult.grade != null && ` (${lastResult.grade}/100)`}
              </div>
            )}
            <Button onClick={handleSubmitCode} disabled={submitting || !code.trim()} className="w-full gap-2">
              {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              Отправить на проверку
            </Button>
          </Card>
        )}

        {/* Complete button — only for students */}
        {!isTeacher && (
          <div className="mb-6">
            <Button onClick={handleCompleteLesson} disabled={completed} size="lg"
              className="w-full gap-2" variant={completed ? 'secondary' : 'default'}>
              <CheckCircle2 className="w-5 h-5" />
              {completed ? 'Урок пройден' : 'Завершить урок (+50 XP)'}
            </Button>
          </div>
        )}

        {/* Comments */}
        <Card className="p-6">
          <h2 className="font-semibold mb-4 flex items-center gap-2">
            <Send className="w-4 h-4 text-muted-foreground" /> Комментарии
          </h2>
          <div className="mb-6">
            <div className="flex items-center gap-2 mb-3">
              <span className="text-sm text-muted-foreground">Оценка урока:</span>
              <div className="flex gap-0.5">
                {[1,2,3,4,5].map(star => (
                  <button key={star} onClick={() => setRating(star)}>
                    <Star className={`w-5 h-5 ${star <= rating ? 'fill-amber-400 text-amber-400' : 'text-muted-foreground/30'}`} />
                  </button>
                ))}
              </div>
            </div>
            <Textarea value={newComment} onChange={e => setNewComment(e.target.value)}
              placeholder="Напишите комментарий..." rows={3} className="mb-3" />
            <Button onClick={handleAddComment} disabled={!newComment.trim()} size="sm" className="gap-1.5">
              <Send className="w-3.5 h-3.5" /> Отправить
            </Button>
          </div>
          <div className="space-y-4">
            {comments.map(c => (
              <div key={c.id} className="border-b pb-4 last:border-0">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm font-medium">{c.userName}</span>
                  <div className="flex gap-0.5">
                    {[...Array(c.rating)].map((_,i) => (
                      <Star key={i} className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                    ))}
                  </div>
                </div>
                <p className="text-sm text-muted-foreground">{c.text}</p>
                <p className="text-xs text-muted-foreground/60 mt-1">{new Date(c.createdAt).toLocaleDateString('ru-RU')}</p>
              </div>
            ))}
            {comments.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-6">Пока нет комментариев</p>
            )}
          </div>
        </Card>
      </div>
    </Layout>
  );
}
