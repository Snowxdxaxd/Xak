import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router';
import { Layout } from '../components/Layout';
import { useAuth } from '../context/AuthContext';
import { Send, Users, Plus } from 'lucide-react';
import { Button } from '../components/ui/button';
import { Card } from '../components/ui/card';
import { Input } from '../components/ui/input';
import { ScrollArea } from '../components/ui/scroll-area';
import { api, supabase } from '../lib/supabase';
import { toast } from 'sonner';

export function Messenger() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [groups] = useState([
    { id: 'general', name: 'Общий чат', members: 0 },
    { id: 'python-basics', name: 'Python для начинающих', members: 0 },
    { id: 'javascript-help', name: 'Помощь по JavaScript', members: 0 },
  ]);
  const [selectedGroup, setSelectedGroup] = useState('general');
  const [messages, setMessages] = useState<any[]>([]);
  const [newMessage, setNewMessage] = useState('');

  useEffect(() => {
    if (!loading && !user) navigate('/login');
  }, [user, loading, navigate]);

  useEffect(() => {
    if (selectedGroup && user) {
      loadMessages();
      const interval = setInterval(loadMessages, 3000); // Poll every 3 seconds
      return () => clearInterval(interval);
    }
  }, [selectedGroup, user]);

  const loadMessages = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) return;

      const data = await api.getMessages(selectedGroup, session.access_token);
      setMessages(data.messages || []);
    } catch (error) {
      console.error('Error loading messages:', error);
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim()) return;

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) return;

      await api.sendMessage(selectedGroup, newMessage, session.access_token);
      setNewMessage('');
      loadMessages();
    } catch (error) {
      toast.error('Ошибка отправки сообщения');
    }
  };

  if (loading) {
    return (
      <Layout>
        <div className="container mx-auto px-4 py-16 text-center">
          <div className="animate-spin w-8 h-8 border-4 border-purple-600 border-t-transparent rounded-full mx-auto" />
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-4xl md:text-5xl font-bold mb-8">💬 Чат с учениками</h1>

        <div className="grid md:grid-cols-[300px_1fr] gap-6 h-[calc(100vh-250px)]">
          {/* Groups Sidebar */}
          <Card className="p-4">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold">Группы</h2>
              <Button size="icon" variant="ghost">
                <Plus className="w-5 h-5" />
              </Button>
            </div>
            <div className="space-y-2">
              {groups.map((group) => (
                <button
                  key={group.id}
                  onClick={() => setSelectedGroup(group.id)}
                  className={`w-full text-left p-3 rounded-lg transition-colors ${
                    selectedGroup === group.id
                      ? 'bg-purple-600 text-white'
                      : 'hover:bg-slate-100'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <Users className="w-5 h-5" />
                    <div className="flex-1">
                      <div className="font-medium">{group.name}</div>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </Card>

          {/* Chat Area */}
          <Card className="flex flex-col">
            <div className="p-4 border-b">
              <h2 className="text-xl font-bold">
                {groups.find((g) => g.id === selectedGroup)?.name}
              </h2>
            </div>

            <ScrollArea className="flex-1 p-4">
              <div className="space-y-4">
                {messages.map((message) => (
                  <div
                    key={message.id}
                    className={`flex ${message.userId === user?.id ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      className={`max-w-[70%] rounded-2xl p-4 ${
                        message.userId === user?.id
                          ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white'
                          : 'bg-slate-100'
                      }`}
                    >
                      {message.userId !== user?.id && (
                        <div className="text-sm font-medium mb-1 opacity-70">
                          {message.userName}
                        </div>
                      )}
                      <p>{message.text}</p>
                      <div className="text-xs mt-1 opacity-70">
                        {new Date(message.createdAt).toLocaleTimeString('ru-RU', {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </div>
                    </div>
                  </div>
                ))}
                {messages.length === 0 && (
                  <div className="text-center text-slate-400 py-12">
                    Пока нет сообщений. Начни общение!
                  </div>
                )}
              </div>
            </ScrollArea>

            <form onSubmit={handleSendMessage} className="p-4 border-t">
              <div className="flex gap-2">
                <Input
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  placeholder="Напиши сообщение..."
                  className="flex-1"
                />
                <Button type="submit" size="icon" disabled={!newMessage.trim()}>
                  <Send className="w-5 h-5" />
                </Button>
              </div>
            </form>
          </Card>
        </div>
      </div>
    </Layout>
  );
}
