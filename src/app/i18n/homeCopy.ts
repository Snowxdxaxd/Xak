import type { Lang } from './translations';

export type HomeCopy = {
  heroBadge: string;
  heroH1: string;
  heroAccent: string;
  heroLead: string;
  langAlgo: string;
  stats: { value: string; label: string }[];
  featTitle: string;
  featSubtitle: string;
  features: { title: string; desc: string }[];
  howTitle: string;
  howSubtitle: string;
  steps: { num: string; title: string; desc: string }[];
  rolesTitle: string;
  rolesSubtitle: string;
  roles: { role: string; badge: string; items: string[] }[];
  privacyPublic: string;
  privacyPrivate: string;
  privacyDesc: string;
  ctaTitle: string;
  ctaDesc: string;
  ctaCreate: string;
  ctaHaveAccount: string;
  footerTagline: string;
  footerLogin: string;
  footerReg: string;
};

const HOME_RU: HomeCopy = {
  heroBadge: 'Образовательная платформа для детей 11–16 лет',
  heroH1: 'Учись программировать.',
  heroAccent: 'По-настоящему.',
  heroLead:
    'Курсы с уроками и заданиями, онлайн-компилятор, классы с преподавателем и геймификация — всё в одном месте.',
  langAlgo: 'Алгоритмы',
  stats: [
    { value: '3+', label: 'языка программирования' },
    { value: '50+', label: 'уроков в базе' },
    { value: '3', label: 'роли: ученик, учитель, родитель' },
    { value: '∞', label: 'курсов можно создать' },
  ],
  featTitle: 'Всё для учёбы — в одном месте',
  featSubtitle: 'Никакого лишнего. Только то, что реально помогает учиться программированию.',
  features: [
    {
      title: 'Структурированные курсы',
      desc: 'Чёткий путь от основ к продвинутым темам. Уроки с текстом, примерами кода и практическими заданиями.',
    },
    {
      title: 'Онлайн-компилятор',
      desc: 'Пиши и запускай Python и JavaScript прямо в браузере — без установки ПО.',
    },
    {
      title: 'Проверка заданий',
      desc: 'Автоматическая проверка кода и ручная оценка преподавателем с обратной связью.',
    },
    {
      title: 'Классы и группы',
      desc: 'Преподаватель создаёт класс, добавляет учеников и назначает индивидуальные курсы.',
    },
    {
      title: 'Геймификация',
      desc: 'Очки опыта, уровни, серии дней и таблица лидеров — учиться интереснее с прогрессом.',
    },
    {
      title: 'Встроенный чат',
      desc: 'Общайся с одноклассниками и преподавателями прямо на платформе.',
    },
  ],
  howTitle: 'Как это работает',
  howSubtitle: 'Четыре шага до первой программы',
  steps: [
    { num: '01', title: 'Зарегистрируйся', desc: 'Создай аккаунт ученика или преподавателя за 30 секунд.' },
    { num: '02', title: 'Выбери курс', desc: 'Открытые курсы доступны всем. Индивидуальные — только твоему классу.' },
    { num: '03', title: 'Изучай и пиши', desc: 'Читай уроки, запускай код в компиляторе, сдавай задания.' },
    { num: '04', title: 'Расти', desc: 'Получай XP, повышай уровень, следи за успехами в дашборде.' },
  ],
  rolesTitle: 'Для всех участников учебного процесса',
  rolesSubtitle: 'Разные роли — разные возможности',
  roles: [
    {
      role: 'Преподаватель',
      badge: 'teacher',
      items: [
        'Создание курсов и уроков',
        'Управление классами',
        'Индивидуальные курсы',
        'Дашборд со статистикой',
        'Выставление оценок',
      ],
    },
    {
      role: 'Ученик',
      badge: 'student',
      items: [
        'Прохождение курсов',
        'Онлайн-компилятор',
        'Сдача заданий',
        'Рейтинг и достижения',
        'Личная статистика',
      ],
    },
    {
      role: 'Родитель',
      badge: 'parent',
      items: [
        'Просмотр прогресса ребёнка',
        'Уведомления об оценках',
        'Привязка к аккаунту ученика',
      ],
    },
  ],
  privacyPublic: 'Публичные курсы',
  privacyPrivate: 'Индивидуальные курсы',
  privacyDesc:
    'Открытые курсы доступны всем. Индивидуальные курсы видны только ученикам, которых добавил преподаватель.',
  ctaTitle: 'Готов начать?',
  ctaDesc: 'Регистрация бесплатна. Выбери роль и начни учиться или преподавать уже сегодня.',
  ctaCreate: 'Создать аккаунт',
  ctaHaveAccount: 'Уже есть аккаунт',
  footerTagline: '© 2026 CodeKids. Образование без границ.',
  footerLogin: 'Войти',
  footerReg: 'Регистрация',
};

