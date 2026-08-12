import { useState } from 'react'
import { useSession } from '../store/SessionContext'
import { recordResponse, updateSessionProgress } from '../services/db'
import { useNavigate } from 'react-router-dom'

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
    <div className="flex flex-col items-center justify-center min-h-screen bg-ivory text-green-dark p-6 relative">
      <div className="absolute top-6 left-6">
        <button onClick={() => navigate('/')} className="text-green-secondary hover:text-green-dark font-medium flex items-center gap-2">
          ← Back to Home
        </button>
      </div>

      <div className="flex flex-col items-center justify-center p-10 bg-soft-white rounded-[32px] shadow-2xl border border-border-glass max-w-2xl w-full mx-auto">
        <h2 className="text-3xl font-medium tracking-tight mb-6">Creative Problem Solver</h2>
        <p className="text-lg mb-10 text-center text-text-muted leading-relaxed">
          Imagine you are designing a new sustainable city. What unique transportation system would you create? Describe how it works and why people would use it.
        </p>
        
        <textarea 
          className="w-full h-40 p-6 bg-ivory border border-border-glass rounded-2xl focus:outline-none focus:border-green-primary mb-8 text-green-dark shadow-sm resize-none"
          placeholder="Type your ideas here..."
          value={text}
          onChange={e => setText(e.target.value)}
        />
        
        <button 
          onClick={handleSubmit}
          disabled={isSubmitting || text.length < 10}
          className="w-full py-4 bg-green-primary text-ivory font-medium rounded-full hover:bg-green-dark disabled:opacity-50 transition-colors shadow-md"
        >
          {isSubmitting ? 'Analyzing...' : 'Submit Idea'}
        </button>
      </div>
    </div>
  )
}
