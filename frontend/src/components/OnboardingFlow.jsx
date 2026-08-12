import { useState } from 'react'
import { motion } from 'framer-motion'
import { useSession } from '../store/SessionContext'
import { useNavigate } from 'react-router-dom'
import { recordResponse } from '../services/db'

const INTEREST_CATEGORIES = [
  { id: 'arts', icon: '🎨', label: 'Arts & Creative' },
  { id: 'architecture', icon: '🏛️', label: 'Architecture & Design' },
  { id: 'languages', icon: '🗣️', label: 'Languages & Lit' },
  { id: 'technology', icon: '💻', label: 'Tech & Computing' },
  { id: 'medicine', icon: '🧬', label: 'Medicine & Life Sci' },
  { id: 'science', icon: '🔬', label: 'Science & Research' },
  { id: 'business', icon: '📊', label: 'Business & Finance' },
  { id: 'psychology', icon: '🧠', label: 'Psychology' },
]

const CAREER_VALUES = [
  'Financial stability', 'Helping people', 'Creativity', 'Intellectual challenge',
  'Social impact', 'Entrepreneurship', 'Work-life balance', 'Leadership'
]

export default function OnboardingFlow() {
  const { sessionId, updateTraits } = useSession()
  const navigate = useNavigate()
  
  const [step, setStep] = useState(1)
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
    if (step === 1) {
      if (selectedInterests.length === 0) return alert('Select at least 1 interest!')
      setStep(2)
    } else {
      if (selectedValues.length === 0) return alert('Select at least 1 value!')
      
      // Update our session state with the new distinct profiles
      const interestProfile = {}
      selectedInterests.forEach((interest, idx) => {
        // Rank 1 gets 1.0, Rank 2 gets 0.8, Rank 3 gets 0.6
        interestProfile[interest] = 1.0 - (idx * 0.2)
      })

      updateTraits({ 
        interests: interestProfile,
        career_values: selectedValues
      })

      if (sessionId) {
        await recordResponse(sessionId, 'onboarding', {
          interests: selectedInterests,
          values: selectedValues
        })
      }
      
      // Move to the first actual telemetry-driven cognitive activity
      navigate('/pattern-hunter')
    }
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-6 relative">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-2xl w-full bg-green-dark p-8 rounded-2xl shadow-xl border border-gold/20"
      >
        {step === 1 ? (
          <>
            <h2 className="text-4xl font-baloo font-bold text-gold mb-2 text-center">What are you curious about?</h2>
            <p className="text-cream/80 text-center mb-8">Select up to 3 areas you'd like to explore.</p>
            
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
              {INTEREST_CATEGORIES.map(cat => {
                const isSelected = selectedInterests.includes(cat.id)
                return (
                  <button
                    key={cat.id}
                    onClick={() => toggleInterest(cat.id)}
                    className={`p-4 rounded-xl flex flex-col items-center justify-center transition-all ${
                      isSelected 
                        ? 'bg-gold text-green-deepest scale-105 shadow-md' 
                        : 'bg-green-mid text-cream hover:bg-green-mid/80'
                    }`}
                  >
                    <span className="text-3xl mb-2">{cat.icon}</span>
                    <span className="text-sm font-semibold text-center">{cat.label}</span>
                  </button>
                )
              })}
            </div>
          </>
        ) : (
          <>
            <h2 className="text-4xl font-baloo font-bold text-gold mb-2 text-center">What matters to you?</h2>
            <p className="text-cream/80 text-center mb-8">Pick up to 3 things you value most in a future career.</p>
            
            <div className="flex flex-wrap justify-center gap-3 mb-8">
              {CAREER_VALUES.map(val => {
                const isSelected = selectedValues.includes(val)
                return (
                  <button
                    key={val}
                    onClick={() => toggleValue(val)}
                    className={`px-4 py-2 rounded-full font-semibold transition-all ${
                      isSelected 
                        ? 'bg-gold-bright text-green-deepest' 
                        : 'bg-green-mid text-cream hover:bg-green-mid/80'
                    }`}
                  >
                    {val}
                  </button>
                )
              })}
            </div>
          </>
        )}

        <div className="flex justify-between items-center mt-8">
          <div className="text-cream/50 text-sm">Step {step} of 2</div>
          <button 
            onClick={handleNext}
            className="paper-badge text-xl px-8 py-3"
          >
            {step === 1 ? 'Next →' : 'Start the Challenge! 🚀'}
          </button>
        </div>
      </motion.div>
    </div>
  )
}
