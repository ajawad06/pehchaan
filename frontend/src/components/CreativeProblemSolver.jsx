import { useState } from 'react'
import { useSession } from '../store/SessionContext'
import { recordResponse, updateSessionProgress } from '../services/db'
import PixelIcon from './PixelIcon'
import { useNavigate } from 'react-router-dom'
import BackButton from './BackButton'

const SCENARIOS = [
  {
    id: 'A',
    icon: 'city',
    title: 'The Sustainable City',
    prompt: 'You are designing a new city from scratch. What one unconventional transportation system would you build at its core — and why would people actually use it? Walk through how it works.',
  },
  {
    id: 'B',
    icon: 'lightbulb',
    title: 'The School Problem',
    prompt: 'Dropout rates at a rural school have doubled in one year. You have a small budget and three months. Design a practical intervention that would actually work in that context.',
  },
  {
    id: 'C',
    icon: 'wrench',
    title: 'The Power Outage',
    prompt: 'A city’s power grid has failed. Emergency services are running on generators. You’re the lead crisis coordinator. What are your first three decisions and why?',
  },
]

function pickScenario() {
  return SCENARIOS[Math.floor(Math.random() * SCENARIOS.length)]
}

export default function CreativeProblemSolver() {
  const { sessionId, updateTraits, traits, advanceFlow } = useSession()
  const [scenario] = useState(pickScenario)
  const [text, setText] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const navigate = useNavigate()

  const handleSubmit = async () => {
    if (text.length < 30) return
    setIsSubmitting(true)

    // Write local defaults unconditionally — never block navigation on Gemini
    // These will be refined by the async /score call below
    // ALL scores on 0-100 scale to match Cognitive Profile display
    const wordCount = text.trim().split(/\s+/).filter(Boolean).length
    const localCreativity  = Math.round(Math.min(100, (wordCount / 80) * 100))
    const localComms       = Math.round(Math.min(100, (wordCount / 60) * 100))
    const localRiskTol     = text.includes('unconventional') || text.includes('new') || text.includes('different') ? 70 : 50
    const localSystems     = text.includes('because') || text.includes('therefore') || text.includes('result') ? 65 : 45

    // Use Math.max to preserve higher scores from earlier activities (e.g. CreativeUses)
    updateTraits({
      creativity:       Math.max(traits.creativity || 0, localCreativity),
      communication:    Math.max(traits.communication || 0, localComms),
      risk_tolerance:   Math.max(traits.risk_tolerance || 0, localRiskTol),
      systems_thinking: Math.max(traits.systems_thinking || 0, localSystems),
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
        // Gemini returns 0-1 — convert to 0-100 and use Math.max to preserve higher scores
        const scaled = {}
        Object.entries(scores).forEach(([key, val]) => {
          const asPercent = Math.round((typeof val === 'number' ? val : 0.5) * 100)
          scaled[key] = Math.max(traits[key] || 0, asPercent)
        })
        updateTraits(scaled)
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
    <div className="flex flex-col items-center justify-center min-h-screen bg-ivory text-green-dark pt-20 sm:pt-24 px-4 sm:px-6 pb-6 relative">
      <BackButton />

      <div className="flex flex-col items-center p-4 sm:p-10 pixel-panel max-w-2xl w-full mx-auto mt-4">
        <div className="flex items-center gap-3 mb-2">
          <PixelIcon name={scenario.icon} size={42} />
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
          className="w-full pixel-button"
          style={{ color: '#041C14' }}
        >
          {isSubmitting ? 'Saving response...' : 'Submit Response'}
        </button>
      </div>
    </div>
  )
}

