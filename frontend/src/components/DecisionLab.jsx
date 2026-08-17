import { useState } from 'react'
import { useSession } from '../store/SessionContext'
import { recordResponse, updateSessionProgress, saveTraitVector } from '../services/db'
import { useNavigate } from 'react-router-dom'
import PixelIcon from './PixelIcon'

const SCENARIOS = [
  { 
    id: 1, 
    text: "Your team is falling behind on a project. What do you do?", 
    options: [
      { text: "Take charge and assign new roles", icon: "crown", traits: { leadership: 80, decision_making: 60 } },
      { text: "Call a meeting to brainstorm together", icon: "users", traits: { leadership: 40, decision_making: 40 } },
      { text: "Work late to finish your part first", icon: "clock", traits: { leadership: 10, decision_making: 20 } }
    ] 
  },
  { 
    id: 2, 
    text: "You have a chance to try a completely new, unproven method that could save time. Do you use it?", 
    options: [
      { text: "Yes, the reward is worth the risk", icon: "flask", traits: { risk_tolerance: 90, planning: 20 } },
      { text: "I'll test it on a small piece first", icon: "wrench", traits: { risk_tolerance: 50, planning: 80 } },
      { text: "No, stick to the proven method", icon: "document", traits: { risk_tolerance: 10, planning: 50 } }
    ] 
  }
]

export default function DecisionLab() {
  const { sessionId, updateTraits, traits, advanceFlow } = useSession()
  const [current, setCurrent] = useState(0)
  // Accumulate trait contributions from every scenario choice
  // { key: [value1, value2, ...] } — averaged at the end
  const [traitAccum, setTraitAccum] = useState({})
  const navigate = useNavigate()

  const handleChoice = async (option) => {
    // Merge this choice's traits into the accumulator
    setTraitAccum(prev => {
      const next = { ...prev }
      Object.entries(option.traits).forEach(([key, val]) => {
        next[key] = prev[key] ? [...prev[key], val] : [val]
      })
      return next
    })

    if (sessionId) {
      await recordResponse(sessionId, 'decision_lab', {
        scenario: SCENARIOS[current].id,
        raw_response: option.text,
        traits_assigned: option.traits
      }).catch(e => console.error("Firestore error:", e))
    }

    if (current + 1 < SCENARIOS.length) {
      setCurrent(c => c + 1)
    } else {
      // All scenarios done — write single averaged trait update
      setTraitAccum(prev => {
        const averaged = {}
        Object.entries(prev).forEach(([key, vals]) => {
          // Include current choice's contribution too
          const allVals = option.traits[key] !== undefined
            ? [...(prev[key] || []), option.traits[key]]
            : (prev[key] || [])
          averaged[key] = allVals.length > 0
            ? allVals.reduce((sum, v) => sum + v, 0) / allVals.length
            : 0
        })
        // Also include any keys from this final option not yet in accumulator
        Object.entries(option.traits).forEach(([key, val]) => {
          if (!(key in averaged)) averaged[key] = val
        })
        updateTraits(averaged)
        return averaged
      })

      if (sessionId) {
        await updateSessionProgress(sessionId, 'decision_lab')
      }
      advanceFlow(navigate)
    }
  }

  if (current >= SCENARIOS.length) return null

  const s = SCENARIOS[current]

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-ivory text-green-dark pt-24 px-6 pb-6 relative">
      <div className="absolute top-6 left-6 z-20">
        <button onClick={() => navigate('/')} className="text-green-secondary hover:text-green-dark font-medium flex items-center gap-2">
          ← Back to Home
        </button>
      </div>

      <div className="flex flex-col items-center justify-center p-10 pixel-panel max-w-2xl w-full mx-auto mt-4">
        <div className="flex justify-between items-center w-full mb-6">
          <h2 className="text-3xl font-medium tracking-tight flex items-center gap-3">
            <PixelIcon name="clover" size={24} />
            Decision Lab
            <PixelIcon name="clover" size={24} />
          </h2>
          <span className="text-text-muted text-sm uppercase tracking-widest font-bold">Scenario {current + 1}/{SCENARIOS.length}</span>
        </div>
        <p className="text-xl mb-10 text-center font-medium leading-relaxed">{s.text}</p>
        
        <div className="w-full space-y-4">
          {s.options.map((opt, i) => (
            <button 
              key={i}
              onClick={() => handleChoice(opt)}
              className="w-full py-5 px-6 flex items-center gap-6 border-2 border-border-glass bg-ivory hover:bg-green-primary hover:text-ivory hover:border-green-primary transition-all font-medium shadow-[3px_3px_0_#041C14]"
            >
              <div className="w-12 h-12 bg-soft-white rounded-full flex items-center justify-center border border-border-glass shrink-0 text-green-dark">
                {opt.icon ? <PixelIcon name={opt.icon} size={24} /> : <span className="font-mono">{i+1}</span>}
              </div>
              <span className="text-left text-lg">{opt.text}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}

