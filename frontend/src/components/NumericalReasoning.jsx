import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useSession } from '../store/SessionContext'
import { recordResponse } from '../services/db'
import { useNavigate } from 'react-router-dom'

const QUESTIONS = [
  { q: "17 + 28", a: 45 },
  { q: "84 - 39", a: 45 },
  { q: "15 × 6", a: 90 },
  { q: "144 ÷ 12", a: 12 },
  { q: "30% of 250", a: 75 }
]

export default function NumericalReasoning() {
  const { sessionId, updateTraits, traits, advanceFlow } = useSession()
  const navigate = useNavigate()
  
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

    // Accuracy based on how many questions were answered correctly
    const accuracy = current / QUESTIONS.length;
    const normalizedTime = Math.min(timeElapsed / MAX_TIME, 1.0)

    // Compute score unconditionally from local telemetry — never gated on API
    // Reward accuracy (70%) + speed (30%), clamp 10-100
    const rawScore = Math.round(Math.max(10, Math.min(100,
      (accuracy * 0.7 + (1 - normalizedTime) * 0.3) * 100
    )))
    updateTraits({ numerical_reasoning: rawScore })

    const telemetry = {
      response_time_sec: timeElapsed,
      hints_used: 0,
      accuracy: accuracy,
      attempts: attempts,
      completed: success,
      quit: false,
    }

    // Fire-and-forget — never block navigation on this
    ;(async () => {
      try {
        await fetch(`${API_URL}/submit_activity`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            user_id: sessionId || 'anonymous',
            activity_id: 'numerical_reasoning',
            difficulty_level: traits?.age_group?.includes('14') ? 1 : 3,
            telemetry: telemetry
          })
        })
      } catch (error) {
        console.warn('NumericalReasoning telemetry failed silently:', error)
      }
      if (sessionId) await recordResponse(sessionId, 'numerical_reasoning', telemetry)
    })()

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
    <div className="flex flex-col items-center justify-center min-h-screen bg-ivory text-green-dark p-6 relative">
      <div className="absolute top-6 left-6">
        <button onClick={() => navigate('/')} className="text-green-secondary hover:text-green-dark font-medium flex items-center gap-2">
          ← Back to Home
        </button>
      </div>

      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="max-w-xl w-full bg-soft-white p-8 rounded-[32px] shadow-2xl border border-border-glass"
      >
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-3xl font-medium tracking-tight">Speed Math</h2>
          <div className="flex space-x-4">
            <span className={`font-mono font-medium px-3 py-1 rounded-full ${timeElapsed > 45 ? 'bg-red-500/10 text-red-600 animate-pulse' : 'bg-green-primary/5 text-green-secondary'}`}>
              ⏱ {MAX_TIME - timeElapsed}s left
            </span>
          </div>
        </div>
        
        <div className="bg-ivory rounded-2xl p-6 mb-8 border border-green-primary/10">
          <p className="text-sm text-text-muted text-center mb-4">Question {current + 1} of {QUESTIONS.length}</p>
          <p className="text-5xl font-mono text-center mb-4 text-green-dark font-bold">{QUESTIONS[current]?.q} = ?</p>
        </div>
        
        {!completed ? (
          <form onSubmit={handleAnswer} className="flex gap-3 mb-8">
            <input 
              type="number" 
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Your answer..."
              className="flex-1 bg-ivory border border-border-glass rounded-xl px-5 py-4 text-green-dark text-xl font-mono text-center focus:outline-none focus:border-green-primary shadow-sm"
              autoFocus
            />
            <button type="submit" className="bg-green-primary text-ivory font-medium px-8 py-4 rounded-xl hover:bg-green-dark transition-colors shadow-md">
              Enter
            </button>
          </form>
        ) : (
          <div className="bg-green-primary/10 text-green-dark p-5 rounded-xl text-center font-medium mb-8">
            {timeElapsed >= MAX_TIME ? "Time's up!" : "Complete!"} Calculating your numerical reasoning score...
          </div>
        )}
      </motion.div>
    </div>
  )
}
