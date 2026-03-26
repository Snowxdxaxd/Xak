import { motion } from 'motion/react';
import { Code2 } from 'lucide-react';

export function Slide10() {
  const software = [
    {
      name: 'Blender',
      use: 'Универсальный инструмент: моделинг, анимация, рендер, монтаж',
      feature: 'Бесплатный, открытый код. Сейчас переживает пик популярности',
      color: 'from-orange-600/30 to-orange-900/30 border-orange-400/40',
    },
    {
      name: 'Autodesk Maya',
      use: 'Кино, анимация, сложные персонажи',
      feature: 'Индустриальный стандарт в Голливуде',
      color: 'from-blue-600/30 to-blue-900/30 border-blue-400/40',
    },
    {
      name: '3ds Max',
      use: 'Архитектурная визуализация, игры',
      feature: 'Мощный инструмент для моделирования',
      color: 'from-green-600/30 to-green-900/30 border-green-400/40',
    },
    {
      name: 'ZBrush',
      use: 'Скульптинг (лепка) высокополигональных моделей',
      feature: 'Позволяет создавать невероятную детализацию: поры, морщины, чешую',
      color: 'from-purple-600/30 to-purple-900/30 border-purple-400/40',
    },
    {
      name: 'Houdini',
      use: 'Сложные спецэффекты: взрывы, симуляции жидкостей, разрушения',
      feature: 'Используется для самых зрелищных сцен в кино',
      color: 'from-red-600/30 to-red-900/30 border-red-400/40',
    },
    {
      name: 'Unreal Engine / Unity',
      use: 'Игровые движки, интерактивная 3D-графика',
      feature: 'Позволяют создавать игры и приложения с графикой реального времени',
      color: 'from-cyan-600/30 to-cyan-900/30 border-cyan-400/40',
    },
  ];

  return (
    <div className="h-full flex flex-col justify-center px-16 overflow-y-auto py-8">
      <motion.h2
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        className="text-5xl font-bold text-white mb-6 flex items-center gap-4"
      >
        <Code2 className="w-12 h-12 text-purple-400" />
        Программное обеспечение
      </motion.h2>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.2 }}
        className="bg-purple-600/20 backdrop-blur-sm border border-purple-400/30 rounded-2xl p-6 mb-6"
      >
        <p className="text-xl text-white/90 leading-relaxed">
          Инструментов много, и у каждого свои сильные стороны.
        </p>
      </motion.div>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.4 }}
        className="grid grid-cols-1 gap-4"
      >
        {software.map((sw, index) => (
          <motion.div
            key={index}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.5 + index * 0.1 }}
            className={`bg-gradient-to-r ${sw.color} backdrop-blur-sm border rounded-xl p-5`}
          >
            <div className="flex items-start gap-4">
              <div className="flex-1">
                <h3 className="text-2xl font-bold text-white mb-2">{sw.name}</h3>
                <p className="text-white/90 mb-2">
                  <span className="font-medium">Для чего:</span> {sw.use}
                </p>
                <p className="text-sm text-white/70 italic">
                  ✨ {sw.feature}
                </p>
              </div>
            </div>
          </motion.div>
        ))}
      </motion.div>
    </div>
  );
}
