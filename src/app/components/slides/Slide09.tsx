import { motion } from 'motion/react';
import { Users, Box, Palette, Settings, User, Lightbulb, Layers } from 'lucide-react';

export function Slide09() {
  const professions = [
    {
      icon: Box,
      name: '3D-моделлер',
      description: 'Создает формы, персонажей, предметы, окружение. Работает с полигонами.',
      color: 'text-blue-400',
    },
    {
      icon: Palette,
      name: 'Текстурщик',
      description: 'Отвечает за материалы, цвет, рельеф. Делает так, чтобы дерево выглядело как дерево.',
      color: 'text-purple-400',
    },
    {
      icon: Settings,
      name: 'Риггер',
      description: 'Создает скелет (риг) для персонажей. Позволяет аниматору управлять моделью.',
      color: 'text-orange-400',
    },
    {
      icon: User,
      name: 'Аниматор',
      description: 'Оживляет персонажей. Заставляет их двигаться, говорить, выражать эмоции.',
      color: 'text-green-400',
    },
    {
      icon: Lightbulb,
      name: 'Осветитель',
      description: 'Расставляет свет, создает настроение и композицию.',
      color: 'text-yellow-400',
    },
    {
      icon: Layers,
      name: 'Композер',
      description: 'Собирает финальный кадр, объединяя 3D-рендер с реальными съемками.',
      color: 'text-pink-400',
    },
  ];

  return (
    <div className="h-full flex flex-col justify-center px-16 overflow-y-auto py-8">
      <motion.h2
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        className="text-5xl font-bold text-white mb-6 flex items-center gap-4"
      >
        <Users className="w-12 h-12 text-purple-400" />
        Кто это создает?
      </motion.h2>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.2 }}
        className="bg-purple-600/20 backdrop-blur-sm border border-purple-400/30 rounded-2xl p-6 mb-6"
      >
        <p className="text-xl text-white/90 leading-relaxed">
          3D-графика — это командная работа. Редко один человек делает всё.
        </p>
      </motion.div>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.4 }}
        className="grid grid-cols-2 gap-4 mb-6"
      >
        {professions.map((prof, index) => (
          <motion.div
            key={index}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 + index * 0.1 }}
            className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl p-5 hover:bg-white/10 transition-all"
          >
            <div className="flex items-start gap-3">
              <prof.icon className={`w-8 h-8 ${prof.color} flex-shrink-0 mt-1`} />
              <div className="flex-1">
                <h3 className="text-xl font-bold text-white mb-2">{prof.name}</h3>
                <p className="text-sm text-white/80">{prof.description}</p>
              </div>
            </div>
          </motion.div>
        ))}
      </motion.div>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.2 }}
        className="bg-gradient-to-r from-purple-600/20 to-pink-600/20 border border-purple-400/30 rounded-xl p-6"
      >
        <p className="text-lg text-white/90 text-center">
          🎨 В индустрии ценятся не только технические навыки, но и понимание классического искусства: композиции, цвета, анатомии, перспективы
        </p>
      </motion.div>
    </div>
  );
}