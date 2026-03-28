import React, { useEffect, useState, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router';
import { Layout } from '../components/Layout';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import {
  Send, Users, Plus, Pencil, Trash2, Copy, Reply, Check, X,
  MessageSquarePlus, Paperclip, FileText, Download, Image as ImageIcon,
  Film, Music, File as FileIcon,
} from 'lucide-react';
import { Button } from '../components/ui/button';
import { Card } from '../components/ui/card';
import { Input } from '../components/ui/input';
import { ScrollArea } from '../components/ui/scroll-area';
import { Progress } from '../components/ui/progress';
import { api, supabase } from '../lib/supabase';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '../components/ui/dialog';
import { Textarea } from '../components/ui/textarea';

const ACCEPT_STRING = [
  'image/jpeg','image/png','image/gif','image/webp','image/svg+xml',
  'video/mp4','video/webm','video/quicktime',
  'audio/mpeg','audio/wav','audio/x-m4a','audio/ogg','audio/mp4',
  'application/pdf','application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'text/plain','application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
].join(',');

const MAX_TOTAL_SIZE = 200 * 1024 * 1024;

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
}

function mediaTypeIcon(type: string) {
  switch (type) {
    case 'image': return <ImageIcon className="w-4 h-4" />;
    case 'video': return <Film className="w-4 h-4" />;
    case 'audio': return <Music className="w-4 h-4" />;
    default:      return <FileText className="w-4 h-4" />;
  }
}

type MediaItem = {
  id: string;
  originalName: string;
  mimeType: string;
  mediaType: string;
  fileSize: number;
  width: number | null;
  height: number | null;
  downloadUrl: string;
  thumbnailUrl: string | null;
};

