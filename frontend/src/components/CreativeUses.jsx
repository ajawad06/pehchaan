import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useSession } from '../store/SessionContext'
import { recordResponse } from '../services/db'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Timer } from 'lucide-react'
import { pick } from '../utils/randomize'

// Divergent-thinking objects — one is drawn per session. Each is an everyday,
// low-cost item with an obvious primary use, so the challenge is always the
// same shape: get past the obvious answer.
const OBJECTS = [
  { name: 'BRICK',       hint: "A brick doesn't just have to be for building walls!" },
  { name: 'PAPERCLIP',   hint: "A paperclip doesn't just have to hold paper together!" },
  { name: 'BUCKET',      hint: "A bucket doesn't just have to carry water!" },
  { name: 'NEWSPAPER',   hint: "A newspaper doesn't just have to be read!" },
  { name: 'RUBBER BAND', hint: "A rubber band doesn't just have to hold things closed!" },
  { name: 'UMBRELLA',    hint: "An umbrella doesn't just have to keep rain off!" },
  { name: 'SPOON',       hint: "A spoon doesn't just have to be for eating!" },
]

export default function CreativeUses() {
  const { sessionId, updateTraits, traits, advanceFlow } = useSession()
  const navigate = useNavigate()
  
  // One object drawn per mount.
  const [OBJECT] = useState(() => pick(OBJECTS))

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
    const rawUrl = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000'
    const API_URL = rawUrl.endsWith('/') ? rawUrl.slice(0, -1) : rawUrl;
    
    // Base score on quantity of ideas generated within 60s
    // A future version could have the LLM judge uniqueness, but for MVP we use count + length
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
      advanceFlow(navigate)
    }, 2000)
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-ivory text-green-dark p-4 sm:p-6 relative">
      <div className="absolute top-4 left-4 sm:top-6 sm:left-6">
        <button onClick={() => navigate('/')} className="text-green-secondary hover:text-green-dark font-semibold flex items-center gap-2 bg-white/60 rounded-pill px-3 py-1.5 sm:px-4 sm:py-2 shadow-cushion-sm text-sm sm:text-base hover:shadow-cushion transition-shadow">
          <ArrowLeft size={16} className="shrink-0" /> Back
        </button>
      </div>

      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="max-w-xl w-full bg-soft-white p-5 sm:p-8 rounded-card-lg shadow-cushion border border-border-glass"
      >
        <div className="flex flex-wrap gap-2 justify-between items-center mb-6">
          <h2 className="font-playful text-2xl sm:text-3xl font-extrabold tracking-tight">Creative Uses</h2>
          <div className="flex space-x-4">
            <span className={`font-mono font-medium px-3 py-1 rounded-pill flex items-center gap-1.5 text-sm sm:text-base whitespace-nowrap ${timeElapsed > 45 ? 'bg-red-500/10 text-red-600 animate-pulse' : 'bg-green-primary/5 text-green-secondary'}`}>
              <Timer size={15} className="shrink-0" /> {MAX_TIME - timeElapsed}s left
            </span>
          </div>
        </div>
        
        <div className="bg-ivory rounded-card p-6 mb-8 border border-green-primary/10">
          <p className="text-xl font-medium text-center mb-2 leading-relaxed">How many different uses can you think of for {'AEIOU'.includes(OBJECT.name[0]) ? 'an' : 'a'} <span className="text-green-primary font-bold">{OBJECT.name}</span>?</p>
          <p className="text-sm text-text-muted text-center">{`Think outside the box. ${OBJECT.hint}`}</p>
        </div>
        
        {!completed ? (
          <form onSubmit={handleAddIdea} className="flex gap-3 mb-8">
            <input 
              type="text" 
              value={currentIdea}
              onChange={(e) => setCurrentIdea(e.target.value)}
              placeholder="Type an idea and press Enter..."
              className="flex-1 bg-ivory border border-border-glass rounded-card px-5 py-4 text-green-dark focus:outline-none focus:border-green-primary shadow-cushion-sm"
              autoFocus
            />
            <motion.button type="submit" whileTap={{ scale: [1, 0.9, 1.03, 1] }} transition={{ duration: 0.3, ease: [0.34, 1.56, 0.64, 1] }} className="bg-green-primary text-ivory font-bold px-8 py-4 rounded-pill hover:bg-green-dark transition-colors shadow-cushion-sm">
              Add
            </motion.button>
          </form>
        ) : (
          <div className="bg-green-primary/10 text-green-dark p-5 rounded-card text-center font-medium mb-8">
            Time's up! Calculating your creativity score...
          </div>
        )}

        <div className="flex flex-wrap gap-2 min-h-[120px] p-5 bg-green-primary/5 rounded-card border border-border-glass">
          <AnimatePresence>
            {ideas.map((idea, idx) => (
              <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                key={idx}
                className="bg-ivory border border-border-glass text-green-dark px-4 py-2 rounded-pill text-sm font-medium shadow-cushion-sm"
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
              onClick={submitTelemetry}
              className="text-green-secondary border border-border-glass px-5 py-2 rounded-pill hover:bg-green-secondary hover:text-ivory transition-colors text-sm font-medium"
            >
              Finish Early
            </button>
          )}
        </div>
      </motion.div>
    </div>
  )
}
