import { useState } from 'react'
import { motion } from 'framer-motion'
import { useSession } from '../store/SessionContext'
import { recordResponse, updateSessionProgress } from '../services/db'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, HeartPulse } from 'lucide-react'

const SCENARIOS = [
  {
    id: 'A',
    tag: 'Patient Care',
    setup: `A 70-year-old patient named Mr. Iqbal has been prescribed 4 medications. He keeps forgetting to take them and has started to feel hopeless, telling you, "What's the point — I'm old anyway." His daughter is frustrated and stops coming to visits.`,
    question: 'How do you respond to Mr. Iqbal in this moment? What do you say, and why? Then — what do you do next to bring his daughter back into his care?',
  },
  {
    id: 'B',
    tag: 'Ethical Pressure',
    setup: `You are a junior doctor on a night shift. A senior doctor orders a dosage for a child patient that you believe is too high based on what you studied. The senior is dismissive when you raise it: "I've been doing this 20 years. Just do it." Other nurses are watching.`,
    question: 'Walk through exactly what you would do and say, step by step. What matters most in this moment?',
  },
  {
    id: 'C',
    tag: 'Breaking News',
    setup: `You are a counselor at a school. A 16-year-old student, Hira, comes to you and says her friend told her in confidence that they've been hurting themselves. Hira is scared that telling you will destroy the friendship, and she's also scared of doing nothing.`,
    question: 'What do you say to Hira right now? How do you handle the tension between confidentiality and safety?',
  },
]

function pickScenario() {
  return SCENARIOS[Math.floor(Math.random() * SCENARIOS.length)]
}

export default function EmpathyScenario() {
  const { sessionId, updateTraits, traits, advanceFlow } = useSession()
  const [scenario] = useState(pickScenario)
  const [text, setText] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const navigate = useNavigate()

  const handleSubmit = async () => {
    if (text.length < 60) return
    setIsSubmitting(true)

    // Write local defaults unconditionally — never block on Gemini latency
    // ALL scores on 0-100 scale to match Cognitive Profile display
    const wordCount = text.trim().split(/\s+/).filter(Boolean).length
    const hasSentences = (text.match(/[.!?]/g) || []).length
    // Empathy proxy: length + explicit people-language
    const empathyProxy = Math.round(Math.min(100,
      ((wordCount / 80) * 0.6 +
      (text.toLowerCase().includes('feel') || text.toLowerCase().includes('understand') || text.toLowerCase().includes('listen') ? 0.25 : 0.05) +
      0.1) * 100
    ))
    const persistenceProxy  = Math.round(Math.min(100, (hasSentences / 8) * 100))
    const communicationProxy = Math.round(Math.min(100, (wordCount / 70) * 100))

    updateTraits({
      empathy:             Math.max(traits.empathy || 0, empathyProxy),
      persistence:         Math.max(traits.persistence || 0, persistenceProxy),
      communication:       Math.max(traits.communication || 0, communicationProxy),
      memory:              Math.max(traits.memory || 0, Math.round(persistenceProxy * 0.8)),
      attention_to_detail: Math.max(traits.attention_to_detail || 0, persistenceProxy),
    })

    // Fire-and-forget Gemini scoring
    ;(async () => {
      try {
        const rawUrl = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000'
        const API_URL = rawUrl.endsWith('/') ? rawUrl.slice(0, -1) : rawUrl
        const response = await fetch(`${API_URL}/score`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            activity_id: 'empathy_scenario',
            response_text: text,
            rubric: ['empathy', 'communication', 'persistence', 'memory'],
          }),
        })
        const scores = await response.json()
        // Gemini returns 0-1 — convert to 0-100 and use Math.max
        const scaled = {}
        Object.entries(scores).forEach(([key, val]) => {
          const asPercent = Math.round((typeof val === 'number' ? val : 0.5) * 100)
          scaled[key] = Math.max(traits[key] || 0, asPercent)
        })
        scaled.attention_to_detail = Math.max(traits.attention_to_detail || 0, scaled.persistence || persistenceProxy)
        updateTraits(scaled)
        if (sessionId) {
          await recordResponse(sessionId, 'empathy_scenario', {
            scenario_id: scenario.id,
            raw_response: text,
            rubric_scores: scores,
          }).catch(e => console.error("Firestore error:", e))
          await updateSessionProgress(sessionId, 'empathy_scenario')
        }
      } catch (e) {
        console.warn('EmpathyScenario Gemini scoring failed silently:', e)
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
            <HeartPulse size={24} />
          </span>
          <h2 className="font-playful text-2xl sm:text-3xl font-extrabold tracking-tight">Empathy Scenario</h2>
        </div>
        <p className="text-xs uppercase tracking-widest text-text-muted mb-8 font-semibold">
          Empathy · Communication · Judgment Under Pressure
        </p>

        {/* Scenario Tag */}
        <div className="w-full flex items-center gap-2 mb-4">
          <span className="px-3 py-1 bg-green-primary/10 text-green-primary text-xs font-bold uppercase tracking-widest rounded-pill">
            {scenario.tag}
          </span>
        </div>

        {/* Scenario Card */}
        <div className="w-full bg-ivory border border-green-primary/10 rounded-card p-6 mb-4">
          <p className="text-green-dark/80 leading-relaxed text-sm mb-4">{scenario.setup}</p>
          <p className="text-green-dark font-medium leading-relaxed">{scenario.question}</p>
        </div>

        {/* Note */}
        <p className="w-full text-xs text-text-muted mb-4 italic">
          This scenario has no single "right" answer. We are measuring how you reason about people, priorities, and care — not whether you have medical knowledge.
        </p>

        {/* Text Area */}
        <textarea
          className="w-full h-44 p-5 bg-ivory border border-border-glass rounded-card focus:outline-none focus:border-green-primary mb-3 text-green-dark shadow-cushion-sm resize-none leading-relaxed"
          placeholder="Describe your response in detail..."
          value={text}
          onChange={e => setText(e.target.value)}
        />

        {/* Word counter */}
        <div className="w-full flex justify-end mb-6">
          <span className={`text-xs font-medium ${wordCount >= 30 ? 'text-green-primary' : 'text-text-muted'}`}>
            {wordCount} words {wordCount >= 30 ? '✓' : '(aim for 30+)'}
          </span>
        </div>

        <motion.button
          onClick={handleSubmit}
          disabled={isSubmitting || text.length < 60}
          whileTap={text.length >= 60 ? { scale: [1, 0.9, 1.03, 1] } : {}}
          transition={{ duration: 0.3, ease: [0.34, 1.56, 0.64, 1] }}
          className="w-full bg-green-primary text-ivory font-bold px-8 py-4 rounded-pill hover:bg-green-dark transition-colors shadow-cushion-sm disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {isSubmitting ? 'Analyzing your response...' : 'Submit Response'}
        </motion.button>
      </motion.div>
    </div>
  )
}
