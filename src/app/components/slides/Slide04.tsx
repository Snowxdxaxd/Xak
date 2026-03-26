import { motion } from 'motion/react';
import { Triangle, Hexagon } from 'lucide-react';

export function Slide04() {
  return (
    <div className="h-full flex flex-col justify-center px-16">
      <motion.h2
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        className="text-5xl font-bold text-white mb-8"
      >
        Из чего состоит 3D-объект?
      </motion.h2>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.2 }}
        className="bg-purple-600/20 backdrop-blur-sm border border-purple-400/30 rounded-2xl p-8 mb-8"
      >
        <p className="text-2xl text-purple-300 font-medium mb-4">Ключевая мысль:</p>
        <p className="text-xl text-white/90 leading-relaxed">
          Любая 3D-модель состоит из маленьких кирпичиков — полигонов.
        </p>
      </motion.div>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.4 }}
        className="mb-8"
      >
        <p className="text-xl text-white/90 leading-relaxed mb-6">
          Представьте, что вы обматываете статую новогодней гирляндой. Гирлянда повторяет форму статуи. Чем больше лампочек, тем точнее форма. В 3D то же самое: полигоны — это треугольники или четырехугольники, которые образуют поверхность.
        </p>
      </motion.div>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.6 }}
        className="grid grid-cols-2 gap-6"
      >
        <div className="bg-gradient-to-br from-blue-600/20 to-blue-900/20 backdrop-blur-sm border border-blue-400/30 rounded-2xl p-6">
          <div className="flex items-center gap-3 mb-4">
            <Triangle className="w-8 h-8 text-blue-400" />
            <h3 className="text-2xl font-bold text-white">Low Poly</h3>
          </div>
          <p className="text-white/70 mb-4">Мало полигонов</p>
          <ul className="space-y-2 text-white/90">
            <li>• Угловатые формы</li>
            <li>• Стилизованный вид</li>
            <li>• Легко для компьютера</li>
            <li>• Мобильные игры</li>
          </ul>
        </div>

        <div className="bg-gradient-to-br from-pink-600/20 to-pink-900/20 backdrop-blur-sm border border-pink-400/30 rounded-2xl p-6">
          <div className="flex items-center gap-3 mb-4">
            <Hexagon className="w-8 h-8 text-pink-400" />
            <h3 className="text-2xl font-bold text-white">High Poly</h3>
          </div>
          <p className="text-white/70 mb-4">Много полигонов</p>
          <ul className="space-y-2 text-white/90">
            <li>• Гладкие поверхности</li>
            <li>• Высокая детализация</li>
            <li>• Требует мощного железа</li>
            <li>• Кино и AAA-игры</li>
          </ul>
        </div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.8 }}
        className="mt-6 bg-yellow-600/20 border border-yellow-400/30 rounded-lg p-4"
      >
        <p className="text-lg text-white/90 text-center">
          ⚡ Количество полигонов — это всегда компромисс между красотой и производительностью
        </p>
      </motion.div>
    </div>
  );
}
