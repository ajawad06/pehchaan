import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useSession } from '../store/SessionContext'
import { recordResponse } from '../services/db'
import { useNavigate } from 'react-router-dom'

export default function CreativeUses() {
  const { sessionId, updateTraits, traits, advanceFlow } = useSession()
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
        submitTelemetry(ideas)  // pass current ideas to avoid stale closure
      }
    }, 1000)
    return () => clearInterval(timer)
  }, [startTs, completed, ideas])

  const handleAddIdea = (e) => {
    e.preventDefault()
    if (currentIdea.trim().length > 2) {
      setIdeas([...ideas, currentIdea.trim()])
      setCurrentIdea('')
    }
  }

  const submitTelemetry = async (currentIdeas = ideas) => {
    setCompleted(true)
    const rawUrl = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000'
    const API_URL = rawUrl.endsWith('/') ? rawUrl.slice(0, -1) : rawUrl;
    
    // Direct score from quantity — unconditional, uses currentIdeas to avoid stale state
    let creativityScore = 10  // minimum — they showed up
    if (currentIdeas.length >= 8) creativityScore = 100
    else if (currentIdeas.length >= 6) creativityScore = 85
    else if (currentIdeas.length >= 4) creativityScore = 68
    else if (currentIdeas.length >= 2) creativityScore = 50
    else if (currentIdeas.length >= 1) creativityScore = 35

    // Write unconditionally before the async call
    updateTraits({ creativity: creativityScore })

    const telemetry = {
      response_time_sec: timeElapsed,
      hints_used: 0,
      accuracy: creativityScore / 100,
      attempts: currentIdeas.length,
      completed: true,
      quit: false,
      raw_ideas: currentIdeas
    }

    try {
      await fetch(`${API_URL}/submit_activity`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: sessionId || 'anonymous',
          activity_id: 'creative_uses_brick',
          difficulty_level: traits?.age_group?.includes('14') ? 1 : 3,
          telemetry
        })
      })
    } catch (error) {
      console.error("Failed to send telemetry to backend:", error)
    }

    if (sessionId) {
      await recordResponse(sessionId, 'creative_uses_brick', telemetry)
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
        className="max-w-xl w-full bg-soft-white p-8 rounded-[32px] shadow-2xl border border-border-glass"
      >
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-3xl font-medium tracking-tight">Creative Uses</h2>
          <div className="flex space-x-4">
            <span className={`font-mono font-medium px-3 py-1 rounded-full ${timeElapsed > 45 ? 'bg-red-500/10 text-red-600 animate-pulse' : 'bg-green-primary/5 text-green-secondary'}`}>
              ⏱ {MAX_TIME - timeElapsed}s left
            </span>
          </div>
        </div>
        
        <div className="bg-ivory rounded-2xl p-6 mb-8 border border-green-primary/10">
          <p className="text-xl font-medium text-center mb-2 leading-relaxed">How many different uses can you think of for a <span className="text-green-primary font-bold">BRICK</span>?</p>
          <p className="text-sm text-text-muted text-center">Think outside the box. A brick doesn't just have to be for building walls!</p>
        </div>
        
        {!completed ? (
          <form onSubmit={handleAddIdea} className="flex gap-3 mb-8">
            <input 
              type="text" 
              value={currentIdea}
              onChange={(e) => setCurrentIdea(e.target.value)}
              placeholder="Type an idea and press Enter..."
              className="flex-1 bg-ivory border border-border-glass rounded-xl px-5 py-4 text-green-dark focus:outline-none focus:border-green-primary shadow-sm"
              autoFocus
            />
            <button type="submit" className="bg-green-primary text-ivory font-medium px-8 py-4 rounded-xl hover:bg-green-dark transition-colors shadow-md">
              Add
            </button>
          </form>
        ) : (
          <div className="bg-green-primary/10 text-green-dark p-5 rounded-xl text-center font-medium mb-8">
            Time's up! Calculating your creativity score...
          </div>
        )}

        <div className="flex flex-wrap gap-2 min-h-[120px] p-5 bg-green-primary/5 rounded-2xl border border-border-glass">
          <AnimatePresence>
            {ideas.map((idea, idx) => (
              <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                key={idx}
                className="bg-ivory border border-border-glass text-green-dark px-4 py-2 rounded-lg text-sm font-medium shadow-sm"
              >
                {idea}
              </motion.div>
            ))}
            {ideas.length === 0 && (
              <div className="text-text-muted text-sm italic w-full text-center mt-8">
                Your ideas will appear here...
              </div>
            )}
          </AnimatePresence>
        </div>
        
        <div className="mt-8 flex justify-between items-center">
          <span className="text-text-muted text-sm font-medium">Ideas generated: {ideas.length}</span>
          {!completed && (
            <button 
              onClick={() => submitTelemetry(ideas)}
              className="text-green-secondary border border-border-glass px-5 py-2 rounded-full hover:bg-green-secondary hover:text-ivory transition-colors text-sm font-medium"
            >
              Finish Early
            </button>
          )}
        </div>
      </motion.div>
    </div>
  )
}
