import { useState } from 'react'
import { useSession } from '../store/SessionContext'
import { recordResponse, updateSessionProgress, saveTraitVector } from '../services/db'
import { useNavigate } from 'react-router-dom'

export default function DataDetective() {
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
          activity_id: 'data_detective',
          response_text: text,
          rubric: ['data_interpretation', 'analytical_thinking']
        })
      })
      
      const scores = await response.json()
      
      const newTraits = { ...traits, ...scores }
      updateTraits(scores)
      
      if (sessionId) {
        await recordResponse(sessionId, 'data_detective', {
          raw_response: text,
          rubric_scores: scores
        })
        await updateSessionProgress(sessionId, 'data_detective')
      }
      
      navigate('/career-simulation')
    } catch (e) {
      console.error(e)
      const fallback = { data_interpretation: 0.5, analytical_thinking: 0.5 }
      const newTraits = { ...traits, ...fallback }
      updateTraits(fallback)
      navigate('/career-simulation')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="flex flex-col items-center justify-center p-8 bg-green-dark rounded-xl shadow-lg max-w-2xl mx-auto mt-10">
      <h2 className="text-3xl font-baloo font-bold text-gold mb-6">Data Detective</h2>
      <p className="text-lg mb-8 text-center text-cream/90">
        You notice that ice cream sales and shark attacks both increase during the summer. Explain why this might happen and how you would prove it's not a direct cause-and-effect relationship.
      </p>
      
      <textarea 
        className="w-full h-40 p-4 border rounded-lg focus:ring-2 focus:ring-gold mb-6"
        placeholder="Type your analysis here..."
        value={text}
        onChange={e => setText(e.target.value)}
      />
      
      <button 
        onClick={handleSubmit}
        disabled={isSubmitting || text.length < 10}
        className="w-full py-4 bg-gold-bright text-green-dark text-white font-bold rounded-lg hover:bg-gold text-green-dark disabled:opacity-50"
      >
        {isSubmitting ? 'Analyzing...' : 'Submit Findings'}
      </button>
    </div>
  )
}
