import { Hono } from 'npm:hono';
import { cors } from 'npm:hono/cors';
import { logger } from 'npm:hono/logger';
import { createClient } from 'jsr:@supabase/supabase-js@2';
import * as kv from './kv_store.tsx';
import { initializeSampleData } from './sample-data.tsx';

const app = new Hono();

// Middleware
app.use('*', cors());
app.use('*', logger(console.log));

// Initialize sample data on startup
initializeSampleData().catch(console.error);

// Initialize Supabase client
const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
);

// Helper to get user from token
async function getUserFromToken(authHeader: string | null) {
  if (!authHeader) return null;
  const token = authHeader.split(' ')[1];
  const { data: { user }, error } = await supabase.auth.getUser(token);
  return error ? null : user;
}

// ========== AUTH ROUTES ==========

// Sign up
app.post('/make-server-1d20ed4b/auth/signup', async (c) => {
  try {
    const { email, password, userData } = await c.req.json();
    
    const { data, error } = await supabase.auth.admin.createUser({
      email,
      password,
      user_metadata: userData,
      email_confirm: true, // Auto-confirm email since email server hasn't been configured
    });

    if (error) {
      console.error('Signup error:', error);
      return c.json({ error: error.message }, 400);
    }

    // Initialize user progress
    await kv.set(`user:${data.user.id}:progress`, {
      level: 1,
      xp: 0,
      xpToNextLevel: 100,
      completedLessons: 0,
      streak: 0,
      lastActive: new Date().toISOString(),
      achievements: [],
    });

    return c.json({ user: data.user });
  } catch (error) {
    console.error('Signup error:', error);
    return c.json({ error: 'Signup failed' }, 500);
  }
});

// ========== COURSES ROUTES ==========

// Get all courses
app.get('/make-server-1d20ed4b/courses', async (c) => {
  try {
    const courses = await kv.getByPrefix('course:') || [];
    return c.json({ courses });
  } catch (error) {
    console.error('Error fetching courses:', error);
    return c.json({ error: 'Failed to fetch courses' }, 500);
  }
});

// Get single course
app.get('/make-server-1d20ed4b/courses/:id', async (c) => {
  try {
    const id = c.req.param('id');
    const course = await kv.get(`course:${id}`);
    
    if (!course) {
      return c.json({ error: 'Course not found' }, 404);
    }

    // Get lessons for this course
    const allLessons = await kv.getByPrefix('lesson:') || [];
    const courseLessons = allLessons.filter((l: any) => l.courseId === id);

    return c.json({ ...course, lessons: courseLessons });
  } catch (error) {
    console.error('Error fetching course:', error);
    return c.json({ error: 'Failed to fetch course' }, 500);
  }
});

