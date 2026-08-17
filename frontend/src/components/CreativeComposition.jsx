import { useState } from 'react'
import { useSession } from '../store/SessionContext'
import { recordResponse, updateSessionProgress } from '../services/db'
import PixelIcon from './PixelIcon'
import { useNavigate } from 'react-router-dom'
import BackButton from './BackButton'

const PROMPT = {
  title: 'Creative Composition',
  icon: 'palette',
  instruction: 'Look at this scene in your mind: a deserted coastal town at dusk, the last fishing boats returning, an old lighthouse flickering. In 4–6 sentences, describe what you see, hear, and feel — and what story this place is silently telling.',
  placeholder: 'Begin your description here...',
  minLength: 60,
}

export default function CreativeComposition() {
  const { sessionId, updateTraits, traits, advanceFlow } = useSession()
  const [text, setText] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const navigate = useNavigate()

  const handleSubmit = async () => {
    if (text.length < PROMPT.minLength) return
    setIsSubmitting(true)

    // Write local defaults unconditionally — never block on Gemini latency
    // ALL scores on 0-100 scale to match Cognitive Profile display
    const wordCount = text.trim().split(/\s+/).filter(Boolean).length
    updateTraits({
      creativity:        Math.max(traits.creativity || 0, Math.round(Math.min(100, (wordCount / 70) * 100))),
      aesthetic_judgment: Math.max(traits.aesthetic_judgment || 0, Math.round(Math.min(100, (wordCount / 90) * 100))),
      verbal_reasoning:  Math.max(traits.verbal_reasoning || 0, Math.round(Math.min(100, (wordCount / 60) * 100))),
    })

    // Fire-and-forget Gemini scoring — refines traits in background
    ;(async () => {
      try {
        const rawUrl = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000'
        const API_URL = rawUrl.endsWith('/') ? rawUrl.slice(0, -1) : rawUrl
        const response = await fetch(`${API_URL}/score`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            activity_id: 'creative_composition',
            response_text: text,
            rubric: ['creativity', 'aesthetic_judgment', 'verbal_reasoning'],
          }),
        })
        const scores = await response.json()
        // Gemini returns 0-1 — convert to 0-100 and Math.max to preserve higher
        const scaled = {}
        Object.entries(scores).forEach(([key, val]) => {
          const asPercent = Math.round((typeof val === 'number' ? val : 0.5) * 100)
          scaled[key] = Math.max(traits[key] || 0, asPercent)
        })
        updateTraits(scaled)
        if (sessionId) {
          await recordResponse(sessionId, 'creative_composition', {
            raw_response: text,
            rubric_scores: scores,
          }).catch(e => console.error("Firestore error:", e))
          await updateSessionProgress(sessionId, 'creative_composition')
        }
      } catch (e) {
        console.warn('CreativeComposition Gemini scoring failed silently:', e)
      }
    })()

    // Advance immediately
    advanceFlow(navigate)
    setIsSubmitting(false)
  }

  const wordCount = text.trim().split(/\s+/).filter(Boolean).length

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-ivory text-green-dark pt-20 sm:pt-24 px-4 sm:px-6 pb-6 relative">
      <BackButton />

      <div className="flex flex-col items-center p-4 sm:p-10 pixel-panel max-w-2xl w-full mx-auto mt-4">
        {/* Header */}
        <div className="flex items-center gap-3 mb-2">
          <PixelIcon name={PROMPT.icon} size={42} />
          <h2 className="text-3xl font-medium tracking-tight">{PROMPT.title}</h2>
        </div>
        <p className="text-xs uppercase tracking-widest text-text-muted mb-8 font-semibold">
          Creativity · Aesthetic Judgment · Verbal Expression
        </p>

        {/* Prompt Card */}
        <div className="w-full bg-sage/10 border border-sage/25 rounded-2xl p-6 mb-8">
          <p className="text-green-dark leading-relaxed text-center text-base">
            {PROMPT.instruction}
          </p>
        </div>

        {/* Text Area */}
        <textarea
          className="w-full h-44 p-5 bg-ivory border border-border-glass rounded-2xl focus:outline-none focus:border-green-primary mb-3 text-green-dark shadow-sm resize-none leading-relaxed"
          placeholder={PROMPT.placeholder}
          value={text}
          onChange={e => setText(e.target.value)}
        />

        {/* Word counter */}
        <div className="w-full flex justify-end mb-6">
          <span className={`text-xs font-medium ${wordCount >= 20 ? 'text-green-primary' : 'text-text-muted'}`}>
            {wordCount} words {wordCount >= 20 ? '✓' : `(aim for 20+)`}
          </span>
        </div>

        <button
          onClick={handleSubmit}
          disabled={isSubmitting || text.length < PROMPT.minLength}
          className="w-full pixel-button"
          style={{ color: '#041C14' }}
        >
          {isSubmitting ? 'Analyzing your composition...' : 'Submit Composition'}
        </button>
      </div>
    </div>
  )
}

