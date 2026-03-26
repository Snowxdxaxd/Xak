import { motion } from 'motion/react';
import { Image, Palette, Sparkles } from 'lucide-react';

export function Slide05() {
  const textures = [
    {
      icon: Palette,
      name: 'Diffuse (цвет)',
      description: 'Определяет базовый цвет объекта',
      example: 'Дерево — коричневое, металл — серый',
      color: 'from-orange-600/20 to-orange-900/20 border-orange-400/30',
      iconColor: 'text-orange-400',
    },
    {
      icon: Image,
      name: 'Normal map (рельеф)',
      description: 'Создает иллюзию объема без добавления полигонов',
      example: 'Шероховатость кирпичной стены на плоской поверхности',
      color: 'from-purple-600/20 to-purple-900/20 border-purple-400/30',
      iconColor: 'text-purple-400',
    },
    {
      icon: Sparkles,
      name: 'Roughness (шероховатость)',
      description: 'Определяет, будет ли поверхность матовой или зеркальной',
      example: 'Матовое дерево vs полированный металл',
      color: 'from-cyan-600/20 to-cyan-900/20 border-cyan-400/30',
      iconColor: 'text-cyan-400',
    },
  ];

  return (
    <div className="h-full flex flex-col justify-center px-16 overflow-y-auto">
      <motion.h2
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        className="text-5xl font-bold text-white mb-6"
      >
        Каркас и текстуры
      </motion.h2>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.2 }}
        className="bg-purple-600/20 backdrop-blur-sm border border-purple-400/30 rounded-2xl p-6 mb-6"
      >
        <p className="text-xl text-purple-300 font-medium mb-3">Ключевая мысль:</p>
        <p className="text-lg text-white/90 leading-relaxed">
          Полигональная сетка — это скелет. Чтобы объект стал видимым и красивым, ему нужна «кожа» и «одежда».
        </p>
      </motion.div>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.4 }}
        className="mb-6"
      >
        <p className="text-xl text-white/90 mb-2">Текстуры — это:</p>
        <p className="text-lg text-white/80 leading-relaxed">
          Цифровые изображения, которые «натягиваются» на 3D-модель.
        </p>
      </motion.div>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.6 }}
        className="space-y-4"
      >
        {textures.map((texture, index) => (
          <motion.div
            key={index}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.8 + index * 0.2 }}
            className={`bg-gradient-to-br ${texture.color} backdrop-blur-sm border rounded-xl p-5`}
          >
            <div className="flex items-start gap-4">
              <texture.icon className={`w-10 h-10 ${texture.iconColor} flex-shrink-0 mt-1`} />
              <div className="flex-1">
                <h3 className="text-xl font-bold text-white mb-2">{texture.name}</h3>
                <p className="text-white/90 mb-2">{texture.description}</p>
                <p className="text-sm text-white/70 italic">Пример: {texture.example}</p>
              </div>
            </div>
          </motion.div>
        ))}
      </motion.div>
    </div>
  );
}
