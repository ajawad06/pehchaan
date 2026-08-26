import { useState, useEffect, useRef } from 'react'
import { motion, useReducedMotion } from 'framer-motion'
import { Link } from 'react-router-dom'
import confetti from 'canvas-confetti'
import {
  Brain, Compass, Sparkles, Puzzle, LineChart, Briefcase,
  Zap, Target, ArrowRight, X, Check
} from 'lucide-react'
import Navbar from './Navbar'

/* ---------------------------------------------------------------------
   GAMES SHOWCASE DATA
   Pulled from the real game routes registered in App.jsx / SessionContext
   generateFlow() — names/routes must stay in sync with those files.
--------------------------------------------------------------------- */
const GAMES = [
  { name: 'Memory Match', desc: 'Test how sharp your recall really is', icon: Brain, to: '/memory-game' },
  { name: 'Pattern Hunter', desc: 'Spot the logic hiding in a sequence', icon: Puzzle, to: '/pattern-hunter' },
  { name: 'Decision Lab', desc: 'Trade-offs under pressure, gamified', icon: Compass, to: '/decision-lab' },
  { name: 'Career Simulation', desc: 'Live a day in a role before you pick it', icon: Briefcase, to: '/career-simulation' },
  { name: 'Instinct Swipe', desc: 'Quick-fire gut calls, no overthinking', icon: Zap, to: '/instinct-swipe' },
  { name: 'Data Detective', desc: 'Follow the clues hidden in the numbers', icon: LineChart, to: '/data-detective' },
]

/* ---------------------------------------------------------------------
   DIGIT POP-UP NUMERAL
   DESIGN SYSTEM: "Streak counters pop up digit-by-digit (odometer style)"
--------------------------------------------------------------------- */
function PopNumber({ value, className }) {
  const digits = String(value).split('')
  return (
    <span className={className} aria-label={String(value)}>
      {digits.map((d, i) => (
        <motion.span
          key={`${i}-${d}`}
          initial={{ opacity: 0, y: 14, scale: 0.7 }}
          whileInView={{ opacity: 1, y: 0, scale: 1 }}
          viewport={{ once: true }}
          transition={{ delay: i * 0.06, duration: 0.4, ease: [0.34, 1.56, 0.64, 1] }}
          className="inline-block"
        >
          {d}
        </motion.span>
      ))}
    </span>
  )
}

