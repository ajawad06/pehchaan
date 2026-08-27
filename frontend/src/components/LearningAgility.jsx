import { useState, useEffect } from 'react'
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion'
import { useSession } from '../store/SessionContext'
import { recordResponse } from '../services/db'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { randInt } from '../utils/randomize'

// Symbol rules the student has to infer: ▲ = +3, ● = ×2, ■ = −4, ★ = square.
// Operators apply left to right.
//
// The shape of this list is load-bearing: four phase-1 items then three
// phase-2 items, with the star rule introduced at index 3→4. Only the numbers
// are randomised — the teaching sequence stays identical every session.
function buildQuestions() {
  // ■ subtracts 4, so any base it touches must stay above it to avoid
  // negative answers; ★ squares, so its bases stay small to keep the
  // arithmetic mental rather than tedious.
  const b = {
    add:      randInt(4, 9),    // n ▲
    times:    randInt(3, 9),    // n ●
    minus:    randInt(9, 16),   // n ■
    addTimes: randInt(2, 7),    // n ▲ ●
    square:   randInt(3, 7),    // n ★
    addSq:    randInt(2, 5),    // n ▲ ★
    sqMinus:  randInt(3, 6),    // n ★ ■
  }
  return [
    // Phase 1 — the three base rules, then a two-step combination
    { p: 1, text: `${b.add} ▲`,        ans: b.add + 3 },
    { p: 1, text: `${b.times} ●`,      ans: b.times * 2 },
    { p: 1, text: `${b.minus} ■`,      ans: b.minus - 4 },
    { p: 1, text: `${b.addTimes} ▲ ●`, ans: (b.addTimes + 3) * 2 },
    // Phase 2 — ★ is introduced, then combined with the earlier rules
    { p: 2, text: `${b.square} ★`,     ans: b.square ** 2 },
    { p: 2, text: `${b.addSq} ▲ ★`,    ans: (b.addSq + 3) ** 2 },
    { p: 2, text: `${b.sqMinus} ★ ■`,  ans: b.sqMinus ** 2 - 4 },
  ]
}

