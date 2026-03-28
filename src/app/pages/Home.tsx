import React, { useMemo } from 'react';
import { Link } from 'react-router';
import {
  GraduationCap, ArrowRight, BookOpen, Trophy, MessageCircle,
  CheckCircle, Code2, Users, Zap, Lock, Globe,
  Terminal, Play,
} from 'lucide-react';
import { Button } from '../components/ui/button';
import { ThemeToggle } from '../components/ThemeToggle';
import { Badge } from '../components/ui/badge';
import { motion } from 'motion/react';
import { useLanguage } from '../context/LanguageContext';
import { getHomeCopy } from '../i18n/homeCopy';

const LANG_BADGES = [
  { name: 'Python', color: 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20' },
  { name: 'JavaScript', color: 'bg-yellow-500/10 text-yellow-600 dark:text-yellow-400 border-yellow-500/20' },
  { name: 'HTML & CSS', color: 'bg-orange-500/10 text-orange-600 dark:text-orange-400 border-orange-500/20' },
  { name: '', color: 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20', dynamic: true },
  { name: 'SQL', color: 'bg-green-500/10 text-green-600 dark:text-green-400 border-green-500/20' },
];

const FEATURE_META = [
  { icon: BookOpen, color: 'text-blue-500', bg: 'bg-blue-500/10' },
  { icon: Terminal, color: 'text-green-500', bg: 'bg-green-500/10' },
  { icon: CheckCircle, color: 'text-purple-500', bg: 'bg-purple-500/10' },
  { icon: Users, color: 'text-orange-500', bg: 'bg-orange-500/10' },
  { icon: Trophy, color: 'text-yellow-500', bg: 'bg-yellow-500/10' },
  { icon: MessageCircle, color: 'text-cyan-500', bg: 'bg-cyan-500/10' },
];

const ROLE_META = [
  { icon: GraduationCap, color: 'text-blue-500', bg: 'bg-blue-500/10', border: 'border-blue-500/20' },
  { icon: BookOpen, color: 'text-green-500', bg: 'bg-green-500/10', border: 'border-green-500/20' },
  { icon: Users, color: 'text-purple-500', bg: 'bg-purple-500/10', border: 'border-purple-500/20' },
];

export function Home() {
  const { t, lang, setLang } = useLanguage();
  const h = useMemo(() => getHomeCopy(lang), [lang]);

  return (
    <div className="min-h-screen bg-background text-foreground overflow-x-hidden">
      {/* ── Header ── */}
      <header className="border-b bg-background/95 backdrop-blur sticky top-0 z-50">
        <div className="container mx-auto px-6 h-14 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2 font-bold text-base">
            <GraduationCap className="w-5 h-5" />
            CodeKids
          </Link>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setLang(lang === 'ru' ? 'en' : 'ru')}
              className="px-2 py-1 rounded text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
            >
              {lang === 'ru' ? 'EN' : 'RU'}
            </button>
            <ThemeToggle />
            <Link to="/login">
              <Button variant="ghost" size="sm">{t('home_login_btn')}</Button>
            </Link>
            <Link to="/register">
              <Button size="sm" className="gap-1.5">
                {t('home_start_btn')} <ArrowRight className="w-3.5 h-3.5" />
              </Button>
            </Link>
          </div>
        </div>
      </header>

      {/* ── Hero ── */}
      <section className="relative container mx-auto px-6 pt-24 pb-20 md:pt-36 md:pb-28">
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[400px] bg-primary/5 rounded-full blur-3xl" />
        </div>

        <div className="max-w-3xl mx-auto text-center relative">
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            className="inline-flex items-center gap-2 border rounded-full px-4 py-1.5 text-sm text-muted-foreground mb-8 bg-background"
          >
            <Zap className="w-3.5 h-3.5 text-yellow-500" />
            {h.heroBadge}
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.08 }}
            className="text-5xl md:text-7xl font-bold tracking-tight mb-6 leading-[1.05]"
          >
            {h.heroH1}
            <br />
            <span className="text-muted-foreground font-normal">{h.heroAccent}</span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.16 }}
            className="text-lg text-muted-foreground mb-6 max-w-xl mx-auto leading-relaxed"
          >
            {h.heroLead}
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.22 }}
            className="flex flex-wrap items-center justify-center gap-2 mb-10"
          >
            {LANG_BADGES.map((l, idx) => (
              <span
                key={idx}
                className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium border ${l.color}`}
              >
                <Code2 className="w-3 h-3" />
                {l.dynamic ? h.langAlgo : l.name}
              </span>
            ))}
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.28 }}
            className="flex items-center justify-center gap-3 flex-wrap"
          >
            <Link to="/register">
              <Button size="lg" className="gap-2 h-12 px-6">
                {t('home_start_btn')} <ArrowRight className="w-4 h-4" />
              </Button>
            </Link>
            <Link to="/login">
              <Button size="lg" variant="outline" className="gap-2 h-12 px-6">
                <Play className="w-4 h-4" /> {t('home_login_btn')}
              </Button>
            </Link>
          </motion.div>
        </div>
      </section>

      {/* ── Stats ── */}
      <section className="border-y bg-muted/30">
        <div className="container mx-auto px-6 py-10">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 max-w-4xl mx-auto">
            {h.stats.map((s, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 12 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.05 }}
                className="text-center"
              >
                <div className="text-3xl font-bold mb-1">{s.value}</div>
                <div className="text-xs text-muted-foreground">{s.label}</div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Features ── */}
      <section className="container mx-auto px-6 py-24">
        <div className="max-w-5xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <h2 className="text-3xl font-bold mb-3">{h.featTitle}</h2>
            <p className="text-muted-foreground max-w-xl mx-auto">{h.featSubtitle}</p>
          </motion.div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {h.features.map((f, i) => {
              const meta = FEATURE_META[i];
              return (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.06 }}
                  className="p-6 rounded-xl border bg-card hover:shadow-md transition-all hover:-translate-y-0.5 group"
                >
                  <div className={`w-10 h-10 rounded-lg ${meta.bg} flex items-center justify-center mb-4 group-hover:scale-110 transition-transform`}>
                    <meta.icon className={`w-5 h-5 ${meta.color}`} />
                  </div>
                  <h3 className="font-semibold mb-2">{f.title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">{f.desc}</p>
                </motion.div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── How it works ── */}
      <section className="border-y bg-muted/20">
        <div className="container mx-auto px-6 py-24 max-w-5xl">
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <h2 className="text-3xl font-bold mb-3">{h.howTitle}</h2>
            <p className="text-muted-foreground">{h.howSubtitle}</p>
          </motion.div>

          <div className="grid md:grid-cols-4 gap-6">
            {h.steps.map((s, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.08 }}
                className="relative"
              >
                {i < h.steps.length - 1 && (
                  <div className="hidden md:block absolute top-6 left-[calc(50%+24px)] right-0 h-px bg-border" />
                )}
                <div className="flex flex-col items-center text-center">
                  <div className="w-12 h-12 rounded-full border-2 border-primary/30 bg-primary/5 flex items-center justify-center mb-4 text-sm font-bold text-primary relative z-10">
                    {s.num}
                  </div>
                  <h3 className="font-semibold mb-2 text-sm">{s.title}</h3>
                  <p className="text-xs text-muted-foreground leading-relaxed">{s.desc}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Roles section ── */}
      <section className="container mx-auto px-6 py-24 max-w-5xl">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <h2 className="text-3xl font-bold mb-3">{h.rolesTitle}</h2>
          <p className="text-muted-foreground">{h.rolesSubtitle}</p>
        </motion.div>

        <div className="grid md:grid-cols-3 gap-6">
          {h.roles.map((r, i) => {
            const meta = ROLE_META[i];
            return (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.08 }}
                className={`p-6 rounded-xl border ${meta.border} bg-card`}
              >
                <div className={`w-10 h-10 rounded-lg ${meta.bg} flex items-center justify-center mb-4`}>
                  <meta.icon className={`w-5 h-5 ${meta.color}`} />
                </div>
                <div className="flex items-center gap-2 mb-4">
                  <h3 className="font-semibold">{r.role}</h3>
                  <Badge variant="outline" className={`text-xs ${meta.color} border-current`}>{r.badge}</Badge>
                </div>
                <ul className="space-y-2">
                  {r.items.map((item, j) => (
                    <li key={j} className="flex items-center gap-2 text-sm text-muted-foreground">
                      <CheckCircle className={`w-3.5 h-3.5 flex-shrink-0 ${meta.color}`} />
                      {item}
                    </li>
                  ))}
                </ul>
              </motion.div>
            );
          })}
        </div>
      </section>

      {/* ── Privacy/access section ── */}
      <section className="border-t bg-muted/20">
        <div className="container mx-auto px-6 py-16 max-w-3xl text-center">
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="flex flex-col items-center gap-4"
          >
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-full border text-sm text-muted-foreground">
                <Globe className="w-3.5 h-3.5" /> {h.privacyPublic}
              </div>
              <span className="text-muted-foreground text-sm">+</span>
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-full border border-primary/30 text-sm text-primary">
                <Lock className="w-3.5 h-3.5" /> {h.privacyPrivate}
              </div>
            </div>
            <p className="text-muted-foreground text-sm max-w-md">{h.privacyDesc}</p>
          </motion.div>
        </div>
      </section>

      {/* ── CTA ── */}
      <section className="container mx-auto px-6 py-24">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="max-w-2xl mx-auto text-center rounded-2xl border bg-card p-12 relative overflow-hidden"
        >
          <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-transparent pointer-events-none" />

          <div className="relative">
            <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-6">
              <GraduationCap className="w-7 h-7 text-primary" />
            </div>
            <h2 className="text-3xl font-bold mb-3">{h.ctaTitle}</h2>
            <p className="text-muted-foreground mb-8 max-w-sm mx-auto">{h.ctaDesc}</p>
            <div className="flex items-center justify-center gap-3 flex-wrap">
              <Link to="/register">
                <Button size="lg" className="gap-2 h-12 px-8">
                  {h.ctaCreate} <ArrowRight className="w-4 h-4" />
                </Button>
              </Link>
              <Link to="/login">
                <Button size="lg" variant="outline" className="h-12 px-8">{h.ctaHaveAccount}</Button>
              </Link>
            </div>
          </div>
        </motion.div>
      </section>

      {/* ── Footer ── */}
      <footer className="border-t py-8">
        <div className="container mx-auto px-6 flex items-center justify-between text-sm text-muted-foreground flex-wrap gap-3">
          <div className="flex items-center gap-2 font-medium">
            <GraduationCap className="w-4 h-4" />
            CodeKids
          </div>
          <span>{h.footerTagline}</span>
          <div className="flex items-center gap-4">
            <Link to="/login" className="hover:text-foreground transition-colors">{h.footerLogin}</Link>
            <Link to="/register" className="hover:text-foreground transition-colors">{h.footerReg}</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
