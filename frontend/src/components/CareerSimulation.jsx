import { useState } from 'react'
import { motion } from 'framer-motion'
import { useSession } from '../store/SessionContext'
import { recordResponse, updateSessionProgress, saveTraitVector } from '../services/db'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'

export default function CareerSimulation() {
  const { sessionId, updateTraits, traits, advanceFlow } = useSession()
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
      
      advanceFlow(navigate)
    } catch (e) {
      console.error(e)
      const fallback = { domain_exposure: 0.5 }
      const newTraits = { ...traits, ...fallback }
      updateTraits(fallback)
      if (sessionId) {
        await saveTraitVector(sessionId, newTraits)
      }
      advanceFlow(navigate)
    } finally {
      setIsSubmitting(false)
    }
  }

  const topInterest = traits?.interests 
    ? Object.keys(traits.interests).reduce((a, b) => traits.interests[a] > traits.interests[b] ? a : b)
    : 'your top career field';

  let simulationPrompt = `Describe a typical day in the life of someone working in ${topInterest} based on what you currently know. What tasks do they perform?`;
  
  if (topInterest === 'technology' || topInterest === 'science') {
    simulationPrompt = `You have been assigned to solve a major technical problem in ${topInterest}. Walk me through the first 3 steps you would take to debug or analyze the issue.`;
  } else if (topInterest === 'arts' || topInterest === 'architecture') {
    simulationPrompt = `You have a blank canvas and a new client requesting a design in ${topInterest}. How do you begin your creative process to ensure it meets their needs?`;
  } else if (topInterest === 'business' || topInterest === 'finance') {
    simulationPrompt = `Your company in the ${topInterest} sector is facing a sudden 15% drop in revenue. What immediate actions do you take to stabilize the situation?`;
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
        <h2 className="font-playful text-xl sm:text-3xl font-extrabold tracking-tight mb-6 capitalize">{topInterest} Simulation</h2>
        <p className="text-lg mb-10 text-center text-text-muted font-light leading-relaxed">
          {simulationPrompt}
        </p>
        
        <textarea 
          className="w-full h-40 p-6 bg-ivory border border-border-glass rounded-card focus:outline-none focus:border-blush mb-8 text-green-dark shadow-cushion-sm resize-none"
          placeholder="Type your response here..."
          value={text}
          onChange={e => setText(e.target.value)}
        />
        
        <motion.button 
          onClick={handleSubmit}
          disabled={isSubmitting || text.length < 10}
          whileTap={{ scale: [1, 0.92, 1.03, 1] }}
          transition={{ duration: 0.35, ease: [0.34, 1.56, 0.64, 1] }}
          className={`w-full py-4 bg-green-primary text-ivory font-bold rounded-pill hover:bg-green-dark disabled:opacity-50 transition-colors shadow-cushion-sm ${text.length >= 10 && !isSubmitting ? 'animate-heartbeat' : ''}`}
        >
          {isSubmitting ? 'Finalize & View Results' : 'Submit'}
        </motion.button>
      </motion.div>
    </div>
  )
}
