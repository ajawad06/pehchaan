import { useState } from 'react'
import { useSession } from '../store/SessionContext'
import { recordResponse, updateSessionProgress } from '../services/db'
import { useNavigate } from 'react-router-dom'

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
  const { sessionId, updateTraits, advanceFlow } = useSession()
  const [scenario] = useState(pickScenario)
  const [text, setText] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const navigate = useNavigate()

  const handleSubmit = async () => {
    if (text.length < 60) return
    setIsSubmitting(true)

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

      // Also propagate attention_to_detail from how structured the response is
      // (a proxy: Gemini scoring persistence captures systematic thinking)
      updateTraits({
        ...scores,
        attention_to_detail: scores.persistence ?? 0.5, // persistence ≈ systematic follow-through
      })

      if (sessionId) {
        await recordResponse(sessionId, 'empathy_scenario', {
          scenario_id: scenario.id,
          raw_response: text,
          rubric_scores: scores,
        })
        await updateSessionProgress(sessionId, 'empathy_scenario')
      }

      advanceFlow(navigate)
    } catch (e) {
      console.error('EmpathyScenario submit error:', e)
      const fallback = { empathy: 0.5, communication: 0.5, persistence: 0.5, memory: 0.5, attention_to_detail: 0.5 }
      updateTraits(fallback)
      advanceFlow(navigate)
    } finally {
      setIsSubmitting(false)
    }
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
          <span className="text-4xl">🧬</span>
          <h2 className="text-3xl font-medium tracking-tight">Empathy Scenario</h2>
        </div>
        <p className="text-xs uppercase tracking-widest text-text-muted mb-8 font-semibold">
          Empathy · Communication · Judgment Under Pressure
        </p>

        {/* Scenario Tag + Card */}
        <div className="w-full flex items-center gap-2 mb-4">
          <span className="px-3 py-1 bg-green-primary/10 text-green-primary text-xs font-bold uppercase tracking-widest rounded-full">
            {scenario.tag}
          </span>
        </div>

        <div className="w-full bg-sage/10 border border-sage/25 rounded-2xl p-6 mb-4">
          <p className="text-green-dark/80 leading-relaxed text-sm mb-4">{scenario.setup}</p>
          <p className="text-green-dark font-medium leading-relaxed">{scenario.question}</p>
        </div>

        {/* Note */}
        <p className="w-full text-xs text-text-muted mb-4 italic">
          This scenario has no single "right" answer. We are measuring how you reason about people, priorities, and care — not whether you have medical knowledge.
        </p>

        {/* Text Area */}
        <textarea
          className="w-full h-44 p-5 bg-ivory border border-border-glass rounded-2xl focus:outline-none focus:border-green-primary mb-3 text-green-dark shadow-sm resize-none leading-relaxed"
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

        <button
          onClick={handleSubmit}
          disabled={isSubmitting || text.length < 60}
          className="w-full py-4 bg-green-primary text-ivory font-medium rounded-full hover:bg-green-dark disabled:opacity-50 transition-colors shadow-md"
        >
          {isSubmitting ? 'Analyzing your response...' : 'Submit Response'}
        </button>
      </div>
    </div>
  )
}
