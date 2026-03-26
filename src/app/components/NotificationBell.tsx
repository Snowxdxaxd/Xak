import { useEffect, useState, useCallback } from 'react';
import { Bell, CheckCheck, TrendingUp, Star, Info } from 'lucide-react';
import { Button } from './ui/button';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuTrigger,
  DropdownMenuSeparator,
} from './ui/dropdown-menu';
import { Badge } from './ui/badge';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';

const TYPE_ICON: Record<string, React.ElementType> = {
  grade:          Star,
  achievement:    TrendingUp,
  parent_request: Bell,
  system:         Info,
};

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return 'только что';
  if (m < 60) return `${m} мин. назад`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h} ч. назад`;
  return `${Math.floor(h / 24)} д. назад`;
}

export function NotificationBell() {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<any[]>([]);
  const [unread, setUnread] = useState(0);
  const [open, setOpen] = useState(false);

  const load = useCallback(async () => {
    if (!user) return;
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) return;
      const res = await fetch('/api/notifications', {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      const d = await res.json();
      setNotifications(d.notifications || []);
      setUnread(d.unread || 0);
    } catch { }
  }, [user]);

  useEffect(() => { load(); }, [load]);

  // Poll every 30 seconds
  useEffect(() => {
    const t = setInterval(load, 30000);
    return () => clearInterval(t);
  }, [load]);

  const markAllRead = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) return;
      await fetch('/api/notifications/read-all', {
        method: 'PUT',
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      setUnread(0);
      setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    } catch { }
  };

  const handleOpen = (o: boolean) => {
    setOpen(o);
    if (o && unread > 0) {
      setTimeout(markAllRead, 1500);
    }
  };

  return (
    <DropdownMenu open={open} onOpenChange={handleOpen}>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="relative" aria-label="Уведомления">
          <Bell className="w-4 h-4" />
          {unread > 0 && (
            <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-foreground text-background text-[10px] rounded-full flex items-center justify-center font-bold">
              {unread > 9 ? '9+' : unread}
            </span>
          )}
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" className="w-80 max-h-[420px] flex flex-col">
        <div className="flex items-center justify-between px-3 py-2.5">
          <span className="font-semibold text-sm">Уведомления</span>
          {unread > 0 && (
            <Button variant="ghost" size="sm" className="h-6 text-xs gap-1" onClick={markAllRead}>
              <CheckCheck className="w-3 h-3" /> Прочитать все
            </Button>
          )}
        </div>
        <DropdownMenuSeparator />

        <div className="overflow-y-auto flex-1">
          {notifications.length === 0 ? (
            <div className="px-3 py-8 text-center text-sm text-muted-foreground">
              Нет уведомлений
            </div>
          ) : (
            notifications.map(n => {
              const Icon = TYPE_ICON[n.type] || Info;
              return (
                <div
                  key={n.id}
                  className={`px-3 py-3 border-b last:border-0 ${!n.read ? 'bg-muted/50' : ''}`}
                >
                  <div className="flex items-start gap-2.5">
                    <div className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 ${!n.read ? 'bg-foreground text-background' : 'bg-muted'}`}>
                      <Icon className="w-3.5 h-3.5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium leading-tight">{n.title}</p>
                      <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed line-clamp-2">{n.message}</p>
                      <p className="text-xs text-muted-foreground/60 mt-1">{timeAgo(n.createdAt)}</p>
                    </div>
                    {!n.read && <div className="w-1.5 h-1.5 rounded-full bg-foreground mt-1.5 flex-shrink-0" />}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
