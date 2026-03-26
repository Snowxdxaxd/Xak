import { motion } from 'motion/react';
import { Film, Gamepad2, Home, Car, Heart, TrendingUp } from 'lucide-react';

export function Slide08() {
  const applications = [
    {
      icon: Film,
      name: 'Кино и анимация',
      description: 'Голливудские блокбастеры, мультфильмы Pixar и DreamWorks, визуальные эффекты',
      color: 'from-purple-600/20 to-purple-900/20 border-purple-400/30',
      iconColor: 'text-purple-400',
    },
    {
      icon: Gamepad2,
      name: 'Видеоигры',
      description: 'От мобильных казуалок до AAA-проектов с открытым миром',
      color: 'from-blue-600/20 to-blue-900/20 border-blue-400/30',
      iconColor: 'text-blue-400',
    },
    {
      icon: Home,
      name: 'Архитектура и дизайн',
      description: 'Визуализация домов и квартир до начала строительства',
      color: 'from-green-600/20 to-green-900/20 border-green-400/30',
      iconColor: 'text-green-400',
    },
    {
      icon: Car,
      name: 'Промышленный дизайн',
      description: 'Автомобили, смартфоны, мебель — всё сначала проектируется в 3D',
      color: 'from-orange-600/20 to-orange-900/20 border-orange-400/30',
      iconColor: 'text-orange-400',
    },
    {
      icon: Heart,
      name: 'Медицина',
      description: '3D-модели органов для планирования операций, печать протезов',
      color: 'from-red-600/20 to-red-900/20 border-red-400/30',
      iconColor: 'text-red-400',
    },
    {
      icon: TrendingUp,
      name: 'Маркетинг и реклама',
      description: 'Идеальная еда в рекламе — это почти всегда 3D',
      color: 'from-pink-600/20 to-pink-900/20 border-pink-400/30',
      iconColor: 'text-pink-400',
    },
  ];

  return (
    <div className="h-full flex flex-col justify-center px-16 overflow-y-auto py-8">
      <motion.h2
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        className="text-5xl font-bold text-white mb-6"
      >
        Где применяется 3D-графика?
      </motion.h2>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.2 }}
        className="bg-purple-600/20 backdrop-blur-sm border border-purple-400/30 rounded-2xl p-6 mb-6"
      >
        <p className="text-xl text-white/90 leading-relaxed">
          3D давно вышла за пределы игр и мультфильмов. Она проникла во все сферы жизни.
        </p>
      </motion.div>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.4 }}
        className="grid grid-cols-2 gap-4"
      >
        {applications.map((app, index) => (
          <motion.div
            key={index}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.6 + index * 0.1 }}
            className={`bg-gradient-to-br ${app.color} backdrop-blur-sm border rounded-xl p-5`}
          >
            <div className="flex items-start gap-3">
              <app.icon className={`w-8 h-8 ${app.iconColor} flex-shrink-0 mt-1`} />
              <div className="flex-1">
                <h3 className="text-xl font-bold text-white mb-2">{app.name}</h3>
                <p className="text-sm text-white/80">{app.description}</p>
              </div>
            </div>
          </motion.div>
        ))}
      </motion.div>
    </div>
  );
}
