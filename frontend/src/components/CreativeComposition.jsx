import { useState } from 'react'
import { motion } from 'framer-motion'
import { useSession } from '../store/SessionContext'
import { recordResponse, updateSessionProgress } from '../services/db'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Palette } from 'lucide-react'

const PROMPT = {
  title: 'Creative Composition',
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
    <div className="flex flex-col items-center justify-center min-h-screen bg-ivory text-green-dark p-4 sm:p-6 relative">
      <div className="absolute top-4 left-4 sm:top-6 sm:left-6">
        <button onClick={() => navigate('/')} className="text-green-secondary hover:text-green-dark font-semibold flex items-center gap-2 bg-white/60 rounded-pill px-3 py-1.5 sm:px-4 sm:py-2 shadow-cushion-sm text-sm sm:text-base hover:shadow-cushion transition-shadow">
          <ArrowLeft size={16} className="shrink-0" /> Back
        </button>
      </div>

      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="max-w-2xl w-full bg-soft-white p-5 sm:p-8 rounded-card-lg shadow-cushion border border-border-glass mt-14 sm:mt-0"
      >
        {/* Header */}
        <div className="flex items-center gap-3 mb-2">
          <span className="grid place-items-center w-11 h-11 rounded-card bg-green-primary/10 text-green-primary shrink-0">
            <Palette size={24} />
          </span>
          <h2 className="font-playful text-2xl sm:text-3xl font-extrabold tracking-tight">{PROMPT.title}</h2>
        </div>
        <p className="text-xs uppercase tracking-widest text-text-muted mb-8 font-semibold">
          Creativity · Aesthetic Judgment · Verbal Expression
        </p>

        {/* Prompt Card */}
        <div className="w-full bg-ivory border border-green-primary/10 rounded-card p-6 mb-8">
          <p className="text-green-dark leading-relaxed text-center text-base">
            {PROMPT.instruction}
          </p>
        </div>

        {/* Text Area */}
        <textarea
          className="w-full h-44 p-5 bg-ivory border border-border-glass rounded-card focus:outline-none focus:border-green-primary mb-3 text-green-dark shadow-cushion-sm resize-none leading-relaxed"
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

        <motion.button
          onClick={handleSubmit}
          disabled={isSubmitting || text.length < PROMPT.minLength}
          whileTap={text.length >= PROMPT.minLength ? { scale: [1, 0.9, 1.03, 1] } : {}}
          transition={{ duration: 0.3, ease: [0.34, 1.56, 0.64, 1] }}
          className="w-full bg-green-primary text-ivory font-bold px-8 py-4 rounded-pill hover:bg-green-dark transition-colors shadow-cushion-sm disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {isSubmitting ? 'Analyzing your composition...' : 'Submit Composition'}
        </motion.button>
      </motion.div>
    </div>
  )
}