// Create course (teachers only)
app.post('/make-server-1d20ed4b/courses', async (c) => {
  try {
    const user = await getUserFromToken(c.req.header('Authorization'));
    if (!user || user.user_metadata?.role !== 'teacher') {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const courseData = await c.req.json();
    const courseId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    const course = {
      id: courseId,
      ...courseData,
      createdBy: user.id,
      createdAt: new Date().toISOString(),
      lessonsCount: 0,
    };

    await kv.set(`course:${courseId}`, course);
    return c.json({ course });
  } catch (error) {
    console.error('Error creating course:', error);
    return c.json({ error: 'Failed to create course' }, 500);
  }
});

// ========== LESSONS ROUTES ==========

// Get lesson
app.get('/make-server-1d20ed4b/lessons/:id', async (c) => {
  try {
    const id = c.req.param('id');
    const lesson = await kv.get(`lesson:${id}`);
    
    if (!lesson) {
      return c.json({ error: 'Lesson not found' }, 404);
    }

    return c.json(lesson);
  } catch (error) {
    console.error('Error fetching lesson:', error);
    return c.json({ error: 'Failed to fetch lesson' }, 500);
  }
});

// Create lesson (teachers only)
app.post('/make-server-1d20ed4b/lessons', async (c) => {
  try {
    const user = await getUserFromToken(c.req.header('Authorization'));
    if (!user || user.user_metadata?.role !== 'teacher') {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const lessonData = await c.req.json();
    const lessonId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    const lesson = {
      id: lessonId,
      ...lessonData,
      createdBy: user.id,
      createdAt: new Date().toISOString(),
    };

    await kv.set(`lesson:${lessonId}`, lesson);

    // Update course lesson count
    if (lessonData.courseId) {
      const course = await kv.get(`course:${lessonData.courseId}`);
      if (course) {
        course.lessonsCount = (course.lessonsCount || 0) + 1;
        await kv.set(`course:${lessonData.courseId}`, course);
      }
    }

    return c.json({ lesson });
  } catch (error) {
    console.error('Error creating lesson:', error);
    return c.json({ error: 'Failed to create lesson' }, 500);
  }
});

// ========== SUBMISSIONS ROUTES ==========

// Submit assignment
app.post('/make-server-1d20ed4b/submissions', async (c) => {
  try {
    const user = await getUserFromToken(c.req.header('Authorization'));
    if (!user) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const { assignmentId, code } = await c.req.json();
    const submissionId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    const submission = {
      id: submissionId,
      assignmentId,
      userId: user.id,
      code,
      status: 'pending',
      createdAt: new Date().toISOString(),
    };

    await kv.set(`submission:${submissionId}`, submission);

    // Auto-check if assignment has test cases
    const assignment = await kv.get(`assignment:${assignmentId}`);
    if (assignment?.autoCheck && assignment?.testCases) {
      // Simple auto-check simulation
      const passed = Math.random() > 0.3; // 70% pass rate for demo
      submission.status = passed ? 'passed' : 'failed';
      submission.feedback = passed ? 'Отличная работа!' : 'Попробуй еще раз!';
      submission.grade = passed ? 100 : 50;
      await kv.set(`submission:${submissionId}`, submission);
    }

    return c.json({ submission });
  } catch (error) {
    console.error('Error submitting assignment:', error);
    return c.json({ error: 'Failed to submit assignment' }, 500);
  }
});

// Grade submission (teachers only)
app.post('/make-server-1d20ed4b/submissions/:id/grade', async (c) => {
  try {
    const user = await getUserFromToken(c.req.header('Authorization'));
    if (!user || user.user_metadata?.role !== 'teacher') {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const id = c.req.param('id');
    const { grade, feedback } = await c.req.json();
    
    const submission = await kv.get(`submission:${id}`);
    if (!submission) {
      return c.json({ error: 'Submission not found' }, 404);
    }

    submission.grade = grade;
    submission.feedback = feedback;
    submission.status = grade >= 60 ? 'passed' : 'failed';
    submission.gradedBy = user.id;
    submission.gradedAt = new Date().toISOString();

    await kv.set(`submission:${id}`, submission);

    return c.json({ submission });
  } catch (error) {
    console.error('Error grading submission:', error);
    return c.json({ error: 'Failed to grade submission' }, 500);
  }
});

// ========== COMMENTS ROUTES ==========

// Get comments for lesson
app.get('/make-server-1d20ed4b/comments/:lessonId', async (c) => {
  try {
    const lessonId = c.req.param('lessonId');
    const allComments = await kv.getByPrefix('comment:') || [];
    const lessonComments = allComments.filter((comment: any) => comment.lessonId === lessonId);
    
    return c.json({ comments: lessonComments });
  } catch (error) {
    console.error('Error fetching comments:', error);
    return c.json({ error: 'Failed to fetch comments' }, 500);
  }
});

// Add comment
app.post('/make-server-1d20ed4b/comments', async (c) => {
  try {
    const user = await getUserFromToken(c.req.header('Authorization'));
    if (!user) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const { lessonId, text, rating } = await c.req.json();
    const commentId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    const comment = {
      id: commentId,
      lessonId,
      userId: user.id,
      userName: user.user_metadata?.name || 'Anonim',
      text,
      rating,
      createdAt: new Date().toISOString(),
    };

    await kv.set(`comment:${commentId}`, comment);

    return c.json({ comment });
  } catch (error) {
    console.error('Error adding comment:', error);
    return c.json({ error: 'Failed to add comment' }, 500);
  }
});

// ========== MESSAGES ROUTES ==========

// Get messages for group
app.get('/make-server-1d20ed4b/messages/:groupId', async (c) => {
  try {
    const user = await getUserFromToken(c.req.header('Authorization'));
    if (!user) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const groupId = c.req.param('groupId');
    const allMessages = await kv.getByPrefix(`message:${groupId}:`) || [];
    
    return c.json({ messages: allMessages });
  } catch (error) {
    console.error('Error fetching messages:', error);
    return c.json({ error: 'Failed to fetch messages' }, 500);
  }
});

// Send message
app.post('/make-server-1d20ed4b/messages', async (c) => {
  try {
    const user = await getUserFromToken(c.req.header('Authorization'));
    if (!user) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const { groupId, text } = await c.req.json();
    const messageId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    const message = {
      id: messageId,
      groupId,
      userId: user.id,
      userName: user.user_metadata?.name || 'Anonim',
      text,
      createdAt: new Date().toISOString(),
    };

    await kv.set(`message:${groupId}:${messageId}`, message);

    return c.json({ message });
  } catch (error) {
    console.error('Error sending message:', error);
    return c.json({ error: 'Failed to send message' }, 500);
  }
});

// ========== PROGRESS ROUTES ==========

// Get user progress
app.get('/make-server-1d20ed4b/progress', async (c) => {
  try {
    const user = await getUserFromToken(c.req.header('Authorization'));
    if (!user) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const progress = await kv.get(`user:${user.id}:progress`) || {
      level: 1,
      xp: 0,
      xpToNextLevel: 100,
      completedLessons: 0,
      streak: 0,
      achievements: [],
    };

    return c.json(progress);
  } catch (error) {
    console.error('Error fetching progress:', error);
    return c.json({ error: 'Failed to fetch progress' }, 500);
  }
});

// Update progress
app.post('/make-server-1d20ed4b/progress', async (c) => {
  try {
    const user = await getUserFromToken(c.req.header('Authorization'));
    if (!user) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const { lessonId, completed } = await c.req.json();
    
    const progress = await kv.get(`user:${user.id}:progress`) || {
      level: 1,
      xp: 0,
      xpToNextLevel: 100,
      completedLessons: 0,
      streak: 0,
      achievements: [],
    };

    if (completed) {
      progress.completedLessons += 1;
      progress.xp += 50; // Award XP

      // Level up check
      while (progress.xp >= progress.xpToNextLevel) {
        progress.xp -= progress.xpToNextLevel;
        progress.level += 1;
        progress.xpToNextLevel = Math.floor(progress.xpToNextLevel * 1.5);
      }

      // Mark lesson as completed
      await kv.set(`user:${user.id}:lesson:${lessonId}`, { completed: true, completedAt: new Date().toISOString() });
    }

    await kv.set(`user:${user.id}:progress`, progress);

    return c.json(progress);
  } catch (error) {
    console.error('Error updating progress:', error);
    return c.json({ error: 'Failed to update progress' }, 500);
  }
});

// ========== LEADERBOARD ==========

// Get leaderboard
app.get('/make-server-1d20ed4b/leaderboard', async (c) => {
  try {
    const allProgress = await kv.getByPrefix('user:') || [];
    const leaderboard = allProgress
      .filter((item: any) => item.level !== undefined)
      .sort((a: any, b: any) => {
        if (b.level !== a.level) return b.level - a.level;
        return b.xp - a.xp;
      })
      .slice(0, 100);

    return c.json({ leaderboard });
  } catch (error) {
    console.error('Error fetching leaderboard:', error);
    return c.json({ error: 'Failed to fetch leaderboard' }, 500);
  }
});

Deno.serve(app.fetch);