import { useState } from 'react';
import { Link, useNavigate } from 'react-router';
import {
  GraduationCap, ArrowLeft, User, Mail, Lock, ChevronRight,
  Loader2, ShieldCheck, RefreshCw,
} from 'lucide-react';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { ThemeToggle } from '../components/ThemeToggle';
import { api } from '../lib/supabase';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'motion/react';

const ROLES = [
  { value: 'student',  label: 'Ученик',        desc: '11–16 лет, изучаю программирование' },
  { value: 'teacher',  label: 'Преподаватель',  desc: 'Создаю курсы и проверяю задания' },
  { value: 'parent',   label: 'Родитель',       desc: 'Слежу за прогрессом ребёнка' },
] as const;

type Step = 'form' | 'verify';

export function Register() {
  const navigate = useNavigate();
  const [step, setStep] = useState<Step>('form');
  const [form, setForm] = useState({ email: '', password: '', name: '', role: 'student' as string });
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [sendingCode, setSendingCode] = useState(false);
  // devCode is returned by server when SMTP is not configured (dev mode)
  const [devCode, setDevCode] = useState<string | null>(null);
  const [smtpEnabled, setSmtpEnabled] = useState(true);

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm(f => ({ ...f, [k]: e.target.value }));

  const handleSendCode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) { toast.error('Введите имя'); return; }
    if (form.password.length < 6) { toast.error('Пароль минимум 6 символов'); return; }
    setSendingCode(true);
    try {
      const res = await fetch('/api/auth/send-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: form.email }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setStep('verify');
      if (data.devCode) {
        // SMTP not configured — code shown in dev mode
        setDevCode(data.devCode);
        setSmtpEnabled(false);
        toast.info(`Режим разработки: код ${data.devCode}`, { duration: 10000 });
      } else {
        setSmtpEnabled(true);
        toast.success('Код подтверждения отправлен на почту');
      }
    } catch (err: any) {
      // If send-code fails (SMTP table not ready etc), try direct signup
      if (err.message?.includes('relation') || err.message?.includes('500')) {
        await doSignup('');
      } else {
        toast.error(err.message || 'Ошибка отправки кода');
      }
    } finally { setSendingCode(false); }
  };

  const doSignup = async (verifyCode: string) => {
    setLoading(true);
    try {
      const result = await api.signUp(form.email, form.password, { name: form.name, role: form.role }, verifyCode);
      if (result.error) throw new Error(result.error);
      toast.success('Аккаунт создан! Войдите в систему.');
      navigate('/login');
    } catch (err: any) {
      toast.error(err.message || 'Ошибка регистрации');
    } finally { setLoading(false); }
  };

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    if (code.length !== 6) { toast.error('Введите 6-значный код'); return; }
    await doSignup(code);
  };

  const handleResend = async () => {
    setSendingCode(true);
    try {
      const res = await fetch('/api/auth/send-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: form.email }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      if (data.devCode) {
        setDevCode(data.devCode);
        toast.info(`Новый код: ${data.devCode}`, { duration: 10000 });
      } else {
        toast.success('Новый код отправлен');
      }
    } catch (err: any) { toast.error(err.message || 'Ошибка'); }
    finally { setSendingCode(false); }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="border-b h-14 flex items-center px-6 justify-between">
        <Link to="/" className="flex items-center gap-2 text-sm font-semibold">
          <GraduationCap className="w-4 h-4" /> CodeKids
        </Link>
        <div className="flex items-center gap-2">
          <ThemeToggle />
          <Link to="/login">
            <Button variant="ghost" size="sm">Войти</Button>
          </Link>
        </div>
      </header>

      <div className="flex-1 flex items-center justify-center p-4">
        <AnimatePresence mode="wait">
          {step === 'form' ? (
            <motion.div
              key="form"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -16 }}
              className="w-full max-w-md"
            >
              <div className="mb-8">
                <h1 className="text-3xl font-bold tracking-tight mb-1">Создать аккаунт</h1>
                <p className="text-muted-foreground">Заполните данные для регистрации</p>
              </div>

              <form onSubmit={handleSendCode} className="space-y-5">
                <div>
                  <Label htmlFor="name" className="text-sm font-medium">Имя</Label>
                  <div className="relative mt-1">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input id="name" type="text" value={form.name} onChange={set('name')}
                      placeholder="Ваше имя" required className="pl-9" />
                  </div>
                </div>

                <div>
                  <Label htmlFor="email" className="text-sm font-medium">Email</Label>
                  <div className="relative mt-1">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input id="email" type="email" value={form.email} onChange={set('email')}
                      placeholder="example@mail.com" required className="pl-9" />
                  </div>
                </div>

                <div>
                  <Label htmlFor="password" className="text-sm font-medium">Пароль</Label>
                  <div className="relative mt-1">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input id="password" type="password" value={form.password} onChange={set('password')}
                      placeholder="Минимум 6 символов" required minLength={6} className="pl-9" />
                  </div>
                </div>

                <div>
                  <Label className="text-sm font-medium">Роль</Label>
                  <div className="mt-2 space-y-2">
                    {ROLES.map(r => (
                      <button
                        key={r.value}
                        type="button"
                        onClick={() => setForm(f => ({ ...f, role: r.value }))}
                        className={`w-full flex items-center gap-3 p-3 rounded-lg border text-left transition-colors ${
                          form.role === r.value
                            ? 'border-foreground bg-foreground text-background'
                            : 'border-border hover:border-foreground/40 hover:bg-muted/50'
                        }`}
                      >
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium">{r.label}</p>
                          <p className={`text-xs mt-0.5 ${form.role === r.value ? 'text-background/70' : 'text-muted-foreground'}`}>
                            {r.desc}
                          </p>
                        </div>
                        {form.role === r.value && <ChevronRight className="w-4 h-4 flex-shrink-0" />}
                      </button>
                    ))}
                  </div>
                </div>

                <Button type="submit" disabled={sendingCode} className="w-full">
                  {sendingCode ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                  Далее — подтвердить email
                </Button>
              </form>

              <p className="text-center mt-6 text-sm text-muted-foreground">
                Уже есть аккаунт?{' '}
                <Link to="/login" className="font-medium text-foreground hover:underline">Войти</Link>
              </p>
            </motion.div>
          ) : (
            <motion.div
              key="verify"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -16 }}
              className="w-full max-w-md"
            >
              <button
                onClick={() => setStep('form')}
                className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-6 transition-colors"
              >
                <ArrowLeft className="w-4 h-4" /> Назад
              </button>

              <div className="mb-8">
                <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mb-4">
                  <ShieldCheck className="w-6 h-6 text-muted-foreground" />
                </div>
                <h1 className="text-3xl font-bold tracking-tight mb-1">Подтверждение email</h1>
                {smtpEnabled ? (
                  <p className="text-muted-foreground">
                    Мы отправили код на <span className="font-medium text-foreground">{form.email}</span>
                  </p>
                ) : (
                  <div className="p-3 rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900 mt-2">
                    <p className="text-sm text-amber-700 dark:text-amber-400">
                      Режим разработки — SMTP не настроен.{' '}
                      {devCode && <><br />Ваш код: <span className="font-bold font-mono text-lg">{devCode}</span></>}
                    </p>
                  </div>
                )}
              </div>

              <form onSubmit={handleVerify} className="space-y-5">
                <div>
                  <Label htmlFor="code" className="text-sm font-medium">Код из письма</Label>
                  <Input
                    id="code"
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]{6}"
                    maxLength={6}
                    value={code}
                    onChange={e => setCode(e.target.value.replace(/\D/g, ''))}
                    placeholder="000000"
                    required
                    className="mt-1 text-center text-2xl font-mono tracking-widest h-14"
                    autoFocus
                  />
                  <p className="text-xs text-muted-foreground mt-1.5">Введите 6-значный код · Действует 15 минут</p>
                </div>

                <Button type="submit" disabled={loading || code.length !== 6} className="w-full">
                  {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                  Подтвердить и создать аккаунт
                </Button>

                <div className="flex items-center justify-center gap-2 text-sm">
                  <span className="text-muted-foreground">Не получили код?</span>
                  <button
                    type="button"
                    onClick={handleResend}
                    disabled={sendingCode}
                    className="flex items-center gap-1 text-foreground hover:underline"
                  >
                    {sendingCode ? <Loader2 className="w-3 h-3 animate-spin" /> : <RefreshCw className="w-3 h-3" />}
                    Отправить снова
                  </button>
                </div>
              </form>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
