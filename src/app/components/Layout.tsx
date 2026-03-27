import React, { ReactNode, useRef, useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router';
import {
  LayoutDashboard, BookOpen, MessageCircle, Trophy,
  User, LogOut, Settings, GraduationCap, BarChart3, Users, Shield,
  Terminal, PieChart, Menu, X, ChevronDown,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { Button } from './ui/button';
import { ThemeToggle } from './ThemeToggle';
import { NotificationBell } from './NotificationBell';

interface LayoutProps { children: ReactNode }

export function Layout({ children }: LayoutProps) {
  const { user, userRole, signOut } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const isTeacher    = userRole === 'teacher';
  const isParent     = userRole === 'parent';
  const isSuperAdmin = userRole === 'superadmin';

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  useEffect(() => {
    setMenuOpen(false);
    setSidebarOpen(false);
  }, [location.pathname]);

  const navItems = isSuperAdmin
    ? [
        { icon: LayoutDashboard, label: 'Главная',     to: '/dashboard' },
        { icon: BookOpen,        label: 'Курсы',       to: '/courses' },
        { icon: Users,           label: 'Классы',      to: '/groups' },
        { icon: Terminal,        label: 'Компилятор',  to: '/playground' },
        { icon: Trophy,          label: 'Рейтинг',     to: '/leaderboard' },
        { icon: MessageCircle,   label: 'Чат',         to: '/messenger' },
      ]
    : isTeacher
    ? [
        { icon: LayoutDashboard, label: 'Главная',     to: '/dashboard' },
        { icon: PieChart,        label: 'Дашборд',     to: '/teacher-dashboard' },
        { icon: BookOpen,        label: 'Курсы',       to: '/courses' },
        { icon: Users,           label: 'Классы',      to: '/groups' },
        { icon: Terminal,        label: 'Компилятор',  to: '/playground' },
        { icon: MessageCircle,   label: 'Чат',         to: '/messenger' },
      ]
    : isParent
    ? [
        { icon: LayoutDashboard, label: 'Главная',     to: '/dashboard' },
        { icon: Users,           label: 'Мои ученики', to: '/parent-dashboard' },
        { icon: Terminal,        label: 'Компилятор',  to: '/playground' },
        { icon: MessageCircle,   label: 'Чат',         to: '/messenger' },
      ]
    : [
        { icon: LayoutDashboard, label: 'Главная',     to: '/dashboard' },
        { icon: BarChart3,       label: 'Оценки',      to: '/grades' },
        { icon: BookOpen,        label: 'Курсы',       to: '/courses' },
        { icon: Terminal,        label: 'Компилятор',  to: '/playground' },
        { icon: Trophy,          label: 'Рейтинг',     to: '/leaderboard' },
        { icon: MessageCircle,   label: 'Чат',         to: '/messenger' },
      ];

  const roleLabel = isSuperAdmin
    ? 'Главный администратор'
    : isTeacher ? 'Преподаватель'
    : isParent  ? 'Родитель'
    : 'Ученик';

  const menuItems = [
    ...(!isTeacher && !isSuperAdmin ? [{ icon: User, label: 'Мой профиль', to: '/profile' }] : []),
    { icon: Settings, label: 'Настройки', to: '/settings' },
    ...(isTeacher ? [{ icon: PieChart, label: 'Дашборд преподавателя', to: '/teacher-dashboard' }] : []),
    ...(isTeacher || isSuperAdmin ? [{ icon: GraduationCap, label: 'Проверить задания', to: '/admin' }] : []),
    ...(isSuperAdmin ? [{ icon: Shield, label: 'Панель администратора', to: '/admin' }] : []),
    ...(isParent ? [{ icon: Users, label: 'Мои ученики', to: '/parent-dashboard' }] : []),
  ];

  const NavLink = ({ item }: { item: typeof navItems[0] }) => {
    const active = location.pathname === item.to ||
      (item.to !== '/dashboard' && location.pathname.startsWith(item.to));
    return (
      <Link to={item.to}>
        <div className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors cursor-pointer
          ${active
            ? 'bg-primary text-primary-foreground'
            : 'text-muted-foreground hover:text-foreground hover:bg-accent'
          }`}
        >
          <item.icon className="w-4 h-4 flex-shrink-0" />
          <span>{item.label}</span>
        </div>
      </Link>
    );
  };

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      {/* ── Top header ── */}
      <header className="sticky top-0 z-40 border-b bg-background h-14 flex-shrink-0">
        <div className="flex items-center justify-between h-full px-4">
          {/* Left: hamburger (mobile) + logo */}
          <div className="flex items-center gap-3">
            <button
              className="lg:hidden p-1.5 rounded-md hover:bg-accent transition-colors"
              onClick={() => setSidebarOpen(v => !v)}
            >
              <Menu className="w-5 h-5" />
            </button>
            <Link to="/dashboard" className="flex items-center gap-2 font-semibold text-sm">
              <GraduationCap className="w-5 h-5" />
              <span>CodeKids</span>
            </Link>
          </div>

          {/* Right: utilities + user menu */}
          <div className="flex items-center gap-1">
            <ThemeToggle />
            <NotificationBell />

            <div className="relative" ref={menuRef}>
              <button
                onClick={() => setMenuOpen(v => !v)}
                className="flex items-center gap-1.5 px-2 py-1.5 rounded-md hover:bg-accent transition-colors text-sm"
              >
                <div className="w-7 h-7 rounded-full bg-muted flex items-center justify-center text-xs font-bold flex-shrink-0">
                  {(user?.user_metadata?.name || user?.email || '?')[0].toUpperCase()}
                </div>
                <span className="hidden sm:inline max-w-[100px] truncate font-medium">
                  {user?.user_metadata?.name || user?.email}
                </span>
                <ChevronDown className={`w-3 h-3 opacity-60 transition-transform ${menuOpen ? 'rotate-180' : ''}`} />
              </button>

              {menuOpen && (
                <div className="absolute right-0 top-full mt-1 w-56 bg-popover border rounded-md shadow-lg z-50 py-1 text-sm text-popover-foreground">
                  <div className="px-3 py-2 border-b">
                    <p className="font-medium truncate">{user?.user_metadata?.name || 'Пользователь'}</p>
                    <p className="text-xs text-muted-foreground truncate">{user?.email}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{roleLabel}</p>
                  </div>
                  {menuItems.map(item => (
                    <Link
                      key={item.to + item.label}
                      to={item.to}
                      className="flex items-center gap-2 px-3 py-2 hover:bg-accent transition-colors cursor-pointer"
                    >
                      <item.icon className="w-4 h-4 text-muted-foreground" />
                      {item.label}
                    </Link>
                  ))}
                  <div className="border-t mt-1 pt-1">
                    <button
                      onClick={async () => { setMenuOpen(false); await signOut(); navigate('/'); }}
                      className="flex items-center gap-2 px-3 py-2 hover:bg-accent transition-colors cursor-pointer w-full text-destructive text-left"
                    >
                      <LogOut className="w-4 h-4" />
                      Выйти
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* ── Body: sidebar + content ── */}
      <div className="flex flex-1 overflow-hidden">
        {/* Mobile sidebar overlay */}
        {sidebarOpen && (
          <div
            className="fixed inset-0 z-30 bg-black/40 lg:hidden"
            onClick={() => setSidebarOpen(false)}
          />
        )}

        {/* Sidebar */}
        <aside className={`
          fixed lg:static top-14 left-0 z-30 h-[calc(100vh-3.5rem)] lg:h-auto
          w-56 flex-shrink-0 border-r bg-background
          flex flex-col
          transition-transform duration-200
          ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
        `}>
          {/* Mobile close button */}
          <div className="flex items-center justify-between px-3 py-2 border-b lg:hidden">
            <span className="text-sm font-medium text-muted-foreground">Навигация</span>
            <button onClick={() => setSidebarOpen(false)} className="p-1 rounded hover:bg-accent">
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Nav items */}
          <nav className="flex-1 overflow-y-auto p-3 space-y-1">
            {navItems.map(item => (
              <NavLink key={item.to} item={item} />
            ))}
          </nav>

          {/* Bottom: role badge */}
          <div className="p-3 border-t">
            <div className="text-xs text-muted-foreground truncate">{roleLabel}</div>
            <div className="text-xs text-muted-foreground truncate">{user?.email}</div>
          </div>
        </aside>

        {/* Main content */}
        <main className="flex-1 overflow-y-auto min-w-0">
          {children}
        </main>
      </div>
    </div>
  );
}
