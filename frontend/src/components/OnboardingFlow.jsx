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

const AGE_GROUPS = [
  { id: '14-15', label: '14-15 (Early Explorer)' },
  { id: '16-17', label: '16-17 (Path Explorer)' },
  { id: '18-20', label: '18-20 (Career Explorer)' },
  { id: '21-24', label: '21-24 (Career Builder)' }
]

export default function OnboardingFlow() {
  const { sessionId, updateTraits } = useSession()
  const navigate = useNavigate()
  
  const [step, setStep] = useState(0)
  const [ageGroup, setAgeGroup] = useState(null)
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
      if (!ageGroup) return alert('Please select your age group!')
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
        age_group: ageGroup,
        interests: interestProfile,
        career_values: selectedValues
      })

      if (sessionId) {
        await recordResponse(sessionId, 'onboarding', {
          age_group: ageGroup,
          interests: selectedInterests,
          values: selectedValues
        })
      }
      
      navigate('/pattern-hunter')
    }
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-6 relative">
      <motion.div 
        key={step}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-2xl w-full bg-green-dark p-8 rounded-2xl shadow-xl border border-gold/20"
      >
        {step === 0 ? (
          <>
            <h2 className="text-4xl font-baloo font-bold text-gold mb-2 text-center">How old are you?</h2>
            <p className="text-cream/80 text-center mb-8">This helps us adapt the challenges for you.</p>
            <div className="flex flex-col space-y-4 mb-8">
              {AGE_GROUPS.map(ag => (
                <button
                  key={ag.id}
                  onClick={() => setAgeGroup(ag.id)}
                  className={`p-4 rounded-xl text-lg font-semibold transition-all ${
                    ageGroup === ag.id 
                      ? 'bg-gold text-green-deepest scale-105 shadow-md' 
                      : 'bg-green-mid text-cream hover:bg-green-mid/80'
                  }`}
                >
                  {ag.label}
                </button>
              ))}
            </div>
          </>
        ) : step === 1 ? (
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
          <div className="text-cream/50 text-sm">Step {step + 1} of 3</div>
          <button 
            onClick={handleNext}
            className="paper-badge text-xl px-8 py-3"
          >
            {step < 2 ? 'Next →' : 'Start the Challenge! 🚀'}
          </button>
        </div>
      </motion.div>
    </div>
  )
}
