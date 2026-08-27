import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useSession } from '../store/SessionContext'
import { recordResponse } from '../services/db'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { sampleBalanced } from '../utils/randomize'

// Big Five item bank — four phrasings per trait. Exactly one item per trait is
// drawn each session, so the student sees five questions covering all five
// dimensions, but a different five each time.
//
// Every item is keyed so that AGREEING raises the trait. Do not add reverse-
// scored items here without also inverting them in handleAnswer.
const ITEM_BANK = [
  // Openness
  { trait: 'O', text: "I enjoy exploring ideas even when I don't know where they will lead." },
  { trait: 'O', text: "I would rather try something unfamiliar than repeat something I already do well." },
  { trait: 'O', text: "I find myself curious about subjects that have nothing to do with my studies." },
  { trait: 'O', text: "I like art, music, or stories that make me see something differently." },

  // Conscientiousness
  { trait: 'C', text: "I like to stick to a strict schedule and plan ahead." },
  { trait: 'C', text: "I finish what I start, even when it stops being interesting." },
  { trait: 'C', text: "I keep my notes, files, and belongings in a clear order." },
  { trait: 'C', text: "I would rather begin work early than rely on a deadline to push me." },

  // Extraversion
  { trait: 'E', text: "I recharge my energy by spending time with large groups of people." },
  { trait: 'E', text: "I speak up quickly in a group rather than waiting to be asked." },
  { trait: 'E', text: "Meeting new people energises me more than it tires me." },
  { trait: 'E', text: "I would rather work through a problem out loud with others than alone." },

  // Agreeableness
  { trait: 'A', text: "I try to make sure everyone in a group feels heard and comfortable." },
  { trait: 'A', text: "I give people the benefit of the doubt when they let me down." },
  { trait: 'A', text: "I would rather find a compromise than win an argument outright." },
  { trait: 'A', text: "I notice quickly when someone around me is upset." },

  // Neuroticism
  { trait: 'N', text: "I often feel overwhelmed when things don't go according to plan." },
  { trait: 'N', text: "I replay conversations afterwards, wondering what I should have said." },
  { trait: 'N', text: "Small setbacks affect my mood for longer than I would like." },
  { trait: 'N', text: "I worry about things going wrong before there is any sign that they will." },
]

export default function PersonalityAssessment() {
  const { sessionId, updateTraits, traits, advanceFlow } = useSession()
  const navigate = useNavigate()

  // One item per trait, drawn once per mount. sampleBalanced guarantees all
  // five dimensions are present — without that the Big Five score would be
  // computed from a partial profile.
  const [QUESTIONS] = useState(() => sampleBalanced(ITEM_BANK, q => q.trait, 1))

  const [current, setCurrent] = useState(0)
  const [answers, setAnswers] = useState({})

  const handleAnswer = async (value) => {
    const q = QUESTIONS[current]
    const updatedAnswers = { ...answers, [q.trait]: value }
    setAnswers(updatedAnswers)

    if (current + 1 < QUESTIONS.length) {
      setCurrent(c => c + 1)
    } else {
      // Completed all questions
      const telemetry = {
        openness: updatedAnswers['O'],
        conscientiousness: updatedAnswers['C'],
        extraversion: updatedAnswers['E'],
        agreeableness: updatedAnswers['A'],
        neuroticism: updatedAnswers['N'],
        completed: true
      }
      
      updateTraits({ 
        openness: (updatedAnswers['O'] / 5.0) * 100,
        conscientiousness: (updatedAnswers['C'] / 5.0) * 100,
        extraversion: (updatedAnswers['E'] / 5.0) * 100,
        agreeableness: (updatedAnswers['A'] / 5.0) * 100,
        neuroticism: (updatedAnswers['N'] / 5.0) * 100
      })

      if (sessionId) {
        await recordResponse(sessionId, 'personality_assessment', telemetry)
      }
      
      advanceFlow(navigate)
    }
  }

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
        className="max-w-xl w-full bg-soft-white p-5 sm:p-8 rounded-card-lg shadow-cushion border border-border-glass"
      >
        <div className="flex flex-wrap gap-2 justify-between items-center mb-6">
          <h2 className="font-playful text-xl sm:text-3xl font-extrabold tracking-tight">Personality Profile</h2>
          <span className="text-text-muted text-sm uppercase tracking-widest font-bold">Q {current + 1}/{QUESTIONS.length}</span>
        </div>
        
        <div className="bg-ivory rounded-card p-8 mb-8 border border-green-primary/10 min-h-[160px] flex items-center justify-center">
          <p className="text-2xl font-medium text-center leading-relaxed text-green-dark">{QUESTIONS[current].text}</p>
        </div>
        
        <div className="flex flex-col space-y-3">
          {[
            { label: 'Strongly Agree', val: 5 },
            { label: 'Agree', val: 4 },
            { label: 'Neutral', val: 3 },
            { label: 'Disagree', val: 2 },
            { label: 'Strongly Disagree', val: 1 }
          ].map((opt, i) => (
            <motion.button 
              key={opt.val}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.35, delay: i * 0.06, ease: [0.34, 1.56, 0.64, 1] }}
              whileTap={{ scale: 0.97 }}
              onClick={() => handleAnswer(opt.val)}
              className="w-full py-4 px-6 text-center border border-border-glass rounded-card bg-ivory hover:bg-green-primary hover:text-ivory hover:border-green-primary transition-colors font-medium shadow-cushion-sm"
            >
              {opt.label}
            </motion.button>
          ))}
        </div>
      </motion.div>
    </div>
  )
}