const HOME_EN: HomeCopy = {
  heroBadge: 'Learning platform for students ages 11–16',
  heroH1: 'Learn to code.',
  heroAccent: 'For real.',
  heroLead:
    'Courses with lessons and tasks, an online compiler, classes with a teacher, and gamification — all in one place.',
  langAlgo: 'Algorithms',
  stats: [
    { value: '3+', label: 'programming languages' },
    { value: '50+', label: 'lessons in the library' },
    { value: '3', label: 'roles: student, teacher, parent' },
    { value: '∞', label: 'courses you can create' },
  ],
  featTitle: 'Everything for learning in one place',
  featSubtitle: 'No fluff — only what actually helps you learn programming.',
  features: [
    {
      title: 'Structured courses',
      desc: 'A clear path from basics to advanced topics — text, code samples, and hands-on tasks.',
    },
    {
      title: 'Online compiler',
      desc: 'Write and run Python and JavaScript in the browser — no install required.',
    },
    {
      title: 'Assignment review',
      desc: 'Automatic code checks plus teacher grading with feedback.',
    },
    {
      title: 'Classes & groups',
      desc: 'Teachers create classes, add students, and assign private courses.',
    },
    {
      title: 'Gamification',
      desc: 'XP, levels, streaks, and leaderboards make progress visible and fun.',
    },
    {
      title: 'Built-in chat',
      desc: 'Talk to classmates and teachers right on the platform.',
    },
  ],
  howTitle: 'How it works',
  howSubtitle: 'Four steps to your first program',
  steps: [
    { num: '01', title: 'Sign up', desc: 'Create a student or teacher account in under a minute.' },
    { num: '02', title: 'Pick a course', desc: 'Public courses for everyone; private ones for your class only.' },
    { num: '03', title: 'Learn & build', desc: 'Read lessons, run code in the compiler, submit assignments.' },
    { num: '04', title: 'Level up', desc: 'Earn XP, raise your level, and track progress on the dashboard.' },
  ],
  rolesTitle: 'Built for everyone in the learning process',
  rolesSubtitle: 'Different roles, different tools',
  roles: [
    {
      role: 'Teacher',
      badge: 'teacher',
      items: [
        'Create courses and lessons',
        'Manage classes',
        'Private courses',
        'Analytics dashboard',
        'Grading & feedback',
      ],
    },
    {
      role: 'Student',
      badge: 'student',
      items: [
        'Take courses',
        'Online compiler',
        'Submit assignments',
        'Leaderboards & achievements',
        'Personal stats',
      ],
    },
    {
      role: 'Parent',
      badge: 'parent',
      items: [
        "View your child's progress",
        'Grade notifications',
        'Link to the student account',
      ],
    },
  ],
  privacyPublic: 'Public courses',
  privacyPrivate: 'Private courses',
  privacyDesc:
    'Public courses are open to all. Private courses are visible only to students added by the teacher.',
  ctaTitle: 'Ready to start?',
  ctaDesc: 'Sign up for free, pick your role, and start learning or teaching today.',
  ctaCreate: 'Create account',
  ctaHaveAccount: 'I already have an account',
  footerTagline: '© 2026 CodeKids. Learning without limits.',
  footerLogin: 'Sign in',
  footerReg: 'Register',
};

export function getHomeCopy(lang: Lang): HomeCopy {
  return lang === 'en' ? HOME_EN : HOME_RU;
}
