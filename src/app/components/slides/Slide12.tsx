import { motion } from 'motion/react';
import { Award, Calculator, Atom, Palette, Sparkles } from 'lucide-react';

export function Slide12() {
  const elements = [
    { icon: Calculator, text: 'Математики', detail: '(координаты, векторы, матрицы)', color: 'text-blue-400' },
    { icon: Atom, text: 'Физики', detail: '(поведение света, отражения, преломления)', color: 'text-purple-400' },
    { icon: Palette, text: 'Искусства', detail: '(композиция, цвет, анатомия, история)', color: 'text-pink-400' },
  ];

  return (
    <div className="h-full flex flex-col justify-center px-16">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="flex items-center justify-center gap-4 mb-8"
      >
        <Award className="w-16 h-16 text-purple-400" />
        <h2 className="text-6xl font-bold text-white">Заключение</h2>
      </motion.div>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.3 }}
        className="mb-8"
      >
        <p className="text-2xl text-white/90 leading-relaxed text-center mb-8">
          Мы прошли путь от полигонального каркаса до фотореалистичного изображения с трассировкой лучей.
        </p>
        <p className="text-xl text-white/80 leading-relaxed text-center mb-8">
          Мы увидели, что 3D-графика — это не просто «нажатие кнопки в программе».
        </p>
      </motion.div>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.6 }}
        className="bg-gradient-to-r from-purple-600/20 to-pink-600/20 backdrop-blur-sm border border-purple-400/30 rounded-2xl p-8 mb-8"
      >
        <p className="text-2xl text-white font-medium mb-6 text-center">Это сочетание:</p>
        <div className="space-y-4">
          {elements.map((element, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.9 + index * 0.2 }}
              className="flex items-center gap-4 bg-white/5 rounded-lg p-4"
            >
              <element.icon className={`w-10 h-10 ${element.color} flex-shrink-0`} />
              <div>
                <span className="text-2xl text-white font-medium">{element.text}</span>
                <span className="text-lg text-white/70 ml-2">{element.detail}</span>
              </div>
            </motion.div>
          ))}
        </div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.5 }}
        className="bg-gradient-to-r from-cyan-600/20 to-blue-600/20 border border-cyan-400/30 rounded-xl p-6 mb-6"
      >
        <p className="text-xl text-white/90 leading-relaxed text-center">
          Самое интересное, что 3D-графика становится доступнее. Бесплатный Blender по возможностям не уступает коммерческим пакетам. Нейросети ускоряют рутинные процессы.
        </p>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 1.8 }}
        className="bg-gradient-to-r from-purple-500 to-pink-500 rounded-2xl p-8 text-center"
      >
        <div className="flex items-center justify-center gap-3 mb-4">
          <Sparkles className="w-8 h-8 text-white" />
          <p className="text-3xl font-bold text-white">Мир трехмерной графики открыт для всех</p>
          <Sparkles className="w-8 h-8 text-white" />
        </div>
        <p className="text-xl text-white/90 leading-relaxed">
          Возможно, именно вы создадите следующего персонажа, который покорит миллионы зрителей, или виртуальный мир, в котором захотят жить люди.
        </p>
      </motion.div>

      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 2.1 }}
        className="text-3xl text-white/90 text-center mt-8 font-medium"
      >
        Спасибо за внимание! 🎬
      </motion.p>
    </div>
  );
}
