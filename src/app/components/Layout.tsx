import { ReactNode, useRef, useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router';
import {
  LayoutDashboard, BookOpen, MessageCircle, Trophy,
  User, LogOut, Settings, GraduationCap, BarChart3, Users,
  ChevronDown,
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
  const menuRef = useRef<HTMLDivElement>(null);

  const isTeacher = userRole === 'teacher';
  const isParent  = userRole === 'parent';

  // Close menu when clicking outside
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // Close menu on route change
  useEffect(() => { setMenuOpen(false); }, [location.pathname]);

  const navItems = isTeacher
    ? [
        { icon: LayoutDashboard, label: 'Главная',  to: '/dashboard' },
        { icon: BookOpen,        label: 'Курсы',    to: '/courses' },
        { icon: Users,           label: 'Группы',   to: '/groups' },
        { icon: MessageCircle,   label: 'Чат',      to: '/messenger' },
      ]
    : isParent
    ? [
        { icon: LayoutDashboard, label: 'Главная',   to: '/dashboard' },
        { icon: Users,           label: 'Ученики',   to: '/parent-dashboard' },
        { icon: MessageCircle,   label: 'Чат',       to: '/messenger' },
      ]
    : [
        { icon: LayoutDashboard, label: 'Главная',  to: '/dashboard' },
        { icon: BarChart3,       label: 'Оценки',   to: '/grades' },
        { icon: BookOpen,        label: 'Курсы',    to: '/courses' },
        { icon: Trophy,          label: 'Рейтинг',  to: '/leaderboard' },
        { icon: MessageCircle,   label: 'Чат',      to: '/messenger' },
      ];

  const roleLabel = isTeacher ? 'Преподаватель' : isParent ? 'Родитель' : 'Ученик';

  const menuItems = [
    ...(!isTeacher ? [{ icon: User, label: 'Мой профиль', to: '/profile' }] : []),
    { icon: Settings, label: 'Настройки', to: '/settings' },
    ...(isTeacher ? [{ icon: GraduationCap, label: 'Проверить задания', to: '/admin' }] : []),
    ...(isParent  ? [{ icon: Users, label: 'Мои ученики', to: '/parent-dashboard' }] : []),
  ];

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* header WITHOUT backdrop-blur to avoid stacking context bug with dropdowns */}
      <header className="sticky top-0 z-40 border-b bg-background">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between h-14">
            {/* Logo */}
            <Link to="/dashboard" className="flex items-center gap-2 font-semibold text-sm">
              <GraduationCap className="w-5 h-5" />
              <span className="hidden sm:inline">CodeKids</span>
            </Link>

            {/* Nav */}
            <nav className="flex items-center gap-0.5">
              {navItems.map(item => {
                const active = location.pathname.startsWith(item.to);
                return (
                  <Link key={item.to} to={item.to}>
                    <Button
                      variant={active ? 'secondary' : 'ghost'}
                      size="sm"
                      className="gap-1.5 text-sm"
                    >
                      <item.icon className="w-4 h-4" />
                      <span className="hidden md:inline">{item.label}</span>
                    </Button>
                  </Link>
                );
              })}
            </nav>

            {/* Right side */}
            <div className="flex items-center gap-1">
              <ThemeToggle />
              <NotificationBell />

              {/* Custom user menu — avoids Radix portal stacking context issues */}
              <div className="relative" ref={menuRef}>
                <button
                  onClick={() => setMenuOpen(v => !v)}
                  className="flex items-center gap-1.5 px-2 py-1.5 rounded-md hover:bg-accent transition-colors text-sm"
                >
                  <div className="w-7 h-7 rounded-full bg-muted flex items-center justify-center text-xs font-bold flex-shrink-0">
                    {(user?.user_metadata?.name || user?.email || '?')[0].toUpperCase()}
                  </div>
                  <span className="hidden sm:inline max-w-[90px] truncate font-medium">
                    {user?.user_metadata?.name || user?.email}
                  </span>
                  <ChevronDown className={`w-3 h-3 opacity-60 transition-transform ${menuOpen ? 'rotate-180' : ''}`} />
                </button>

                {menuOpen && (
                  <div className="absolute right-0 top-full mt-1 w-52 bg-popover border rounded-md shadow-lg z-50 py-1 text-sm text-popover-foreground">
                    {/* User info */}
                    <div className="px-3 py-2 border-b">
                      <p className="font-medium truncate">{user?.user_metadata?.name || 'Пользователь'}</p>
                      <p className="text-xs text-muted-foreground truncate">{user?.email}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">{roleLabel}</p>
                    </div>

                    {/* Menu items */}
                    {menuItems.map(item => (
                      <Link
                        key={item.to}
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
        </div>
      </header>

      <main>{children}</main>
    </div>
  );
}
