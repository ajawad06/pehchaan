import { useState, useEffect } from 'react'
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion'
import { ArrowLeft } from 'lucide-react'
import { useSession } from '../store/SessionContext'
import { recordResponse } from '../services/db'
import { useNavigate } from 'react-router-dom'

const SEQUENCES = [
  ['7', 'K', '3'],
  ['B', '9', 'R', '2'],
  ['4', 'M', '8', 'P', '1'],
  ['T', '5', 'L', '9', 'C', '3']
]

export default function MemoryGame() {
  const { sessionId, updateTraits, traits, advanceFlow } = useSession()
  const navigate = useNavigate()
  const reduceMotion = useReducedMotion()
  
  const [level, setLevel] = useState(0)
  const [phase, setPhase] = useState('ready') // ready -> showing -> recalling -> result
  const [input, setInput] = useState('')
  const [score, setScore] = useState(0)
  
  useEffect(() => {
    if (phase === 'showing') {
      const displayTime = SEQUENCES[level].length * 1000 // 1 second per item
      const timer = setTimeout(() => {
        setPhase('recalling')
      }, displayTime)
      return () => clearTimeout(timer)
    }
  }, [phase, level])

  const startLevel = () => {
    setPhase('showing')
    setInput('')
  }

  const handleAnswer = async (e) => {
    e.preventDefault()
    const target = SEQUENCES[level].join('')
    const isCorrect = input.toUpperCase().replace(/\s/g, '') === target
    
    if (isCorrect) {
      setScore(s => s + 1)
      if (level + 1 < SEQUENCES.length) {
        setPhase('ready')
        setLevel(l => l + 1)
      } else {
        await finishGame(true)
      }
    } else {
      await finishGame(false)
    }
  }

  const finishGame = async (won) => {
    setPhase('result')
    const finalScore = won ? score + 1 : score
    
    const telemetry = {
      max_sequence_length: finalScore > 0 ? SEQUENCES[finalScore - 1].length : 0,
      accuracy: finalScore / SEQUENCES.length,
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
          activity_id: 'memory_game',
          difficulty_level: traits?.age_group?.includes('14') ? 1 : 3,
          telemetry: telemetry
        })
      })
      
      const data = await response.json()
      
      if (data.estimated_skill_delta) {
        const newScore = Math.max(0, Math.min(100, (traits.working_memory || 50) + (data.estimated_skill_delta * 10)))
        updateTraits({ working_memory: newScore })
      }
    } catch (error) {
      console.error("Failed to send telemetry:", error)
    }

    if (sessionId) {
      await recordResponse(sessionId, 'memory_game', telemetry)
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

      {/* Screen entrance: ease-out bounce-settle per DESIGN SYSTEM */}
      <motion.div
        initial={reduceMotion ? {} : { opacity: 0, y: 16 }}
        animate={reduceMotion ? {} : { opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
        className="max-w-xl w-full bg-soft-white p-5 sm:p-8 rounded-card-lg shadow-cushion border border-border-glass text-center"
      >
        <h2 className="font-playful text-xl sm:text-3xl font-extrabold tracking-tight mb-6">Working Memory</h2>

        <AnimatePresence mode="wait">
          {phase === 'ready' && (
            <motion.div
              key="ready"
              initial={reduceMotion ? {} : { opacity: 0, y: 12 }}
              animate={reduceMotion ? {} : { opacity: 1, y: 0 }}
              exit={reduceMotion ? {} : { opacity: 0 }}
              transition={{ duration: 0.35 }}
              className="space-y-6"
            >
              <p className="text-lg text-text-muted font-light">You will see a sequence of characters. Remember them exactly as they appear.</p>
              <motion.button
                onClick={startLevel}
                whileTap={reduceMotion ? {} : { scale: [1, 0.92, 1.03, 1] }}
                transition={{ duration: 0.35, ease: [0.34, 1.56, 0.64, 1] }}
                className={`bg-green-primary text-ivory px-8 py-4 rounded-pill font-bold hover:bg-green-dark transition-colors shadow-cushion ${reduceMotion ? '' : 'animate-breathe'}`}
              >
                Start Level {level + 1}
              </motion.button>
            </motion.div>
          )}

          {phase === 'showing' && (
            <motion.div
              key="showing"
              initial={reduceMotion ? {} : { opacity: 0, scale: 0.96 }}
              animate={reduceMotion ? {} : { opacity: 1, scale: 1 }}
              exit={reduceMotion ? {} : { opacity: 0 }}
              transition={{ duration: 0.3 }}
              className="py-12 bg-ivory rounded-card border border-green-primary/10"
            >
              <p className="text-3xl sm:text-5xl font-mono tracking-[0.3em] sm:tracking-[1em] font-bold text-green-dark px-2 overflow-x-auto whitespace-nowrap">
                {SEQUENCES[level].join('')}
              </p>
            </motion.div>
          )}

          {phase === 'recalling' && (
            <motion.div
              key="recalling"
              initial={reduceMotion ? {} : { opacity: 0, y: 12 }}
              animate={reduceMotion ? {} : { opacity: 1, y: 0 }}
              exit={reduceMotion ? {} : { opacity: 0 }}
              transition={{ duration: 0.35 }}
              className="space-y-6"
            >
              <p className="text-lg text-text-muted font-light">Type the sequence you just saw:</p>
              <form onSubmit={handleAnswer} className="flex flex-col gap-4">
                <input
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="Enter sequence..."
                  className="w-full bg-ivory border border-border-glass rounded-card px-5 py-4 text-green-dark text-2xl font-mono text-center focus:outline-none focus:border-blush shadow-cushion-sm uppercase"
                  autoFocus
                  autoComplete="off"
                />
                <motion.button
                  type="submit"
                  whileTap={reduceMotion ? {} : { scale: [1, 0.92, 1.03, 1] }}
                  transition={{ duration: 0.35, ease: [0.34, 1.56, 0.64, 1] }}
                  className="bg-green-primary text-ivory font-bold px-8 py-4 rounded-pill hover:bg-green-dark transition-colors shadow-cushion w-full"
                >
                  Submit
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
              {/* Loading state: three bouncing dots, never a flat spinner */}
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
