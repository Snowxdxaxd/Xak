import { useState } from 'react';
import { Link, useNavigate } from 'react-router';
import { GraduationCap, Mail, Lock, Loader2, Eye, EyeOff } from 'lucide-react';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { ThemeToggle } from '../components/ThemeToggle';
import { supabase } from '../lib/supabase';
import { useLanguage } from '../context/LanguageContext';
import { toast } from 'sonner';
import { motion } from 'motion/react';

export function Login() {
  const { t, lang, setLang } = useLanguage();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      toast.success(t('login_welcome'));
      navigate('/dashboard');
    } catch (err: any) {
      toast.error(err.message || t('login_error'));
    } finally { setLoading(false); }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="border-b h-14 flex items-center px-6 justify-between">
        <Link to="/" className="flex items-center gap-2 text-sm font-semibold">
          <GraduationCap className="w-4 h-4" /> CodeKids
        </Link>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setLang(lang === 'ru' ? 'en' : 'ru')}
            className="px-2 py-1 rounded text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
          >
            {lang === 'ru' ? 'EN' : 'RU'}
          </button>
          <ThemeToggle />
          <Link to="/register">
            <Button variant="ghost" size="sm">{t('login_register')}</Button>
          </Link>
        </div>
      </header>

      <div className="flex-1 flex items-center justify-center p-4">
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-sm">
          <div className="mb-8">
            <h1 className="text-3xl font-bold tracking-tight mb-1">{t('login_title')}</h1>
            <p className="text-muted-foreground">{t('login_subtitle')}</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="email" className="text-sm font-medium">Email</Label>
              <div className="relative mt-1">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input id="email" type="email" value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="example@mail.com" required className="pl-9" />
              </div>
            </div>

            <div>
              <Label htmlFor="password" className="text-sm font-medium">{t('login_password')}</Label>
              <div className="relative mt-1">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder={t('settings_pass_confirm_placeholder')}
                  required
                  className="pl-9 pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(v => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <Button type="submit" disabled={loading} className="w-full">
              {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              {t('login_btn')}
            </Button>
          </form>

          <p className="text-center mt-6 text-sm text-muted-foreground">
            {t('login_no_account')}{' '}
            <Link to="/register" className="font-medium text-foreground hover:underline">
              {t('login_register')}
            </Link>
          </p>
        </motion.div>
      </div>
    </div>
  );
}
