import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useSession } from '../store/SessionContext'
import { recordResponse } from '../services/db'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Timer, Lightbulb } from 'lucide-react'
import { sampleBalanced } from '../utils/randomize'

// Item bank — three per reasoning type. Exactly one of each type is served per
// session, because `type` is the trait each answer writes to: drop a type and
// that trait never gets measured.
const ITEM_BANK = [
  // ── numerical_reasoning ──────────────────────────────────────────────
  {
    id: 1,
    type: "numerical_reasoning",
    text: "Identify the missing element in the sequence: 2, 6, 12, 20, 30, ?",
    options: ["40", "42", "44", "48"],
    answer: "42",
    hint: "Look at the differences between consecutive numbers. How are the differences themselves changing?"
  },
  {
    id: 5,
    type: "numerical_reasoning",
    text: "What comes next: 3, 6, 12, 24, 48, ?",
    options: ["72", "84", "96", "108"],
    answer: "96",
    hint: "Each step does the same thing to the previous number. What single operation gets you from 3 to 6, and 6 to 12?"
  },
  {
    id: 6,
    type: "numerical_reasoning",
    text: "A shirt costs Rs. 800 after a 20% discount. What was the original price?",
    options: ["Rs. 960", "Rs. 1000", "Rs. 1020", "Rs. 1600"],
    answer: "Rs. 1000",
    hint: "Rs. 800 is not 80% off — it is what remains after 20% was removed."
  },

  // ── logical_reasoning ────────────────────────────────────────────────
  {
    id: 2,
    type: "logical_reasoning",
    text: "If C = 3, F = 6, and I = 9, what is the value of P + D?",
    options: ["18", "20", "22", "24"],
    answer: "20",
    hint: "Map each letter to its position in the alphabet (A=1, B=2...)."
  },
  {
    id: 7,
    type: "logical_reasoning",
    text: "All engineers can code. Sara can code. Which statement must be true?",
    options: ["Sara is an engineer", "Sara is not an engineer", "Some coders are engineers", "All coders are engineers"],
    answer: "Some coders are engineers",
    hint: "The first sentence tells you about every engineer, but nothing about every coder."
  },
  {
    id: 8,
    type: "logical_reasoning",
    text: "Five runners finish a race. Ali beat Bilal. Cina finished last. Bilal beat Danish. Who cannot be first?",
    options: ["Ali", "Bilal", "Danish", "Both Bilal and Danish"],
    answer: "Both Bilal and Danish",
    hint: "Anyone who was beaten by someone else cannot have finished first."
  },

  // ── pattern_recognition ──────────────────────────────────────────────
  {
    id: 3,
    type: "pattern_recognition",
    text: "Observe the pattern: 111 = 3, 112 = 4, 122 = 5, 222 = 6. What does 333 equal?",
    options: ["6", "7", "8", "9"],
    answer: "9",
    hint: "Don't think of them as hundreds and tens. Look at the individual digits."
  },
  {
    id: 9,
    type: "pattern_recognition",
    text: "If RED becomes SFE, what does BLUE become?",
    options: ["CMVF", "CMWF", "AKTD", "CNVF"],
    answer: "CMVF",
    hint: "Compare each letter with the one that replaced it. How far did it move?"
  },
  {
    id: 10,
    type: "pattern_recognition",
    text: "The pattern goes 1, 1, 2, 3, 5, 8, 13, ? — what comes next?",
    options: ["18", "20", "21", "26"],
    answer: "21",
    hint: "Each number is built from the two before it."
  },

  // ── spatial_reasoning ────────────────────────────────────────────────
  {
    id: 4,
    type: "spatial_reasoning",
    text: "Which of the following logically completes this sequence? ▲ ● ▲ ● ■ ▲ ● ▲ ● ■ ■ ?",
    options: ["▲", "●", "■", "None"],
    answer: "▲",
    hint: "Break the sequence into smaller repeating groups. Notice how the groups grow."
  },
  {
    id: 11,
    type: "spatial_reasoning",
    text: "A cube is painted on all six faces, then cut into 27 smaller cubes. How many have exactly one painted face?",
    options: ["4", "6", "8", "12"],
    answer: "6",
    hint: "A small cube with one painted face must have come from the middle of a face, not an edge or corner."
  },
  {
    id: 12,
    type: "spatial_reasoning",
    text: "You face north, turn 90° right, then 180°, then 90° right again. Which way are you facing?",
    options: ["North", "South", "East", "West"],
    answer: "North",
    hint: "Track the turns one at a time. Right from north is east."
  }
]

