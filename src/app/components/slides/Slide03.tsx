import { motion } from 'motion/react';
import { Box, Eye, Lightbulb } from 'lucide-react';

export function Slide03() {
  const features = [
    { icon: Eye, text: 'Мы можем посмотреть на объект с любой стороны' },
    { icon: Box, text: 'Мы видим, какие предметы ближе, а какие дальше' },
    { icon: Lightbulb, text: 'Свет и тень ведут себя так же, как в реальном мире' },
  ];

  return (
    <div className="h-full flex flex-col justify-center px-16">
      <motion.h2
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        className="text-5xl font-bold text-white mb-8"
      >
        Что такое 3D-графика?
      </motion.h2>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.2 }}
        className="bg-purple-600/20 backdrop-blur-sm border border-purple-400/30 rounded-2xl p-8 mb-8"
      >
        <p className="text-2xl text-purple-300 font-medium mb-4">Ключевая мысль:</p>
        <p className="text-xl text-white/90 leading-relaxed">
          3D-графика — это способ создания объемных изображений и анимации с помощью компьютера.
        </p>
      </motion.div>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.4 }}
        className="mb-8"
      >
        <p className="text-xl text-white/90 leading-relaxed mb-6">
          Наш экран плоский. У него есть только ширина и высота. Задача 3D-графики — добавить третье измерение — <span className="text-purple-300 font-medium">глубину</span>. Это иллюзия, но очень убедительная.
        </p>
      </motion.div>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.6 }}
        className="space-y-4"
      >
        <p className="text-xl text-white/90 font-medium mb-4">Что дает третье измерение:</p>
        {features.map((feature, index) => (
          <motion.div
            key={index}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.8 + index * 0.2 }}
            className="flex items-center gap-4 bg-white/5 rounded-lg p-4"
          >
            <feature.icon className="w-8 h-8 text-purple-400 flex-shrink-0" />
            <p className="text-lg text-white/90">{feature.text}</p>
          </motion.div>
        ))}
      </motion.div>
    </div>
  );
}