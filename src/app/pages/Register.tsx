import { useState } from 'react';
import { Link, useNavigate } from 'react-router';
import { GraduationCap, ArrowLeft, User, Mail, Lock, ChevronRight, Loader2 } from 'lucide-react';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { ThemeToggle } from '../components/ThemeToggle';
import { api } from '../lib/supabase';
import { toast } from 'sonner';
import { motion } from 'motion/react';

const ROLES = [
  { value: 'student',  label: 'Ученик',        desc: '11–16 лет, изучаю программирование' },
  { value: 'teacher',  label: 'Преподаватель',  desc: 'Создаю курсы и проверяю задания' },
  { value: 'parent',   label: 'Родитель',       desc: 'Слежу за прогрессом ребёнка' },
] as const;

export function Register() {
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: '', password: '', name: '', role: 'student' as string });
  const [loading, setLoading] = useState(false);

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm(f => ({ ...f, [k]: e.target.value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) { toast.error('Введите имя'); return; }
    if (form.password.length < 6) { toast.error('Пароль минимум 6 символов'); return; }
    setLoading(true);
    try {
      const result = await api.signUp(form.email, form.password, { name: form.name, role: form.role });
      if (result.error) throw new Error(result.error);
      toast.success('Аккаунт создан! Войдите в систему.');
      navigate('/login');
    } catch (err: any) {
      toast.error(err.message || 'Ошибка регистрации');
    } finally { setLoading(false); }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
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
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-md"
        >
          <div className="mb-8">
            <h1 className="text-3xl font-bold tracking-tight mb-1">Создать аккаунт</h1>
            <p className="text-muted-foreground">Заполните данные для регистрации</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Name */}
            <div>
              <Label htmlFor="name" className="text-sm font-medium">Имя</Label>
              <div className="relative mt-1">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input id="name" type="text" value={form.name} onChange={set('name')}
                  placeholder="Ваше имя" required className="pl-9" />
              </div>
            </div>

            {/* Email */}
            <div>
              <Label htmlFor="email" className="text-sm font-medium">Email</Label>
              <div className="relative mt-1">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input id="email" type="email" value={form.email} onChange={set('email')}
                  placeholder="example@mail.com" required className="pl-9" />
              </div>
            </div>

            {/* Password */}
            <div>
              <Label htmlFor="password" className="text-sm font-medium">Пароль</Label>
              <div className="relative mt-1">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input id="password" type="password" value={form.password} onChange={set('password')}
                  placeholder="Минимум 6 символов" required minLength={6} className="pl-9" />
              </div>
            </div>

            {/* Role selector */}
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

            <Button type="submit" disabled={loading} className="w-full">
              {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              Зарегистрироваться
            </Button>
          </form>

          <p className="text-center mt-6 text-sm text-muted-foreground">
            Уже есть аккаунт?{' '}
            <Link to="/login" className="font-medium text-foreground hover:underline">
              Войти
            </Link>
          </p>
        </motion.div>
      </div>
    </div>
  );
}
