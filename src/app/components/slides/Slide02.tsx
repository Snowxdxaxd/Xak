import { motion } from 'motion/react';
import { Presentation } from 'lucide-react';

export function Slide02() {
  return (
    <div className="h-full flex flex-col items-center justify-center px-16">
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center gap-4 mb-12"
      >
        <Presentation className="w-12 h-12 text-purple-400" />
        <h2 className="text-5xl font-bold text-white">Введение</h2>
      </motion.div>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.3 }}
        className="max-w-4xl text-center"
      >
        <p className="text-2xl text-white/90 leading-relaxed mb-6">
          Добрый день! Сегодня мы поговорим о том, что окружает нас повсюду: в кино, в играх, в рекламе и даже в медицине.
        </p>
        <p className="text-xl text-white/80 leading-relaxed mb-6">
          Мы разберем, из чего состоит 3D-графика, как она создается и почему одни изображения выглядят как фотография, а другие — как мультфильм.
        </p>
        <p className="text-xl text-purple-300 font-medium">
          И главное — я покажу, что в создании 3D нет магии, есть только математика, физика и немного искусства.
        </p>
      </motion.div>
    </div>
  );
}
