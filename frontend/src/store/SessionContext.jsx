import { createContext, useContext, useState, useEffect } from 'react'
import { auth, signIn } from '../firebase'
import { createSession, createUserRecord } from '../services/db'

const SessionContext = createContext()

export const useSession = () => useContext(SessionContext)

export const SessionProvider = ({ children }) => {
  const [user, setUser] = useState(null)
  const [sessionId, setSessionId] = useState(null)
  const [ageGroup, setAgeGroup] = useState('15-17') // Real age band set in onboarding
  const [traits, setTraits] = useState({
    // RIASEC (from InstinctSwipe)
    R: 0, I: 0, A: 0, S: 0, E: 0, C: 0,
    // Cognitive (each activity owns one key, no collisions)
    logical_reasoning: 0,       // PatternHunter
    numerical_reasoning: 0,     // NumericalReasoning (averaged with DataDetective)
    spatial_reasoning: 0,       // VisualSpatial
    processing_speed: 0,        // AttentionGame
    working_memory: 0,          // MemoryGame
    learning_agility: 0,        // LearningAgility
    creativity: 0,              // CreativeUses
    analytical_thinking: 0,     // DataDetective derived
    // Behavioral (from DecisionLab)
    risk_tolerance: 0,
    decision_making: 0,
    planning: 0,
    leadership: 0,
    // Personality (from PersonalityAssessment - Big Five, 0-100)
    openness: 0,
    conscientiousness: 0,
    extraversion: 0,
    agreeableness: 0,
    neuroticism: 0,
    // Misc
    communication: 0,
    domain_exposure: 0,
    // Onboarding
    interests: {},
    career_values: []
  })

  const [activityQueue, setActivityQueue] = useState([])
  const [currentActivityIndex, setCurrentActivityIndex] = useState(0)

  useEffect(() => {
    async function initUser() {
      try {
        const u = await signIn()
        setUser(u)
        await createUserRecord(u.uid, ageGroup)
        const sId = await createSession(u.uid)
        setSessionId(sId)
      } catch (err) {
        console.error("Auth init failed", err)
      }
    }
    initUser()
  }, [])

  const updateTraits = (newTraits) => {
    setTraits(prev => ({ ...prev, ...newTraits }))
  }

  const generateFlow = (interests) => {
    // 1. Base core activities EVERYONE gets (Generic ML Features)
    let queue = [
      '/personality',           // Big Five 
      '/instinct-swipe',        // RIASEC — must feed the RF model
      '/pattern-hunter',        // Pattern Recognition (IQ)
      '/decision-lab',          // Decision Making (Trade-offs)
      '/memory-game',           // Working Memory
      '/visual-spatial',        // Spatial Reasoning
      '/attention-game',        // Processing Speed
      '/learning-agility',      // Learning Ability
      '/creative-uses'          // Creativity
    ]
    
    // 2. Dynamically add domain-specific activities based on interests
    const interestList = Object.keys(interests)
    
    if (interestList.includes('technology') || interestList.includes('science')) {
      queue.push('/data-detective')
      queue.push('/numerical-reasoning')
    }
    
    if (interestList.includes('business') || interestList.includes('psychology')) {
      queue.push('/creative-problem-solver')
    }

    // De-duplicate
    queue = [...new Set(queue)]
    
    // 3. Everyone ends with a field-specific Career Simulation
    queue.push('/career-simulation')
    queue.push('/results')
    
    setActivityQueue(queue)
    setCurrentActivityIndex(0)
    return queue
  }

  const advanceFlow = (navigate) => {
    if (currentActivityIndex < activityQueue.length - 1) {
      const nextIndex = currentActivityIndex + 1
      setCurrentActivityIndex(nextIndex)
      navigate(activityQueue[nextIndex])
    } else {
      navigate('/results')
    }
  }

  return (
    <SessionContext.Provider value={{ user, sessionId, traits, updateTraits, generateFlow, advanceFlow, ageGroup, setAgeGroup }}>
      {children}
    </SessionContext.Provider>
  )
}
