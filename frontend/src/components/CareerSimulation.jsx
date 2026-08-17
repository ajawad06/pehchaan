import { useState } from 'react'
import { useSession } from '../store/SessionContext'
import { recordResponse, updateSessionProgress, saveTraitVector } from '../services/db'
import { useNavigate } from 'react-router-dom'
import PixelIcon from './PixelIcon'
import BackButton from './BackButton'

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

  const topInterest = traits?.interests && Object.keys(traits.interests).length > 0
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
    <div className="flex flex-col items-center justify-center min-h-screen bg-ivory text-green-dark pt-20 sm:pt-24 px-4 sm:px-6 pb-6 relative">
      <BackButton />

      <div className="flex flex-col items-center justify-center p-4 sm:p-10 pixel-panel max-w-4xl w-full mx-auto mt-4 relative">
        <div className="absolute top-4 right-4 sm:top-8 sm:right-8">
          <PixelIcon name="spark" size={24} />
        </div>
        <h2 className="text-2xl sm:text-3xl font-medium tracking-tight mb-4 sm:mb-6 capitalize flex items-center gap-2 sm:gap-3">
          <PixelIcon name="clover" size={20} />
          {topInterest} Simulation
          <PixelIcon name="clover" size={20} />
        </h2>
        <p className="text-sm sm:text-lg mb-6 sm:mb-8 text-center text-green-dark leading-relaxed font-medium">
          {simulationPrompt}
        </p>
        
        <div className="w-full flex flex-col sm:flex-row gap-4 mb-6">
          <textarea 
            className="flex-1 h-48 sm:h-64 p-4 sm:p-6 bg-ivory border-2 border-green-deepest focus:outline-none shadow-[4px_4px_0_#041C14] text-green-dark resize-none font-mono text-base sm:text-lg"
            style={{ 
              backgroundImage: 'linear-gradient(#B6C8BE 1px, transparent 1px), linear-gradient(90deg, #B6C8BE 1px, transparent 1px)', 
              backgroundSize: '24px 24px',
              lineHeight: '24px'
            }}
            placeholder="Start drafting here..."
            value={text}
            onChange={e => setText(e.target.value)}
          />
          
          {(topInterest === 'architecture' || topInterest === 'arts') && (
            <div className="w-full sm:w-20 shrink-0 bg-ivory border-2 border-green-deepest shadow-[4px_4px_0_#041C14] p-2 flex flex-row sm:flex-col items-center justify-around sm:justify-start gap-2 sm:gap-4 h-auto sm:h-64">
              <div className="text-[10px] font-bold uppercase tracking-widest text-green-dark">Tools</div>
              <button type="button" className="p-2 border-2 border-green-deepest bg-[#FAF8EF] hover:bg-green-primary/10"><PixelIcon name="spark" size={20} /></button>
              <button type="button" className="p-2 border-2 border-green-deepest bg-green-primary text-ivory"><PixelIcon name="hammer" size={20} /></button>
              <button type="button" className="p-2 border-2 border-green-deepest bg-[#FAF8EF] hover:bg-green-primary/10"><PixelIcon name="palette" size={20} /></button>
            </div>
          )}
        </div>
        
        <div className="w-full flex justify-between items-center">
          <button onClick={() => setText('')} className="pixel-button ghost px-6 py-2">
            <PixelIcon name="cross" size={14} /> Clear
          </button>
          <button 
            onClick={handleSubmit}
            disabled={isSubmitting || text.length < 10}
            className="pixel-button px-10 py-3 disabled:opacity-50"
          >
            {isSubmitting ? 'Finalize...' : 'Submit Design →'}
          </button>
        </div>
      </div>
    </div>
  )
}

