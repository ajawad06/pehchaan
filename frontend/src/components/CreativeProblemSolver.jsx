import { useState } from 'react'
import { useSession } from '../store/SessionContext'
import { recordResponse, updateSessionProgress } from '../services/db'
import { useNavigate } from 'react-router-dom'

export default function CreativeProblemSolver() {
  const { sessionId, updateTraits } = useSession()
  const [text, setText] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const navigate = useNavigate()

  const handleSubmit = async () => {
    setIsSubmitting(true)
    
    try {
      const API_URL = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000';
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
      
      navigate('/data-detective')
    } catch (e) {
      console.error(e)
      const fallback = { creativity: 0.5, flexibility: 0.5, communication: 0.5, originality: 0.5 }
      updateTraits(fallback)
      navigate('/data-detective')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="flex flex-col items-center justify-center p-8 bg-green-dark rounded-xl shadow-lg max-w-2xl mx-auto mt-10">
      <h2 className="text-3xl font-baloo font-bold text-gold mb-6">Creative Problem Solver</h2>
      <p className="text-lg mb-8 text-center text-cream/90">
        Imagine you are designing a new sustainable city. What unique transportation system would you create? Describe how it works and why people would use it.
      </p>
      
      <textarea 
        className="w-full h-40 p-4 border rounded-lg focus:ring-2 focus:ring-gold mb-6"
        placeholder="Type your ideas here..."
        value={text}
        onChange={e => setText(e.target.value)}
      />
      
      <button 
        onClick={handleSubmit}
        disabled={isSubmitting || text.length < 10}
        className="w-full py-4 bg-gold-bright text-green-dark text-white font-bold rounded-lg hover:bg-gold text-green-dark disabled:opacity-50"
      >
        {isSubmitting ? 'Analyzing...' : 'Submit Idea'}
      </button>
    </div>
  )
}
