import { useState } from 'react'
import { useSession } from '../store/SessionContext'
import { recordResponse, updateSessionProgress, saveTraitVector } from '../services/db'
import { useNavigate } from 'react-router-dom'

export default function CareerSimulation() {
  const { sessionId, updateTraits, traits, advanceFlow } = useSession()
  const [text, setText] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const navigate = useNavigate()

  const handleSubmit = async () => {
    if (text.length < 10) return
    setIsSubmitting(true)

    // Completing the simulation is itself strong domain-exposure evidence.
    // Write unconditionally before any async call.
    // All traits on 0-100 scale
    const wordCount = text.trim().split(/\s+/).filter(Boolean).length
    const localExposure = Math.round(Math.min(100, (wordCount / 80) * 100))
    const finalExposure = Math.max(traits.domain_exposure || 0, Math.max(60, localExposure))
    updateTraits({ domain_exposure: finalExposure })

    // Save the trait vector to Firestore immediately with what we have now
    const snapshotTraits = { ...traits, domain_exposure: finalExposure }
    if (sessionId) {
      saveTraitVector(sessionId, snapshotTraits).catch(e =>
        console.warn('saveTraitVector failed:', e)
      )
    }

    // Fire-and-forget Gemini scoring + DB record
    ;(async () => {
      try {
        const rawUrl = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000'
        const API_URL = rawUrl.endsWith('/') ? rawUrl.slice(0, -1) : rawUrl
        const response = await fetch(`${API_URL}/score`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            activity_id: 'career_simulation',
            response_text: text,
            rubric: ['domain_exposure'],
          }),
        })
        const scores = await response.json()
        
        // Gemini returns 0-1 — convert to 0-100 and use Math.max
        const scaled = {}
        Object.entries(scores).forEach(([key, val]) => {
          const asPercent = Math.round((typeof val === 'number' ? val : 0.5) * 100)
          scaled[key] = Math.max(traits[key] || 0, asPercent)
        })
        updateTraits(scaled)
        if (sessionId) {
          await recordResponse(sessionId, 'career_simulation', {
            raw_response: text,
            rubric_scores: scores,
          }).catch(e => console.error("Firestore error:", e))
          await updateSessionProgress(sessionId, 'career_simulation')
        }
      } catch (e) {
        console.warn('CareerSimulation Gemini scoring failed silently:', e)
      }
    })()

    // Advance immediately
    advanceFlow(navigate)
    setIsSubmitting(false)
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
    <div className="flex flex-col items-center justify-center min-h-screen bg-ivory text-green-dark pt-24 px-6 pb-6 relative">
      <div className="absolute top-6 left-6 z-20">
        <button onClick={() => navigate('/')} className="text-green-secondary hover:text-green-dark font-medium flex items-center gap-2">
          ← Back to Home
        </button>
      </div>

      <div className="flex flex-col items-center justify-center p-10 bg-soft-white rounded-[32px] shadow-2xl border border-border-glass max-w-2xl w-full mx-auto">
        <h2 className="text-3xl font-medium tracking-tight mb-6 capitalize">{topInterest} Simulation</h2>
        <p className="text-lg mb-10 text-center text-text-muted leading-relaxed">
          {simulationPrompt}
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

