import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Star, Menu, Volume2, VolumeX, Radio, Info } from 'lucide-react';
import confetti from 'canvas-confetti';
import { useNavigate } from 'react-router-dom';

const STARS = Array.from({ length: 15 }).map((_, i) => ({
  id: i,
  x: Math.random() * 100,
  y: Math.random() * 60,
  size: 8 + Math.random() * 12,
  duration: 2 + Math.random() * 2,
  delay: Math.random() * 2
}));

const FUN_FACTS = [
  "Did you know? Our flag's green stands for the majority and white for minorities!",
  "Pakistan became independent on 14th August 1947, a day of immense joy and freedom.",
  "The national anthem of Pakistan was written by Hafeez Jullundhri.",
  "Minar-e-Pakistan marks the spot where the Pakistan Resolution was passed in 1940."
];

export default function AzaadiHero() {
  const [factIndex, setFactIndex] = useState(0);
  const [factsFound, setFactsFound] = useState(0);
  const [isRadioOn, setIsRadioOn] = useState(false);
  const [muted, setMuted] = useState(false);
  const [showFact, setShowFact] = useState(false);
  const navigate = useNavigate();

  const handleRadioTap = () => {
    setIsRadioOn(true);
    if (!showFact) {
      setShowFact(true);
      setFactsFound(Math.min(FUN_FACTS.length, factsFound + 1));
    } else {
      const nextIdx = (factIndex + 1) % FUN_FACTS.length;
      setFactIndex(nextIdx);
      if (nextIdx >= factsFound && factsFound < FUN_FACTS.length) {
        setFactsFound(factsFound + 1);
      }
    }
  };

  const handleStartGame = () => {
    confetti({
      particleCount: 100,
      spread: 70,
      origin: { y: 0.6 },
      colors: ['#2E4A24', '#E8D9B0', '#F3EFE1', '#FFFFFF']
    });
    setTimeout(() => {
      navigate('/start');
    }, 1500);
  };

  return (
    <div className="relative min-h-screen overflow-hidden bg-radial-gradient text-cream">
      <div className="grain-overlay"></div>
      
      {/* Floating Stars */}
      <div className="absolute inset-0 pointer-events-none z-10">
        {STARS.map((s) => (
          <motion.div
            key={s.id}
            className="absolute text-gold-bright"
            style={{ left: `${s.x}%`, top: `${s.y}%`, width: s.size, height: s.size }}
            animate={{ opacity: [0.3, 1, 0.3], scale: [0.8, 1.1, 0.8] }}
            transition={{ duration: s.duration, delay: s.delay, repeat: Infinity, ease: "easeInOut" }}
          >
            <Star fill="currentColor" size={s.size} />
          </motion.div>
        ))}
      </div>

      {/* Navbar */}
      <nav className="relative z-50 flex justify-between items-center px-4 sm:px-6 md:px-10 py-4">
        <div className="font-baloo font-bold text-gold text-2xl animate-blur-fade-up" style={{ animationDelay: '0ms' }}>
          🇵🇰 Azaadi Adventure
        </div>
        
        <div className="hidden lg:flex space-x-4">
          <button className="paper-badge px-4 py-2 font-medium animate-blur-fade-up" style={{ animationDelay: '100ms' }}>Our Story</button>
          <button className="paper-badge px-4 py-2 font-medium animate-blur-fade-up" style={{ animationDelay: '150ms' }}>Fun Facts</button>
          <button className="paper-badge px-4 py-2 font-medium animate-blur-fade-up" style={{ animationDelay: '200ms' }}>Play & Win</button>
        </div>

        <div className="flex items-center space-x-3">
          <div className="paper-badge flex items-center space-x-1 px-3 py-1.5 animate-blur-fade-up" style={{ animationDelay: '300ms' }}>
            <Star size={16} className="text-gold-bright" fill="currentColor" />
            <span className="font-bold text-cream">{factsFound}/{FUN_FACTS.length}</span>
          </div>
          <button className="lg:hidden paper-badge p-2 rounded-full animate-blur-fade-up" style={{ animationDelay: '350ms' }}>
            <Menu size={20} className="text-cream" />
          </button>
        </div>
      </nav>

      {/* Main Content Area */}
      <main className="relative z-20 flex flex-col justify-end min-h-[85vh] px-4 sm:px-8 md:px-12 pb-8 md:pb-16 max-w-7xl mx-auto">
        <div className="flex flex-col md:flex-row md:items-end justify-between w-full">
          
          {/* Left Text Block */}
          <div className="flex-1 mb-10 md:mb-0">
            <div className="flex space-x-2 mb-4">
              <span className="paper-badge px-3 py-1 text-xs sm:text-sm animate-blur-fade-up" style={{ animationDelay: '300ms' }}>🎈 Est. 1947</span>
              <span className="paper-badge px-3 py-1 text-xs sm:text-sm animate-blur-fade-up" style={{ animationDelay: '350ms' }}>🕊️ Freedom Day</span>
            </div>
            
            <h1 className="font-baloo font-extrabold text-5xl sm:text-6xl md:text-7xl lg:text-8xl leading-none tracking-tight mb-4 animate-blur-fade-up text-gold-bright" 
                style={{ 
                  animationDelay: '400ms',
                  textShadow: '0 0 30px rgba(244,232,193,0.4)'
                }}>
              14 AUGUST<br/>1947
            </h1>
            
            <p className="text-base sm:text-lg md:text-xl max-w-xl mb-8 animate-blur-fade-up text-cream/90" style={{ animationDelay: '500ms' }}>
              Turn the radio, catch the stars, and discover how Pakistan came to be! 🌟
            </p>
            
            <div className="flex flex-wrap gap-4">
              <button 
                onClick={handleStartGame}
                className="bg-gold-bright text-green-dark font-baloo font-bold text-xl px-8 py-3 rounded-full hover:scale-105 transition-transform animate-blur-fade-up shadow-[0_0_20px_rgba(244,232,193,0.6)]" 
                style={{ animationDelay: '600ms' }}
              >
                Tap the Radio! 📻
              </button>
              <button className="paper-badge px-6 py-3 font-medium flex items-center space-x-2 animate-blur-fade-up text-cream" style={{ animationDelay: '700ms' }}>
                <Info size={20} />
                <span>Learn Our Story</span>
              </button>
            </div>
          </div>

          {/* Right Activities / Radio Placeholder */}
          <div className="flex flex-col items-center justify-end md:w-1/3">
            <div className="relative animate-blur-fade-up" style={{ animationDelay: '800ms' }}>
              {showFact && (
                <motion.div 
                  initial={{ opacity: 0, y: 20, scale: 0.8 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  className="absolute bottom-full mb-4 w-64 bg-cream text-green-dark p-4 rounded-xl shadow-xl font-medium text-sm text-center z-50"
                >
                  {FUN_FACTS[factIndex]}
                  <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-4 h-4 bg-cream rotate-45"></div>
                </motion.div>
              )}
              
              <button 
                onClick={handleRadioTap}
                className={`relative w-48 h-32 md:w-64 md:h-48 bg-radio-brown rounded-3xl border-4 border-radio-brown-dark flex items-center justify-center transition-all duration-300 z-40 ${isRadioOn ? 'shadow-[0_0_40px_rgba(244,232,193,0.5)] scale-105' : 'hover:scale-105'}`}
              >
                <div className="absolute inset-2 border-2 border-dashed border-radio-brown-dark rounded-2xl opacity-50"></div>
                <Radio size={48} className={isRadioOn ? 'text-gold-bright animate-pulse' : 'text-radio-brown-dark'} />
                {isRadioOn && (
                  <div className="absolute bottom-4 flex space-x-1">
                    {[1,2,3,4].map(i => (
                      <motion.div key={i} className="w-1.5 bg-gold-bright rounded-full"
                        animate={{ height: [10, 20 + Math.random()*20, 10] }}
                        transition={{ duration: 0.5 + Math.random(), repeat: Infinity }}
                      />
                    ))}
                  </div>
                )}
              </button>
              <div className="mt-4 flex justify-center space-x-3">
                <button onClick={() => setMuted(!muted)} className="paper-badge p-2 rounded-full text-cream">
                  {muted ? <VolumeX size={16} /> : <Volume2 size={16} />}
                </button>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
