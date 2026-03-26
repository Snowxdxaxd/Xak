import { motion } from 'motion/react';
import { TrendingUp, Zap, Brain, Video, Globe } from 'lucide-react';

export function Slide11() {
  const trends = [
    {
      icon: Zap,
      name: 'Real-time Ray Tracing',
      subtitle: 'Трассировка лучей в реальном времени',
      description: 'Раньше фотореалистичные тени и отражения были доступны только при долгом рендере. Теперь современные видеокарты позволяют делать это в играх на лету.',
      color: 'from-yellow-600/20 to-yellow-900/20 border-yellow-400/30',
      iconColor: 'text-yellow-400',
    },
    {
      icon: Brain,
      name: 'Нейросети (AI) в 3D',
      subtitle: 'Искусственный интеллект',
      description: 'AI уже умеет генерировать текстуры по текстовому описанию, создавать 3D-модели из фотографий, увеличивать качество старых текстур, анимировать лица по голосу.',
      color: 'from-purple-600/20 to-purple-900/20 border-purple-400/30',
      iconColor: 'text-purple-400',
    },
    {
      icon: Video,
      name: 'Virtual Production',
      subtitle: 'Виртуальное производство',
      description: 'Технология, популяризированная сериалом «Мандалорец». Огромные LED-экраны заменяют зеленый фон. Актер видит окружение в реальном времени.',
      color: 'from-blue-600/20 to-blue-900/20 border-blue-400/30',
      iconColor: 'text-blue-400',
    },
    {
      icon: Globe,
      name: '3D в браузере (WebGL)',
      subtitle: 'Веб-технологии',
      description: 'Для просмотра сложной 3D-графики больше не нужен мощный компьютер. Современные браузеры способны рендерить сложные сцены прямо на сайте.',
      color: 'from-green-600/20 to-green-900/20 border-green-400/30',
      iconColor: 'text-green-400',
    },
  ];

  return (
    <div className="h-full flex flex-col justify-center px-16 overflow-y-auto py-8">
      <motion.h2
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        className="text-5xl font-bold text-white mb-6 flex items-center gap-4"
      >
        <TrendingUp className="w-12 h-12 text-purple-400" />
        Современные тренды
      </motion.h2>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.2 }}
        className="bg-purple-600/20 backdrop-blur-sm border border-purple-400/30 rounded-2xl p-6 mb-6"
      >
        <p className="text-xl text-white/90 leading-relaxed">
          Технологии развиваются стремительно, и граница между реальностью и виртуальностью стирается.
        </p>
      </motion.div>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.4 }}
        className="space-y-4"
      >
        {trends.map((trend, index) => (
          <motion.div
            key={index}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 + index * 0.15 }}
            className={`bg-gradient-to-br ${trend.color} backdrop-blur-sm border rounded-xl p-6`}
          >
            <div className="flex items-start gap-4">
              <trend.icon className={`w-10 h-10 ${trend.iconColor} flex-shrink-0 mt-1`} />
              <div className="flex-1">
                <h3 className="text-2xl font-bold text-white mb-1">{trend.name}</h3>
                <p className="text-sm text-white/70 mb-3 italic">{trend.subtitle}</p>
                <p className="text-white/90 leading-relaxed">{trend.description}</p>
              </div>
            </div>
          </motion.div>
        ))}
      </motion.div>
    </div>
  );
}
