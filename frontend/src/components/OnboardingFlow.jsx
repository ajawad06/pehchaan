import { useState } from 'react'
import { motion } from 'framer-motion'
import { useSession } from '../store/SessionContext'
import { useNavigate } from 'react-router-dom'
import { recordResponse } from '../services/db'
import PixelIcon from './PixelIcon'

const INTEREST_CATEGORIES = [
  { id: 'arts', icon: 'palette', label: 'Arts & Creative' },
  { id: 'architecture', icon: 'building', label: 'Architecture & Design' },
  { id: 'languages', icon: 'book', label: 'Languages & Lit' },
  { id: 'technology', icon: 'calculator', label: 'Tech & Computing' },
  { id: 'medicine', icon: 'heart', label: 'Medicine & Life Sci' },
  { id: 'science', icon: 'flask', label: 'Science & Research' },
  { id: 'business', icon: 'chart', label: 'Business & Finance' },
  { id: 'psychology', icon: 'users', label: 'Psychology' },
  { id: 'law', icon: 'scales', label: 'Law & Public Policy' },
  { id: 'engineering', icon: 'hammer', label: 'Engineering' },
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
        }).catch(e => console.error("Firestore error:", e))
      }
      
      const queue = generateFlow(interestProfile)
      navigate(queue[0])
    }
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-ivory text-green-dark pt-24 px-6 pb-6 relative">
      <div className="absolute top-6 left-6 z-20">
        <button onClick={() => navigate('/')} className="pixel-button ghost" style={{ fontSize: '13px' }}>
          ← Back
        </button>
      </div>

      <motion.div 
        key={step}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-2xl w-full pixel-panel p-10 mt-4 relative z-10"
      >
        {step === 0 ? (
          <>
            <h2 className="text-4xl font-medium tracking-tight mb-2 text-center text-green-dark flex items-center justify-center gap-3">
              <PixelIcon name="clover" size={28} />
              How old are you?
              <PixelIcon name="clover" size={28} />
            </h2>
            <p className="text-text-muted text-center mb-10 text-sm font-bold tracking-widest uppercase">This helps us adapt the challenges for you.</p>
            <div className="flex flex-col space-y-4 mb-8">
              {AGE_GROUPS.map(ag => (
                <button
                  key={ag.id}
                  onClick={() => setLocalAgeGroup(ag.id)}
                  className={`py-4 px-6 border-2 transition-all font-medium text-lg ${
                    localAgeGroup === ag.id 
                      ? 'border-green-deepest bg-green-primary text-ivory shadow-[3px_3px_0_#041C14] translate-y-[-2px]' 
                      : 'border-green-deepest bg-ivory text-green-dark hover:bg-green-primary/5 shadow-[3px_3px_0_#041C14]'
                  }`}
                >
                  {ag.label}
                </button>
              ))}
            </div>
          </>
        ) : step === 1 ? (
          <>
            <h2 className="text-4xl font-medium tracking-tight mb-2 text-center text-green-dark flex items-center justify-center gap-3">
              <PixelIcon name="clover" size={28} />
              What are you curious about?
              <PixelIcon name="clover" size={28} />
            </h2>
            <p className="text-text-muted text-center mb-10 text-sm font-bold tracking-widest uppercase">Select up to 3 areas you'd like to explore.</p>
            
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
              {INTEREST_CATEGORIES.map(cat => {
                const isSelected = selectedInterests.includes(cat.id)
                return (
                  <button
                    key={cat.id}
                    onClick={() => toggleInterest(cat.id)}
                    className={`p-4 border-2 flex flex-col items-center justify-center transition-all ${
                      isSelected 
                        ? 'border-green-deepest bg-green-primary text-ivory shadow-[3px_3px_0_#041C14] translate-y-[-2px]' 
                        : 'border-green-deepest bg-ivory text-green-dark hover:bg-green-primary/5 shadow-[3px_3px_0_#041C14]'
                    }`}
                  >
                    <span className="pixel-game-icon" style={{ width: 44, height: 44, marginBottom: 8, background: isSelected ? 'transparent' : '' }}><PixelIcon name={cat.icon} size={28} /></span>
                    <span className="text-xs font-medium text-center">{cat.label}</span>
                  </button>
                )
              })}
            </div>
          </>
        ) : (
          <>
            <h2 className="text-4xl font-medium tracking-tight mb-2 text-center text-green-dark flex items-center justify-center gap-3">
              <PixelIcon name="clover" size={28} />
              What matters to you?
              <PixelIcon name="clover" size={28} />
            </h2>
            <p className="text-text-muted text-center mb-10 text-sm font-bold tracking-widest uppercase">Pick up to 3 things you value most in a future career.</p>
            
            <div className="flex flex-wrap justify-center gap-3 mb-8">
              {CAREER_VALUES.map(val => {
                const isSelected = selectedValues.includes(val)
                return (
                  <button
                    key={val}
                    onClick={() => toggleValue(val)}
                    className={`px-4 py-2 border-2 transition-all font-medium text-sm ${
                      isSelected 
                        ? 'border-green-deepest bg-sage text-ivory shadow-[2px_2px_0_#041C14] translate-y-[-1px]' 
                        : 'border-green-deepest bg-ivory text-green-dark hover:bg-green-primary/5 shadow-[2px_2px_0_#041C14]'
                    }`}
                  >
                    {val}
                  </button>
                )
              })}
            </div>
          </>
        )}

        <div className="flex justify-between items-center mt-12 pt-6 border-t-2 border-border-glass">
          <div className="text-text-muted text-xs font-bold uppercase tracking-widest">Step {step + 1} of 3</div>
          <button 
            onClick={handleNext}
            className="pixel-button px-8 py-3"
          >
            {step < 2 ? 'Next →' : 'Start Exploring →'}
          </button>
        </div>
      </motion.div>
      <div className="forest-floor" aria-hidden="true" style={{ position: 'absolute', bottom: 0, left: 0, right: 0 }} />
    </div>
  )
}

