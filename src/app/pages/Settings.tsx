import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router';
import { Layout } from '../components/Layout';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { Card } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Badge } from '../components/ui/badge';
import { supabase } from '../lib/supabase';
import { toast } from 'sonner';
import {
  Settings as SettingsIcon, Lock, Mail, LogOut,
  UserCheck, UserX, Link2, Loader2, User, Globe, Eye, EyeOff,
} from 'lucide-react';

export function Settings() {
  const { user, userRole, signOut, loading, refreshUser } = useAuth();
  const { t, lang, setLang } = useLanguage();
  const navigate = useNavigate();

  const [nameForm, setNameForm]   = useState({ name: '' });
  const [emailForm, setEmailForm] = useState({ newEmail: '', password: '' });
  const [passForm, setPassForm]   = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
  const [nameLoading, setNameLoading]   = useState(false);
  const [emailLoading, setEmailLoading] = useState(false);
  const [passLoading, setPassLoading]   = useState(false);

  // Password visibility toggles
  const [showEmailPass, setShowEmailPass]     = useState(false);
  const [showCurrentPass, setShowCurrentPass] = useState(false);
  const [showNewPass, setShowNewPass]         = useState(false);
  const [showConfirmPass, setShowConfirmPass] = useState(false);

  // Parent: send request
  const [studentEmail, setStudentEmail] = useState('');
  const [linkLoading, setLinkLoading]   = useState(false);

  // Student: pending parent requests
  const [parentRequests, setParentRequests] = useState<any[]>([]);

  useEffect(() => { if (!loading && !user) navigate('/login'); }, [user, loading, navigate]);
  useEffect(() => {
    if (user) {
      setNameForm({ name: user.user_metadata?.name || '' });
      if (userRole === 'student') loadParentRequests();
    }
  }, [user, userRole]);

  const getToken = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    return session?.access_token || null;
  };

  const loadParentRequests = async () => {
    try {
      const t = await getToken(); if (!t) return;
      const res = await fetch('/api/student/parents', { headers: { Authorization: `Bearer ${t}` } });
      const d = await res.json();
      setParentRequests(d.parents || []);
    } catch { }
  };

  const handleChangeName = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nameForm.name.trim()) { toast.error(t('settings_name_empty')); return; }
    setNameLoading(true);
    try {
      const tk = await getToken();
      if (!tk) { toast.error('Необходима авторизация'); return; }
      const res = await fetch('/api/auth/update-name', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${tk}` },
        body: JSON.stringify({ name: nameForm.name.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      refreshUser(data.token, data.user);
      toast.success(t('settings_name_saved'));
    } catch (err: any) {
      toast.error(err.message || t('error'));
    } finally { setNameLoading(false); }
  };

  const handleChangeEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    setEmailLoading(true);
    try {
      const tk = await getToken();
      if (!tk) { toast.error('Необходима авторизация'); return; }
      const res = await fetch('/api/auth/change-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${tk}` },
        body: JSON.stringify(emailForm),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      refreshUser(data.token, data.user);
      toast.success(t('settings_email_saved'));
      setEmailForm({ newEmail: '', password: '' });
    } catch (err: any) {
      toast.error(err.message || t('error'));
    } finally { setEmailLoading(false); }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (passForm.newPassword !== passForm.confirmPassword) { toast.error(t('settings_pass_mismatch')); return; }
    if (passForm.newPassword.length < 6) { toast.error(t('settings_pass_short')); return; }
    setPassLoading(true);
    try {
      const tk = await getToken();
      if (!tk) { toast.error('Необходима авторизация'); return; }
      const res = await fetch('/api/auth/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${tk}` },
        body: JSON.stringify({ currentPassword: passForm.currentPassword, newPassword: passForm.newPassword }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      toast.success(t('settings_pass_saved'));
      setPassForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
    } catch (err: any) {
      toast.error(err.message || t('error'));
    } finally { setPassLoading(false); }
  };

  const handleSendParentRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    setLinkLoading(true);
    try {
      const tk = await getToken();
      if (!tk) return;
      const res = await fetch('/api/parent/request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${tk}` },
        body: JSON.stringify({ studentEmail }),
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error);
      toast.success('Запрос отправлен. Ученик должен подтвердить привязку.');
      setStudentEmail('');
    } catch (err: any) { toast.error(err.message || t('error')); }
    finally { setLinkLoading(false); }
  };

  const handleAcceptLink = async (linkId: string) => {
    try {
      const tk = await getToken(); if (!tk) return;
      const res = await fetch(`/api/parent/request/${linkId}/accept`, {
        method: 'PUT', headers: { Authorization: `Bearer ${tk}` },
      });
      if (!res.ok) throw new Error();
      toast.success('Привязка подтверждена');
      loadParentRequests();
    } catch { toast.error(t('error')); }
  };

  const handleRejectLink = async (linkId: string) => {
    try {
      const tk = await getToken(); if (!tk) return;
      await fetch(`/api/parent/request/${linkId}/reject`, {
        method: 'PUT', headers: { Authorization: `Bearer ${tk}` },
      });
      toast.success('Запрос отклонён');
      loadParentRequests();
    } catch { toast.error(t('error')); }
  };

  if (loading) return (
    <Layout>
      <div className="container mx-auto px-4 py-16 flex justify-center">
        <Loader2 className="w-6 h-6 animate-spin" />
      </div>
    </Layout>
  );

  const roleLabel = userRole === 'superadmin'
    ? t('role_superadmin') : userRole === 'teacher'
    ? t('role_teacher') : userRole === 'parent'
    ? t('role_parent') : t('role_student');

  return (
    <Layout>
      <div className="container mx-auto px-4 py-8 max-w-2xl">
        <div className="flex items-center gap-3 mb-8">
          <SettingsIcon className="w-5 h-5 text-muted-foreground" />
          <h1 className="text-2xl font-bold">{t('settings_title')}</h1>
        </div>

        {/* Account info */}
        <Card className="p-5 mb-4">
          <p className="text-xs text-muted-foreground mb-2">{t('settings_account')}</p>
          <p className="font-semibold">{user?.user_metadata?.name}</p>
          <p className="text-sm text-muted-foreground">{user?.email}</p>
          <Badge variant="secondary" className="mt-1 text-xs">{roleLabel}</Badge>
        </Card>

        {/* Change Name */}
        <Card className="p-6 mb-4">
          <div className="flex items-center gap-2 mb-4">
            <User className="w-4 h-4 text-muted-foreground" />
            <h2 className="font-semibold">{t('settings_change_name')}</h2>
          </div>
          <form onSubmit={handleChangeName} className="flex gap-2">
            <Input
              value={nameForm.name}
              onChange={e => setNameForm({ name: e.target.value })}
              placeholder={t('settings_new_name')}
              className="flex-1"
              required
            />
            <Button type="submit" disabled={nameLoading} size="sm" className="flex-shrink-0">
              {nameLoading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              {t('settings_save_name')}
            </Button>
          </form>
        </Card>

        {/* Language */}
        <Card className="p-6 mb-4">
          <div className="flex items-center gap-2 mb-3">
            <Globe className="w-4 h-4 text-muted-foreground" />
            <h2 className="font-semibold">{t('settings_language')}</h2>
          </div>
          <div className="flex gap-2">
            <Button
              variant={lang === 'ru' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setLang('ru')}
            >
              🇷🇺 Русский
            </Button>
            <Button
              variant={lang === 'en' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setLang('en')}
            >
              🇬🇧 English
            </Button>
          </div>
        </Card>

        {/* Change Email */}
        <Card className="p-6 mb-4">
          <div className="flex items-center gap-2 mb-4">
            <Mail className="w-4 h-4 text-muted-foreground" />
            <h2 className="font-semibold">{t('settings_change_email')}</h2>
          </div>
          <form onSubmit={handleChangeEmail} className="space-y-3">
            <div>
              <Label htmlFor="newEmail" className="text-sm">{t('settings_new_email')}</Label>
              <Input id="newEmail" type="email" value={emailForm.newEmail}
                onChange={e => setEmailForm({ ...emailForm, newEmail: e.target.value })}
                placeholder="новый@email.com" required className="mt-1" />
            </div>
            <div>
              <Label htmlFor="emailPassword" className="text-sm">{t('settings_current_password')}</Label>
              <div className="relative mt-1">
                <Input
                  id="emailPassword"
                  type={showEmailPass ? 'text' : 'password'}
                  value={emailForm.password}
                  onChange={e => setEmailForm({ ...emailForm, password: e.target.value })}
                  required
                  className="pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowEmailPass(v => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  tabIndex={-1}
                >
                  {showEmailPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
            <Button type="submit" disabled={emailLoading} size="sm">
              {emailLoading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              {t('settings_save_email')}
            </Button>
          </form>
        </Card>

        {/* Change Password */}
        <Card className="p-6 mb-4">
          <div className="flex items-center gap-2 mb-4">
            <Lock className="w-4 h-4 text-muted-foreground" />
            <h2 className="font-semibold">{t('settings_change_password')}</h2>
          </div>
          <form onSubmit={handleChangePassword} className="space-y-3">
            <div>
              <Label htmlFor="currentPassword" className="text-sm">{t('settings_current_password')}</Label>
              <div className="relative mt-1">
                <Input
                  id="currentPassword"
                  type={showCurrentPass ? 'text' : 'password'}
                  value={passForm.currentPassword}
                  onChange={e => setPassForm({ ...passForm, currentPassword: e.target.value })}
                  required
                  className="pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowCurrentPass(v => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  tabIndex={-1}
                >
                  {showCurrentPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
            <div>
              <Label htmlFor="newPassword" className="text-sm">{t('settings_new_password')}</Label>
              <div className="relative mt-1">
                <Input
                  id="newPassword"
                  type={showNewPass ? 'text' : 'password'}
                  value={passForm.newPassword}
                  onChange={e => setPassForm({ ...passForm, newPassword: e.target.value })}
                  placeholder={t('settings_pass_new_placeholder')}
                  required
                  className="pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowNewPass(v => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  tabIndex={-1}
                >
                  {showNewPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
            <div>
              <Label htmlFor="confirmPassword" className="text-sm">{t('settings_confirm_password')}</Label>
              <div className="relative mt-1">
                <Input
                  id="confirmPassword"
                  type={showConfirmPass ? 'text' : 'password'}
                  value={passForm.confirmPassword}
                  onChange={e => setPassForm({ ...passForm, confirmPassword: e.target.value })}
                  placeholder={t('settings_pass_confirm_placeholder')}
                  required
                  className="pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPass(v => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  tabIndex={-1}
                >
                  {showConfirmPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
            <Button type="submit" disabled={passLoading} size="sm">
              {passLoading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              {t('settings_change_pass_btn')}
            </Button>
          </form>
        </Card>

        {/* Parent: link to student */}
        {userRole === 'parent' && (
          <Card className="p-6 mb-4">
            <div className="flex items-center gap-2 mb-4">
              <Link2 className="w-4 h-4 text-muted-foreground" />
              <h2 className="font-semibold">{t('settings_link_student')}</h2>
            </div>
            <p className="text-sm text-muted-foreground mb-3">{t('settings_link_student_desc')}</p>
            <form onSubmit={handleSendParentRequest} className="flex gap-2">
              <Input type="email" value={studentEmail}
                onChange={e => setStudentEmail(e.target.value)}
                placeholder="email ученика" required />
              <Button type="submit" disabled={linkLoading} size="sm" className="flex-shrink-0">
                {linkLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : t('settings_send')}
              </Button>
            </form>
          </Card>
        )}

        {/* Student: pending parent requests */}
        {userRole === 'student' && parentRequests.length > 0 && (
          <Card className="p-6 mb-4">
            <div className="flex items-center gap-2 mb-4">
              <Link2 className="w-4 h-4 text-muted-foreground" />
              <h2 className="font-semibold">{t('settings_parent_links')}</h2>
            </div>
            <div className="space-y-3">
              {parentRequests.map((p) => (
                <div key={p.linkId} className="flex items-center justify-between p-3 border rounded-lg">
                  <div>
                    <p className="text-sm font-medium">{p.user_metadata?.name || p.email}</p>
                    <p className="text-xs text-muted-foreground">{p.email}</p>
                  </div>
                  {p.status === 'pending' ? (
                    <div className="flex gap-2">
                      <Button size="sm" variant="outline" onClick={() => handleAcceptLink(p.linkId)}>
                        <UserCheck className="w-3.5 h-3.5 mr-1" /> {t('settings_accept')}
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => handleRejectLink(p.linkId)}
                        className="text-destructive hover:text-destructive">
                        <UserX className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  ) : (
                    <Badge variant={p.status === 'accepted' ? 'default' : 'secondary'} className="text-xs">
                      {p.status === 'accepted' ? t('settings_accepted') : t('settings_rejected')}
                    </Badge>
                  )}
                </div>
              ))}
            </div>
          </Card>
        )}

        {/* Logout */}
        <Card className="p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-sm">{t('settings_logout')}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{t('settings_logout_desc')}</p>
            </div>
            <Button variant="destructive" size="sm" onClick={async () => { await signOut(); navigate('/'); }}>
              <LogOut className="w-4 h-4 mr-2" /> {t('settings_logout_btn')}
            </Button>
          </div>
        </Card>
      </div>
    </Layout>
  );
}
