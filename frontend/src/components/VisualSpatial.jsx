import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useSession } from '../store/SessionContext'
import { recordResponse } from '../services/db'
import { useNavigate } from 'react-router-dom'

const QUESTIONS = [
  { 
    prompt: "Which shape can be folded to make a perfect cube?", 
    options: ["A shape with 5 squares", "A T-shape with 6 squares", "A square of 4 squares", "A line of 6 squares"], 
    a: "A T-shape with 6 squares" 
  },
  { 
    prompt: "If you rotate a lowercase 'b' 180 degrees clockwise, it becomes...", 
    options: ["p", "q", "d", "b"], 
    a: "q" 
  },
  { 
    prompt: "Which 3D shape looks like a circle from the top and a triangle from the side?", 
    options: ["Cylinder", "Sphere", "Cone", "Pyramid"], 
    a: "Cone" 
  }
]

export default function VisualSpatial() {
  const { sessionId, updateTraits, traits, advanceFlow } = useSession()
  const navigate = useNavigate()
  
  const [current, setCurrent] = useState(0)
  const [startTs, setStartTs] = useState(Date.now())
  const [timeElapsed, setTimeElapsed] = useState(0)
  const [wrongAnswers, setWrongAnswers] = useState([])
  const [attempts, setAttempts] = useState(0)
  const [completed, setCompleted] = useState(false)

  useEffect(() => {
    if (completed) return;
    const timer = setInterval(() => {
      setTimeElapsed(Math.floor((Date.now() - startTs) / 1000))
    }, 1000)
    return () => clearInterval(timer)
  }, [startTs, completed])

  const submitTelemetry = async (success) => {
    setCompleted(true)
    const rawUrl = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000'
    const API_URL = rawUrl.endsWith('/') ? rawUrl.slice(0, -1) : rawUrl;
    
    const accuracy = success ? Math.max(0, 1 - (attempts * 0.2)) : 0.0;
    
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
          activity_id: 'visual_spatial',
          difficulty_level: traits?.age_group?.includes('14') ? 1 : 3,
          telemetry: telemetry
        })
      })
      
      const data = await response.json()
      
      if (data.estimated_skill_delta) {
        const newScore = Math.max(0, Math.min(100, (traits.spatial_reasoning || 50) + (data.estimated_skill_delta * 10)))
        updateTraits({ spatial_reasoning: newScore })
      }
    } catch (error) {
      console.error("Failed to send telemetry to backend:", error)
    }

    if (sessionId) {
      await recordResponse(sessionId, 'visual_spatial', telemetry).catch(e => console.error("Firestore error:", e))
    }
    
    setTimeout(() => {
      advanceFlow(navigate)
    }, 1500)
  }

  const handleAnswer = (selected) => {
    const isCorrect = selected === QUESTIONS[current].a
    setAttempts(a => a + 1)
    setWrongAnswers(prev => [...prev, selected])

    // Fire-and-forget telemetry
    ;(async () => {
      try {
        const rawUrl = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000'
        const API_URL = rawUrl.endsWith('/') ? rawUrl.slice(0, -1) : rawUrl
        const res = await fetch(`${API_URL}/submit_activity`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            user_id: sessionId || 'anonymous',
            activity_id: 'visual_spatial',
            difficulty_level: 3,
            telemetry: { response_time_sec: timeElapsed, hints_used: 0, accuracy: isCorrect ? 0.9 : 0.1, attempts: attempts + 1, completed: true, quit: false, was_correct: isCorrect }
          })
        })
        const data = await res.json()
        if (data.estimated_skill_delta) {
          const newScore = Math.max(0, Math.min(100, (traits.spatial_reasoning || 50) + (data.estimated_skill_delta * 10)))
          updateTraits({ spatial_reasoning: newScore })
        }
      } catch (e) { console.warn('Telemetry failed silently:', e) }
      if (sessionId) await recordResponse(sessionId, 'visual_spatial', { was_correct: isCorrect }).catch(e => console.error("Firestore error:", e))
    })()

    // Always advance
    if (current + 1 < QUESTIONS.length) {
      setCurrent(c => c + 1)
    } else {
      submitTelemetry(true)
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
          <h2 className="text-3xl font-medium tracking-tight">Spatial Reasoning</h2>
          <span className="text-green-secondary font-mono font-medium px-3 py-1 bg-green-primary/5 rounded-full">⏱ {timeElapsed}s</span>
        </div>
        
        <div className="bg-ivory rounded-2xl p-6 mb-8 border border-green-primary/10">
          <p className="text-sm text-text-muted text-center mb-4">Question {current + 1} of {QUESTIONS.length}</p>
          <p className="text-xl font-medium text-center leading-relaxed text-green-dark">{QUESTIONS[current]?.prompt}</p>
        </div>
        
        {!completed ? (
          <div className="w-full space-y-3 mb-8">
          {QUESTIONS[current]?.options.map(opt => (
            <button 
              key={opt}
              onClick={() => handleAnswer(opt)}
              className="w-full py-4 px-6 text-left border border-border-glass rounded-2xl bg-ivory hover:bg-green-primary hover:text-ivory transition-all font-medium shadow-sm"
            >
              {opt}
            </button>
          ))}
        </div>
        ) : (
          <div className="bg-green-primary/10 text-green-dark p-5 rounded-xl text-center font-medium mb-8">
            Complete! Calculating your spatial reasoning score...
          </div>
        )}
      </motion.div>
    </div>
  )
}



