import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router';
import { Layout } from '../components/Layout';
import { useAuth } from '../context/AuthContext';
import { Send, Users, Plus, Pencil, Trash2, Copy, Reply, Check, X, MessageSquarePlus } from 'lucide-react';
import { Button } from '../components/ui/button';
import { Card } from '../components/ui/card';
import { Input } from '../components/ui/input';
import { ScrollArea } from '../components/ui/scroll-area';
import { api, supabase } from '../lib/supabase';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '../components/ui/dialog';
import { Textarea } from '../components/ui/textarea';

export function Messenger() {
  const { user, userRole, loading } = useAuth();
  const navigate = useNavigate();
  const [groups, setGroups] = useState<any[]>([]);
  const [selectedGroup, setSelectedGroup] = useState('general');
  const [messages, setMessages] = useState<any[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingText, setEditingText] = useState('');
  const [replyTo, setReplyTo] = useState<any | null>(null);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [groupForm, setGroupForm] = useState({ name: '', description: '' });

  useEffect(() => {
    if (!loading && !user) navigate('/login');
  }, [user, loading, navigate]);

  useEffect(() => {
    if (user) loadGroups();
  }, [user]);

  useEffect(() => {
    if (selectedGroup && user) {
      loadMessages();
      const interval = setInterval(loadMessages, 3000); // Poll every 3 seconds
      return () => clearInterval(interval);
    }
  }, [selectedGroup, user]);

  const getToken = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    return session?.access_token || null;
  };

  const loadGroups = async () => {
    try {
      const t = await getToken();
      if (!t) return;
      const res = await fetch('/api/groups', { headers: { Authorization: `Bearer ${t}` } });
      const d = await res.json();
      const all = (d.groups || []).map((g: any) => ({ id: g.id, name: g.name, memberCount: Number(g.memberCount || 0) }));
      setGroups(all);
      if (all.length === 0) {
        setSelectedGroup('');
        setMessages([]);
      } else if (!all.find((g: any) => g.id === selectedGroup)) {
        setSelectedGroup(all[0].id);
      }
    } catch {
      setGroups([]);
    }
  };

  const loadMessages = async () => {
    try {
      const t = await getToken();
      if (!t) return;
      const data = await api.getMessages(selectedGroup, t);
      setMessages(data.messages || []);
    } catch {
      setMessages([]);
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !selectedGroup) return;

    try {
      const t = await getToken();
      if (!t) return;
      const payload = replyTo ? `↪ ${replyTo.userName}: ${replyTo.text}\n${newMessage}` : newMessage;
      await api.sendMessage(selectedGroup, payload, t);
      setNewMessage('');
      setReplyTo(null);
      loadMessages();
    } catch (error) {
      toast.error('Ошибка отправки сообщения');
    }
  };

  const handleEditMessage = async (messageId: string) => {
    if (!editingText.trim()) return;
    try {
      const t = await getToken();
      if (!t) return;
      await api.editMessage(messageId, editingText, t);
      setEditingId(null);
      setEditingText('');
      loadMessages();
      toast.success('Сообщение изменено');
    } catch {
      toast.error('Нельзя изменить это сообщение');
    }
  };

  const handleDeleteMessage = async (messageId: string) => {
    if (!confirm('Удалить сообщение?')) return;
    try {
      const t = await getToken();
      if (!t) return;
      await api.deleteMessage(messageId, t);
      loadMessages();
      toast.success('Сообщение удалено');
    } catch {
      toast.error('Нельзя удалить это сообщение');
    }
  };

  const handleCreateGroup = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const t = await getToken();
      if (!t) return;
      const r = await fetch('/api/groups', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${t}` },
        body: JSON.stringify(groupForm),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || 'Ошибка');
      toast.success('Чат создан');
      setGroupForm({ name: '', description: '' });
      setIsCreateOpen(false);
      await loadGroups();
      setSelectedGroup(d.group.id);
    } catch (err: any) {
      toast.error(err.message || 'Только преподаватель/админ может создавать чаты');
    }
  };

  const canCreateChat = userRole === 'teacher' || userRole === 'superadmin';
  const canModerateAll = userRole === 'superadmin';

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
        <h1 className="text-3xl md:text-4xl font-bold mb-6">💬 Мессенджер</h1>

        <div className="grid md:grid-cols-[300px_1fr] gap-6 h-[calc(100vh-250px)]">
          <Card className="p-4 bg-card border-border">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold">Группы</h2>
              <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
                <DialogTrigger asChild>
                  <Button size="icon" variant="ghost" disabled={!canCreateChat} title={canCreateChat ? 'Создать чат' : 'Только преподаватель/админ'}>
                    <Plus className="w-5 h-5" />
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader><DialogTitle className="flex items-center gap-2"><MessageSquarePlus className="w-4 h-4" /> Создать чат</DialogTitle></DialogHeader>
                  <form onSubmit={handleCreateGroup} className="space-y-4">
                    <div>
                      <Input
                        value={groupForm.name}
                        onChange={(e) => setGroupForm(v => ({ ...v, name: e.target.value }))}
                        placeholder="Название чата"
                        required
                      />
                    </div>
                    <div>
                      <Textarea
                        value={groupForm.description}
                        onChange={(e) => setGroupForm(v => ({ ...v, description: e.target.value }))}
                        placeholder="Описание (необязательно)"
                        rows={3}
                      />
                    </div>
                    <Button type="submit" className="w-full">Создать</Button>
                  </form>
                </DialogContent>
              </Dialog>
            </div>
            <div className="space-y-2">
              {groups.length === 0 && (
                <div className="text-sm text-muted-foreground py-6 text-center">
                  У вас пока нет доступных чатов
                </div>
              )}
              {groups.map((group) => (
                <button
                  key={group.id}
                  onClick={() => setSelectedGroup(group.id)}
                  className={`w-full text-left p-3 rounded-lg transition-colors border ${
                    selectedGroup === group.id
                      ? 'bg-accent text-accent-foreground border-accent'
                      : 'hover:bg-muted/60 border-transparent'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <Users className="w-5 h-5" />
                    <div className="flex-1">
                      <div className="font-medium">{group.name}</div>
                      {!!group.memberCount && <div className="text-xs opacity-80">{group.memberCount} участников</div>}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </Card>

          <Card className="flex flex-col bg-card border-border">
            <div className="p-4 border-b">
              <h2 className="text-xl font-bold">
                {groups.find((g) => g.id === selectedGroup)?.name || 'Чат'}
              </h2>
            </div>

            <ScrollArea className="flex-1 p-4">
              <div className="space-y-4">
                {messages.map((message) => (
                  <div
                    key={message.id}
                    className={`flex ${message.userId === user?.id ? 'justify-end' : 'justify-start'} group`}
                  >
                    <div
                      className={`max-w-[76%] rounded-2xl p-4 ${
                        message.userId === user?.id
                          ? 'bg-primary text-primary-foreground'
                          : 'bg-muted'
                      }`}
                    >
                      {message.userId !== user?.id && (
                        <div className="text-sm font-medium mb-1 opacity-70">
                          {message.userName}
                        </div>
                      )}
                      {editingId === message.id ? (
                        <div className="space-y-2">
                          <Textarea value={editingText} onChange={(e) => setEditingText(e.target.value)} rows={3} />
                          <div className="flex gap-2 justify-end">
                            <Button type="button" variant="outline" size="sm" onClick={() => { setEditingId(null); setEditingText(''); }}>
                              <X className="w-3.5 h-3.5 mr-1" /> Отмена
                            </Button>
                            <Button type="button" size="sm" onClick={() => handleEditMessage(message.id)}>
                              <Check className="w-3.5 h-3.5 mr-1" /> Сохранить
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <>
                          <p className="whitespace-pre-wrap break-words">{message.text}</p>
                          <div className="text-xs mt-1 opacity-70 flex items-center gap-2">
                            <span>
                              {new Date(message.createdAt).toLocaleTimeString('ru-RU', {
                                hour: '2-digit',
                                minute: '2-digit',
                              })}
                            </span>
                            {message.editedAt && <span>(изменено)</span>}
                          </div>
                        </>
                      )}
                      {editingId !== message.id && (
                        <div className={`flex gap-1 mt-2 ${message.userId === user?.id ? 'justify-end' : 'justify-start'}`}>
                          <Button size="icon" variant="ghost" className="w-7 h-7" onClick={() => setReplyTo(message)} title="Ответить">
                            <Reply className="w-3.5 h-3.5" />
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="w-7 h-7"
                            onClick={() => navigator.clipboard.writeText(message.text)}
                            title="Копировать"
                          >
                            <Copy className="w-3.5 h-3.5" />
                          </Button>
                          {(message.userId === user?.id || canModerateAll) && (
                            <>
                              <Button
                                size="icon"
                                variant="ghost"
                                className="w-7 h-7"
                                onClick={() => { setEditingId(message.id); setEditingText(message.text); }}
                                title="Изменить"
                              >
                                <Pencil className="w-3.5 h-3.5" />
                              </Button>
                              <Button
                                size="icon"
                                variant="ghost"
                                className="w-7 h-7 text-destructive hover:text-destructive"
                                onClick={() => handleDeleteMessage(message.id)}
                                title="Удалить"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </Button>
                            </>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
                {selectedGroup && messages.length === 0 && (
                  <div className="text-center text-muted-foreground py-12">
                    Пока нет сообщений. Начни общение!
                  </div>
                )}
                {!selectedGroup && (
                  <div className="text-center text-muted-foreground py-12">
                    Выберите чат из списка слева
                  </div>
                )}
              </div>
            </ScrollArea>

            <form onSubmit={handleSendMessage} className="p-4 border-t">
              {replyTo && (
                <div className="mb-2 rounded-md border p-2 text-xs bg-muted/50 flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <p className="font-medium truncate">Ответ: {replyTo.userName}</p>
                    <p className="text-muted-foreground truncate">{replyTo.text}</p>
                  </div>
                  <Button type="button" size="icon" variant="ghost" className="w-7 h-7" onClick={() => setReplyTo(null)}>
                    <X className="w-3.5 h-3.5" />
                  </Button>
                </div>
              )}
              <div className="flex gap-2">
                <Input
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  placeholder="Напиши сообщение..."
                  className="flex-1"
                  disabled={!selectedGroup}
                />
                <Button type="submit" size="icon" disabled={!newMessage.trim() || !selectedGroup}>
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
