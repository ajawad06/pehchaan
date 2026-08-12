import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { useSession } from '../store/SessionContext'
import { recordResponse } from '../services/db'
import { useNavigate } from 'react-router-dom'

const QUESTIONS = [
  // Phase 1 (Base Rules)
  { p: 1, base: 5, ops: ['▲'], text: '5 ▲', ans: 8 },
  { p: 1, base: 4, ops: ['●'], text: '4 ●', ans: 8 },
  { p: 1, base: 10, ops: ['■'], text: '10 ■', ans: 6 },
  { p: 1, base: 3, ops: ['▲', '●'], text: '3 ▲ ●', ans: 12 }, // (3+3)*2
  // Phase 2 (New Rule introduced: ★ = Square it)
  { p: 2, base: 3, ops: ['★'], text: '3 ★', ans: 9 },
  { p: 2, base: 2, ops: ['▲', '★'], text: '2 ▲ ★', ans: 25 }, // (2+3)^2 = 25
  { p: 2, base: 5, ops: ['★', '■'], text: '5 ★ ■', ans: 21 }, // (5^2)-4 = 21
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
        updateTraits({ logical_reasoning: 50 + (data.estimated_skill_delta * 10) }) 
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
    <div className="flex flex-col items-center justify-center min-h-screen bg-ivory text-green-dark p-6 relative">
      <div className="absolute top-6 left-6">
        <button onClick={() => navigate('/')} className="text-green-secondary hover:text-green-dark font-medium flex items-center gap-2">
          ← Back to Home
        </button>
      </div>

      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="max-w-xl w-full bg-soft-white p-8 rounded-[32px] shadow-2xl border border-border-glass text-center"
      >
        <h2 className="text-3xl font-medium tracking-tight mb-6">Learning Agility</h2>
        
        {phase === 'intro1' && (
          <div className="space-y-6">
            <p className="text-lg text-text-muted">Learn this new system. Read left to right.</p>
            <div className="bg-ivory rounded-2xl p-6 border border-green-primary/10 text-xl font-mono text-left space-y-4 max-w-sm mx-auto">
              <p><span className="text-blue-500">▲</span> means <b>Add 3</b></p>
              <p><span className="text-red-500">●</span> means <b>Multiply by 2</b></p>
              <p><span className="text-orange-500">■</span> means <b>Subtract 4</b></p>
            </div>
            <button onClick={() => setPhase('practice')} className="bg-green-primary text-ivory px-8 py-4 rounded-full font-medium hover:bg-green-dark transition-colors shadow-md w-full">
              Start Practice
            </button>
          </div>
        )}

        {phase === 'intro2' && (
          <div className="space-y-6">
            <p className="text-lg text-text-muted">Great. Now, a new rule is introduced:</p>
            <div className="bg-ivory rounded-2xl p-6 border border-green-primary/10 text-xl font-mono text-left space-y-4 max-w-sm mx-auto">
              <p><span className="text-purple-500">★</span> means <b>Square the number</b> (multiply by itself)</p>
            </div>
            <button onClick={() => setPhase('test')} className="bg-green-primary text-ivory px-8 py-4 rounded-full font-medium hover:bg-green-dark transition-colors shadow-md w-full">
              Continue
            </button>
          </div>
        )}

        {(phase === 'practice' || phase === 'test') && (
          <div className="space-y-6">
            <p className="text-sm text-text-muted uppercase tracking-widest">{phase}</p>
            
            <div className="bg-ivory rounded-2xl p-8 border border-green-primary/10">
              <p className="text-5xl font-mono tracking-widest font-bold text-green-dark">
                {QUESTIONS[current].text} = ?
              </p>
            </div>

            <form onSubmit={handleAnswer} className="flex gap-4">
              <input 
                type="number" 
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Answer..."
                className="flex-1 bg-ivory border border-border-glass rounded-xl px-5 py-4 text-green-dark text-2xl font-mono text-center focus:outline-none focus:border-green-primary shadow-sm"
                autoFocus
              />
              <button type="submit" className="bg-green-primary text-ivory font-medium px-8 py-4 rounded-xl hover:bg-green-dark transition-colors shadow-md">
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
