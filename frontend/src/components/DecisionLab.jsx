import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useSession } from '../store/SessionContext'
import { recordResponse, updateSessionProgress, saveTraitVector } from '../services/db'
import { useNavigate } from 'react-router-dom'
import { sampleBalanced } from '../utils/randomize'
import { ArrowLeft } from 'lucide-react'

// Scenario bank, grouped by `focus`. One scenario is drawn per focus each
// session, so both trait pairs — leadership/decision_making and
// risk_tolerance/planning — are always measured, just via different stories.
const SCENARIO_BANK = [
  // ── focus: leading a group ───────────────────────────────────────────
  {
    id: 1, focus: 'leadership',
    text: "Your team is falling behind on a project. What do you do?",
    options: [
      { text: "Take charge and assign new roles", traits: { leadership: 0.8, decision_making: 0.6 } },
      { text: "Call a meeting to brainstorm together", traits: { leadership: 0.4, decision_making: 0.4 } },
      { text: "Work late to finish your part first", traits: { leadership: 0.1, decision_making: 0.2 } }
    ]
  },
  {
    id: 3, focus: 'leadership',
    text: "Two people in your group have stopped speaking to each other and the work has stalled. What do you do?",
    options: [
      { text: "Sit them both down and settle it today", traits: { leadership: 0.85, decision_making: 0.7 } },
      { text: "Split the work so they don't have to interact", traits: { leadership: 0.45, decision_making: 0.55 } },
      { text: "Give it a few days and hope it passes", traits: { leadership: 0.1, decision_making: 0.15 } }
    ]
  },
  {
    id: 4, focus: 'leadership',
    text: "You are made group leader over classmates who are all older than you. How do you start?",
    options: [
      { text: "Set out the plan and expectations immediately", traits: { leadership: 0.8, decision_making: 0.65 } },
      { text: "Ask each of them what they want to own", traits: { leadership: 0.55, decision_making: 0.45 } },
      { text: "Keep quiet and lead by example instead", traits: { leadership: 0.2, decision_making: 0.3 } }
    ]
  },

  // ── focus: risk under uncertainty ────────────────────────────────────
  {
    id: 2, focus: 'risk',
    text: "You have a chance to try a completely new, unproven method that could save time. Do you use it?",
    options: [
      { text: "Yes, the reward is worth the risk", traits: { risk_tolerance: 0.9, planning: 0.2 } },
      { text: "I'll test it on a small piece first", traits: { risk_tolerance: 0.5, planning: 0.8 } },
      { text: "No, stick to the proven method", traits: { risk_tolerance: 0.1, planning: 0.5 } }
    ]
  },
  {
    id: 5, focus: 'risk',
    text: "You can enter a competition you will probably lose, or a smaller one you would probably win. Which?",
    options: [
      { text: "The big one — losing still teaches me something", traits: { risk_tolerance: 0.9, planning: 0.3 } },
      { text: "Enter the small one now, the big one next year", traits: { risk_tolerance: 0.45, planning: 0.85 } },
      { text: "The one I can win — a result is a result", traits: { risk_tolerance: 0.15, planning: 0.55 } }
    ]
  },
  {
    id: 6, focus: 'risk',
    text: "Your savings could fund a course now, or sit safely for a year. What do you do?",
    options: [
      { text: "Spend it now while the chance is there", traits: { risk_tolerance: 0.85, planning: 0.25 } },
      { text: "Spend half, keep half in reserve", traits: { risk_tolerance: 0.5, planning: 0.8 } },
      { text: "Keep all of it until I am certain", traits: { risk_tolerance: 0.1, planning: 0.6 } }
    ]
  }
]

export default function DecisionLab() {
  const { sessionId, updateTraits, traits, advanceFlow } = useSession()

  // One scenario per focus, drawn once per mount, so both trait pairs are
  // always covered.
  const [SCENARIOS] = useState(() => sampleBalanced(SCENARIO_BANK, s => s.focus, 1))

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
      advanceFlow(navigate)
    }
  }

  if (current >= SCENARIOS.length) return null

  const s = SCENARIOS[current]

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-ivory text-green-dark p-4 sm:p-6 relative">
      <div className="absolute top-4 left-4 sm:top-6 sm:left-6">
        <button onClick={() => navigate('/')} className="text-green-secondary hover:text-green-dark font-semibold flex items-center gap-2 bg-white/60 rounded-pill px-3 py-1.5 sm:px-4 sm:py-2 shadow-cushion-sm text-sm sm:text-base hover:shadow-cushion transition-shadow">
          <ArrowLeft size={16} className="shrink-0" /> Back
        </button>
      </div>

      <motion.div
        key={current}
        initial={{ opacity: 0, y: 16, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.45, ease: [0.34, 1.56, 0.64, 1] }}
        className="flex flex-col items-center justify-center p-5 sm:p-10 bg-soft-white rounded-card-lg shadow-cushion border border-border-glass max-w-2xl w-full mx-auto"
      >
        <div className="flex justify-between items-center w-full mb-6">
          <h2 className="font-playful text-xl sm:text-3xl font-extrabold tracking-tight">Decision Lab</h2>
          <span className="text-text-muted text-sm uppercase tracking-widest font-bold">Scenario {current + 1}/{SCENARIOS.length}</span>
        </div>
        <p className="text-xl mb-10 text-center font-medium leading-relaxed">{s.text}</p>
        
        <div className="w-full space-y-4">
          {s.options.map((opt, i) => (
            <motion.button 
              key={i}
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.35, delay: i * 0.08, ease: [0.34, 1.56, 0.64, 1] }}
              whileTap={{ scale: 0.97 }}
              onClick={() => handleChoice(opt)}
              className="w-full py-5 px-6 text-left border border-border-glass rounded-card bg-ivory hover:bg-green-primary hover:text-ivory hover:border-green-primary transition-colors font-medium shadow-cushion-sm"
            >
              {opt.text}
            </motion.button>
          ))}
        </div>
      </motion.div>
    </div>
  )
}
