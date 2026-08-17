import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { useSession } from '../store/SessionContext'
import { recordResponse } from '../services/db'
import { useNavigate } from 'react-router-dom'
import PixelIcon from './PixelIcon'
import BackButton from './BackButton'

const QUESTIONS = [
  // Phase 1 (Base Rules)
  { p: 1, base: 'CAT', ops: ['▲'], text: 'CAT ▲', ans: 'TAC' },
  { p: 1, base: 'DOG', ops: ['●'], text: 'DOG ●', ans: 'DOGS' },
  { p: 1, base: 'ART', ops: ['■'], text: 'ART ■', ans: 'RT' },
  { p: 1, base: 'PEN', ops: ['▲', '●'], text: 'PEN ▲ ●', ans: 'NEPS' }, // Reverse -> NEP -> Add S
  // Phase 2 (New Rule introduced: ★ = Duplicate it)
  { p: 2, base: 'BAT', ops: ['★'], text: 'BAT ★', ans: 'BATBAT' },
  { p: 2, base: 'CAT', ops: ['▲', '★'], text: 'CAT ▲ ★', ans: 'TACTAC' }, // Reverse -> TAC -> Duplicate
  { p: 2, base: 'ART', ops: ['★', '■'], text: 'ART ★ ■', ans: 'RTART' }, // Duplicate -> ARTART -> Remove first
]

export default function LearningAgility() {
  const { sessionId, updateTraits, traits, advanceFlow } = useSession()
  const navigate = useNavigate()
  
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
    
    // Check correctness but advance either way
    if (input.trim() === QUESTIONS[current].ans) {
      setScore(s => s + 1)
    }
    
    setInput('')
    
    if (current === 3 && phase === 'practice') {
      setPhase('intro2')
      setCurrent(c => c + 1)
    } else if (current + 1 < QUESTIONS.length) {
      setCurrent(c => c + 1)
    } else {
      finishGame()
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

    // Score from actual performance — unconditional
    // Penalise wrong attempts, reward speed and accuracy
    const agilityScore = Math.round(Math.max(10, Math.min(100,
      (accuracy * 0.7 + Math.max(0, 1 - timeElapsed / 120) * 0.3) * 100
    )))
    // Always write first — can't be gated on API response
    updateTraits({ learning_agility: agilityScore })

    try {
      const rawUrl = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000'
      const API_URL = rawUrl.endsWith('/') ? rawUrl.slice(0, -1) : rawUrl;
      await fetch(`${API_URL}/submit_activity`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: sessionId || 'anonymous',
          activity_id: 'learning_agility',
          difficulty_level: traits?.age_group?.includes('14') ? 1 : 3,
          telemetry
        })
      })
    } catch (error) {
      console.error("Failed to send telemetry:", error)
    }

    if (sessionId) {
      await recordResponse(sessionId, 'learning_agility', telemetry).catch(e => console.error("Firestore error:", e))
    }
    
    setTimeout(() => {
      advanceFlow(navigate)
    }, 2000)
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-ivory text-green-dark pt-20 sm:pt-24 px-4 sm:px-6 pb-6 relative">
      <BackButton />

      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="max-w-xl w-full pixel-panel p-4 sm:p-8 mt-4 text-center"
      >
        <h2 className="text-3xl font-medium tracking-tight mb-6">Learning Agility</h2>
        
        {phase === 'intro1' && (
          <div className="space-y-6">
            <p className="text-lg text-text-muted">Learn this new system. Read left to right.</p>
                <div className="bg-ivory border border-border-glass p-6 rounded-xl space-y-4 mb-8 text-left font-mono">
                  <p><span className="text-blue-500">▲</span> means <strong>Reverse the word</strong></p>
                  <p><span className="text-red-500">●</span> means <strong>Add 'S' to the end</strong></p>
                  <p><span className="text-orange-500">■</span> means <strong>Remove the first letter</strong></p>
                </div>
            <button onClick={() => setPhase('practice')} className="bg-green-primary text-ivory px-8 py-4 rounded-full font-medium hover:bg-green-dark transition-colors shadow-md w-full">
              Start Practice
            </button>
          </div>
        )}

        {phase === 'intro2' && (
          <div className="space-y-6">
            <p className="text-lg text-text-muted">Great. Now, a new rule is introduced:</p>
            <div className="bg-ivory border border-border-glass p-6 rounded-xl space-y-4 mb-8 text-left font-mono">
              <p><span className="text-purple-500">★</span> means <strong>Duplicate the word</strong></p>
            </div>
            <button onClick={() => setPhase('test')} className="pixel-button w-full" style={{ color: '#041C14' }}>
              Continue
            </button>
          </div>
        )}

        {(phase === 'practice' || phase === 'test') && (
          <div className="space-y-6">
            <p className="text-sm text-text-muted uppercase tracking-widest">{phase}</p>
            
            <div className="bg-ivory rounded-2xl p-8 border border-green-primary/10">
              <p className="text-4xl sm:text-5xl font-mono tracking-widest font-bold text-green-dark font-clean">
                {QUESTIONS[current].text} = ?
              </p>
            </div>

            <form onSubmit={handleAnswer} className="flex gap-4">
              <input 
                type="text" 
                value={input}
                onChange={(e) => setInput(e.target.value.toUpperCase())}
                placeholder="Answer..."
                className="flex-1 bg-ivory border border-border-glass rounded-xl px-5 py-4 text-green-dark text-2xl font-mono text-center focus:outline-none focus:border-green-primary shadow-sm"
                autoFocus
              />
              <button type="submit" className="pixel-button" style={{ color: '#041C14' }}>
                Enter
              </button>
            </form>
          </div>
        )}

        {phase === 'result' && (
          <div className="py-12">
            <p className="text-2xl font-medium text-green-secondary">Simulation Complete!</p>
            <p className="text-text-muted mt-2">Saving adaptability metrics...</p>
          </div>
        )}
      </motion.div>
    </div>
  )
}