export default function LandingPage() {
  const reduceMotion = useReducedMotion()
  const ctaRef = useRef(null)

  // Final CTA band: subtle confetti preview burst on hover (not full celebration —
  // governing principle 4 reserves big confetti for real milestones elsewhere)
  const handleCtaHover = () => {
    if (reduceMotion) return
    const rect = ctaRef.current?.getBoundingClientRect()
    if (!rect) return
    confetti({
      particleCount: 14,
      spread: 40,
      startVelocity: 18,
      gravity: 0.9,
      scalar: 0.6,
      colors: ['#F2C9CE', '#FBE4E7', '#F5F2E8'],
      origin: {
        x: (rect.left + rect.width / 2) / window.innerWidth,
        y: (rect.top + rect.height / 2) / window.innerHeight,
      },
    })
  }

  return (
    <div className="min-h-screen bg-green-deepest text-ivory font-sans selection:bg-blush selection:text-green-deepest overflow-x-hidden">
      <Navbar />

      {/* ============================= HERO ============================= */}
      <section className="relative min-h-screen flex flex-col items-center justify-center pt-24 sm:pt-32 pb-16 sm:pb-20 px-4 sm:px-6">
        <div className="z-10 max-w-7xl w-full grid md:grid-cols-2 gap-8 sm:gap-12 items-center">
          {/* Hero copy — staggered hop-in per DESIGN SYSTEM "Cards & Containers" */}
          <motion.div
            initial={reduceMotion ? {} : { opacity: 0, y: 20 }}
            animate={reduceMotion ? {} : { opacity: 1, y: 0 }}
            transition={{ duration: 0.7, ease: [0.34, 1.56, 0.64, 1] }}
          >
            <span className="inline-flex items-center gap-2 bg-blush/15 border border-blush/30 text-blush-bright px-3 py-1.5 sm:px-4 rounded-pill text-xs sm:text-sm font-semibold mb-5 sm:mb-6">
              <Sparkles size={16} className="shrink-0" />
              Not a quiz. A playground.
            </span>

            <h1 className="font-playful text-3xl sm:text-5xl md:text-6xl lg:text-7xl font-extrabold tracking-tight leading-[1.1] sm:leading-[1.05] mb-5 sm:mb-6 break-words">
              Find your path by <span className="text-blush">playing</span>, not filling bubbles.
            </h1>

            <p className="text-base sm:text-lg md:text-xl text-text-muted mb-8 sm:mb-10 font-light leading-relaxed max-w-lg">
              Pehchaan swaps the multiple-choice career test for short, tactile
              mini-games — memory, pattern spotting, real decision sims — and
              reads how you actually think while you play.
            </p>

            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 sm:gap-6">
              {/* Primary CTA pill — breathing idle per spec, heartbeat handled via
                  animate-heartbeat class (double-pulse), squash on press via whileTap */}
              <motion.div
                whileTap={reduceMotion ? {} : { scale: [1, 0.9, 1.03, 1] }}
                transition={{ duration: 0.35, ease: [0.34, 1.56, 0.64, 1] }}
              >
                <Link
                  to="/start"
                  className={`group relative inline-flex items-center gap-2 bg-blush text-green-deepest px-6 py-3.5 sm:px-8 sm:py-4 rounded-pill text-base sm:text-lg font-bold shadow-cushion hover:shadow-cushion-hover transition-shadow ${reduceMotion ? '' : 'animate-heartbeat'}`}
                >
                  Play the Games
                  <ArrowRight size={20} className="shrink-0 group-hover:translate-x-1 transition-transform" />
                </Link>
              </motion.div>
              <a href="#how-it-different" className="text-text-muted hover:text-ivory transition-colors text-base sm:text-lg font-medium">
                See how it's different
              </a>
            </div>

            <p className="mt-6 sm:mt-8 text-xs sm:text-sm text-sage/80 font-semibold tracking-wide uppercase">
              Zero multiple choice. Zero boredom.
            </p>
          </motion.div>

          {/* Mascot / illustration — idle sway loop per "MASCOT" spec */}
          <motion.div
            initial={reduceMotion ? {} : { opacity: 0, scale: 0.9 }}
            animate={reduceMotion ? {} : { opacity: 1, scale: 1 }}
            transition={{ duration: 0.8, delay: 0.15, ease: [0.34, 1.56, 0.64, 1] }}
            className="relative hidden md:flex justify-center"
          >
            <div className={`relative w-full max-w-md aspect-square rounded-card-lg bg-gradient-to-br from-green-primary to-green-dark shadow-cushion flex items-center justify-center ${reduceMotion ? '' : 'animate-idle-bob'}`}>
              <img
                src="/student-3d.png"
                alt="Student playing through Pehchaan's mini-games"
                className="w-4/5 drop-shadow-2xl object-contain"
              />
              <div className="absolute -top-4 -right-4 bg-blush text-green-deepest rounded-pill px-4 py-2 font-bold text-sm shadow-cushion-sm">
                +1 badge earned!
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ===================== HOW IT'S DIFFERENT ===================== */}
      <section id="how-it-different" className="bg-ivory text-green-dark py-16 sm:py-28 px-4 sm:px-6">
        <div className="max-w-6xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-80px' }}
            transition={{ duration: 0.6 }}
            className="text-center mb-10 sm:mb-16"
          >
            <h2 className="font-playful text-2xl sm:text-4xl md:text-5xl font-extrabold tracking-tight mb-3 sm:mb-4 break-words">
              Quizzes ask. Games reveal.
            </h2>
            <p className="text-base sm:text-lg text-green-secondary font-light max-w-xl mx-auto px-2">
              A checkbox tells us what you'd like to believe about yourself.
              A game shows us how you actually solve problems.
            </p>
          </motion.div>

          <div className="grid md:grid-cols-2 gap-6 sm:gap-8">
            {/* Typical quiz — grayed, static, boring, staggered hop-in */}
            <motion.div
              initial={{ opacity: 0, y: 24, scale: 0.96 }}
              whileInView={{ opacity: 1, y: 0, scale: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, ease: [0.34, 1.56, 0.64, 1] }}
              className="bg-gray-100 border border-gray-200 rounded-card p-5 sm:p-8 opacity-80"
            >
              <span className="text-xs font-bold tracking-widest text-gray-400 uppercase">Typical career quiz</span>
              <h3 className="text-lg sm:text-2xl font-semibold text-gray-500 mt-3 mb-5 sm:mb-6">45 static questions</h3>
              <ul className="space-y-3">
                {['Rate yourself 1–5 on "leadership"', 'Pick A, B, C, or D', 'Answer from memory, not instinct'].map((t) => (
                  <li key={t} className="flex items-start gap-3 text-gray-500 text-sm sm:text-base">
                    <X size={18} className="mt-0.5 shrink-0 text-gray-400" />
                    <span>{t}</span>
                  </li>
                ))}
              </ul>
              <div className="mt-6 sm:mt-8 h-2 w-full bg-gray-200 rounded-pill overflow-hidden">
                <div className="h-full bg-gray-400 w-1/3 rounded-pill" />
              </div>
              <p className="text-xs text-gray-400 mt-2">A flat progress bar. That's it.</p>
            </motion.div>

            {/* Pehchaan — colorful, springy, game icons, staggered hop-in with delay */}
            <motion.div
              initial={{ opacity: 0, y: 24, scale: 0.96 }}
              whileInView={{ opacity: 1, y: 0, scale: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: 0.12, ease: [0.34, 1.56, 0.64, 1] }}
              whileHover={{ scale: 1.015 }}
              className="bg-green-primary text-ivory rounded-card p-5 sm:p-8 shadow-cushion relative overflow-hidden"
            >
              <div className="absolute -top-10 -right-10 w-40 h-40 bg-blush/20 rounded-full blur-3xl" />
              <span className="text-xs font-bold tracking-widest text-blush uppercase relative">Pehchaan</span>
              <h3 className="text-lg sm:text-2xl font-semibold mt-3 mb-5 sm:mb-6 relative">9 short mini-games</h3>
              <ul className="space-y-3 relative">
                {['Match cards to test working memory', 'Swipe fast, gut-first decisions', 'Play a real career sim for a day'].map((t) => (
                  <li key={t} className="flex items-start gap-3 text-sm sm:text-base">
                    <Check size={18} className="mt-0.5 shrink-0 text-blush" />
                    <span>{t}</span>
                  </li>
                ))}
              </ul>
              {/* Liquid-pour progress bar with wobble leading edge */}
              <div className="mt-6 sm:mt-8 h-2 w-full bg-green-dark rounded-pill overflow-hidden relative">
                <div className={`h-full bg-blush w-2/3 rounded-pill relative ${reduceMotion ? '' : 'animate-pour-wobble'}`} />
              </div>
              <p className="text-xs text-sage mt-2 relative">Every tap teaches the model something real.</p>
            </motion.div>
          </div>
        </div>
      </section>

      {/* ========================= GAME SHOWCASE ========================= */}
      <section className="bg-green-primary py-16 sm:py-28 px-4 sm:px-6">
        <div className="max-w-6xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="mb-8 sm:mb-14"
          >
            <span className="text-sm font-bold tracking-widest text-blush uppercase">The Games</span>
            <h2 className="font-playful text-2xl sm:text-4xl md:text-5xl font-extrabold tracking-tight mt-3 break-words">
              Six ways to show us who you are
            </h2>
          </motion.div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5 sm:gap-6">
            {GAMES.map(({ name, desc, icon: Icon, to }, i) => (
              <motion.div
                key={name}
                initial={{ opacity: 0, y: 28, scale: 0.94 }}
                whileInView={{ opacity: 1, y: 0, scale: 1 }}
                viewport={{ once: true, margin: '-40px' }}
                transition={{ duration: 0.5, delay: i * 0.08, ease: [0.34, 1.56, 0.64, 1] }}
                whileHover={reduceMotion ? {} : { scale: 1.03, y: -4 }}
                whileTap={reduceMotion ? {} : { scale: 0.97 }}
              >
                <Link
                  to={to}
                  className="group block bg-green-dark/60 border border-border-glass hover:border-blush/40 rounded-card p-5 sm:p-7 shadow-cushion-sm transition-colors h-full"
                >
                  <div className={`w-12 h-12 sm:w-14 sm:h-14 rounded-card bg-blush/15 flex items-center justify-center mb-4 sm:mb-5 text-blush ${reduceMotion ? '' : 'group-hover:animate-idle-bob'}`}>
                    <Icon size={24} className="shrink-0" />
                  </div>
                  <h3 className="text-lg sm:text-xl font-semibold mb-2">{name}</h3>
                  <p className="text-text-muted font-light text-sm leading-relaxed">{desc}</p>
                  <span className="inline-flex items-center gap-1 text-blush text-sm font-semibold mt-4 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                    Try it <ArrowRight size={14} className="shrink-0" />
                  </span>
                </Link>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ========================= STATS STRIP ========================= */}
      <section className="bg-ivory text-green-dark py-16 sm:py-24 px-4 sm:px-6 border-t border-green-primary/10">
        <div className="max-w-5xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-6 sm:gap-10 text-center">
          {[
            { value: '9', label: 'Mini-games per session' },
            { value: '12', label: 'Traits measured' },
            { value: '0', label: 'Multiple choice questions' },
            { value: '15', label: 'Minutes, start to finish' },
          ].map((s) => (
            <div key={s.label}>
              <PopNumber
                value={s.value}
                className="font-playful text-3xl sm:text-5xl md:text-6xl font-extrabold text-green-primary block"
              />
              <p className="text-xs sm:text-sm text-green-secondary font-medium mt-2">{s.label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ========================= FINAL CTA BAND ========================= */}
      <section className="bg-green-deepest py-16 sm:py-28 px-4 sm:px-6 text-center">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
        >
          <Target className="mx-auto mb-5 sm:mb-6 text-blush shrink-0" size={36} />
          <h2 className="font-playful text-2xl sm:text-4xl md:text-6xl font-extrabold tracking-tight mb-4 break-words px-2">
            Ready to actually enjoy this part?
          </h2>
          <p className="text-base sm:text-lg text-text-muted font-light mb-8 sm:mb-10 max-w-lg mx-auto px-2">
            No timer pressure, no wrong answers — just play and let your instincts do the talking.
          </p>

          <motion.div
            ref={ctaRef}
            onHoverStart={handleCtaHover}
            whileTap={reduceMotion ? {} : { scale: [1, 0.9, 1.03, 1] }}
            transition={{ duration: 0.35, ease: [0.34, 1.56, 0.64, 1] }}
            className="inline-block"
          >
            <Link
              to="/start"
              className={`inline-flex items-center gap-2 bg-blush text-green-deepest px-7 py-4 sm:px-10 sm:py-5 rounded-pill text-base sm:text-xl font-bold shadow-cushion hover:shadow-cushion-hover transition-shadow ${reduceMotion ? '' : 'animate-heartbeat'}`}
            >
              Start Playing <ArrowRight size={20} className="shrink-0" />
            </Link>
          </motion.div>

          <p className="mt-5 sm:mt-6 text-xs sm:text-sm text-sage/70 font-light">Takes about 15 minutes. Free.</p>
        </motion.div>
      </section>

      {/* ============================= FOOTER ============================= */}
      <footer className="bg-green-deepest border-t border-border-glass py-10 sm:py-12 px-4 sm:px-6">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3 sm:gap-4 text-center sm:text-left">
          <div className="flex items-center gap-2 text-sage/70 font-medium">
            <span className="text-lg font-serif">پہچان</span>
            <span className="text-sm">Know yourself. Find your direction.</span>
          </div>
          <p className="text-xs text-text-muted/60">© {new Date().getFullYear()} Pehchaan. All rights reserved.</p>
        </div>
      </footer>
    </div>
  )
}
