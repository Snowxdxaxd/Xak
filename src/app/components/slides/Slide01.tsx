import { motion } from 'motion/react';
import { Box, Sparkles } from 'lucide-react';

export function Slide01() {
  return (
    <div className="h-full flex flex-col items-center justify-center text-center">
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ type: 'spring', duration: 0.8 }}
        className="mb-8"
      >
        <Box className="w-32 h-32 text-purple-400 mx-auto" strokeWidth={1.5} />
      </motion.div>
      
      <motion.h1
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="text-6xl font-bold text-white mb-6"
      >
        3D-графика: как создается<br />виртуальная реальность
      </motion.h1>
      
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.6 }}
        className="flex items-center gap-2 text-2xl text-purple-300"
      >
        <Sparkles className="w-6 h-6" />
        <p>От математической точки до голливудского блокбастера</p>
        <Sparkles className="w-6 h-6" />
      </motion.div>
    </div>
  );
}