export default function PatternHunter() {
  const { sessionId, updateTraits, traits, advanceFlow } = useSession()
  const navigate = useNavigate()

  // One item per reasoning type, drawn once per mount — every trait this
  // activity feeds still gets exactly one measurement.
  const [QUESTIONS] = useState(() => sampleBalanced(ITEM_BANK, q => q.type, 1))

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

    // Fire-and-forget telemetry — do NOT await so it never blocks
    ;(async () => {
      try {
        const rawUrl = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000'
        const API_URL = rawUrl.endsWith('/') ? rawUrl.slice(0, -1) : rawUrl
        const res = await fetch(`${API_URL}/submit_activity`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ user_id: sessionId || 'anonymous', activity_id: 'pattern_hunter', difficulty_level: 3, telemetry })
        })
        const data = await res.json()
        if (data.estimated_skill_delta) {
          const traitName = q.type === 'spatial_reasoning' ? 'spatial_reasoning' : 'logical_reasoning'
          const newScore = Math.max(0, Math.min(100, (traits[traitName] || 50) + (data.estimated_skill_delta * 10)))
          updateTraits({ [traitName]: newScore })
        }
      } catch (e) { console.warn('Telemetry send failed silently:', e) }
      if (sessionId) await recordResponse(sessionId, `pattern_hunter_q${current+1}`, telemetry)
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
    <div className="flex flex-col items-center justify-center min-h-screen bg-ivory text-green-dark p-4 sm:p-6 relative">
      <div className="absolute top-4 left-4 sm:top-6 sm:left-6">
        <button onClick={() => navigate('/')} className="text-green-secondary hover:text-green-dark font-semibold flex items-center gap-2 bg-white/60 rounded-pill px-3 py-1.5 sm:px-4 sm:py-2 shadow-cushion-sm text-sm sm:text-base hover:shadow-cushion transition-shadow">
          <ArrowLeft size={16} className="shrink-0" /> Back
        </button>
      </div>

      <motion.div 
        key={current}
        initial={{ opacity: 0, y: 16, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.45, ease: [0.34, 1.56, 0.64, 1] }}
        className="max-w-xl w-full bg-soft-white p-5 sm:p-8 rounded-card-lg shadow-cushion border border-border-glass"
      >
        <div className="flex flex-wrap gap-2 justify-between items-center mb-6">
          <h2 className="font-playful text-xl sm:text-3xl font-extrabold tracking-tight">Pattern Hunter</h2>
          <div className="flex space-x-4 items-center">
            <span className="text-green-secondary font-mono font-bold px-4 py-1.5 bg-green-primary/5 rounded-pill flex items-center gap-1.5"><Timer size={16} className="shrink-0" /> {timeElapsed}s</span>
            <span className="text-text-muted text-sm uppercase tracking-widest font-bold">Stage {current + 1}/{QUESTIONS.length}</span>
          </div>
        </div>
        
        <p className="text-2xl mb-10 font-medium leading-relaxed">{q.text}</p>
        
        <div className="w-full space-y-3 mb-8">
          {q.options.map((opt, i) => (
            <motion.button 
              key={opt}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.35, delay: i * 0.06, ease: [0.34, 1.56, 0.64, 1] }}
              whileTap={{ scale: 0.97 }}
              onClick={() => handleAnswer(opt)}
              className="w-full py-4 px-6 text-left border rounded-card transition-colors font-medium border-green-primary/10 bg-ivory hover:bg-green-primary hover:text-ivory shadow-cushion-sm"
            >
              {opt}
            </motion.button>
          ))}
        </div>

        <div className="flex flex-wrap gap-3 justify-between items-center mt-8 pt-6 border-t border-green-primary/10">
          <button 
            onClick={useHint}
            disabled={showHint}
            className={`text-sm px-4 sm:px-6 py-2.5 rounded-pill border transition-colors font-semibold flex items-center gap-1.5 whitespace-nowrap ${
              showHint ? 'border-border-glass text-text-muted' : 'border-green-secondary text-green-secondary hover:bg-green-secondary hover:text-ivory'
            }`}
          >
            <Lightbulb size={15} className="shrink-0" />
            {showHint ? "Hint Used" : "Need a hint?"}
          </button>
          
          <AnimatePresence>
            {showHint && (
              <motion.div 
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.3, ease: [0.34, 1.56, 0.64, 1] }}
                className="text-sm text-green-secondary w-full sm:w-auto sm:max-w-[60%] text-left sm:text-right font-medium break-words"
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
