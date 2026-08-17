import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useSession } from '../store/SessionContext'
import { recordResponse } from '../services/db'
import { useNavigate } from 'react-router-dom'

const QUESTIONS = [
  { 
    id: 1, 
    // PatternHunter owns: logical_reasoning, pattern_recognition only
    // NOT numerical_reasoning (that's NumericalReasoning's key)
    type: "logical_reasoning", 
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
    type: "pattern_recognition",
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
          difficulty_level: 3,
          telemetry: telemetry
        })
      })
      
      const data = await response.json()
      
      // Update local state based on backend response heuristic
      // PatternHunter owns ONLY logical_reasoning and pattern_recognition
      if (data.estimated_skill_delta) {
        const traitName = QUESTIONS[current].type // already remapped: only 'logical_reasoning' or 'pattern_recognition'
        const newScore = Math.max(0, Math.min(100, (traits[traitName] || 50) + (data.estimated_skill_delta * 10)))
        updateTraits({ [traitName]: newScore })
      }
    } catch (error) {
      console.error("Failed to send telemetry to backend:", error)
    }

    // Save backup to Firebase
    if (sessionId) {
      await recordResponse(sessionId, `pattern_hunter_q${current+1}`, telemetry).catch(e => console.error("Firestore error:", e))
    }
  }

  const handleAnswer = async (selected) => {
    const q = QUESTIONS[current]
    const isCorrect = selected === q.answer
    const latencySec = (Date.now() - startTs) / 1000

    // Record telemetry immediately with whatever was chosen — never block progress
    const telemetry = {
      response_time_sec: latencySec,
      hints_used: hintsUsed,
      accuracy: isCorrect ? Math.max(1.0 - (attempts * 0.3), 0.2) : 0.0,
      attempts: attempts + 1,
      completed: true,
      quit: false,
      selected_answer: selected,
      correct_answer: q.answer,
      was_correct: isCorrect
    }

    // Write trait unconditionally first — never gate on API
    // PatternHunter owns ONLY logical_reasoning and pattern_recognition.
    // q.type is already remapped in QUESTIONS above: no numerical_reasoning or spatial_reasoning here.
    const traitScore = Math.round(Math.max(10, Math.min(100,
      (isCorrect ? Math.max(1.0 - (attempts * 0.3), 0.2) : 0.1) * 100
    )))
    updateTraits({ [q.type]: traitScore })

    // Fire-and-forget telemetry — do NOT await so it never blocks
    ;(async () => {
      try {
        const rawUrl = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000'
        const API_URL = rawUrl.endsWith('/') ? rawUrl.slice(0, -1) : rawUrl
        await fetch(`${API_URL}/submit_activity`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ user_id: sessionId || 'anonymous', activity_id: 'pattern_hunter', difficulty_level: 3, telemetry })
        })
      } catch (e) { console.warn('Telemetry send failed silently:', e) }
      if (sessionId) await recordResponse(sessionId, `pattern_hunter_q${current+1}`, telemetry).catch(e => console.error("Firestore error:", e))
    })()

    setAttempts(a => a + 1)

    // Always advance to next question
    if (current + 1 < QUESTIONS.length) {
      setCurrent(c => c + 1)
    } else {
      advanceFlow(navigate)
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
    <div className="flex flex-col items-center justify-center min-h-screen bg-ivory text-green-dark pt-24 px-6 pb-6 relative">
      <div className="absolute top-6 left-6 z-20">
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
          {q.options.map(opt => (
            <button 
              key={opt}
              onClick={() => handleAnswer(opt)}
              className="w-full py-4 px-6 text-left border rounded-2xl transition-all font-medium border-green-primary/10 bg-ivory hover:bg-green-primary hover:text-ivory shadow-sm"
            >
              {opt}
            </button>
          ))}
        </div>

        <div className="flex justify-between items-center mt-8 pt-6 border-t border-green-primary/10">
          <button 
            onClick={useHint}
            disabled={showHint}
            className={`text-sm px-6 py-2 rounded-full border transition-colors font-medium ${
              showHint ? 'border-border-glass text-text-muted' : 'border-green-secondary text-green-secondary hover:bg-green-secondary hover:text-ivory'
            }`}
          >
            {showHint ? "Hint Used" : "Need a hint?"}
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



