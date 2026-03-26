import { motion } from 'motion/react';
import { Sun, Lightbulb, Square } from 'lucide-react';

export function Slide06() {
  const lightTypes = [
    {
      icon: Lightbulb,
      name: 'Point Light (точечный)',
      description: 'Как лампочка — светит во все стороны',
      color: 'from-yellow-600/20 to-yellow-900/20 border-yellow-400/30',
      iconColor: 'text-yellow-400',
    },
    {
      icon: Sun,
      name: 'Directional Light (солнце)',
      description: 'Бесконечно далекий источник, дает параллельные лучи. Создает жесткие тени.',
      color: 'from-orange-600/20 to-orange-900/20 border-orange-400/30',
      iconColor: 'text-orange-400',
    },
    {
      icon: Square,
      name: 'Area Light (площадной)',
      description: 'Мягкий свет, как от окна или софита. Дает красивые плавные тени.',
      color: 'from-blue-600/20 to-blue-900/20 border-blue-400/30',
      iconColor: 'text-blue-400',
    },
  ];

  return (
    <div className="h-full flex flex-col justify-center px-16 overflow-y-auto">
      <motion.h2
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        className="text-5xl font-bold text-white mb-6"
      >
        Свет — главный художник
      </motion.h2>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.2 }}
        className="bg-purple-600/20 backdrop-blur-sm border border-purple-400/30 rounded-2xl p-6 mb-6"
      >
        <p className="text-xl text-purple-300 font-medium mb-3">Ключевая мысль:</p>
        <p className="text-lg text-white/90 leading-relaxed">
          Без света мы ничего не увидим. В 3D-графике свет не только освещает, но и создает настроение, форму и атмосферу.
        </p>
      </motion.div>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.4 }}
        className="space-y-4 mb-6"
      >
        {lightTypes.map((light, index) => (
          <motion.div
            key={index}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.6 + index * 0.2 }}
            className={`bg-gradient-to-br ${light.color} backdrop-blur-sm border rounded-xl p-5`}
          >
            <div className="flex items-start gap-4">
              <light.icon className={`w-10 h-10 ${light.iconColor} flex-shrink-0 mt-1`} />
              <div className="flex-1">
                <h3 className="text-xl font-bold text-white mb-2">{light.name}</h3>
                <p className="text-white/90">{light.description}</p>
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
        <h3 className="text-xl font-bold text-white mb-3">Как свет меняет восприятие:</h3>
        <div className="space-y-2 text-white/90">
          <p>• Освещенный спереди — выглядит плоским</p>
          <p>• Освещенный сбоку — приобретает объем</p>
          <p>• Освещенный снизу — выглядит зловеще</p>
        </div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.4 }}
        className="mt-4 bg-cyan-600/20 border border-cyan-400/30 rounded-lg p-4"
      >
        <p className="text-lg text-white/90 text-center">
          💡 В 3D-графике художник контролирует каждый источник света. Это расстановка софитов как в кино.
        </p>
      </motion.div>
    </div>
  );
}
