import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useSession } from '../store/SessionContext'
import { recordResponse } from '../services/db'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Timer } from 'lucide-react'
import { randInt, pick } from '../utils/randomize'

// One generator per operation, in the order they're served. Difficulty comes
// from the operation, so the order is fixed and only the numbers vary.
// Every generator yields a whole-number answer — no decimals to round.
const GENERATORS = [
  // two-digit addition, forced to carry
  () => { const a = randInt(17, 68), b = randInt(24, 79); return { q: `${a} + ${b}`, a: a + b } },
  // two-digit subtraction, forced to borrow, never negative
  () => { const a = randInt(52, 96), b = randInt(17, 48); return { q: `${a} - ${b}`, a: a - b } },
  // times table beyond the easy rows
  () => { const a = randInt(12, 19), b = randInt(4, 9); return { q: `${a} × ${b}`, a: a * b } },
  // division that always divides cleanly
  () => { const b = randInt(6, 12), r = randInt(7, 15); return { q: `${b * r} ÷ ${b}`, a: r } },
  // percentage chosen so the result is always whole
  () => { const p = pick([10, 20, 25, 30, 40, 50, 60, 75]), base = randInt(2, 12) * 20
          return { q: `${p}% of ${base}`, a: (base * p) / 100 } },
]

function buildQuestions() {
  return GENERATORS.map(gen => gen())
}

export default function NumericalReasoning() {
  const { sessionId, updateTraits, traits, advanceFlow } = useSession()
  const navigate = useNavigate()

  // Generated once per mount, so the sum can't change mid-answer.
  const [QUESTIONS] = useState(buildQuestions)

  const [current, setCurrent] = useState(0)
  const [input, setInput] = useState('')
  const [startTs, setStartTs] = useState(Date.now())
  const [timeElapsed, setTimeElapsed] = useState(0)
  const [completed, setCompleted] = useState(false)
  const [attempts, setAttempts] = useState(0)
  
  // 60 second timer overall
  const MAX_TIME = 60

  useEffect(() => {
    if (completed) return;
    const timer = setInterval(() => {
      const elapsed = Math.floor((Date.now() - startTs) / 1000)
      setTimeElapsed(elapsed)
      if (elapsed >= MAX_TIME) {
        setCompleted(true)
        submitTelemetry(false)
      }
    }, 1000)
    return () => clearInterval(timer)
  }, [startTs, completed])

  const submitTelemetry = async (success) => {
    setCompleted(true)
    const rawUrl = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000'
    const API_URL = rawUrl.endsWith('/') ? rawUrl.slice(0, -1) : rawUrl;
    
    // Accuracy based on how many they got right
    const accuracy = current / QUESTIONS.length;
    
    const telemetry = {
      response_time_sec: timeElapsed,
      hints_used: 0,
      accuracy: accuracy,
      attempts: attempts,
      completed: success,
      quit: false,
    }

    try {
      const response = await fetch(`${API_URL}/submit_activity`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: sessionId || 'anonymous',
          activity_id: 'numerical_reasoning',
          difficulty_level: traits?.age_group?.includes('14') ? 1 : 3,
          telemetry: telemetry
        })
      })
      
      const data = await response.json()
      
      if (data.estimated_skill_delta) {
        const newScore = Math.max(0, Math.min(100, (traits.numerical_reasoning || 50) + (data.estimated_skill_delta * 10) + (current * 5)))
        updateTraits({ numerical_reasoning: newScore })
      }
    } catch (error) {
      console.error("Failed to send telemetry to backend:", error)
    }

    if (sessionId) {
      await recordResponse(sessionId, 'numerical_reasoning', telemetry)
    }
    
    setTimeout(() => {
      advanceFlow(navigate)
    }, 1500)
  }

  const handleAnswer = (e) => {
    e.preventDefault()
    setAttempts(a => a + 1)
    
    if (parseInt(input) === QUESTIONS[current].a) {
      setInput('')
      if (current + 1 < QUESTIONS.length) {
        setCurrent(c => c + 1)
      } else {
        submitTelemetry(true)
      }
    } else {
      // flash red or let them try again
      setInput('')
    }
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-ivory text-green-dark p-4 sm:p-6 relative">
      <div className="absolute top-4 left-4 sm:top-6 sm:left-6">
        <button onClick={() => navigate('/')} className="text-green-secondary hover:text-green-dark font-semibold flex items-center gap-2 bg-white/60 rounded-pill px-3 py-1.5 sm:px-4 sm:py-2 shadow-cushion-sm text-sm sm:text-base hover:shadow-cushion transition-shadow">
          <ArrowLeft size={16} className="shrink-0" /> Back
        </button>
      </div>

      <motion.div 
        initial={{ opacity: 0, y: 16, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.45, ease: [0.34, 1.56, 0.64, 1] }}
        className="max-w-xl w-full bg-soft-white p-5 sm:p-8 rounded-card-lg shadow-cushion border border-border-glass"
      >
        <div className="flex flex-wrap gap-2 justify-between items-center mb-6">
          <h2 className="font-playful text-2xl sm:text-3xl font-extrabold tracking-tight">Speed Math</h2>
          <div className="flex space-x-4">
            <span className={`font-mono font-medium px-3 py-1 rounded-pill flex items-center gap-1.5 text-sm sm:text-base whitespace-nowrap ${timeElapsed > 45 ? 'bg-red-500/10 text-red-600 animate-pulse' : 'bg-green-primary/5 text-green-secondary'}`}>
              <Timer size={15} className="shrink-0" /> {MAX_TIME - timeElapsed}s left
            </span>
          </div>
        </div>
        
        <div className="bg-ivory rounded-card p-6 mb-8 border border-green-primary/10">
          <p className="text-sm text-text-muted text-center mb-4">Question {current + 1} of {QUESTIONS.length}</p>
          <p className="text-3xl sm:text-5xl font-mono text-center mb-4 text-green-dark font-bold break-words">{QUESTIONS[current]?.q} = ?</p>
        </div>
        
        {!completed ? (
          <form onSubmit={handleAnswer} className="flex gap-3 mb-8">
            <input 
              type="number" 
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Your answer..."
              className="flex-1 bg-ivory border border-border-glass rounded-card px-5 py-4 text-green-dark text-xl font-mono text-center focus:outline-none focus:border-green-primary shadow-cushion-sm"
              autoFocus
            />
            <motion.button type="submit" whileTap={{ scale: [1, 0.9, 1.03, 1] }} transition={{ duration: 0.3, ease: [0.34, 1.56, 0.64, 1] }} className="bg-green-primary text-ivory font-bold px-8 py-4 rounded-card hover:bg-green-dark transition-colors shadow-cushion-sm">
              Enter
            </motion.button>
          </form>
        ) : (
          <div className="bg-green-primary/10 text-green-dark p-5 rounded-card text-center font-medium mb-8">
            {timeElapsed >= MAX_TIME ? "Time's up!" : "Complete!"} Calculating your numerical reasoning score...
          </div>
        )}
      </motion.div>
    </div>
  )
}
