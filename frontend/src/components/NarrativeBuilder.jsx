import { useState } from 'react'
import { motion } from 'framer-motion'
import { useSession } from '../store/SessionContext'
import { recordResponse, updateSessionProgress } from '../services/db'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Users } from 'lucide-react'

const SCENARIOS = [
  {
    id: 'A',
    title: 'The Argument',
    setup: `You are a student council member. A popular policy — free lunch for all students — is about to be voted out because the school budget is tight. Many students who need it most will go hungry. You have two minutes to speak before the vote. No notes.`,
    question: 'Write your two-minute speech. Argue your position clearly and persuasively.',
    placeholder: 'Your speech starts here...',
  },
  {
    id: 'B',
    title: 'The Translation',
    setup: `Your grandmother speaks only Urdu and has never used a smartphone. She needs to learn how to use WhatsApp to call your cousin abroad. You have to explain it to her — but you can only use objects she already knows from everyday life. No tech jargon at all.`,
    question: 'Write your explanation to your grandmother.',
    placeholder: 'Your explanation starts here...',
  },
  {
    id: 'C',
    title: 'The Opener',
    setup: `You are writing the opening paragraph of a short story set in Lahore, 1947, the night before Partition is announced. The story is told through the eyes of a 14-year-old who doesn't yet know what is coming.`,
    question: 'Write the opening paragraph of this story.',
    placeholder: 'Your opening paragraph...',
  },
]

function pickScenario() {
  return SCENARIOS[Math.floor(Math.random() * SCENARIOS.length)]
}

export default function NarrativeBuilder() {
  const { sessionId, updateTraits, traits, advanceFlow } = useSession()
  const [scenario] = useState(pickScenario)
  const [text, setText] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const navigate = useNavigate()

  const handleSubmit = async () => {
    if (text.length < 50) return
    setIsSubmitting(true)

    // Write local defaults unconditionally — never block on LLM latency
    // ALL scores on 0-100 scale to match Cognitive Profile display
    const wordCount = text.trim().split(/\s+/).filter(Boolean).length
    updateTraits({
      verbal_reasoning: Math.max(traits.verbal_reasoning || 0, Math.round(Math.min(100, (wordCount / 80) * 100))),
      communication:    Math.max(traits.communication || 0, Math.round(Math.min(100, (wordCount / 65) * 100))),
      creativity:       Math.max(traits.creativity || 0, Math.round(Math.min(100, (wordCount / 100) * 100))),
    })

    // Fire-and-forget LLM scoring
    ;(async () => {
      try {
        const rawUrl = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000'
        const API_URL = rawUrl.endsWith('/') ? rawUrl.slice(0, -1) : rawUrl
        const response = await fetch(`${API_URL}/score`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            activity_id: 'narrative_builder',
            response_text: text,
            rubric: ['verbal_reasoning', 'communication', 'creativity'],
          }),
        })
        const scores = await response.json()
        // The scorer returns 0-1 — convert to 0-100 and Math.max to preserve higher
        const scaled = {}
        Object.entries(scores).forEach(([key, val]) => {
          const asPercent = Math.round((typeof val === 'number' ? val : 0.5) * 100)
          scaled[key] = Math.max(traits[key] || 0, asPercent)
        })
        updateTraits(scaled)
        if (sessionId) {
          await recordResponse(sessionId, 'narrative_builder', {
            scenario_id: scenario.id,
            raw_response: text,
            rubric_scores: scores,
          }).catch(e => console.error("Firestore error:", e))
          await updateSessionProgress(sessionId, 'narrative_builder')
        }
      } catch (e) {
        console.warn('NarrativeBuilder LLM scoring failed silently:', e)
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
            <Users size={24} />
          </span>
          <h2 className="font-playful text-2xl sm:text-3xl font-extrabold tracking-tight">Narrative Builder</h2>
        </div>
        <p className="text-xs uppercase tracking-widest text-text-muted mb-8 font-semibold">
          Verbal Reasoning · Communication · Creativity
        </p>

        {/* Scenario Badge */}
        <div className="w-full flex flex-wrap items-center gap-2 mb-4">
          <span className="px-3 py-1 bg-green-primary/10 text-green-primary text-xs font-bold uppercase tracking-widest rounded-pill">
            Scenario {scenario.id}
          </span>
          <span className="text-sm font-medium text-green-dark">{scenario.title}</span>
        </div>

        {/* Scenario Card */}
        <div className="w-full bg-ivory border border-green-primary/10 rounded-card p-6 mb-4">
          <p className="text-green-dark/80 leading-relaxed text-sm mb-4">{scenario.setup}</p>
          <p className="text-green-dark font-medium leading-relaxed">{scenario.question}</p>
        </div>

        {/* Text Area */}
        <textarea
          className="w-full h-44 p-5 bg-ivory border border-border-glass rounded-card focus:outline-none focus:border-green-primary mb-3 text-green-dark shadow-cushion-sm resize-none leading-relaxed"
          placeholder={scenario.placeholder}
          value={text}
          onChange={e => setText(e.target.value)}
        />

        {/* Word counter */}
        <div className="w-full flex flex-wrap gap-2 justify-between items-center mb-6">
          <span className="text-xs text-text-muted">There are no right or wrong answers. Write what feels true to you.</span>
          <span className={`text-xs font-medium ${wordCount >= 25 ? 'text-green-primary' : 'text-text-muted'}`}>
            {wordCount} words
          </span>
        </div>

        <motion.button
          onClick={handleSubmit}
          disabled={isSubmitting || text.length < 50}
          whileTap={text.length >= 50 ? { scale: [1, 0.9, 1.03, 1] } : {}}
          transition={{ duration: 0.3, ease: [0.34, 1.56, 0.64, 1] }}
          className="w-full bg-green-primary text-ivory font-bold px-8 py-4 rounded-pill hover:bg-green-dark transition-colors shadow-cushion-sm disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {isSubmitting ? 'Analyzing your writing...' : 'Submit Response'}
        </motion.button>
      </motion.div>
    </div>
  )
}
