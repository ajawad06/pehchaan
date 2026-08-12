import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useSession } from '../store/SessionContext'
import { recordResponse } from '../services/db'
import { useNavigate } from 'react-router-dom'

export default function CreativeUses() {
  const { sessionId, updateTraits, traits } = useSession()
  const navigate = useNavigate()
  
  const [ideas, setIdeas] = useState([])
  const [currentIdea, setCurrentIdea] = useState('')
  const [startTs, setStartTs] = useState(Date.now())
  const [timeElapsed, setTimeElapsed] = useState(0)
  const [completed, setCompleted] = useState(false)

  // 60 second timer
  const MAX_TIME = 60

  useEffect(() => {
    if (completed) return;
    const timer = setInterval(() => {
      const elapsed = Math.floor((Date.now() - startTs) / 1000)
      setTimeElapsed(elapsed)
      if (elapsed >= MAX_TIME) {
        setCompleted(true)
        submitTelemetry()
      }
    }, 1000)
    return () => clearInterval(timer)
  }, [startTs, completed])

  const handleAddIdea = (e) => {
    e.preventDefault()
    if (currentIdea.trim().length > 2) {
      setIdeas([...ideas, currentIdea.trim()])
      setCurrentIdea('')
    }
  }

  const submitTelemetry = async () => {
    setCompleted(true)
    const API_URL = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000'
    
    // Base score on quantity of ideas generated within 60s
    // Real ML would use Gemini to judge uniqueness, but for MVP we use count + length
    let estimatedCreativity = 0.5
    if (ideas.length >= 8) estimatedCreativity = 1.0
    else if (ideas.length >= 5) estimatedCreativity = 0.8
    else if (ideas.length >= 3) estimatedCreativity = 0.6
    
    const telemetry = {
      response_time_sec: timeElapsed,
      hints_used: 0,
      accuracy: estimatedCreativity,
      attempts: ideas.length,
      completed: true,
      quit: false,
      raw_ideas: ideas
    }

    try {
      const response = await fetch(`${API_URL}/submit_activity`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: sessionId || 'anonymous',
          activity_id: 'creative_uses_brick',
          difficulty_level: traits?.age_group?.includes('14') ? 1 : 3,
          telemetry: telemetry
        })
      })
      
      const data = await response.json()
      
      if (data.estimated_skill_delta) {
        const newScore = Math.max(0, Math.min(100, (traits.creativity || 50) + (data.estimated_skill_delta * 10) + (ideas.length * 2)))
        updateTraits({ creativity: newScore })
      }
    } catch (error) {
      console.error("Failed to send telemetry to backend:", error)
    }

    if (sessionId) {
      await recordResponse(sessionId, 'creative_uses_brick', telemetry)
    }
    
    setTimeout(() => {
      navigate('/data-detective')
    }, 2000)
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-6 relative">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="max-w-xl w-full bg-green-dark p-8 rounded-2xl shadow-xl border border-gold/20"
      >
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-3xl font-baloo font-bold text-gold">Creative Uses</h2>
          <div className="flex space-x-4">
            <span className={`font-mono text-lg px-3 py-1 rounded-lg ${timeElapsed > 45 ? 'bg-red-500 text-white animate-pulse' : 'bg-green-deepest text-gold-bright'}`}>
              ⏱ {MAX_TIME - timeElapsed}s left
            </span>
          </div>
        </div>
        
        <div className="bg-green-mid rounded-xl p-6 mb-6 border border-gold/30">
          <p className="text-xl text-cream font-semibold text-center mb-2">How many different uses can you think of for a <span className="text-gold-bright">BRICK</span>?</p>
          <p className="text-sm text-cream/70 text-center">Think outside the box. A brick doesn't just have to be for building walls!</p>
        </div>
        
        {!completed ? (
          <form onSubmit={handleAddIdea} className="flex gap-2 mb-6">
            <input 
              type="text" 
              value={currentIdea}
              onChange={(e) => setCurrentIdea(e.target.value)}
              placeholder="Type an idea and press Enter..."
              className="flex-1 bg-green-deepest border border-gold/20 rounded-lg px-4 py-3 text-cream focus:outline-none focus:border-gold"
              autoFocus
            />
            <button type="submit" className="bg-gold text-green-deepest font-bold px-6 py-3 rounded-lg hover:bg-gold-bright transition-colors">
              Add
            </button>
          </form>
        ) : (
          <div className="bg-gold/20 text-gold-bright p-4 rounded-lg text-center font-bold mb-6">
            Time's up! Calculating your creativity score...
          </div>
        )}

        <div className="flex flex-wrap gap-2 min-h-[100px] p-4 bg-green-deepest rounded-xl">
          <AnimatePresence>
            {ideas.map((idea, idx) => (
              <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                key={idx}
                className="bg-green-mid border border-gold/30 text-cream px-3 py-2 rounded-lg text-sm"
              >
                {idea}
              </motion.div>
            ))}
            {ideas.length === 0 && (
              <div className="text-cream/30 text-sm italic w-full text-center mt-6">
                Your ideas will appear here...
              </div>
            )}
          </AnimatePresence>
        </div>
        
        <div className="mt-6 flex justify-between items-center">
          <span className="text-cream/60 text-sm">Ideas generated: {ideas.length}</span>
          {!completed && (
            <button 
              onClick={submitTelemetry}
              className="text-gold border border-gold px-4 py-2 rounded-lg hover:bg-gold hover:text-green-deepest transition-colors text-sm"
            >
              Finish Early
            </button>
          )}
        </div>
      </motion.div>
    </div>
  )
}
