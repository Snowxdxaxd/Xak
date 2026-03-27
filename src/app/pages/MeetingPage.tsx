import React, { useEffect, useRef, useState, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import { Button } from '../components/ui/button';
import { GraduationCap, Video, VideoOff, PhoneOff, Users, Loader2, AlertCircle, ArrowLeft } from 'lucide-react';
import { motion } from 'motion/react';

declare global {
  interface Window {
    JitsiMeetExternalAPI: any;
  }
}

export function MeetingPage() {
  const { groupId } = useParams<{ groupId: string }>();
  const { user, userRole, loading: authLoading } = useAuth();
  const navigate = useNavigate();

  const jitsiContainerRef = useRef<HTMLDivElement>(null);
  const jitsiApiRef = useRef<any>(null);

  const [meeting, setMeeting] = useState<any>(null);
  const [group, setGroup] = useState<any>(null);
  const [pageState, setPageState] = useState<'loading' | 'no-meeting' | 'connecting' | 'active' | 'error'>('loading');
  const [errorMsg, setErrorMsg] = useState('');
  const [participantCount, setParticipantCount] = useState(0);

  const isTeacher = userRole === 'teacher' || userRole === 'superadmin';

  const getToken = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    return session?.access_token || null;
  };

  const loadMeeting = useCallback(async () => {
    try {
      const t = await getToken();
      if (!t) { navigate('/login'); return; }

      const res = await fetch(`/api/groups/${groupId}/meeting`, {
        headers: { Authorization: `Bearer ${t}` },
      });
      const d = await res.json();

      if (!res.ok) {
        setErrorMsg(d.error || 'Нет доступа к этому уроку');
        setPageState('error');
        return;
      }

      setGroup(d.group);

      if (d.meeting) {
        setMeeting(d.meeting);
        setPageState('connecting');
        loadJitsiScript(d.meeting.roomId);
      } else {
        setPageState('no-meeting');
      }
    } catch {
      setErrorMsg('Ошибка подключения к серверу');
      setPageState('error');
    }
  }, [groupId]);

  const loadJitsiScript = (roomId: string) => {
    if (window.JitsiMeetExternalAPI) {
      initJitsi(roomId);
      return;
    }
    const existing = document.getElementById('jitsi-api-script');
    if (existing) {
      existing.addEventListener('load', () => initJitsi(roomId));
      return;
    }
    const script = document.createElement('script');
    script.id = 'jitsi-api-script';
    script.src = 'https://meet.jit.si/external_api.js';
    script.async = true;
    script.onload = () => initJitsi(roomId);
    script.onerror = () => {
      setErrorMsg('Не удалось загрузить Jitsi. Проверьте подключение к интернету.');
      setPageState('error');
    };
    document.head.appendChild(script);
  };

  const initJitsi = (roomId: string) => {
    if (!jitsiContainerRef.current || jitsiApiRef.current) return;

    const displayName = user?.user_metadata?.name || user?.email || 'Участник';

    jitsiApiRef.current = new window.JitsiMeetExternalAPI('meet.jit.si', {
      roomName: roomId,
      parentNode: jitsiContainerRef.current,
      width: '100%',
      height: '100%',
      userInfo: {
        displayName,
        email: user?.email,
      },
      configOverwrite: {
        startWithAudioMuted: !isTeacher,
        startWithVideoMuted: false,
        disableDeepLinking: true,
        prejoinPageEnabled: false,
        disableInviteFunctions: true,
        enableClosePage: false,
        requireDisplayName: false,
        // Disable lobby / moderator waiting
        enableLobbyChat: false,
        hiddenPremeetingButtons: ['invite'],
        // Start immediately without waiting for moderator
        startAsMuted: 0,
        toolbarButtons: [
          'microphone', 'camera', 'closedcaptions', 'desktop', 'fullscreen',
          'fodeviceselection', 'hangup', 'chat', 'raisehand',
          'videoquality', 'tileview', 'participants-pane',
        ],
      },
      interfaceConfigOverwrite: {
        SHOW_JITSI_WATERMARK: false,
        SHOW_WATERMARK_FOR_GUESTS: false,
        SHOW_BRAND_WATERMARK: false,
        DEFAULT_REMOTE_DISPLAY_NAME: 'Участник',
        TOOLBAR_ALWAYS_VISIBLE: false,
        MOBILE_APP_PROMO: false,
      },
    });

    // Show Jitsi UI immediately — don't wait for videoConferenceJoined
    // so the teacher can interact with the "I am the host" button if needed
    setPageState('active');

    jitsiApiRef.current.addEventListener('videoConferenceJoined', () => {
      setPageState('active');
      setParticipantCount(jitsiApiRef.current?.getNumberOfParticipants?.() || 0);
    });

    jitsiApiRef.current.addEventListener('participantJoined', () => {
      setParticipantCount(jitsiApiRef.current?.getNumberOfParticipants?.() || 0);
    });

    jitsiApiRef.current.addEventListener('participantLeft', () => {
      setParticipantCount(jitsiApiRef.current?.getNumberOfParticipants?.() || 0);
    });

    jitsiApiRef.current.addEventListener('readyToClose', () => {
      handleLeave();
    });
  };

  const handleLeave = useCallback(() => {
    if (jitsiApiRef.current) {
      jitsiApiRef.current.dispose();
      jitsiApiRef.current = null;
    }
    navigate('/groups');
  }, [navigate]);

  const handleEndMeeting = async () => {
    try {
      const t = await getToken();
      if (t) {
        await fetch(`/api/groups/${groupId}/meeting`, {
          method: 'DELETE',
          headers: { Authorization: `Bearer ${t}` },
        });
      }
    } catch {}
    handleLeave();
  };

  const handleStartMeeting = async () => {
    try {
      const t = await getToken();
      if (!t) return;
      setPageState('loading');
      const res = await fetch(`/api/groups/${groupId}/meeting`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${t}` },
      });
      const d = await res.json();
      if (!res.ok) { setErrorMsg(d.error); setPageState('error'); return; }
      setMeeting({ roomId: d.roomId });
      setPageState('connecting');
      loadJitsiScript(d.roomId);
    } catch {
      setErrorMsg('Ошибка при создании урока');
      setPageState('error');
    }
  };

  useEffect(() => {
    if (!authLoading && !user) { navigate('/login'); return; }
    if (!authLoading && user) loadMeeting();
  }, [authLoading, user]);

  // Poll for meeting start (student waiting)
  useEffect(() => {
    if (pageState !== 'no-meeting' || isTeacher) return;
    const timer = setInterval(loadMeeting, 10000);
    return () => clearInterval(timer);
  }, [pageState, isTeacher, loadMeeting]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (jitsiApiRef.current) {
        jitsiApiRef.current.dispose();
        jitsiApiRef.current = null;
      }
    };
  }, []);

  if (authLoading) return <FullscreenSpinner />;

  return (
    <div className="h-screen flex flex-col bg-black text-white overflow-hidden">
      {/* ── Top bar ── */}
      <div className="flex items-center justify-between px-4 h-12 bg-background border-b flex-shrink-0 text-foreground">
        <div className="flex items-center gap-3">
          <Link to="/groups" className="text-muted-foreground hover:text-foreground transition-colors">
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <GraduationCap className="w-4 h-4 text-primary" />
          <span className="font-semibold text-sm">
            {group?.name || 'Онлайн-урок'}
          </span>
          {pageState === 'active' && (
            <>
              <div className="flex items-center gap-1.5 ml-2">
                <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                <span className="text-xs text-green-500 font-medium">В эфире</span>
              </div>
              {participantCount > 0 && (
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Users className="w-3 h-3" />
                  {participantCount}
                </div>
              )}
            </>
          )}
        </div>

        <div className="flex items-center gap-2">
          {pageState === 'active' && isTeacher && (
            <Button
              variant="destructive" size="sm" className="h-7 gap-1.5 text-xs"
              onClick={handleEndMeeting}
            >
              <PhoneOff className="w-3.5 h-3.5" /> Завершить урок
            </Button>
          )}
          {pageState === 'active' && !isTeacher && (
            <Button
              variant="outline" size="sm" className="h-7 gap-1.5 text-xs"
              onClick={handleLeave}
            >
              <PhoneOff className="w-3.5 h-3.5" /> Покинуть урок
            </Button>
          )}
        </div>
      </div>

      {/* ── Main area ── */}
      <div className="flex-1 relative overflow-hidden">
        {/* Jitsi container — always mounted so it can initialize */}
        <div
          ref={jitsiContainerRef}
          className={`absolute inset-0 ${pageState === 'active' || pageState === 'connecting' ? 'block' : 'hidden'}`}
        />

        {/* Overlay states */}
        {pageState === 'loading' && <FullscreenSpinner />}

        {pageState === 'connecting' && (
          // Transparent, non-blocking spinner in corner while Jitsi loads its own UI
          <div className="absolute bottom-6 right-6 z-10 pointer-events-none">
            <div className="flex items-center gap-2 bg-black/60 text-white text-xs px-3 py-2 rounded-full backdrop-blur-sm">
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
              Подключение...
            </div>
          </div>
        )}

        {pageState === 'no-meeting' && (
          <div className="absolute inset-0 flex items-center justify-center bg-background">
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-center max-w-sm px-6"
            >
              {isTeacher ? (
                <>
                  <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-6">
                    <Video className="w-8 h-8 text-primary" />
                  </div>
                  <h2 className="text-xl font-bold mb-2">Начать онлайн-урок</h2>
                  <p className="text-muted-foreground text-sm mb-6">
                    Нажмите кнопку, чтобы открыть видеоконференцию. Ученики получат уведомление и смогут присоединиться.
                  </p>
                  <Button size="lg" className="gap-2 w-full" onClick={handleStartMeeting}>
                    <Video className="w-4 h-4" /> Начать урок
                  </Button>
                  <p className="text-xs text-muted-foreground mt-4">
                    Используется meet.jit.si — требуется доступ к интернету
                  </p>
                </>
              ) : (
                <>
                  <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center mx-auto mb-6">
                    <VideoOff className="w-8 h-8 text-muted-foreground" />
                  </div>
                  <h2 className="text-xl font-bold mb-2">Урок ещё не начался</h2>
                  <p className="text-muted-foreground text-sm mb-6">
                    Преподаватель скоро начнёт урок. Страница обновится автоматически.
                  </p>
                  <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Ожидание...
                  </div>
                  <Button variant="ghost" size="sm" className="mt-4" onClick={() => navigate('/dashboard')}>
                    Вернуться на главную
                  </Button>
                </>
              )}
            </motion.div>
          </div>
        )}

        {pageState === 'error' && (
          <div className="absolute inset-0 flex items-center justify-center bg-background">
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-center max-w-sm px-6"
            >
              <div className="w-16 h-16 rounded-2xl bg-destructive/10 flex items-center justify-center mx-auto mb-6">
                <AlertCircle className="w-8 h-8 text-destructive" />
              </div>
              <h2 className="text-xl font-bold mb-2">Ошибка</h2>
              <p className="text-muted-foreground text-sm mb-6">{errorMsg}</p>
              <div className="flex gap-3 justify-center">
                <Button variant="outline" onClick={() => { setErrorMsg(''); setPageState('loading'); loadMeeting(); }}>
                  Повторить
                </Button>
                <Button onClick={() => navigate('/groups')}>
                  К классам
                </Button>
              </div>
            </motion.div>
          </div>
        )}
      </div>
    </div>
  );
}

function FullscreenSpinner() {
  return (
    <div className="absolute inset-0 flex items-center justify-center bg-background">
      <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
    </div>
  );
}
