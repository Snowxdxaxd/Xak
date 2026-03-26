import { Link } from 'react-router';
import { GraduationCap, ArrowRight, BookOpen, Trophy, MessageCircle, CheckCircle } from 'lucide-react';
import { Button } from '../components/ui/button';
import { ThemeToggle } from '../components/ThemeToggle';
import { motion } from 'motion/react';

export function Home() {
  const features = [
    { icon: BookOpen,     title: 'Структурированные курсы',  description: 'Чёткий путь от основ к продвинутым темам — как в лучших онлайн-школах' },
    { icon: CheckCircle,  title: 'Практика с проверкой',     description: 'Автоматическая и ручная проверка заданий преподавателем' },
    { icon: Trophy,       title: 'Прогресс и уровни',        description: 'Наглядная статистика, очки опыта и таблица лидеров' },
    { icon: MessageCircle,title: 'Живое общение',            description: 'Чат с одноклассниками и преподавателями' },
  ];

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Header */}
      <header className="border-b bg-background/95 backdrop-blur sticky top-0 z-50">
        <div className="container mx-auto px-6 h-14 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2 font-semibold">
            <GraduationCap className="w-5 h-5" />
            CodeKids
          </Link>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <Link to="/login">
              <Button variant="ghost" size="sm">Войти</Button>
            </Link>
            <Link to="/register">
              <Button size="sm">Начать</Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="container mx-auto px-6 py-24 md:py-36">
        <div className="max-w-3xl mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            className="inline-flex items-center gap-2 border rounded-full px-4 py-1.5 text-sm text-muted-foreground mb-8"
          >
            <GraduationCap className="w-3.5 h-3.5" />
            Платформа для программирования 11–16 лет
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.08 }}
            className="text-5xl md:text-7xl font-bold tracking-tight mb-6 leading-none"
          >
            Учись программировать.<br />
            <span className="text-muted-foreground font-normal">Правильно.</span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.16 }}
            className="text-lg text-muted-foreground mb-10 max-w-xl mx-auto"
          >
            Структурированные курсы, живые задания с проверкой, личная статистика — всё что нужно для настоящего обучения.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.24 }}
            className="flex items-center justify-center gap-3"
          >
            <Link to="/register">
              <Button size="lg" className="gap-2">
                Начать бесплатно <ArrowRight className="w-4 h-4" />
              </Button>
            </Link>
            <Link to="/login">
              <Button size="lg" variant="outline">Войти</Button>
            </Link>
          </motion.div>
        </div>
      </section>

      {/* Features */}
      <section className="container mx-auto px-6 py-20">
        <div className="max-w-5xl mx-auto">
          <motion.h2
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            className="text-2xl font-semibold mb-12 text-center"
          >
            Всё необходимое для обучения
          </motion.h2>

          <div className="grid md:grid-cols-2 gap-4">
            {features.map((f, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.06 }}
                className="p-6 rounded-xl border bg-card hover:shadow-sm transition-shadow"
              >
                <f.icon className="w-5 h-5 mb-4 text-muted-foreground" />
                <h3 className="font-semibold mb-2">{f.title}</h3>
                <p className="text-sm text-muted-foreground">{f.description}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="container mx-auto px-6 py-20">
        <div className="max-w-2xl mx-auto text-center border rounded-2xl p-12 bg-card">
          <h2 className="text-3xl font-bold mb-4">Готов начать?</h2>
          <p className="text-muted-foreground mb-8">
            Зарегистрируйся и получи доступ к курсам, заданиям и рейтингу.
          </p>
          <Link to="/register">
            <Button size="lg" className="gap-2">
              Создать аккаунт <ArrowRight className="w-4 h-4" />
            </Button>
          </Link>
        </div>
      </section>

      <footer className="border-t py-8">
        <div className="container mx-auto px-6 text-center text-sm text-muted-foreground">
          © 2026 CodeKids
        </div>
      </footer>
    </div>
  );
}
