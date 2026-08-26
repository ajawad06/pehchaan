import { useState } from 'react'
import { motion } from 'framer-motion'
import { useSession } from '../store/SessionContext'
import { recordResponse, updateSessionProgress } from '../services/db'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'

export default function CreativeProblemSolver() {
  const { sessionId, updateTraits, advanceFlow } = useSession()
  const [text, setText] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const navigate = useNavigate()

  const handleSubmit = async () => {
    setIsSubmitting(true)
    
    try {
      const rawUrl = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000';
      const API_URL = rawUrl.endsWith('/') ? rawUrl.slice(0, -1) : rawUrl;
      const response = await fetch(`${API_URL}/score`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          activity_id: 'creative_problem_solver',
          response_text: text,
          rubric: ['creativity', 'flexibility', 'communication', 'originality']
        })
      })
      
      const scores = await response.json()
      updateTraits(scores)
      
      if (sessionId) {
        await recordResponse(sessionId, 'creative_problem_solver', {
          raw_response: text,
          rubric_scores: scores
        })
        await updateSessionProgress(sessionId, 'creative_problem_solver')
      }
      
      advanceFlow(navigate)
    } catch (e) {
      console.error(e)
      const fallback = { creativity: 0.5, flexibility: 0.5, communication: 0.5, originality: 0.5 }
      updateTraits(fallback)
      advanceFlow(navigate)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-ivory text-green-dark p-4 sm:p-6 relative">
      <div className="absolute top-4 left-4 sm:top-6 sm:left-6">
        <button onClick={() => navigate('/')} className="text-green-secondary hover:text-green-dark font-semibold flex items-center gap-2 bg-white/60 rounded-pill px-3 py-1.5 sm:px-4 sm:py-2 shadow-cushion-sm text-sm sm:text-base hover:shadow-cushion transition-shadow">
          <ArrowLeft size={16} className="shrink-0" /> Back
        </button>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 16, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.45, ease: [0.34, 1.56, 0.64, 1] }}
        className="flex flex-col items-center justify-center p-5 sm:p-10 bg-soft-white rounded-card-lg shadow-cushion border border-border-glass max-w-2xl w-full mx-auto"
      >
        <h2 className="font-playful text-xl sm:text-3xl font-extrabold tracking-tight mb-6">Creative Problem Solver</h2>
        <p className="text-lg mb-10 text-center text-text-muted font-light leading-relaxed">
          Imagine you are designing a new sustainable city. What unique transportation system would you create? Describe how it works and why people would use it.
        </p>
        
        <textarea 
          className="w-full h-40 p-6 bg-ivory border border-border-glass rounded-card focus:outline-none focus:border-blush mb-8 text-green-dark shadow-cushion-sm resize-none"
          placeholder="Type your ideas here..."
          value={text}
          onChange={e => setText(e.target.value)}
        />
        
        <motion.button 
          onClick={handleSubmit}
          disabled={isSubmitting || text.length < 10}
          whileTap={{ scale: [1, 0.92, 1.03, 1] }}
          transition={{ duration: 0.35, ease: [0.34, 1.56, 0.64, 1] }}
          className={`w-full py-4 bg-green-primary text-ivory font-bold rounded-pill hover:bg-green-dark disabled:opacity-50 transition-colors shadow-cushion-sm ${text.length >= 10 && !isSubmitting ? 'animate-breathe' : ''}`}
        >
          {isSubmitting ? 'Analyzing...' : 'Submit Idea'}
        </motion.button>
      </motion.div>
    </div>
  )
}
