import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
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

    // Score from actual game performance — unconditional, never 0 unless game errors
    // Levels: 3-char=25, 4-char=50, 5-char=75, 6-char=100 → spans 25-100
    const rawMemScore = Math.round((finalScore / SEQUENCES.length) * 100)
    const clampedScore = Math.max(10, Math.min(100, rawMemScore))

    try {
      const rawUrl = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000'
      const API_URL = rawUrl.endsWith('/') ? rawUrl.slice(0, -1) : rawUrl;
      await fetch(`${API_URL}/submit_activity`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: sessionId || 'anonymous',
          activity_id: 'memory_game',
          difficulty_level: traits?.age_group?.includes('14') ? 1 : 3,
          telemetry
        })
      })
    } catch (error) {
      console.error("Failed to send telemetry:", error)
    }

    // Always write — trait must never stay at 0
    updateTraits({ working_memory: clampedScore, memory: clampedScore })

    if (sessionId) {
      await recordResponse(sessionId, 'memory_game', telemetry).catch(e => console.error("Firestore error:", e))
    }
    
    setTimeout(() => {
      advanceFlow(navigate)
    }, 2000)
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-ivory text-green-dark pt-24 px-6 pb-6 relative">
      <div className="absolute top-6 left-6 z-20">
        <button onClick={() => navigate('/')} className="text-green-secondary hover:text-green-dark font-medium flex items-center gap-2">
          ← Back to Home
        </button>
      </div>

      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="max-w-xl w-full bg-soft-white p-8 rounded-[32px] shadow-2xl border border-border-glass text-center"
      >
        <h2 className="text-3xl font-medium tracking-tight mb-6">Working Memory</h2>
        
        {phase === 'ready' && (
          <div className="space-y-6">
            <p className="text-lg text-text-muted">You will see a sequence of characters. Remember them exactly as they appear.</p>
            <button onClick={startLevel} className="bg-green-primary text-ivory px-8 py-4 rounded-full font-medium hover:bg-green-dark transition-colors shadow-md">
              Start Level {level + 1}
            </button>
          </div>
        )}

        {phase === 'showing' && (
          <div className="py-12 bg-ivory rounded-2xl border border-green-primary/10">
            <p className="text-5xl font-mono tracking-[1em] font-bold text-green-dark ml-4">
              {SEQUENCES[level].join('')}
            </p>
          </div>
        )}

        {phase === 'recalling' && (
          <div className="space-y-6">
            <p className="text-lg text-text-muted">Type the sequence you just saw:</p>
            <form onSubmit={handleAnswer} className="flex flex-col gap-4">
              <input 
                type="text" 
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Enter sequence..."
                className="w-full bg-ivory border border-border-glass rounded-xl px-5 py-4 text-green-dark text-2xl font-mono text-center focus:outline-none focus:border-green-primary shadow-sm uppercase"
                autoFocus
                autoComplete="off"
              />
              <button type="submit" className="bg-green-primary text-ivory font-medium px-8 py-4 rounded-xl hover:bg-green-dark transition-colors shadow-md w-full">
                Submit
              </button>
            </form>
          </div>
        )}

        {phase === 'result' && (
          <div className="py-12">
            <p className="text-2xl font-medium text-green-secondary">Simulation Complete!</p>
            <p className="text-text-muted mt-2">Saving cognitive telemetry...</p>
          </div>
        )}
      </motion.div>
    </div>
  )
}



