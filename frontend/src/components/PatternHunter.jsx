import { useState } from 'react'
import { useSession } from '../store/SessionContext'
import { recordResponse, updateSessionProgress } from '../services/db'
import { useNavigate } from 'react-router-dom'

const QUESTIONS = [
  { id: 1, type: "numerical", text: "What comes next? 2, 4, 8, 16...", options: ["24", "32", "64", "20"], answer: "32" },
  { id: 2, type: "logical", text: "If all Z are Y, and all Y are X, then:", options: ["All Z are X", "All X are Z", "Some Z are not X", "None of the above"], answer: "All Z are X" }
]

export default function PatternHunter() {
  const { sessionId, updateTraits, traits } = useSession()
  const [current, setCurrent] = useState(0)
  const [startTs, setStartTs] = useState(Date.now())
  const navigate = useNavigate()

  const handleAnswer = async (selected) => {
    const q = QUESTIONS[current]
    const isCorrect = selected === q.answer
    const latency = Date.now() - startTs
    
    // Scoring logic
    if (isCorrect) {
      if (q.type === 'numerical') updateTraits({ numerical_reasoning: traits.numerical_reasoning + 0.5 })
      if (q.type === 'logical') updateTraits({ logical_reasoning: traits.logical_reasoning + 0.5 })
    }

    if (sessionId) {
      await recordResponse(sessionId, 'pattern_hunter', {
        raw_response: selected,
        is_correct: isCorrect,
        latency_ms: latency
      })
    }

    if (current + 1 < QUESTIONS.length) {
      setCurrent(c => c + 1)
      setStartTs(Date.now())
    } else {
      if (sessionId) await updateSessionProgress(sessionId, 'pattern_hunter')
      navigate('/decision-lab')
    }
  }

  if (current >= QUESTIONS.length) return null

  const q = QUESTIONS[current]

  return (
    <div className="flex flex-col items-center justify-center p-8 bg-green-dark rounded-xl shadow-lg max-w-lg mx-auto mt-10">
      <h2 className="text-3xl font-baloo font-bold text-gold mb-6">Pattern Hunter</h2>
      <p className="text-lg mb-8">{q.text}</p>
      
      <div className="w-full space-y-4">
        {q.options.map(opt => (
          <button 
            key={opt}
            onClick={() => handleAnswer(opt)}
            className="w-full py-4 px-6 text-left border rounded-lg hover:bg-green-mid hover:border-blue-500 transition-colors"
          >
            {opt}
          </button>
        ))}
      </div>
    </div>
  )
}
