import { createContext, useContext, useState, useEffect } from 'react'
import { auth, signIn } from '../firebase'
import { createSession, createUserRecord } from '../services/db'

const SessionContext = createContext()

export const useSession = () => useContext(SessionContext)

// ─── Interest → Domain Activity + Skill Map ───────────────────────────────────
// Each domain owns exactly the activities and skills that give real evidence
// for careers in that domain. No domain is silently ignored.
const INTEREST_MODULES = {
  arts:         { activities: ['/creative-composition', '/narrative-builder'],               skills: ['creativity', 'aesthetic_judgment', 'verbal_reasoning'] },
  languages:    { activities: ['/narrative-builder', '/creative-composition'],               skills: ['verbal_reasoning', 'communication', 'creativity'] },
  architecture: { activities: ['/visual-spatial', '/creative-composition'],                  skills: ['spatial_reasoning', 'creativity', 'aesthetic_judgment'] },
  technology:   { activities: ['/data-detective', '/numerical-reasoning'],                   skills: ['logical_reasoning', 'numerical_reasoning', 'analytical_thinking'] },
  science:      { activities: ['/data-detective', '/numerical-reasoning'],                   skills: ['numerical_reasoning', 'analytical_thinking', 'pattern_recognition'] },
  medicine:     { activities: ['/empathy-scenario', '/attention-game', '/memory-game'],      skills: ['empathy', 'memory', 'persistence', 'attention_to_detail'] },
  business:     { activities: ['/creative-problem-solver', '/decision-lab'],                 skills: ['risk_tolerance', 'communication', 'leadership'] },
  psychology:   { activities: ['/creative-problem-solver', '/empathy-scenario'],             skills: ['empathy', 'communication', 'analytical_thinking'] },
  law:          { activities: ['/narrative-builder', '/creative-problem-solver'],            skills: ['verbal_reasoning', 'logical_reasoning', 'communication', 'persistence'] },
  engineering:  { activities: ['/visual-spatial', '/numerical-reasoning', '/data-detective'], skills: ['spatial_reasoning', 'numerical_reasoning', 'systems_thinking'] },
}

export const SessionProvider = ({ children }) => {
  const [user, setUser] = useState(null)
  
  // Try to load state from localStorage first to survive page reloads
  const [sessionId, setSessionId] = useState(() => localStorage.getItem('pehchaan_sessionId') || null)
  const [ageGroup, setAgeGroup] = useState(() => localStorage.getItem('pehchaan_ageGroup') || '15-17')
  
  const [traits, setTraits] = useState(() => {
    const saved = localStorage.getItem('pehchaan_traits')
    if (saved) {
      try { return JSON.parse(saved) } catch (e) { /* ignore */ }
    }
    return {
      // RIASEC (from InstinctSwipe)
      R: 0, I: 0, A: 0, S: 0, E: 0, C: 0,
      // Core Cognitive
      logical_reasoning: 0,       // PatternHunter
      numerical_reasoning: 0,     // NumericalReasoning / DataDetective
      spatial_reasoning: 0,       // VisualSpatial
      processing_speed: 0,        // AttentionGame
      working_memory: 0,          // MemoryGame
      learning_agility: 0,        // LearningAgility
      creativity: 0,              // CreativeUses / CreativeComposition
      analytical_thinking: 0,     // DataDetective
      pattern_recognition: 0,     // PatternHunter / DataDetective
      // Domain-specific (produced by Tier 1 activities)
      verbal_reasoning: 0,        // NarrativeBuilder
      aesthetic_judgment: 0,      // CreativeComposition
      empathy: 0,                 // EmpathyScenario
      memory: 0,                  // MemoryGame / EmpathyScenario
      persistence: 0,             // AttentionGame / EmpathyScenario
      attention_to_detail: 0,     // AttentionGame / EmpathyScenario
      systems_thinking: 0,        // CreativeProblemSolver (engineering context)
      abstract_reasoning: 0,      // PatternHunter advanced
      adversarial_thinking: 0,    // DataDetective (cybersecurity variant)
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
    }
  })

  // Persist state changes
  useEffect(() => {
    if (sessionId) localStorage.setItem('pehchaan_sessionId', sessionId)
  }, [sessionId])
  
  useEffect(() => {
    localStorage.setItem('pehchaan_ageGroup', ageGroup)
  }, [ageGroup])
  
  useEffect(() => {
    localStorage.setItem('pehchaan_traits', JSON.stringify(traits))
  }, [traits])

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
    // Tier 0: Universal core — everyone takes these
    let queue = [
      '/personality',       // Big Five
      '/instinct-swipe',    // RIASEC — feeds the RF model
      '/pattern-hunter',    // logical_reasoning / pattern_recognition
      '/decision-lab',      // risk_tolerance, decision_making, planning
      '/memory-game',       // working_memory / memory
      '/visual-spatial',    // spatial_reasoning
      '/attention-game',    // processing_speed / persistence / attention_to_detail
      '/learning-agility',  // learning_agility
      '/creative-uses',     // creativity
    ]

    // Tier 1: Interest-gated domain deep-dive
    // Iterate interests in selection order (highest weight first)
    const topInterests = Object.keys(interests)
    topInterests.forEach(interest => {
      const mod = INTEREST_MODULES[interest]
      if (mod) {
        mod.activities.forEach(a => queue.push(a))
      }
    })

    // De-duplicate — shared activities (e.g. /data-detective for both tech & science)
    // appear only once while preserving first-encounter order
    queue = [...new Set(queue)]

    // Everyone ends with Career Simulation then Results
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
