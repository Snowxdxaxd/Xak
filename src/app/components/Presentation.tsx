import { useState } from 'react';
import { ChevronLeft, ChevronRight, Menu, X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { slides } from './slides-data';
import { Button } from './ui/button';

export function Presentation() {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [showMenu, setShowMenu] = useState(false);

  const nextSlide = () => {
    if (currentSlide < slides.length - 1) {
      setCurrentSlide(currentSlide + 1);
    }
  };

  const prevSlide = () => {
    if (currentSlide > 0) {
      setCurrentSlide(currentSlide - 1);
    }
  };

  const goToSlide = (index: number) => {
    setCurrentSlide(index);
    setShowMenu(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowRight') nextSlide();
    if (e.key === 'ArrowLeft') prevSlide();
    if (e.key === 'Escape') setShowMenu(false);
  };

  const CurrentSlideComponent = slides[currentSlide].component;

  return (
    <div 
      className="relative w-full h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 overflow-hidden"
      onKeyDown={handleKeyDown}
      tabIndex={0}
    >
      {/* Slide Content */}
      <div className="absolute inset-0 flex items-center justify-center p-8">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentSlide}
            initial={{ opacity: 0, x: 100 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -100 }}
            transition={{ duration: 0.3 }}
            className="w-full h-full max-w-7xl"
          >
            <CurrentSlideComponent />
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Navigation Controls */}
      <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 flex items-center gap-4 z-10">
        <Button
          onClick={prevSlide}
          disabled={currentSlide === 0}
          variant="outline"
          size="icon"
          className="bg-white/10 hover:bg-white/20 border-white/20 text-white backdrop-blur-sm disabled:opacity-30"
        >
          <ChevronLeft className="w-5 h-5" />
        </Button>
        
        <div className="bg-white/10 backdrop-blur-sm px-4 py-2 rounded-full text-white border border-white/20">
          {currentSlide + 1} / {slides.length}
        </div>

        <Button
          onClick={nextSlide}
          disabled={currentSlide === slides.length - 1}
          variant="outline"
          size="icon"
          className="bg-white/10 hover:bg-white/20 border-white/20 text-white backdrop-blur-sm disabled:opacity-30"
        >
          <ChevronRight className="w-5 h-5" />
        </Button>
      </div>

      {/* Menu Button */}
      <div className="absolute top-8 right-8 z-20">
        <Button
          onClick={() => setShowMenu(!showMenu)}
          variant="outline"
          size="icon"
          className="bg-white/10 hover:bg-white/20 border-white/20 text-white backdrop-blur-sm"
        >
          {showMenu ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </Button>
      </div>

      {/* Slide Menu */}
      <AnimatePresence>
        {showMenu && (
          <motion.div
            initial={{ opacity: 0, x: 300 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 300 }}
            className="absolute top-0 right-0 h-full w-96 bg-slate-900/95 backdrop-blur-lg border-l border-white/10 z-10 p-8 overflow-y-auto"
          >
            <h3 className="text-2xl font-bold text-white mb-6">Содержание</h3>
            <div className="space-y-2">
              {slides.map((slide, index) => (
                <button
                  key={index}
                  onClick={() => goToSlide(index)}
                  className={`w-full text-left p-3 rounded-lg transition-all ${
                    currentSlide === index
                      ? 'bg-purple-600 text-white'
                      : 'bg-white/5 text-white/70 hover:bg-white/10 hover:text-white'
                  }`}
                >
                  <div className="text-sm opacity-70">Слайд {index + 1}</div>
                  <div className="font-medium">{slide.title}</div>
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Progress Bar */}
      <div className="absolute top-0 left-0 w-full h-1 bg-white/10">
        <motion.div
          className="h-full bg-gradient-to-r from-purple-500 to-pink-500"
          initial={{ width: 0 }}
          animate={{ width: `${((currentSlide + 1) / slides.length) * 100}%` }}
          transition={{ duration: 0.3 }}
        />
      </div>
    </div>
  );
}
