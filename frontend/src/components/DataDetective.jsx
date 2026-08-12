import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useSession } from '../store/SessionContext'
import { recordResponse } from '../services/db'
import { useNavigate } from 'react-router-dom'

export default function DataDetective() {
  const { sessionId, updateTraits, traits } = useSession()
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
      const API_URL = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000'
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
        const newScore = Math.max(0, Math.min(100, (traits.numerical_reasoning || 50) + (data.estimated_skill_delta * 10)))
        updateTraits({ numerical_reasoning: newScore })
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

    if (isCorrect) {
      await submitTelemetry(true)
      navigate('/career-simulation')
    } else {
      setAttempts(a => a + 1)
      setWrongAnswers(prev => [...prev, selected])
      if (attempts >= 2) {
        await submitTelemetry(false)
        navigate('/career-simulation')
      }
    }
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-6 relative">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="max-w-2xl w-full bg-green-dark p-8 rounded-2xl shadow-xl border border-gold/20"
      >
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-3xl font-baloo font-bold text-gold">Data Detective</h2>
          <span className="text-gold-bright font-mono text-lg bg-green-deepest px-3 py-1 rounded-lg">⏱ {timeElapsed}s</span>
        </div>
        
        {/* Dataset Table */}
        <div className="bg-green-mid rounded-xl overflow-hidden mb-8 border border-gold/30">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-green-deepest text-gold-bright">
                <th className="p-3 border-b border-gold/20">Month</th>
                <th className="p-3 border-b border-gold/20">Revenue (Rs.)</th>
                <th className="p-3 border-b border-gold/20">Active Users</th>
              </tr>
            </thead>
            <tbody>
              {dataset.map((row, i) => (
                <tr key={i} className="border-b border-cream/10 last:border-0 hover:bg-green-deepest/50">
                  <td className="p-3 text-cream">{row.month}</td>
                  <td className="p-3 text-cream font-mono">{row.revenue}</td>
                  <td className="p-3 text-cream font-mono">{row.users}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <p className="text-xl text-cream mb-6 font-semibold">{question}</p>
        
        <div className="w-full space-y-3 mb-8">
          {options.map(opt => {
            const isWrong = wrongAnswers.includes(opt)
            return (
              <button 
                key={opt}
                onClick={() => handleAnswer(opt)}
                disabled={isWrong}
                className={`w-full py-4 px-6 text-left border rounded-lg transition-all ${
                  isWrong 
                    ? 'border-red-500/50 bg-red-500/10 text-cream/50 cursor-not-allowed'
                    : 'border-gold/20 bg-green-mid hover:bg-gold hover:text-green-deepest font-medium'
                }`}
              >
                {opt}
              </button>
            )
          })}
        </div>

        <div className="flex justify-between items-center mt-6 pt-6 border-t border-cream/10">
          <button 
            onClick={() => { setHintsUsed(h => h + 1); setShowHint(true) }}
            disabled={showHint}
            className={`text-sm px-4 py-2 rounded-full border ${
              showHint ? 'border-cream/20 text-cream/40' : 'border-gold text-gold hover:bg-gold hover:text-green-deepest'
            }`}
          >
            {showHint ? "Hint Used" : "💡 Need a hint?"}
          </button>
          
          <AnimatePresence>
            {showHint && (
              <motion.div 
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                className="text-sm text-gold-bright max-w-[60%] text-right italic"
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
