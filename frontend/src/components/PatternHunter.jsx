import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useSession } from '../store/SessionContext'
import { recordResponse } from '../services/db'
import { useNavigate } from 'react-router-dom'

const QUESTIONS = [
  { 
    id: 1, 
    type: "numerical_reasoning", 
    text: "Identify the missing element in the sequence: 2, 6, 12, 20, 30, ?", 
    options: ["40", "42", "44", "48"], 
    answer: "42",
    hint: "Look at the differences between consecutive numbers. How are the differences themselves changing?"
  },
  { 
    id: 2, 
    type: "logical_reasoning", 
    text: "If C = 3, F = 6, and I = 9, what is the value of P + D?", 
    options: ["18", "20", "22", "24"], 
    answer: "20",
    hint: "Map each letter to its position in the alphabet (A=1, B=2...)."
  },
  {
    id: 3,
    type: "pattern_recognition",
    text: "Observe the pattern: 111 = 3, 112 = 4, 122 = 5, 222 = 6. What does 333 equal?",
    options: ["6", "7", "8", "9"],
    answer: "9",
    hint: "Don't think of them as hundreds and tens. Look at the individual digits."
  },
  {
    id: 4,
    type: "spatial_reasoning",
    text: "Which of the following logically completes this sequence? ▲ ● ▲ ● ■ ▲ ● ▲ ● ■ ■ ?",
    options: ["▲", "●", "■", "None"],
    answer: "▲",
    hint: "Break the sequence into smaller repeating groups. Notice how the groups grow."
  }
]

export default function PatternHunter() {
  const { sessionId, updateTraits, traits, advanceFlow } = useSession()
  const navigate = useNavigate()
  
  const [current, setCurrent] = useState(0)
  const [startTs, setStartTs] = useState(Date.now())
  const [timeElapsed, setTimeElapsed] = useState(0)
  const [attempts, setAttempts] = useState(0)
  const [hintsUsed, setHintsUsed] = useState(0)
  const [showHint, setShowHint] = useState(false)
  const [wrongAnswers, setWrongAnswers] = useState([])

  // Timer logic
  useEffect(() => {
    const timer = setInterval(() => {
      setTimeElapsed(Math.floor((Date.now() - startTs) / 1000))
    }, 1000)
    return () => clearInterval(timer)
  }, [startTs])

  // Reset tracking when question changes
  useEffect(() => {
    setStartTs(Date.now())
    setTimeElapsed(0)
    setAttempts(0)
    setHintsUsed(0)
    setShowHint(false)
    setWrongAnswers([])
  }, [current])

  const submitTelemetry = async (isCorrect) => {
    const latencySec = (Date.now() - startTs) / 1000
    const finalAccuracy = isCorrect ? Math.max(1.0 - (attempts * 0.3) - (hintsUsed * 0.2), 0.2) : 0.0

    const telemetry = {
      response_time_sec: latencySec,
      hints_used: hintsUsed,
      accuracy: finalAccuracy,
      attempts: attempts + 1,
      completed: isCorrect,
      quit: false
    }

    try {
      const API_URL = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000'
      const response = await fetch(`${API_URL}/submit_activity`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: sessionId || 'anonymous',
          activity_id: 'pattern_hunter',
          difficulty_level: 3, // In full app, derive from traits.age_group
          telemetry: telemetry
        })
      })
      
      const data = await response.json()
      
      // Update local state based on backend response heuristic
      if (data.estimated_skill_delta) {
        const traitName = QUESTIONS[current].type
        const newScore = Math.max(0, Math.min(100, (traits[traitName] || 50) + (data.estimated_skill_delta * 10)))
        updateTraits({ [traitName]: newScore })
      }
    } catch (error) {
      console.error("Failed to send telemetry to backend:", error)
    }

    // Save backup to Firebase
    if (sessionId) {
      await recordResponse(sessionId, `pattern_hunter_q${current+1}`, telemetry)
    }
  }

  const handleAnswer = async (selected) => {
    const q = QUESTIONS[current]
    const isCorrect = selected === q.answer

    if (isCorrect) {
      await submitTelemetry(true)
      
      if (current + 1 < QUESTIONS.length) {
        setCurrent(c => c + 1)
      } else {
        advanceFlow(navigate)
      }
    } else {
      setAttempts(a => a + 1)
      setWrongAnswers(prev => [...prev, selected])
      // If they fail 3 times, auto-advance and log failure
      if (attempts >= 2) {
        await submitTelemetry(false)
        if (current + 1 < QUESTIONS.length) {
          setCurrent(c => c + 1)
        } else {
          advanceFlow(navigate)
        }
      }
    }
  }

  const useHint = () => {
    if (!showHint) {
      setHintsUsed(h => h + 1)
      setShowHint(true)
    }
  }

  const q = QUESTIONS[current]

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-ivory text-green-dark p-6 relative">
      <div className="absolute top-6 left-6">
        <button onClick={() => navigate('/')} className="text-green-secondary hover:text-green-dark font-medium flex items-center gap-2">
          ← Back to Home
        </button>
      </div>

      <motion.div 
        key={current}
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="max-w-xl w-full bg-soft-white p-8 rounded-[32px] shadow-2xl border border-border-glass"
      >
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-3xl font-medium tracking-tight">Pattern Hunter</h2>
          <div className="flex space-x-4 items-center">
            <span className="text-green-secondary font-mono font-medium px-3 py-1 bg-green-primary/5 rounded-full">⏱ {timeElapsed}s</span>
            <span className="text-text-muted text-sm uppercase tracking-widest font-bold">Stage {current + 1}/{QUESTIONS.length}</span>
          </div>
        </div>
        
        <p className="text-2xl mb-10 font-medium leading-relaxed">{q.text}</p>
        
        <div className="w-full space-y-3 mb-8">
          {q.options.map(opt => {
            const isWrong = wrongAnswers.includes(opt)
            return (
              <button 
                key={opt}
                onClick={() => handleAnswer(opt)}
                disabled={isWrong}
                className={`w-full py-4 px-6 text-left border rounded-2xl transition-all font-medium ${
                  isWrong 
                    ? 'border-red-500/20 bg-red-500/5 text-red-500/50 cursor-not-allowed'
                    : 'border-green-primary/10 bg-ivory hover:bg-green-primary hover:text-ivory shadow-sm'
                }`}
              >
                {opt}
              </button>
            )
          })}
        </div>

        <div className="flex justify-between items-center mt-8 pt-6 border-t border-green-primary/10">
          <button 
            onClick={useHint}
            disabled={showHint}
            className={`text-sm px-6 py-2 rounded-full border transition-colors font-medium ${
              showHint ? 'border-border-glass text-text-muted' : 'border-green-secondary text-green-secondary hover:bg-green-secondary hover:text-ivory'
            }`}
          >
            {showHint ? "Hint Used" : "💡 Need a hint?"}
          </button>
          
          <AnimatePresence>
            {showHint && (
              <motion.div 
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                className="text-sm text-green-secondary max-w-[60%] text-right font-medium"
              >
                {q.hint}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </div>
  )
}
