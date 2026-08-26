import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useSession } from '../store/SessionContext'
import { recordResponse } from '../services/db'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Timer, Lightbulb } from 'lucide-react'

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
      await recordResponse(sessionId, 'data_detective', telemetry)
    }
  }

  const handleAnswer = async (selected) => {
    const isCorrect = selected === answer
    const latencySec = (Date.now() - startTs) / 1000
    const finalAccuracy = isCorrect ? Math.max(1.0 - (attempts * 0.3) - (hintsUsed * 0.2), 0.2) : 0.0

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

    // Fire-and-forget
    ;(async () => {
      try {
        const rawUrl = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000'
        const API_URL = rawUrl.endsWith('/') ? rawUrl.slice(0, -1) : rawUrl
        const response = await fetch(`${API_URL}/submit_activity`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ user_id: sessionId || 'anonymous', activity_id: 'data_detective_sim', difficulty_level: 3, telemetry })
        })
        const data = await response.json()
        if (data.estimated_skill_delta) {
          const delta = data.estimated_skill_delta * 10
          const avgNumerical = ((traits.numerical_reasoning || 50) + Math.max(0, Math.min(100, (traits.numerical_reasoning || 50) + delta))) / 2
          const normalizedLatency = Math.min(latencySec / 120, 1.0)
          const analyticalFromTelemetry = (finalAccuracy * 0.7) + ((1 - normalizedLatency) * 0.3)
          updateTraits({ analytical_thinking: Math.round(analyticalFromTelemetry * 100), numerical_reasoning: Math.round(avgNumerical) })
        }
      } catch (error) { console.warn('Telemetry send failed silently:', error) }
      if (sessionId) await recordResponse(sessionId, 'data_detective', telemetry)
    })()

    setAttempts(a => a + 1)
    // Always advance
    advanceFlow(navigate)
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-ivory text-green-dark p-4 sm:p-6 relative">
      <div className="absolute top-4 left-4 sm:top-6 sm:left-6">
        <button onClick={() => navigate('/')} className="text-green-secondary hover:text-green-dark font-semibold flex items-center gap-2 bg-white/60 rounded-pill px-3 py-1.5 sm:px-4 sm:py-2 shadow-cushion-sm text-sm sm:text-base hover:shadow-cushion transition-shadow">
          <ArrowLeft size={16} className="shrink-0" /> Back
        </button>
      </div>

      <motion.div 
        initial={{ opacity: 0, y: 16, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.45, ease: [0.34, 1.56, 0.64, 1] }}
        className="max-w-2xl w-full bg-soft-white p-5 sm:p-8 rounded-card-lg shadow-cushion border border-border-glass"
      >
        <div className="flex flex-wrap gap-2 justify-between items-center mb-6">
          <h2 className="font-playful text-xl sm:text-3xl font-extrabold tracking-tight">Data Detective</h2>
          <span className="text-green-secondary font-mono font-medium px-3 py-1 bg-green-primary/5 rounded-pill flex items-center gap-1.5"><Timer size={15} className="shrink-0" /> {timeElapsed}s</span>
        </div>
        
        {/* Dataset Table */}
        <div className="bg-ivory rounded-card overflow-hidden mb-8 border border-border-glass shadow-cushion-sm">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-green-primary/5 text-green-secondary text-sm tracking-wide uppercase">
                <th className="p-4 border-b border-border-glass font-medium">Month</th>
                <th className="p-4 border-b border-border-glass font-medium">Revenue (Rs.)</th>
                <th className="p-4 border-b border-border-glass font-medium">Active Users</th>
              </tr>
            </thead>
            <tbody>
              {dataset.map((row, i) => (
                <tr key={i} className="border-b border-border-glass last:border-0 hover:bg-green-primary/5 transition-colors">
                  <td className="p-4 text-green-dark">{row.month}</td>
                  <td className="p-4 text-green-dark font-mono font-medium">{row.revenue}</td>
                  <td className="p-4 text-green-dark font-mono font-medium">{row.users}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <p className="text-xl text-green-dark mb-8 font-medium leading-relaxed">{question}</p>
        
        <div className="w-full space-y-3 mb-8">
          {options.map((opt, i) => {
            const isWrong = wrongAnswers.includes(opt)
            return (
              <motion.button 
                key={opt}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.35, delay: i * 0.06, ease: [0.34, 1.56, 0.64, 1] }}
                whileTap={isWrong ? {} : { scale: 0.97 }}
                onClick={() => handleAnswer(opt)}
                disabled={isWrong}
                className={`w-full py-4 px-6 text-left border rounded-card transition-colors font-medium ${
                  isWrong 
                    ? 'border-red-500/20 bg-red-500/5 text-red-500/50 cursor-not-allowed'
                    : 'border-border-glass bg-ivory hover:bg-green-primary hover:text-ivory shadow-cushion-sm'
                }`}
              >
                {opt}
              </motion.button>
            )
          })}
        </div>

        <div className="flex flex-wrap gap-3 justify-between items-center mt-8 pt-6 border-t border-green-primary/10">
          <button 
            onClick={() => { setHintsUsed(h => h + 1); setShowHint(true) }}
            disabled={showHint}
            className={`text-sm px-4 sm:px-6 py-2 rounded-pill border transition-colors font-medium flex items-center gap-1.5 whitespace-nowrap ${
              showHint ? 'border-border-glass text-text-muted' : 'border-green-secondary text-green-secondary hover:bg-green-secondary hover:text-ivory'
            }`}
          >
            <Lightbulb size={15} className="shrink-0" />
            {showHint ? "Hint Used" : "Need a hint?"}
          </button>
          
          <AnimatePresence>
            {showHint && (
              <motion.div 
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                className="text-sm text-green-secondary w-full sm:w-auto sm:max-w-[60%] text-left sm:text-right font-medium break-words"
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
