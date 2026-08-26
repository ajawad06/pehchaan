import { useState } from 'react'
import { motion } from 'framer-motion'
import { useSession } from '../store/SessionContext'
import { useNavigate } from 'react-router-dom'
import { recordResponse } from '../services/db'
import {
  Palette, Landmark, Languages, Laptop, Dna, FlaskConical,
  BarChart3, Brain, ArrowLeft, ArrowRight, Rocket
} from 'lucide-react'

const INTEREST_CATEGORIES = [
  { id: 'arts', icon: Palette, label: 'Arts & Creative' },
  { id: 'architecture', icon: Landmark, label: 'Architecture & Design' },
  { id: 'languages', icon: Languages, label: 'Languages & Lit' },
  { id: 'technology', icon: Laptop, label: 'Tech & Computing' },
  { id: 'medicine', icon: Dna, label: 'Medicine & Life Sci' },
  { id: 'science', icon: FlaskConical, label: 'Science & Research' },
  { id: 'business', icon: BarChart3, label: 'Business & Finance' },
  { id: 'psychology', icon: Brain, label: 'Psychology' },
]

const CAREER_VALUES = [
  'Financial stability', 'Helping people', 'Creativity', 'Intellectual challenge',
  'Social impact', 'Entrepreneurship', 'Work-life balance', 'Leadership'
]

const AGE_GROUPS = [
  { id: '14-15', label: '14-15 (Early Explorer)' },
  { id: '16-17', label: '16-17 (Path Explorer)' },
  { id: '18-20', label: '18-20 (Career Explorer)' },
  { id: '21-24', label: '21-24 (Career Builder)' }
]