function MediaDisplay({ media, onLightbox, userId, currentUserId, onDelete }: {
  media: MediaItem[];
  onLightbox: (m: MediaItem) => void;
  userId: string;
  currentUserId?: string;
  onDelete: (id: string) => void;
}) {
  if (!media || media.length === 0) return null;
  return (
    <div className="mt-2 space-y-2">
      {media.map(m => (
        <div key={m.id} className="relative group/media">
          {m.mediaType === 'image' && (
            <img
              src={m.thumbnailUrl || m.downloadUrl}
              alt={m.originalName}
              onClick={() => onLightbox(m)}
              className="max-w-[280px] max-h-[220px] rounded-lg cursor-pointer hover:opacity-90 transition object-cover"
              loading="lazy"
            />
          )}

          {m.mediaType === 'video' && (
            <video
              controls
              preload="metadata"
              className="max-w-[320px] max-h-[240px] rounded-lg"
            >
              <source src={m.downloadUrl} type={m.mimeType} />
            </video>
          )}

          {m.mediaType === 'audio' && (
            <div className="flex items-center gap-2 min-w-[200px]">
              <audio controls preload="metadata" className="max-w-[260px] h-10">
                <source src={m.downloadUrl} type={m.mimeType} />
              </audio>
            </div>
          )}

          {m.mediaType === 'document' && (
            <a
              href={m.downloadUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 p-2.5 rounded-lg bg-background/30 hover:bg-background/50 transition text-sm max-w-[280px]"
            >
              <FileText className="w-5 h-5 shrink-0" />
              <span className="truncate flex-1">{m.originalName}</span>
              <span className="text-xs opacity-60 shrink-0">{formatFileSize(m.fileSize)}</span>
              <Download className="w-4 h-4 shrink-0" />
            </a>
          )}

          {/* Actions overlay */}
          <div className="absolute top-1 right-1 opacity-0 group-hover/media:opacity-100 transition flex gap-1">
            <a
              href={m.downloadUrl}
              download={m.originalName}
              onClick={e => e.stopPropagation()}
              className="p-1 rounded bg-black/50 text-white hover:bg-black/70"
              title="Скачать"
            >
              <Download className="w-3.5 h-3.5" />
            </a>
            {userId === currentUserId && (
              <button
                onClick={(e) => { e.stopPropagation(); onDelete(m.id); }}
                className="p-1 rounded bg-black/50 text-red-300 hover:bg-black/70"
                title="Удалить файл"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

export function Messenger() {
  const { user, userRole, loading } = useAuth();
  const { t } = useLanguage();
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

  // Media state
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const [lightboxMedia, setLightboxMedia] = useState<MediaItem | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!loading && !user) navigate('/login');
  }, [user, loading, navigate]);

  useEffect(() => {
    if (user) loadGroups();
  }, [user]);

  useEffect(() => {
    if (selectedGroup && user) {
      loadMessages();
      const interval = setInterval(loadMessages, 3000);
      return () => clearInterval(interval);
    }
  }, [selectedGroup, user]);

  const getToken = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    return session?.access_token || null;
  };

  const loadGroups = async () => {
    try {
      const tk = await getToken();
      if (!tk) return;
      const res = await fetch('/api/groups', { headers: { Authorization: `Bearer ${tk}` } });
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
      const tk = await getToken();
      if (!tk) return;
      const data = await api.getMessages(selectedGroup, t);
      setMessages(data.messages || []);
    } catch {
      setMessages([]);
    }
  };

  // ─── File handling ───────────────────────────────────────────────────────

  const addFiles = useCallback((files: File[]) => {
    setSelectedFiles(prev => {
      const combined = [...prev, ...files].slice(0, 2);
      if (prev.length + files.length > 2) toast.error('Максимум 2 файла на сообщение');
      return combined;
    });
  }, []);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length) addFiles(files);
    e.target.value = '';
  };

  const removeFile = (idx: number) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== idx));
  };

  const handleDeleteMedia = async (mediaId: string) => {
    if (!confirm('Удалить этот файл?')) return;
    try {
      const tk = await getToken();
      if (!tk) return;
      await api.deleteMedia(mediaId, tk);
      loadMessages();
      toast.success('Файл удалён');
    } catch {
      toast.error('Не удалось удалить файл');
    }
  };

  // ─── Drag & Drop ─────────────────────────────────────────────────────────

  const handleDragOver = (e: React.DragEvent) => { e.preventDefault(); setIsDragging(true); };
  const handleDragLeave = (e: React.DragEvent) => { e.preventDefault(); setIsDragging(false); };
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const files = Array.from(e.dataTransfer.files);
    if (files.length) addFiles(files);
  };

  // ─── Send ─────────────────────────────────────────────────────────────────

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if ((!newMessage.trim() && selectedFiles.length === 0) || !selectedGroup) return;

    try {
      const tk = await getToken();
      if (!tk) return;
      const payload = replyTo
        ? `↪ ${replyTo.userName}: ${replyTo.text}\n${newMessage}`
        : newMessage;

      if (selectedFiles.length > 0) {
        setIsUploading(true);
        setUploadProgress(0);
        await api.sendMessageWithMedia(selectedGroup, payload, selectedFiles, tk, setUploadProgress);
      } else {
        await api.sendMessage(selectedGroup, payload, tk);
      }

      setNewMessage('');
      setReplyTo(null);
      setSelectedFiles([]);
      setUploadProgress(0);
      setIsUploading(false);
      loadMessages();
    } catch (error: any) {
      setIsUploading(false);
      setUploadProgress(0);
      toast.error(error.message || 'Ошибка отправки сообщения');
    }
  };

  const handleEditMessage = async (messageId: string) => {
    if (!editingText.trim()) return;
    try {
      const tk = await getToken();
      if (!tk) return;
      await api.editMessage(messageId, editingText, tk);
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
      const tk = await getToken();
      if (!tk) return;
      await api.deleteMessage(messageId, tk);
      loadMessages();
      toast.success('Сообщение удалено');
    } catch {
      toast.error('Нельзя удалить это сообщение');
    }
  };

  const handleCreateGroup = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const tk = await getToken();
      if (!tk) return;
      const r = await fetch('/api/groups', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${tk}` },
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
        <h1 className="text-3xl md:text-4xl font-bold mb-6">💬 {t('messenger_title')}</h1>

        <div className="grid md:grid-cols-[300px_1fr] gap-6 h-[calc(100vh-250px)]">
          <Card className="p-4 bg-card border-border">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold">{t('messenger_groups')}</h2>
              <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
                <DialogTrigger asChild>
                  <Button size="icon" variant="ghost" disabled={!canCreateChat} title={canCreateChat ? t('messenger_create_chat') : ''}>
                    <Plus className="w-5 h-5" />
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader><DialogTitle className="flex items-center gap-2"><MessageSquarePlus className="w-4 h-4" /> {t('messenger_create_chat')}</DialogTitle></DialogHeader>
                  <form onSubmit={handleCreateGroup} className="space-y-4">
                    <div>
                      <Input
                        value={groupForm.name}
                        onChange={(e) => setGroupForm(v => ({ ...v, name: e.target.value }))}
                        placeholder={t('messenger_chat_name')}
                        required
                      />
                    </div>
                    <div>
                      <Textarea
                        value={groupForm.description}
                        onChange={(e) => setGroupForm(v => ({ ...v, description: e.target.value }))}
                        placeholder={t('messenger_chat_desc')}
                        rows={3}
                      />
                    </div>
                    <Button type="submit" className="w-full">{t('messenger_create_btn')}</Button>
                  </form>
                </DialogContent>
              </Dialog>
            </div>
            <div className="space-y-2">
              {groups.length === 0 && (
                <div className="text-sm text-muted-foreground py-6 text-center">
                  {t('messenger_no_chats')}
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
                      {!!group.memberCount && <div className="text-xs opacity-80">{group.memberCount} {t('messenger_members')}</div>}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </Card>

          <Card
            className={`flex flex-col bg-card border-border ${isDragging ? 'ring-2 ring-primary' : ''}`}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
          >
            <div className="p-4 border-b">
              <h2 className="text-xl font-bold">
                {groups.find((g) => g.id === selectedGroup)?.name || 'Чат'}
              </h2>
            </div>

            {isDragging && (
              <div className="absolute inset-0 z-10 bg-primary/10 flex items-center justify-center rounded-xl pointer-events-none">
                <div className="text-primary font-medium text-lg">{t('messenger_drop')}</div>
              </div>
            )}

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
                          {message.text && (
                            <p className="whitespace-pre-wrap break-words">{message.text}</p>
                          )}

                          <MediaDisplay
                            media={message.media || []}
                            onLightbox={setLightboxMedia}
                            userId={message.userId}
                            currentUserId={user?.id}
                            onDelete={handleDeleteMedia}
                          />

                          <div className="text-xs mt-1 opacity-70 flex items-center gap-2">
                            <span>
                              {new Date(message.createdAt).toLocaleTimeString('ru-RU', {
                                hour: '2-digit',
                                minute: '2-digit',
                              })}
                            </span>
                            {message.editedAt && <span>({t('messenger_changed')})</span>}
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
                    {t('messenger_no_messages')}
                  </div>
                )}
                {!selectedGroup && (
                  <div className="text-center text-muted-foreground py-12">
                    {t('messenger_select')}
                  </div>
                )}
              </div>
            </ScrollArea>

            <form onSubmit={handleSendMessage} className="p-4 border-t space-y-2">
              {replyTo && (
                <div className="rounded-md border p-2 text-xs bg-muted/50 flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <p className="font-medium truncate">{t('messenger_reply')} {replyTo.userName}</p>
                    <p className="text-muted-foreground truncate">{replyTo.text}</p>
                  </div>
                  <Button type="button" size="icon" variant="ghost" className="w-7 h-7" onClick={() => setReplyTo(null)}>
                    <X className="w-3.5 h-3.5" />
                  </Button>
                </div>
              )}

              {/* File previews */}
              {selectedFiles.length > 0 && (
                <div className="flex gap-2 flex-wrap">
                  {selectedFiles.map((file, idx) => (
                    <div
                      key={idx}
                      className="relative flex items-center gap-2 px-3 py-2 rounded-lg bg-muted/60 border text-sm max-w-[220px]"
                    >
                      {file.type.startsWith('image/') ? (
                        <img
                          src={URL.createObjectURL(file)}
                          className="w-10 h-10 rounded object-cover shrink-0"
                          alt=""
                        />
                      ) : (
                        <div className="w-10 h-10 rounded bg-muted flex items-center justify-center shrink-0">
                          {file.type.startsWith('video/') ? <Film className="w-5 h-5" /> :
                           file.type.startsWith('audio/') ? <Music className="w-5 h-5" /> :
                           <FileIcon className="w-5 h-5" />}
                        </div>
                      )}
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-xs font-medium">{file.name}</p>
                        <p className="text-xs text-muted-foreground">{formatFileSize(file.size)}</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => removeFile(idx)}
                        className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-destructive text-destructive-foreground flex items-center justify-center"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {/* Upload progress */}
              {isUploading && (
                <div className="space-y-1">
                  <Progress value={uploadProgress} className="h-2" />
                  <p className="text-xs text-muted-foreground text-center">{uploadProgress}%</p>
                </div>
              )}

              <div className="flex gap-2">
                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  accept={ACCEPT_STRING}
                  onChange={handleFileSelect}
                  className="hidden"
                />
                <Button
                  type="button"
                  size="icon"
                  variant="outline"
                  disabled={!selectedGroup || isUploading || selectedFiles.length >= 2}
                  onClick={() => fileInputRef.current?.click()}
                  title={t('messenger_attach')}
                >
                  <Paperclip className="w-5 h-5" />
                </Button>
                <Input
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  placeholder={selectedFiles.length > 0 ? t('messenger_caption') : t('messenger_placeholder')}
                  className="flex-1"
                  disabled={!selectedGroup || isUploading}
                />
                <Button
                  type="submit"
                  size="icon"
                  disabled={(!newMessage.trim() && selectedFiles.length === 0) || !selectedGroup || isUploading}
                >
                  <Send className="w-5 h-5" />
                </Button>
              </div>
            </form>
          </Card>
        </div>
      </div>

      {/* Lightbox */}
      {lightboxMedia && (
        <div
          className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4"
          onClick={() => setLightboxMedia(null)}
        >
          <div className="relative max-w-[90vw] max-h-[90vh]" onClick={e => e.stopPropagation()}>
            <img
              src={lightboxMedia.downloadUrl}
              alt={lightboxMedia.originalName}
              className="max-w-full max-h-[85vh] object-contain rounded-lg"
            />
            <div className="absolute top-2 right-2 flex gap-2">
              <a
                href={lightboxMedia.downloadUrl}
                download={lightboxMedia.originalName}
                className="p-2 rounded-full bg-black/60 text-white hover:bg-black/80 transition"
                title={t('messenger_download')}
              >
                <Download className="w-5 h-5" />
              </a>
              <button
                onClick={() => setLightboxMedia(null)}
                className="p-2 rounded-full bg-black/60 text-white hover:bg-black/80 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <p className="text-white/70 text-sm text-center mt-2">{lightboxMedia.originalName}</p>
          </div>
        </div>
      )}
    </Layout>
  );
}
