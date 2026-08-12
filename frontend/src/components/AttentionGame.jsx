import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { useSession } from '../store/SessionContext'
import { recordResponse } from '../services/db'
import { useNavigate } from 'react-router-dom'

const TARGETS = 10
const DISTRACTORS = 15

export default function AttentionGame() {
  const { sessionId, updateTraits, advanceFlow } = useSession()
  const navigate = useNavigate()
  
  const [phase, setPhase] = useState('ready')
  const [shapes, setShapes] = useState([])
  const [score, setScore] = useState(0)
  const [mistakes, setMistakes] = useState(0)
  const [timeLeft, setTimeLeft] = useState(15)

  useEffect(() => {
    if (phase === 'playing') {
      const timer = setInterval(() => {
        setTimeLeft(t => {
          if (t <= 1) {
            finishGame()
            return 0
          }
          return t - 1
        })
      }, 1000)
      return () => clearInterval(timer)
    }
  }, [phase])

  const startLevel = () => {
    // Generate shapes
    let newShapes = []
    for(let i=0; i<TARGETS; i++) newShapes.push({ id: `t${i}`, type: 'target', active: true })
    for(let i=0; i<DISTRACTORS; i++) newShapes.push({ id: `d${i}`, type: 'distractor', active: true })
    
    // Shuffle
    newShapes = newShapes.sort(() => Math.random() - 0.5)
    
    setShapes(newShapes)
    setPhase('playing')
    setScore(0)
    setMistakes(0)
    setTimeLeft(15)
  }

  const handleClick = (id, type) => {
    if (type === 'target') {
      setScore(s => s + 1)
    } else {
      setMistakes(m => m + 1)
    }
    
    setShapes(prev => prev.map(s => s.id === id ? { ...s, active: false } : s))
    
    // Check if all targets are found
    if (type === 'target' && score + 1 >= TARGETS) {
      finishGame()
    }
  }

  const finishGame = async () => {
    setPhase('result')
    
    const accuracy = Math.max(0, (score - mistakes) / TARGETS)
    
    const telemetry = {
      reaction_time: 15 - timeLeft,
      accuracy: accuracy,
      false_clicks: mistakes,
      missed_targets: TARGETS - score,
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
          activity_id: 'attention_game',
          difficulty_level: 2,
          telemetry: telemetry
        })
      })
      
      const data = await response.json()
      
      if (data.estimated_skill_delta) {
        const newSpeed = Math.max(0, Math.min(100, 50 + (data.estimated_skill_delta * 10)))
        updateTraits({ processing_speed: newSpeed })
      }
    } catch (error) {
      console.error("Failed to send telemetry:", error)
    }

    if (sessionId) {
      await recordResponse(sessionId, 'attention_game', telemetry)
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
        className="max-w-3xl w-full bg-soft-white p-8 rounded-[32px] shadow-2xl border border-border-glass text-center"
      >
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-3xl font-medium tracking-tight">Processing Speed</h2>
          {phase === 'playing' && (
            <span className={`font-mono font-medium px-3 py-1 rounded-full ${timeLeft <= 5 ? 'bg-red-500/10 text-red-600 animate-pulse' : 'bg-green-primary/5 text-green-secondary'}`}>
              ⏱ {timeLeft}s
            </span>
          )}
        </div>
        
        {phase === 'ready' && (
          <div className="space-y-6 py-10">
            <p className="text-lg text-text-muted">Tap all the <span className="text-blue-500 font-bold">Blue Circles</span> as fast as you can.</p>
            <p className="text-lg text-text-muted">Do NOT tap the <span className="text-red-500 font-bold">Red Squares</span>.</p>
            <button onClick={startLevel} className="bg-green-primary text-ivory px-8 py-4 rounded-full font-medium hover:bg-green-dark transition-colors shadow-md mt-6">
              Start
            </button>
          </div>
        )}

        {phase === 'playing' && (
          <div className="grid grid-cols-5 gap-4 bg-ivory rounded-2xl p-6 border border-green-primary/10 min-h-[400px]">
            {shapes.map((shape) => (
              <div key={shape.id} className="flex items-center justify-center h-16 w-16 mx-auto">
                {shape.active && (
                  <button 
                    onClick={() => handleClick(shape.id, shape.type)}
                    className={`w-12 h-12 transition-transform active:scale-90 ${
                      shape.type === 'target' ? 'bg-blue-500 rounded-full' : 'bg-red-500 rounded-lg'
                    }`}
                  />
                )}
              </div>
            ))}
          </div>
        )}

        {phase === 'result' && (
          <div className="py-12">
            <p className="text-2xl font-medium text-green-secondary">Complete!</p>
            <p className="text-text-muted mt-2">Accuracy: {Math.round((score / TARGETS) * 100)}%</p>
            <p className="text-text-muted">Mistakes: {mistakes}</p>
          </div>
        )}
      </motion.div>
    </div>
  )
}