export default function OnboardingFlow() {
  const { sessionId, updateTraits, generateFlow, setAgeGroup } = useSession()
  const navigate = useNavigate()
  
  const [step, setStep] = useState(0)
  const [localAgeGroup, setLocalAgeGroup] = useState(null)
  const [selectedInterests, setSelectedInterests] = useState([])
  const [selectedValues, setSelectedValues] = useState([])

  const toggleInterest = (id) => {
    if (selectedInterests.includes(id)) {
      setSelectedInterests(prev => prev.filter(i => i !== id))
    } else if (selectedInterests.length < 3) {
      setSelectedInterests(prev => [...prev, id])
    }
  }

  const toggleValue = (val) => {
    if (selectedValues.includes(val)) {
      setSelectedValues(prev => prev.filter(v => v !== val))
    } else if (selectedValues.length < 3) {
      setSelectedValues(prev => [...prev, val])
    }
  }

  const handleNext = async () => {
    if (step === 0) {
      if (!localAgeGroup) return alert('Please select your age group!')
      setAgeGroup(localAgeGroup) // Thread real age to context
      setStep(1)
    } else if (step === 1) {
      if (selectedInterests.length === 0) return alert('Select at least 1 interest!')
      setStep(2)
    } else {
      if (selectedValues.length === 0) return alert('Select at least 1 value!')
      
      const interestProfile = {}
      selectedInterests.forEach((interest, idx) => {
        interestProfile[interest] = 1.0 - (idx * 0.2)
      })

      updateTraits({ 
        age_group: localAgeGroup,
        interests: interestProfile,
        career_values: selectedValues
      })

      if (sessionId) {
        await recordResponse(sessionId, 'onboarding', {
          age_group: localAgeGroup,
          interests: selectedInterests,
          values: selectedValues
        })
      }
      
      const queue = generateFlow(interestProfile)
      navigate(queue[0])
    }
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-ivory text-green-dark p-4 sm:p-6 relative">
      <div className="absolute top-4 left-4 sm:top-6 sm:left-6">
        <button onClick={() => navigate('/')} className="text-green-secondary hover:text-green-dark font-semibold flex items-center gap-1.5 sm:gap-2 bg-white/60 rounded-pill px-3 py-1.5 sm:px-4 sm:py-2 shadow-cushion-sm hover:shadow-cushion transition-shadow text-sm sm:text-base">
          <ArrowLeft size={16} className="shrink-0" />
          <span>Back</span>
        </button>
      </div>

      <motion.div 
        key={step}
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
        className="max-w-2xl w-full bg-soft-white p-5 sm:p-8 md:p-10 rounded-card-lg shadow-cushion border border-border-glass mt-16 sm:mt-0"
      >
        {step === 0 ? (
          <>
            <h2 className="font-playful text-2xl sm:text-3xl md:text-4xl font-extrabold tracking-tight mb-2 text-center text-green-dark break-words">How old are you?</h2>
            <p className="text-text-muted text-center mb-6 sm:mb-10 font-light text-sm sm:text-base px-2">This helps us adapt the challenges for you.</p>
            <div className="flex flex-col space-y-3 sm:space-y-4 mb-8">
              {AGE_GROUPS.map((ag, i) => (
                <motion.button
                  key={ag.id}
                  initial={{ opacity: 0, y: 14 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.35, delay: i * 0.06, ease: [0.34, 1.56, 0.64, 1] }}
                  whileTap={{ scale: [1, 0.94, 1.03, 1] }}
                  onClick={() => setLocalAgeGroup(ag.id)}
                  className={`p-4 sm:p-5 rounded-card text-base sm:text-lg font-semibold transition-colors break-words ${
                    localAgeGroup === ag.id 
                      ? 'bg-green-primary text-ivory scale-105 shadow-cushion' 
                      : 'bg-ivory border border-border-glass text-green-dark hover:bg-green-primary/5 hover:border-green-primary/30'
                  }`}
                >
                  {ag.label}
                </motion.button>
              ))}
            </div>
          </>
        ) : step === 1 ? (
          <>
            <h2 className="font-playful text-2xl sm:text-3xl md:text-4xl font-extrabold tracking-tight mb-2 text-center text-green-dark break-words">What are you curious about?</h2>
            <p className="text-text-muted text-center mb-6 sm:mb-10 font-light text-sm sm:text-base px-2">Select up to 3 areas you'd like to explore.</p>
            
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 mb-8">
              {INTEREST_CATEGORIES.map(({ id, icon: Icon, label }, i) => {
                const isSelected = selectedInterests.includes(id)
                return (
                  <motion.button
                    key={id}
                    initial={{ opacity: 0, y: 14, scale: 0.94 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    transition={{ duration: 0.35, delay: i * 0.05, ease: [0.34, 1.56, 0.64, 1] }}
                    whileTap={{ scale: [1, 0.92, 1.05, 1] }}
                    onClick={() => toggleInterest(id)}
                    className={`min-w-0 p-3 sm:p-5 rounded-card flex flex-col items-center justify-center gap-1 transition-colors ${
                      isSelected 
                        ? 'bg-green-primary text-ivory scale-105 shadow-cushion' 
                        : 'bg-ivory border border-border-glass text-green-dark hover:bg-green-primary/5 hover:border-green-primary/30'
                    }`}
                  >
                    <Icon size={26} className="mb-1.5 sm:mb-2 shrink-0" strokeWidth={1.75} />
                    <span className="text-xs sm:text-sm font-semibold text-center leading-tight break-words hyphens-auto w-full">{label}</span>
                  </motion.button>
                )
              })}
            </div>
          </>
        ) : (
          <>
            <h2 className="font-playful text-2xl sm:text-3xl md:text-4xl font-extrabold tracking-tight mb-2 text-center text-green-dark break-words">What matters to you?</h2>
            <p className="text-text-muted text-center mb-6 sm:mb-10 font-light text-sm sm:text-base px-2">Pick up to 3 things you value most in a future career.</p>
            
            <div className="flex flex-wrap justify-center gap-2 sm:gap-3 mb-8">
              {CAREER_VALUES.map((val, i) => {
                const isSelected = selectedValues.includes(val)
                return (
                  <motion.button
                    key={val}
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.3, delay: i * 0.04, ease: [0.34, 1.56, 0.64, 1] }}
                    whileTap={{ scale: [1, 0.92, 1.05, 1] }}
                    onClick={() => toggleValue(val)}
                    className={`px-4 py-2 sm:px-5 sm:py-3 rounded-pill font-semibold transition-colors text-sm sm:text-base break-words ${
                      isSelected 
                        ? 'bg-green-primary text-ivory shadow-cushion-sm' 
                        : 'bg-ivory border border-border-glass text-green-dark hover:bg-green-primary/5'
                    }`}
                  >
                    {val}
                  </motion.button>
                )
              })}
            </div>
          </>
        )}

        <div className="flex flex-wrap gap-3 justify-between items-center mt-8 sm:mt-12 pt-5 sm:pt-6 border-t border-green-primary/10">
          <div className="text-text-muted text-xs sm:text-sm font-medium uppercase tracking-widest">Step {step + 1} of 3</div>
          <motion.button 
            onClick={handleNext}
            whileTap={{ scale: [1, 0.92, 1.03, 1] }}
            transition={{ duration: 0.35, ease: [0.34, 1.56, 0.64, 1] }}
            className="bg-green-primary text-ivory px-5 py-2.5 sm:px-8 sm:py-3 rounded-pill font-bold hover:bg-green-dark transition-colors shadow-cushion-sm text-sm sm:text-base flex items-center gap-1.5 whitespace-nowrap"
          >
            {step < 2 ? (
              <>Next <ArrowRight size={16} className="shrink-0" /></>
            ) : (
              <>Start Exploring <Rocket size={16} className="shrink-0" /></>
            )}
          </motion.button>
        </div>
      </motion.div>
    </div>
  )
}
