import { useState } from 'react'
import { useSession } from '../store/SessionContext'
import { recordResponse, updateSessionProgress, saveTraitVector } from '../services/db'
import { useNavigate } from 'react-router-dom'

const SCENARIOS = [
  { 
    id: 1, 
    text: "Your team is falling behind on a project. What do you do?", 
    options: [
      { text: "Take charge and assign new roles", traits: { leadership: 0.8, decision_making: 0.6 } },
      { text: "Call a meeting to brainstorm together", traits: { leadership: 0.4, decision_making: 0.4 } },
      { text: "Work late to finish your part first", traits: { leadership: 0.1, decision_making: 0.2 } }
    ] 
  },
  { 
    id: 2, 
    text: "You have a chance to try a completely new, unproven method that could save time. Do you use it?", 
    options: [
      { text: "Yes, the reward is worth the risk", traits: { risk_tolerance: 0.9, planning: 0.2 } },
      { text: "I'll test it on a small piece first", traits: { risk_tolerance: 0.5, planning: 0.8 } },
      { text: "No, stick to the proven method", traits: { risk_tolerance: 0.1, planning: 0.5 } }
    ] 
  }
]

export default function DecisionLab() {
  const { sessionId, updateTraits, traits } = useSession()
  const [current, setCurrent] = useState(0)
  const navigate = useNavigate()

  const handleChoice = async (option) => {
    // Update traits based on choice
    updateTraits(option.traits)

    if (sessionId) {
      await recordResponse(sessionId, 'decision_lab', {
        raw_response: option.text,
        traits_assigned: option.traits
      })
    }

    if (current + 1 < SCENARIOS.length) {
      setCurrent(c => c + 1)
    } else {
      if (sessionId) {
        await updateSessionProgress(sessionId, 'decision_lab')
      }
      navigate('/creative-problem-solver')
    }
  }

  if (current >= SCENARIOS.length) return null

  const s = SCENARIOS[current]

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-ivory text-green-dark p-6 relative">
      <div className="absolute top-6 left-6">
        <button onClick={() => navigate('/')} className="text-green-secondary hover:text-green-dark font-medium flex items-center gap-2">
          ← Back to Home
        </button>
      </div>

      <div className="flex flex-col items-center justify-center p-10 bg-soft-white rounded-[32px] shadow-2xl border border-border-glass max-w-2xl w-full mx-auto">
        <div className="flex justify-between items-center w-full mb-6">
          <h2 className="text-3xl font-medium tracking-tight">Decision Lab</h2>
          <span className="text-text-muted text-sm uppercase tracking-widest font-bold">Scenario {current + 1}/{SCENARIOS.length}</span>
        </div>
        <p className="text-xl mb-10 text-center font-medium leading-relaxed">{s.text}</p>
        
        <div className="w-full space-y-4">
          {s.options.map((opt, i) => (
            <button 
              key={i}
              onClick={() => handleChoice(opt)}
              className="w-full py-5 px-6 text-left border border-border-glass rounded-2xl bg-ivory hover:bg-green-primary hover:text-ivory hover:border-green-primary transition-all font-medium shadow-sm"
            >
              {opt.text}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
