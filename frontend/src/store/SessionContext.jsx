import { createContext, useContext, useState, useEffect } from 'react'
import { auth, signIn } from '../firebase'
import { createSession, createUserRecord } from '../services/db'

const SessionContext = createContext()

export const useSession = () => useContext(SessionContext)

export const SessionProvider = ({ children }) => {
  const [user, setUser] = useState(null)
  const [sessionId, setSessionId] = useState(null)
  const [traits, setTraits] = useState({
    R: 0, I: 0, A: 0, S: 0, E: 0, C: 0,
    decisiveness: 0,
    numerical_reasoning: 0,
    logical_reasoning: 0,
    risk_tolerance: 0,
    decision_making: 0,
    planning: 0,
    leadership: 0
  })

  useEffect(() => {
    async function initUser() {
      try {
        const u = await signIn()
        setUser(u)
        await createUserRecord(u.uid, '15-17') // Default for MVP
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

  return (
    <SessionContext.Provider value={{ user, sessionId, traits, updateTraits }}>
      {children}
    </SessionContext.Provider>
  )
}
