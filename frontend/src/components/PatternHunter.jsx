import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useSession } from '../store/SessionContext'
import { recordResponse } from '../services/db'
import { useNavigate } from 'react-router-dom'

const QUESTIONS = [
  { 
    id: 1, 
    type: "numerical_reasoning", 
    text: "What comes next? 2, 4, 8, 16...", 
    options: ["24", "32", "64", "20"], 
    answer: "32",
    hint: "Think about multiplication. What happens when you multiply a number by itself?"
  },
  { 
    id: 2, 
    type: "logical_reasoning", 
    text: "If all Z are Y, and all Y are X, then:", 
    options: ["All Z are X", "All X are Z", "Some Z are not X", "None of the above"], 
    answer: "All Z are X",
    hint: "Draw three circles inside each other. The smallest circle is Z."
  },
  {
    id: 3,
    type: "pattern_recognition",
    text: "A, C, F, J, O, ...",
    options: ["U", "V", "S", "T"],
    answer: "U",
    hint: "Count the number of letters skipped between each step. It increases by 1 each time."
  }
]

export default function PatternHunter() {
  const { sessionId, updateTraits, traits } = useSession()
  const navigate = useNavigate()
  
  const [current, setCurrent] = useState(0)
  const [startTs, setStartTs] = useState(Date.now())
  const [attempts, setAttempts] = useState(0)
  const [hintsUsed, setHintsUsed] = useState(0)
  const [showHint, setShowHint] = useState(false)
  const [wrongAnswers, setWrongAnswers] = useState([])

  // Reset tracking when question changes
  useEffect(() => {
    setStartTs(Date.now())
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
          difficulty_level: 3,
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
        navigate('/decision-lab')
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
          navigate('/decision-lab')
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
    <div className="flex flex-col items-center justify-center min-h-screen p-6 relative">
      <motion.div 
        key={current}
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="max-w-xl w-full bg-green-dark p-8 rounded-2xl shadow-xl border border-gold/20"
      >
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-3xl font-baloo font-bold text-gold">Pattern Hunter</h2>
          <span className="text-cream/60">Stage {current + 1} / {QUESTIONS.length}</span>
        </div>
        
        <p className="text-xl text-cream mb-8 font-semibold">{q.text}</p>
        
        <div className="w-full space-y-4 mb-8">
          {q.options.map(opt => {
            const isWrong = wrongAnswers.includes(opt)
            return (
              <button 
                key={opt}
                onClick={() => handleAnswer(opt)}
                disabled={isWrong}
                className={`w-full py-4 px-6 text-left border rounded-lg transition-all ${
                  isWrong 
                    ? 'border-red-500/50 bg-red-500/10 text-cream/50 cursor-not-allowed'
                    : 'border-gold/20 bg-green-mid hover:bg-gold hover:text-green-deepest'
                }`}
              >
                {opt}
              </button>
            )
          })}
        </div>

        <div className="flex justify-between items-center mt-6 pt-6 border-t border-cream/10">
          <button 
            onClick={useHint}
            disabled={showHint}
            className={`text-sm px-4 py-2 rounded-full border ${
              showHint ? 'border-cream/20 text-cream/40' : 'border-gold text-gold hover:bg-gold hover:text-green-deepest'
            }`}
          >
            {showHint ? "Hint Used" : "💡 Need a hint?"}
          </button>
          
          <AnimatePresence>
            {showHint && (
              <motion.div 
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                className="text-sm text-gold-bright max-w-[60%] text-right italic"
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
