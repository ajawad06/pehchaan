import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useSession } from '../store/SessionContext'
import { recordResponse } from '../services/db'
import { useNavigate } from 'react-router-dom'
import PixelIcon from './PixelIcon'
import BackButton from './BackButton'

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

    // Write spatial_reasoning unconditionally FIRST — never gate on API response
    const spatialScore = Math.round(Math.max(10, Math.min(100, accuracy * 100)))
    updateTraits({ spatial_reasoning: Math.max(traits.spatial_reasoning || 0, spatialScore) })

    // Fire-and-forget telemetry
    ;(async () => {
      try {
        await fetch(`${API_URL}/submit_activity`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            user_id: sessionId || 'anonymous',
            activity_id: 'visual_spatial',
            difficulty_level: traits?.age_group?.includes('14') ? 1 : 3,
            telemetry: telemetry
          })
        })
      } catch (error) {
        console.warn('VisualSpatial telemetry failed silently:', error)
      }
    })()

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

    // Write spatial_reasoning unconditionally on every answer
    const answerAccuracy = isCorrect ? 0.9 : 0.1
    const spatialScore = Math.round(Math.max(10, Math.min(100, answerAccuracy * 100)))
    updateTraits({ spatial_reasoning: Math.max(traits.spatial_reasoning || 0, spatialScore) })

    // Fire-and-forget telemetry
    ;(async () => {
      try {
        const rawUrl = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000'
        const API_URL = rawUrl.endsWith('/') ? rawUrl.slice(0, -1) : rawUrl
        await fetch(`${API_URL}/submit_activity`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            user_id: sessionId || 'anonymous',
            activity_id: 'visual_spatial',
            difficulty_level: 3,
            telemetry: { response_time_sec: timeElapsed, hints_used: 0, accuracy: answerAccuracy, attempts: attempts + 1, completed: true, quit: false, was_correct: isCorrect }
          })
        })
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
    <div className="flex flex-col items-center justify-center min-h-screen bg-ivory text-green-dark pt-20 sm:pt-24 px-4 sm:px-6 pb-6 relative">
      <BackButton />

      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="max-w-xl w-full pixel-panel p-4 sm:p-8 mt-4"
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



