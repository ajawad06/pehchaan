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
    <div className="flex flex-col items-center justify-center p-8 bg-green-dark rounded-xl shadow-lg max-w-lg mx-auto mt-10">
      <h2 className="text-3xl font-baloo font-bold text-gold mb-6">Decision Lab</h2>
      <p className="text-lg mb-8 text-center">{s.text}</p>
      
      <div className="w-full space-y-4">
        {s.options.map((opt, i) => (
          <button 
            key={i}
            onClick={() => handleChoice(opt)}
            className="w-full py-4 px-6 text-left border rounded-lg hover:bg-green-mid hover:border-green-500 transition-colors"
          >
            {opt.text}
          </button>
        ))}
      </div>
    </div>
  )
}
