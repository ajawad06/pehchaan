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
    <div className="flex flex-col items-center justify-center min-h-screen bg-ivory text-green-dark p-6 relative">
      <div className="absolute top-6 left-6">
        <button onClick={() => navigate('/')} className="text-green-secondary hover:text-green-dark font-medium flex items-center gap-2">
          ← Back to Home
        </button>
      </div>

      <motion.div 
        key={step}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-2xl w-full bg-soft-white p-10 rounded-[32px] shadow-2xl border border-border-glass"
      >
        {step === 0 ? (
          <>
            <h2 className="text-4xl font-medium tracking-tight mb-2 text-center text-green-dark">How old are you?</h2>
            <p className="text-text-muted text-center mb-10">This helps us adapt the challenges for you.</p>
            <div className="flex flex-col space-y-4 mb-8">
              {AGE_GROUPS.map(ag => (
                <button
                  key={ag.id}
                  onClick={() => setLocalAgeGroup(ag.id)}
                  className={`p-5 rounded-2xl text-lg font-medium transition-all ${
                    localAgeGroup === ag.id 
                      ? 'bg-green-primary text-ivory scale-105 shadow-xl' 
                      : 'bg-ivory border border-border-glass text-green-dark hover:bg-green-primary/5 hover:border-green-primary/30'
                  }`}
                >
                  {ag.label}
                </button>
              ))}
            </div>
          </>
        ) : step === 1 ? (
          <>
            <h2 className="text-4xl font-medium tracking-tight mb-2 text-center text-green-dark">What are you curious about?</h2>
            <p className="text-text-muted text-center mb-10">Select up to 3 areas you'd like to explore.</p>
            
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
              {INTEREST_CATEGORIES.map(cat => {
                const isSelected = selectedInterests.includes(cat.id)
                return (
                  <button
                    key={cat.id}
                    onClick={() => toggleInterest(cat.id)}
                    className={`p-5 rounded-2xl flex flex-col items-center justify-center transition-all ${
                      isSelected 
                        ? 'bg-green-primary text-ivory scale-105 shadow-xl' 
                        : 'bg-ivory border border-border-glass text-green-dark hover:bg-green-primary/5 hover:border-green-primary/30'
                    }`}
                  >
                    <span className="text-3xl mb-3">{cat.icon}</span>
                    <span className="text-sm font-medium text-center">{cat.label}</span>
                  </button>
                )
              })}
            </div>
          </>
        ) : (
          <>
            <h2 className="text-4xl font-medium tracking-tight mb-2 text-center text-green-dark">What matters to you?</h2>
            <p className="text-text-muted text-center mb-10">Pick up to 3 things you value most in a future career.</p>
            
            <div className="flex flex-wrap justify-center gap-3 mb-8">
              {CAREER_VALUES.map(val => {
                const isSelected = selectedValues.includes(val)
                return (
                  <button
                    key={val}
                    onClick={() => toggleValue(val)}
                    className={`px-5 py-3 rounded-full font-medium transition-all ${
                      isSelected 
                        ? 'bg-sage text-ivory shadow-md' 
                        : 'bg-ivory border border-border-glass text-green-dark hover:bg-green-primary/5'
                    }`}
                  >
                    {val}
                  </button>
                )
              })}
            </div>
          </>
        )}

        <div className="flex justify-between items-center mt-12 pt-6 border-t border-green-primary/10">
          <div className="text-text-muted text-sm font-medium uppercase tracking-widest">Step {step + 1} of 3</div>
          <button 
            onClick={handleNext}
            className="bg-green-primary text-ivory px-8 py-3 rounded-full font-medium hover:bg-green-dark transition-colors shadow-md"
          >
            {step < 2 ? 'Next →' : 'Start Exploring 🚀'}
          </button>
        </div>
      </motion.div>
    </div>
  )
}
