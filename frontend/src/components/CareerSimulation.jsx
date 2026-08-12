import { useState } from 'react'
import { useSession } from '../store/SessionContext'
import { recordResponse, updateSessionProgress, saveTraitVector } from '../services/db'
import { useNavigate } from 'react-router-dom'

export default function CareerSimulation() {
  const { sessionId, updateTraits, traits } = useSession()
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
          activity_id: 'career_simulation',
          response_text: text,
          rubric: ['domain_exposure']
        })
      })
      
      const scores = await response.json()
      
      const newTraits = { ...traits, ...scores }
      updateTraits(scores)
      
      if (sessionId) {
        await recordResponse(sessionId, 'career_simulation', {
          raw_response: text,
          rubric_scores: scores
        })
        await updateSessionProgress(sessionId, 'career_simulation')
        
        // Final activity, save the complete trait vector
        await saveTraitVector(sessionId, newTraits)
      }
      
      navigate('/results')
    } catch (e) {
      console.error(e)
      const fallback = { domain_exposure: 0.5 }
      const newTraits = { ...traits, ...fallback }
      updateTraits(fallback)
      if (sessionId) {
        await saveTraitVector(sessionId, newTraits)
      }
      navigate('/results')
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
        <h2 className="text-3xl font-medium tracking-tight mb-6">Career Simulation</h2>
        <p className="text-lg mb-10 text-center text-text-muted leading-relaxed">
          Describe a typical day in the life of someone working in your top career field based on what you currently know. What tasks do they perform?
        </p>
        
        <textarea 
          className="w-full h-40 p-6 bg-ivory border border-border-glass rounded-2xl focus:outline-none focus:border-green-primary mb-8 text-green-dark shadow-sm resize-none"
          placeholder="Type your response here..."
          value={text}
          onChange={e => setText(e.target.value)}
        />
        
        <button 
          onClick={handleSubmit}
          disabled={isSubmitting || text.length < 10}
          className="w-full py-4 bg-green-primary text-ivory font-medium rounded-full hover:bg-green-dark disabled:opacity-50 transition-colors shadow-md"
        >
          {isSubmitting ? 'Finalize & View Results' : 'Submit'}
        </button>
      </div>
    </div>
  )
}
