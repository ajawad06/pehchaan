import { useState } from 'react'
import { useSession } from '../store/SessionContext'
import { recordResponse, updateSessionProgress } from '../services/db'
import { useNavigate } from 'react-router-dom'

const SCENARIOS = [
  {
    id: 'A',
    emoji: '🏙️',
    title: 'The Sustainable City',
    prompt: 'You are designing a new city from scratch. What one unconventional transportation system would you build at its core — and why would people actually use it? Walk through how it works.',
  },
  {
    id: 'B',
    emoji: '💡',
    title: 'The School Problem',
    prompt: 'Dropout rates at a rural school have doubled in one year. You have a small budget and three months. Design a practical intervention that would actually work in that context.',
  },
  {
    id: 'C',
    emoji: '🔧',
    title: 'The Power Outage',
    prompt: 'A city’s power grid has failed. Emergency services are running on generators. You’re the lead crisis coordinator. What are your first three decisions and why?',
  },
]

function pickScenario() {
  return SCENARIOS[Math.floor(Math.random() * SCENARIOS.length)]
}

export default function CreativeProblemSolver() {
  const { sessionId, updateTraits, advanceFlow } = useSession()
  const [scenario] = useState(pickScenario)
  const [text, setText] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const navigate = useNavigate()

  const handleSubmit = async () => {
    if (text.length < 30) return
    setIsSubmitting(true)

    // Write local defaults unconditionally — never block navigation on Gemini
    // These will be refined by the async /score call below
    const wordCount = text.trim().split(/\s+/).filter(Boolean).length
    const localCreativity  = Math.min(1.0, wordCount / 80)  // more words → more elaboration
    const localComms       = Math.min(1.0, wordCount / 60)
    const localRiskTol     = text.includes('unconventional') || text.includes('new') || text.includes('different') ? 0.7 : 0.5
    const localSystems     = text.includes('because') || text.includes('therefore') || text.includes('result') ? 0.65 : 0.45

    updateTraits({
      creativity:      localCreativity,
      communication:   localComms,
      risk_tolerance:  localRiskTol,
      systems_thinking: localSystems,
    })

    // Fire-and-forget Gemini scoring in background — refines trait values if available
    ;(async () => {
      try {
        const rawUrl = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000'
        const API_URL = rawUrl.endsWith('/') ? rawUrl.slice(0, -1) : rawUrl
        const res = await fetch(`${API_URL}/score`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            activity_id: 'creative_problem_solver',
            response_text: text,
            // Rubric keys match taxonomy required_skills exactly
            rubric: ['creativity', 'communication', 'risk_tolerance', 'systems_thinking'],
          }),
        })
        const scores = await res.json()
        // Refine — only update if the Gemini scores differ meaningfully from defaults
        updateTraits(scores)
      } catch (e) {
        console.warn('CreativeProblemSolver Gemini scoring failed silently:', e)
      }
      if (sessionId) {
        await recordResponse(sessionId, 'creative_problem_solver', {
          scenario_id: scenario.id,
          raw_response: text,
        }).catch(e => console.error("Firestore error:", e))
        await updateSessionProgress(sessionId, 'creative_problem_solver')
      }
    })()

    // Advance immediately — never wait for Gemini
    advanceFlow(navigate)
    setIsSubmitting(false)
  }

  const wordCount = text.trim().split(/\s+/).filter(Boolean).length

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-ivory text-green-dark p-6 relative">
      <div className="absolute top-6 left-6">
        <button onClick={() => navigate('/')} className="text-green-secondary hover:text-green-dark font-medium flex items-center gap-2">
          ← Back to Home
        </button>
      </div>

      <div className="flex flex-col items-center p-10 bg-soft-white rounded-[32px] shadow-2xl border border-border-glass max-w-2xl w-full mx-auto">
        <div className="flex items-center gap-3 mb-2">
          <span className="text-4xl">{scenario.emoji}</span>
          <h2 className="text-3xl font-medium tracking-tight">Creative Problem Solver</h2>
        </div>
        <p className="text-xs uppercase tracking-widest text-text-muted mb-8 font-semibold">
          Creativity · Communication · Systems Thinking
        </p>

        <div className="w-full flex items-center gap-2 mb-4">
          <span className="px-3 py-1 bg-green-primary/10 text-green-primary text-xs font-bold uppercase tracking-widest rounded-full">
            Scenario {scenario.id}
          </span>
          <span className="text-sm font-medium text-green-dark">{scenario.title}</span>
        </div>

        <div className="w-full bg-sage/10 border border-sage/25 rounded-2xl p-6 mb-8">
          <p className="text-green-dark leading-relaxed">{scenario.prompt}</p>
        </div>

        <textarea
          className="w-full h-44 p-5 bg-ivory border border-border-glass rounded-2xl focus:outline-none focus:border-green-primary mb-3 text-green-dark shadow-sm resize-none leading-relaxed"
          placeholder="Type your response here..."
          value={text}
          onChange={e => setText(e.target.value)}
        />

        <div className="w-full flex justify-between items-center mb-6">
          <span className="text-xs text-text-muted">No right or wrong answer. We measure how you structure your thinking.</span>
          <span className={`text-xs font-medium ${wordCount >= 25 ? 'text-green-primary' : 'text-text-muted'}`}>
            {wordCount} words
          </span>
        </div>

        <button
          onClick={handleSubmit}
          disabled={isSubmitting || text.length < 30}
          className="w-full py-4 bg-green-primary text-ivory font-medium rounded-full hover:bg-green-dark disabled:opacity-50 transition-colors shadow-md"
        >
          {isSubmitting ? 'Saving response...' : 'Submit Response'}
        </button>
      </div>
    </div>
  )
}

