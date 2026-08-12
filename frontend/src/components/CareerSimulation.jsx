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
      const response = await fetch('http://127.0.0.1:8000/score', {
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
    <div className="flex flex-col items-center justify-center p-8 bg-green-dark rounded-xl shadow-lg max-w-2xl mx-auto mt-10">
      <h2 className="text-3xl font-baloo font-bold text-gold mb-6">Career Simulation</h2>
      <p className="text-lg mb-8 text-center text-cream/90">
        Describe a typical day in the life of someone working in your top career field based on what you currently know. What tasks do they perform?
      </p>
      
      <textarea 
        className="w-full h-40 p-4 border rounded-lg focus:ring-2 focus:ring-gold mb-6"
        placeholder="Type your response here..."
        value={text}
        onChange={e => setText(e.target.value)}
      />
      
      <button 
        onClick={handleSubmit}
        disabled={isSubmitting || text.length < 10}
        className="w-full py-4 bg-gold-bright text-green-dark text-white font-bold rounded-lg hover:bg-gold text-green-dark disabled:opacity-50"
      >
        {isSubmitting ? 'Finalize & View Results' : 'Submit'}
      </button>
    </div>
  )
}
