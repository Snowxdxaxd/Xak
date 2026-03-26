import { motion } from 'motion/react';
import { Zap, Clock } from 'lucide-react';

export function Slide07() {
  return (
    <div className="h-full flex flex-col justify-center px-16">
      <motion.h2
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        className="text-5xl font-bold text-white mb-8"
      >
        Рендеринг — момент истины
      </motion.h2>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.2 }}
        className="bg-purple-600/20 backdrop-blur-sm border border-purple-400/30 rounded-2xl p-8 mb-8"
      >
        <p className="text-2xl text-purple-300 font-medium mb-4">Ключевая мысль:</p>
        <p className="text-xl text-white/90 leading-relaxed">
          Рендеринг (или визуализация) — это процесс превращения сцены из математических расчетов в готовую картинку.
        </p>
      </motion.div>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.4 }}
        className="mb-8"
      >
        <p className="text-xl text-white/90 leading-relaxed mb-6">
          Компьютер просчитывает путь каждого луча света: от источника до объекта, отражение, преломление, попадание в камеру. Это <span className="text-purple-300 font-medium">миллиарды вычислений</span>.
        </p>
      </motion.div>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.6 }}
        className="grid grid-cols-2 gap-6 mb-8"
      >
        <div className="bg-gradient-to-br from-green-600/20 to-green-900/20 backdrop-blur-sm border border-green-400/30 rounded-2xl p-6">
          <div className="flex items-center gap-3 mb-4">
            <Zap className="w-10 h-10 text-green-400" />
            <h3 className="text-2xl font-bold text-white">Real-time</h3>
          </div>
          <p className="text-white/70 mb-4">Рендеринг в реальном времени</p>
          <ul className="space-y-3 text-white/90">
            <li>✓ Используется в играх</li>
            <li>✓ Скорость важнее качества</li>
            <li>✓ 60+ кадров в секунду</li>
            <li>✓ Жертва точности ради производительности</li>
          </ul>
        </div>

        <div className="bg-gradient-to-br from-pink-600/20 to-pink-900/20 backdrop-blur-sm border border-pink-400/30 rounded-2xl p-6">
          <div className="flex items-center gap-3 mb-4">
            <Clock className="w-10 h-10 text-pink-400" />
            <h3 className="text-2xl font-bold text-white">Ray Tracing</h3>
          </div>
          <p className="text-white/70 mb-4">Трассировка лучей</p>
          <ul className="space-y-3 text-white/90">
            <li>✓ Используется в кино</li>
            <li>✓ Физически точные расчеты</li>
            <li>✓ Фотореализм</li>
            <li>✓ Минуты или часы на кадр</li>
          </ul>
        </div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.8 }}
        className="bg-gradient-to-r from-orange-600/20 to-red-600/20 border border-orange-400/30 rounded-xl p-6"
      >
        <h3 className="text-xl font-bold text-white mb-3">🍽 Аналогия:</h3>
        <p className="text-lg text-white/90 leading-relaxed">
          Рендеринг похож на приготовление сложного блюда. Вы подготовили все ингредиенты (модели, текстуры, свет), а теперь ставите в духовку. Вынуть рано — картинка зернистая и недоделанная. Вынуть вовремя — шедевр.
        </p>
      </motion.div>
    </div>
  );
}
