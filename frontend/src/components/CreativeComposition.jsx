import { useState } from 'react'
import { useSession } from '../store/SessionContext'
import { recordResponse, updateSessionProgress } from '../services/db'
import { useNavigate } from 'react-router-dom'

const PROMPT = {
  title: 'Creative Composition',
  emoji: '🎨',
  instruction: 'Look at this scene in your mind: a deserted coastal town at dusk, the last fishing boats returning, an old lighthouse flickering. In 4–6 sentences, describe what you see, hear, and feel — and what story this place is silently telling.',
  placeholder: 'Begin your description here...',
  minLength: 60,
}

export default function CreativeComposition() {
  const { sessionId, updateTraits, advanceFlow } = useSession()
  const [text, setText] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const navigate = useNavigate()

  const handleSubmit = async () => {
    if (text.length < PROMPT.minLength) return
    setIsSubmitting(true)

    // Write local defaults unconditionally — never block on Gemini latency
    const wordCount = text.trim().split(/\s+/).filter(Boolean).length
    updateTraits({
      creativity:        Math.min(1.0, wordCount / 70),
      aesthetic_judgment: Math.min(1.0, wordCount / 90),
      verbal_reasoning:  Math.min(1.0, wordCount / 60),
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
        updateTraits(scores)
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
    <div className="flex flex-col items-center justify-center min-h-screen bg-ivory text-green-dark p-6 relative">
      <div className="absolute top-6 left-6">
        <button
          onClick={() => navigate('/')}
          className="text-green-secondary hover:text-green-dark font-medium flex items-center gap-2"
        >
          ← Back to Home
        </button>
      </div>

      <div className="flex flex-col items-center p-10 bg-soft-white rounded-[32px] shadow-2xl border border-border-glass max-w-2xl w-full mx-auto">
        {/* Header */}
        <div className="flex items-center gap-3 mb-2">
          <span className="text-4xl">{PROMPT.emoji}</span>
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
          className="w-full py-4 bg-green-primary text-ivory font-medium rounded-full hover:bg-green-dark disabled:opacity-50 transition-colors shadow-md"
        >
          {isSubmitting ? 'Analyzing your composition...' : 'Submit Composition'}
        </button>
      </div>
    </div>
  )
}

