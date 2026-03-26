import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router';
import { Layout } from '../components/Layout';
import { useAuth } from '../context/AuthContext';
import { Trophy, TrendingUp, Crown, Medal } from 'lucide-react';
import { Card } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Progress } from '../components/ui/progress';
import { api } from '../lib/supabase';
import { motion } from 'motion/react';

export function Leaderboard() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [leaderboard, setLeaderboard] = useState<any[]>([]);

  useEffect(() => { if (!loading && !user) navigate('/login'); }, [user, loading, navigate]);
  useEffect(() => { loadLeaderboard(); }, []);

  const loadLeaderboard = async () => {
    try {
      const data = await api.getLeaderboard();
      setLeaderboard(data.leaderboard || []);
    } catch { }
  };

  if (loading) return (
    <Layout>
      <div className="container mx-auto px-4 py-16 flex justify-center">
        <div className="animate-spin w-6 h-6 border-2 border-foreground border-t-transparent rounded-full" />
      </div>
    </Layout>
  );

  const medalIcon = (i: number) => {
    if (i === 0) return <Crown className="w-5 h-5 text-amber-400" />;
    if (i === 1) return <Medal className="w-5 h-5 text-slate-400" />;
    if (i === 2) return <Medal className="w-5 h-5 text-orange-600" />;
    return <span className="text-sm font-bold text-muted-foreground w-5 text-center">{i + 1}</span>;
  };

  // Find current user position
  const myIndex = leaderboard.findIndex(e => e.userId === user?.id);

  return (
    <Layout>
      <div className="container mx-auto px-4 py-8 max-w-3xl">
        <div className="flex items-center gap-3 mb-8">
          <Trophy className="w-5 h-5 text-muted-foreground" />
          <h1 className="text-2xl font-bold">Таблица лидеров</h1>
        </div>

        {myIndex >= 0 && (
          <Card className="p-4 mb-6 border-dashed flex items-center gap-4">
            <span className="text-sm text-muted-foreground">Ваше место</span>
            <span className="font-bold text-lg">#{myIndex + 1}</span>
            <span className="text-sm text-muted-foreground">из {leaderboard.length} учеников</span>
          </Card>
        )}

        {leaderboard.length === 0 ? (
          <Card className="p-10 text-center">
            <TrendingUp className="w-10 h-10 mx-auto mb-3 text-muted-foreground/40" />
            <p className="font-medium mb-1">Рейтинг формируется</p>
            <p className="text-sm text-muted-foreground">Проходи уроки — появишься в таблице!</p>
          </Card>
        ) : (
          <div className="space-y-2">
            {leaderboard.slice(0, 50).map((entry, i) => {
              const isMe = entry.userId === user?.id;
              return (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.03 }}
                >
                  <Card className={`p-4 ${isMe ? 'border-foreground' : ''}`}>
                    <div className="flex items-center gap-4">
                      <div className="w-8 flex items-center justify-center flex-shrink-0">
                        {medalIcon(i)}
                      </div>

                      <div className="w-9 h-9 rounded-full bg-muted flex items-center justify-center text-sm font-bold flex-shrink-0">
                        {(entry.userName || '?')[0].toUpperCase()}
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-sm truncate">
                            {entry.userName || `Ученик #${i + 1}`}
                          </span>
                          {isMe && <Badge variant="outline" className="text-xs py-0">Вы</Badge>}
                        </div>
                        <p className="text-xs text-muted-foreground mt-0.5">{entry.completedLessons} уроков пройдено</p>
                      </div>

                      <div className="text-right flex-shrink-0">
                        <div className="text-base font-bold">{entry.xp} XP</div>
                        <div className="text-xs text-muted-foreground">Ур. {entry.level}</div>
                      </div>
                    </div>

                    {i < 3 && entry.xpToNextLevel && (
                      <div className="mt-3 ml-[4.25rem]">
                        <Progress value={Math.round((entry.xp / (entry.xp + 100)) * 100)} className="h-1" />
                      </div>
                    )}
                  </Card>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>
    </Layout>
  );
}