export default function LearningAgility() {
  const { sessionId, updateTraits, traits, advanceFlow } = useSession()
  const navigate = useNavigate()
  const reduceMotion = useReducedMotion()

  // Generated once per mount, so the numbers hold still while answering.
  const [QUESTIONS] = useState(buildQuestions)

  const [current, setCurrent] = useState(0)
  const [phase, setPhase] = useState('intro1') // intro1 -> practice -> intro2 -> test -> result
  const [input, setInput] = useState('')
  const [attempts, setAttempts] = useState(0)
  const [score, setScore] = useState(0)
  const [startTs, setStartTs] = useState(Date.now())

  const handleAnswer = (e) => {
    e.preventDefault()
    if (!input) return
    
    setAttempts(a => a + 1)
    
    if (parseInt(input) === QUESTIONS[current].ans) {
      setScore(s => s + 1)
      setInput('')
      
      if (current === 3 && phase === 'practice') {
        setPhase('intro2')
        setCurrent(c => c + 1)
      } else if (current + 1 < QUESTIONS.length) {
        setCurrent(c => c + 1)
      } else {
        finishGame()
      }
    } else {
      setInput('')
    }
  }

  const finishGame = async () => {
    setPhase('result')
    
    const timeElapsed = Math.floor((Date.now() - startTs) / 1000)
    const accuracy = score / Math.max(attempts, 1)
    
    const telemetry = {
      reaction_time: timeElapsed,
      accuracy: accuracy,
      attempts: attempts,
      completed: true
    }

    try {
      const rawUrl = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000'
      const API_URL = rawUrl.endsWith('/') ? rawUrl.slice(0, -1) : rawUrl;
      const response = await fetch(`${API_URL}/submit_activity`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: sessionId || 'anonymous',
          activity_id: 'learning_agility',
          difficulty_level: traits?.age_group?.includes('14') ? 1 : 3,
          telemetry: telemetry
        })
      })
      
      const data = await response.json()
      
      if (data.estimated_skill_delta) {
        const newScore = Math.max(0, Math.min(100, 50 + (data.estimated_skill_delta * 10)))
        updateTraits({ learning_agility: newScore })
      }
    } catch (error) {
      console.error("Failed to send telemetry:", error)
    }

    if (sessionId) {
      await recordResponse(sessionId, 'learning_agility', telemetry)
    }
    
    setTimeout(() => {
      advanceFlow(navigate)
    }, 2000)
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-ivory text-green-dark p-4 sm:p-6 relative">
      <div className="absolute top-4 left-4 sm:top-6 sm:left-6">
        <button onClick={() => navigate('/')} className="text-green-secondary hover:text-green-dark font-semibold flex items-center gap-2 bg-white/60 rounded-pill px-3 py-1.5 sm:px-4 sm:py-2 shadow-cushion-sm text-sm sm:text-base hover:shadow-cushion transition-shadow">
          <ArrowLeft size={16} className="shrink-0" /> Back
        </button>
      </div>

      <motion.div 
        initial={reduceMotion ? {} : { opacity: 0, y: 16 }}
        animate={reduceMotion ? {} : { opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
        className="max-w-xl w-full bg-soft-white p-5 sm:p-8 rounded-card-lg shadow-cushion border border-border-glass text-center"
      >
        <h2 className="font-playful text-xl sm:text-3xl font-extrabold tracking-tight mb-6">Learning Agility</h2>
        
        <AnimatePresence mode="wait">
        {phase === 'intro1' && (
          <motion.div
            key="intro1"
            initial={reduceMotion ? {} : { opacity: 0, y: 12 }}
            animate={reduceMotion ? {} : { opacity: 1, y: 0 }}
            exit={reduceMotion ? {} : { opacity: 0 }}
            transition={{ duration: 0.35 }}
            className="space-y-6"
          >
            <p className="text-lg text-text-muted font-light">Learn this new system. Read left to right.</p>
            <div className="bg-ivory rounded-card p-6 border border-green-primary/10 text-xl font-mono text-left space-y-4 max-w-sm mx-auto">
              <p><span className="text-blue-500">▲</span> means <b>Add 3</b></p>
              <p><span className="text-red-500">●</span> means <b>Multiply by 2</b></p>
              <p><span className="text-orange-500">■</span> means <b>Subtract 4</b></p>
            </div>
            <motion.button
              onClick={() => setPhase('practice')}
              whileTap={reduceMotion ? {} : { scale: [1, 0.92, 1.03, 1] }}
              transition={{ duration: 0.35, ease: [0.34, 1.56, 0.64, 1] }}
              className={`bg-green-primary text-ivory px-8 py-4 rounded-pill font-bold hover:bg-green-dark transition-colors shadow-cushion w-full ${reduceMotion ? '' : 'animate-breathe'}`}
            >
              Start Practice
            </motion.button>
          </motion.div>
        )}

        {phase === 'intro2' && (
          <motion.div
            key="intro2"
            initial={reduceMotion ? {} : { opacity: 0, y: 12 }}
            animate={reduceMotion ? {} : { opacity: 1, y: 0 }}
            exit={reduceMotion ? {} : { opacity: 0 }}
            transition={{ duration: 0.35 }}
            className="space-y-6"
          >
            <p className="text-lg text-text-muted font-light">Great. Now, a new rule is introduced:</p>
            <div className="bg-ivory rounded-card p-6 border border-green-primary/10 text-xl font-mono text-left space-y-4 max-w-sm mx-auto">
              <p><span className="text-purple-500">★</span> means <b>Square the number</b> (multiply by itself)</p>
            </div>
            <motion.button
              onClick={() => setPhase('test')}
              whileTap={reduceMotion ? {} : { scale: [1, 0.92, 1.03, 1] }}
              transition={{ duration: 0.35, ease: [0.34, 1.56, 0.64, 1] }}
              className={`bg-green-primary text-ivory px-8 py-4 rounded-pill font-bold hover:bg-green-dark transition-colors shadow-cushion w-full ${reduceMotion ? '' : 'animate-breathe'}`}
            >
              Continue
            </motion.button>
          </motion.div>
        )}

        {(phase === 'practice' || phase === 'test') && (
          <motion.div
            key={`${phase}-${current}`}
            initial={reduceMotion ? {} : { opacity: 0, y: 12, scale: 0.97 }}
            animate={reduceMotion ? {} : { opacity: 1, y: 0, scale: 1 }}
            exit={reduceMotion ? {} : { opacity: 0 }}
            transition={{ duration: 0.35, ease: [0.34, 1.56, 0.64, 1] }}
            className="space-y-6"
          >
            <p className="text-sm text-text-muted uppercase tracking-widest font-bold">{phase}</p>
            
            <div className="bg-ivory rounded-card p-5 sm:p-8 border border-green-primary/10">
              <p className="text-3xl sm:text-5xl font-mono tracking-wide sm:tracking-widest font-bold text-green-dark break-words">
                {QUESTIONS[current].text} = ?
              </p>
            </div>

            <form onSubmit={handleAnswer} className="flex flex-col sm:flex-row gap-3 sm:gap-4">
              <input 
                type="number" 
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Answer..."
                className="flex-1 min-w-0 bg-ivory border border-border-glass rounded-card px-5 py-4 text-green-dark text-xl sm:text-2xl font-mono text-center focus:outline-none focus:border-blush shadow-cushion-sm"
                autoFocus
              />
              <motion.button
                type="submit"
                whileTap={reduceMotion ? {} : { scale: [1, 0.92, 1.03, 1] }}
                transition={{ duration: 0.35, ease: [0.34, 1.56, 0.64, 1] }}
                className="bg-green-primary text-ivory font-bold px-8 py-4 rounded-card hover:bg-green-dark transition-colors shadow-cushion-sm"
              >
                Enter
              </motion.button>
            </form>
          </motion.div>
        )}

        {phase === 'result' && (
          <motion.div
            key="result"
            initial={reduceMotion ? {} : { opacity: 0, y: 12 }}
            animate={reduceMotion ? {} : { opacity: 1, y: 0 }}
            transition={{ duration: 0.4, ease: [0.34, 1.56, 0.64, 1] }}
            className="py-12"
          >
            <p className="font-playful text-2xl font-bold text-green-secondary">Simulation Complete!</p>
            <div className="flex justify-center gap-1.5 mt-4">
              {[0, 1, 2].map((i) => (
                <span
                  key={i}
                  className={`w-2.5 h-2.5 rounded-full bg-green-secondary ${reduceMotion ? '' : 'animate-dot-bounce'}`}
                  style={{ animationDelay: `${i * 0.15}s` }}
                />
              ))}
            </div>
            <p className="text-text-muted mt-3 text-sm">Saving your progress...</p>
          </motion.div>
        )}
        </AnimatePresence>
      </motion.div>
    </div>
  )
}
