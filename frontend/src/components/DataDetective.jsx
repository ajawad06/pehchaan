import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useSession } from '../store/SessionContext'
import { recordResponse } from '../services/db'
import { useNavigate } from 'react-router-dom'
import PixelIcon from './PixelIcon'
import BackButton from './BackButton'

export default function DataDetective() {
  const { sessionId, updateTraits, traits, advanceFlow } = useSession()
  const navigate = useNavigate()
  
  const [startTs, setStartTs] = useState(Date.now())
  const [timeElapsed, setTimeElapsed] = useState(0)
  const [attempts, setAttempts] = useState(0)
  const [hintsUsed, setHintsUsed] = useState(0)
  const [showHint, setShowHint] = useState(false)
  const [wrongAnswers, setWrongAnswers] = useState([])

  // The Data Challenge
  const dataset = [
    { month: 'Jan', revenue: 1200, users: 400 },
    { month: 'Feb', revenue: 1500, users: 420 },
    { month: 'Mar', revenue: 1100, users: 450 },
    { month: 'Apr', revenue: 1800, users: 470 }
  ]

  const question = "Looking at this startup's data, which statement is definitely true?"
  const options = [
    "Revenue increases every single month.",
    "User count is steadily increasing.",
    "Revenue and users are perfectly correlated.",
    "March was the most profitable month."
  ]
  const answer = "User count is steadily increasing."
  const hint = "Look closely at the 'users' column row by row. Then check the 'revenue' column for drops."

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeElapsed(Math.floor((Date.now() - startTs) / 1000))
    }, 1000)
    return () => clearInterval(timer)
  }, [startTs])

  const submitTelemetry = async (isCorrect) => {
    const latencySec = (Date.now() - startTs) / 1000
    const finalAccuracy = isCorrect ? Math.max(1.0 - (attempts * 0.3) - (hintsUsed * 0.2), 0.2) : 0.0

    const telemetry = {
      response_time_sec: latencySec,
      hints_used: hintsUsed,
      accuracy: finalAccuracy,
      attempts: attempts + 1,
      completed: isCorrect,
      quit: false
    }

    try {
      const rawUrl = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000'
      const API_URL = rawUrl.endsWith('/') ? rawUrl.slice(0, -1) : rawUrl;
      const response = await fetch(`${API_URL}/submit_activity`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: sessionId || 'anonymous',
          activity_id: 'data_detective_sim',
          difficulty_level: 3,
          telemetry: telemetry
        })
      })
      
      const data = await response.json()
      
      if (data.estimated_skill_delta) {
        const delta = data.estimated_skill_delta * 10
        // DataDetective owns analytical_thinking
        const analyticalScore = Math.max(0, Math.min(100, 50 + delta))
        // Average numerical_reasoning instead of overwriting it (shared signal)
        const avgNumerical = ((traits.numerical_reasoning || 50) + Math.max(0, Math.min(100, (traits.numerical_reasoning || 50) + delta))) / 2
        // Derive analytical_thinking from accuracy + latency
        const normalizedLatency = Math.min(latencySec / 120, 1.0)
        const analyticalFromTelemetry = (finalAccuracy * 0.7) + ((1 - normalizedLatency) * 0.3)
        updateTraits({ 
          analytical_thinking: Math.round(analyticalFromTelemetry * 100),
          numerical_reasoning: Math.round(avgNumerical)
        })
      }
    } catch (error) {
      console.error("Failed to send telemetry to backend:", error)
    }

    if (sessionId) {
      await recordResponse(sessionId, 'data_detective', telemetry).catch(e => console.error("Firestore error:", e))
    }
  }

  const handleAnswer = async (selected) => {
    const isCorrect = selected === answer
    const latencySec = (Date.now() - startTs) / 1000
    const finalAccuracy = isCorrect ? Math.max(1.0 - (attempts * 0.3) - (hintsUsed * 0.2), 0.2) : 0.2

    const telemetry = {
      response_time_sec: latencySec,
      hints_used: hintsUsed,
      accuracy: finalAccuracy,
      attempts: attempts + 1,
      completed: true,
      quit: false,
      was_correct: isCorrect,
      selected_answer: selected
    }

    // Write traits unconditionally — never gate on API response
    const normalizedLatency = Math.min(latencySec / 120, 1.0)
    const analyticalFromTelemetry = (finalAccuracy * 0.7) + ((1 - normalizedLatency) * 0.3)
    updateTraits({
      analytical_thinking: Math.round(analyticalFromTelemetry * 100),
    })

    // Fire-and-forget telemetry — doesn't block navigation
    ;(async () => {
      try {
        const rawUrl = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000'
        const API_URL = rawUrl.endsWith('/') ? rawUrl.slice(0, -1) : rawUrl
        await fetch(`${API_URL}/submit_activity`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ user_id: sessionId || 'anonymous', activity_id: 'data_detective_sim', difficulty_level: 3, telemetry })
        })
      } catch (error) { console.warn('Telemetry send failed silently:', error) }
      if (sessionId) await recordResponse(sessionId, 'data_detective', telemetry).catch(e => console.error("Firestore error:", e))
    })()

    setAttempts(a => a + 1)
    // Always advance
    advanceFlow(navigate)
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-ivory text-green-dark pt-20 sm:pt-24 px-4 sm:px-6 pb-6 relative">
      <BackButton />

      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="max-w-2xl w-full pixel-panel p-4 sm:p-8 mt-4"
      >
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl sm:text-3xl font-medium tracking-tight flex items-center gap-2 sm:gap-3">
            <PixelIcon name="clover" size={20} />
            Data Detective
            <PixelIcon name="clover" size={20} />
          </h2>
          <span className="text-green-dark font-mono font-medium px-3 py-1 bg-ivory border-2 border-green-deepest shadow-[3px_3px_0_#041C14]">⏱ {timeElapsed}s</span>
        </div>
        
        {/* Dataset Table */}
        <div className="bg-ivory mb-8 border-2 border-green-deepest shadow-[4px_4px_0_#041C14]">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-green-deepest text-ivory text-xs tracking-widest uppercase">
                <th className="p-3 border-b-2 border-green-deepest font-medium">Month</th>
                <th className="p-3 border-b-2 border-green-deepest font-medium">Revenue (Rs.)</th>
                <th className="p-3 border-b-2 border-green-deepest font-medium">Active Users</th>
              </tr>
            </thead>
            <tbody>
              {dataset.map((row, i) => (
                <tr key={i} className="border-b border-border-glass last:border-0 hover:bg-green-primary/5 transition-colors text-sm">
                  <td className="p-3 text-green-dark">{row.month}</td>
                  <td className="p-3 text-green-dark font-mono font-medium">{row.revenue}</td>
                  <td className="p-3 text-green-dark font-mono font-medium">{row.users}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <p className="text-lg text-green-dark mb-6 font-medium leading-relaxed">{question}</p>
        
        <div className="w-full space-y-3 mb-8">
          {options.map(opt => {
            const isWrong = wrongAnswers.includes(opt)
            return (
              <button 
                key={opt}
                onClick={() => handleAnswer(opt)}
                disabled={isWrong}
                className={`w-full py-4 px-6 text-left border-2 transition-all font-medium text-sm ${
                  isWrong 
                    ? 'border-red-500/20 bg-red-500/5 text-red-500/50 cursor-not-allowed'
                    : 'border-green-deepest bg-ivory hover:bg-green-primary hover:text-ivory shadow-[3px_3px_0_#041C14]'
                }`}
              >
                {opt}
              </button>
            )
          })}
        </div>

        <div className="flex justify-between items-center mt-8 pt-6 border-t-2 border-border-glass">
          <button 
            onClick={() => { setHintsUsed(h => h + 1); setShowHint(true) }}
            disabled={showHint}
            className={`pixel-button text-xs py-2 px-4 ${showHint ? 'opacity-50 cursor-not-allowed' : 'ghost'}`}
            style={showHint ? { background: 'transparent', color: 'var(--muted)', borderColor: 'var(--muted)' } : {}}
          >
            {showHint ? "Hint Used" : "? Need a hint?"}
          </button>
          
          <AnimatePresence>
            {showHint && (
              <motion.div 
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                className="text-sm text-green-secondary max-w-[60%] text-right font-medium"
              >
                {hint}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </div>
  )
}



