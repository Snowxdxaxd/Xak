const API_BASE = (import.meta.env.VITE_API_BASE_URL as string | undefined) || '/api';

export type AppUser = {
  id: string;
  email: string;
  user_metadata?: Record<string, any>;
};

type AppSession = {
  access_token: string;
  user: AppUser;
};

const SESSION_KEY = 'app_session';
const authListeners = new Set<(event: string, session: AppSession | null) => void>();

function getStoredSession(): AppSession | null {
  const raw = localStorage.getItem(SESSION_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    localStorage.removeItem(SESSION_KEY);
    return null;
  }
}

function setStoredSession(session: AppSession | null) {
  if (session) {
    localStorage.setItem(SESSION_KEY, JSON.stringify(session));
  } else {
    localStorage.removeItem(SESSION_KEY);
  }
}

function emitAuth(event: string, session: AppSession | null) {
  for (const listener of authListeners) {
    listener(event, session);
  }
}

type FetchOptions = {
  method?: string;
  token?: string;
  body?: unknown;
};

async function parseResponse(res: Response) {
  const raw = await res.text();
  let data: any = null;

  if (raw) {
    try {
      data = JSON.parse(raw);
    } catch {
      data = { message: raw };
    }
  }

  if (!res.ok) {
    const message = data?.error || data?.message || `Request failed: ${res.status}`;
    throw new Error(message);
  }

  return data;
}

async function request(path: string, options: FetchOptions = {}) {
  const headers: Record<string, string> = {};
  if (options.token) {
    headers['Authorization'] = `Bearer ${options.token}`;
  }

  if (options.body !== undefined) {
    headers['Content-Type'] = 'application/json';
  }

  try {
    const res = await fetch(`${API_BASE}${path}`, {
      method: options.method || 'GET',
      headers,
      body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
    });
    return await parseResponse(res);
  } catch (error: any) {
    if (error instanceof Error) {
      throw error;
    }
    throw new Error('Network error while calling API');
  }
}

export const supabase = {
  auth: {
    async signInWithPassword({ email, password }: { email: string; password: string }) {
      try {
        const data = await request('/auth/login', {
          method: 'POST',
          body: { email, password },
        });
        const session: AppSession = {
          access_token: data.token,
          user: data.user,
        };
        setStoredSession(session);
        emitAuth('SIGNED_IN', session);
        return { data: { session, user: session.user }, error: null };
      } catch (error: any) {
        return { data: { session: null, user: null }, error: { message: error.message } };
      }
    },

    async getSession() {
      return { data: { session: getStoredSession() } };
    },

    onAuthStateChange(callback: (event: string, session: AppSession | null) => void) {
      authListeners.add(callback);
      return {
        data: {
          subscription: {
            unsubscribe() {
              authListeners.delete(callback);
            },
          },
        },
      };
    },

    async signOut() {
      setStoredSession(null);
      emitAuth('SIGNED_OUT', null);
      return { error: null };
    },
  },
};

export const api = {
  // Auth
  async signUp(email: string, password: string, userData: any, code?: string) {
    return request('/auth/signup', {
      method: 'POST',
      body: { email, password, userData, ...(code ? { code } : {}) },
    });
  },

  // Courses
  async getCourses() {
    return request('/courses');
  },

  async getCourse(id: string) {
    return request(`/courses/${id}`);
  },

  async createCourse(courseData: any, token: string) {
    return request('/courses', { method: 'POST', token, body: courseData });
  },

  // Lessons
  async getLesson(id: string) {
    return request(`/lessons/${id}`);
  },

  async createLesson(lessonData: any, token: string) {
    return request('/lessons', { method: 'POST', token, body: lessonData });
  },

  // Submissions
  async submitAssignment(assignmentId: string, code: string, token: string) {
    return request('/submissions', {
      method: 'POST',
      token,
      body: { assignmentId, code },
    });
  },

  async gradeSubmission(submissionId: string, grade: number, feedback: string, token: string) {
    return request(`/submissions/${submissionId}/grade`, {
      method: 'POST',
      token,
      body: { grade, feedback },
    });
  },

  // Comments
  async getComments(lessonId: string) {
    return request(`/comments/${lessonId}`);
  },

  async addComment(lessonId: string, text: string, rating: number, token: string) {
    return request('/comments', {
      method: 'POST',
      token,
      body: { lessonId, text, rating },
    });
  },

  // Messages
  async getMessages(groupId: string, token: string) {
    return request(`/messages/${groupId}`, { token });
  },

  async sendMessage(groupId: string, text: string, token: string) {
    return request('/messages', {
      method: 'POST',
      token,
      body: { groupId, text },
    });
  },

  async sendMessageWithMedia(
    groupId: string,
    text: string,
    files: File[],
    token: string,
    onProgress?: (pct: number) => void,
  ): Promise<any> {
    const formData = new FormData();
    formData.append('groupId', groupId);
    formData.append('text', text);
    files.forEach(f => formData.append('files', f));

    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.open('POST', `${API_BASE}/messages`);
      xhr.setRequestHeader('Authorization', `Bearer ${token}`);

      xhr.upload.onprogress = (e) => {
        if (e.lengthComputable && onProgress) {
          onProgress(Math.round((e.loaded / e.total) * 100));
        }
      };

      xhr.onload = () => {
        try {
          const data = JSON.parse(xhr.responseText);
          if (xhr.status >= 200 && xhr.status < 300) resolve(data);
          else reject(new Error(data.error || 'Ошибка загрузки'));
        } catch { reject(new Error('Некорректный ответ сервера')); }
      };

      xhr.onerror = () => reject(new Error('Ошибка сети'));
      xhr.send(formData);
    });
  },

  async editMessage(messageId: string, text: string, token: string) {
    return request(`/messages/${messageId}`, {
      method: 'PUT',
      token,
      body: { text },
    });
  },

  async deleteMessage(messageId: string, token: string) {
    return request(`/messages/${messageId}`, {
      method: 'DELETE',
      token,
    });
  },

  async deleteMedia(mediaId: string, token: string) {
    return request(`/media/${mediaId}`, { method: 'DELETE', token });
  },

  async getMediaQuota(token: string) {
    return request('/media/quota', { token });
  },

  // User Progress
  async getUserProgress(token: string) {
    return request('/progress', { token });
  },

  async updateProgress(lessonId: string, completed: boolean, token: string) {
    return request('/progress', {
      method: 'POST',
      token,
      body: { lessonId, completed },
    });
  },

  // Leaderboard
  async getLeaderboard() {
    return request('/leaderboard');
  },

  async getTeacherPopularity() {
    return request('/teacher/popularity');
  },

  async getPublicProfile(userId: string, token: string) {
    return request(`/users/${userId}/public-profile`, { token });
  },

  async getAdminStudents(token: string) {
    return request('/admin/students', { token });
  },
};
