import { useState, useRef } from 'react'
import { motion, AnimatePresence, useMotionValue, useTransform } from 'framer-motion'
import { useSession } from '../store/SessionContext'
import { recordResponse } from '../services/db'
import { useNavigate } from 'react-router-dom'
import PixelIcon from './PixelIcon'

// 18 cards, 3 per RIASEC letter, each with weights that accumulate
const CARDS = [
  { id: 1, text: "Fix a broken machine or engine", icon: 'wrench', weights: { R: 0.9, I: 0.2 } },
  { id: 2, text: "Build something with your hands", icon: 'building', weights: { R: 0.8, C: 0.1 } },
  { id: 3, text: "Work outdoors on a construction site", icon: 'hammer', weights: { R: 0.7, E: 0.1 } },
  { id: 4, text: "Analyze a complex dataset to find patterns", icon: 'chart', weights: { I: 0.9, C: 0.3 } },
  { id: 5, text: "Conduct a science experiment", icon: 'flask', weights: { I: 0.8, R: 0.1 } },
  { id: 6, text: "Research and write a technical report", icon: 'document', weights: { I: 0.7, C: 0.3 } },
  { id: 7, text: "Design a poster or visual artwork", icon: 'palette', weights: { A: 0.9, E: 0.2 } },
  { id: 8, text: "Write a short story or poem", icon: 'document', weights: { A: 0.8, I: 0.2 } },
  { id: 9, text: "Direct a short film or music video", icon: 'film', weights: { A: 0.7, E: 0.3 } },
  { id: 10, text: "Help a classmate who is struggling", icon: 'users', weights: { S: 0.9, A: 0.2 } },
  { id: 11, text: "Volunteer at a community event", icon: 'heart', weights: { S: 0.8, E: 0.2 } },
  { id: 12, text: "Teach someone a new skill", icon: 'book', weights: { S: 0.7, C: 0.1 } },
  { id: 13, text: "Pitch a business idea to investors", icon: 'crown', weights: { E: 0.9, S: 0.3 } },
  { id: 14, text: "Lead a project and delegate tasks", icon: 'crown', weights: { E: 0.8, C: 0.2 } },
  { id: 15, text: "Negotiate the best deal in a transaction", icon: 'calculator', weights: { E: 0.7, R: 0.1 } },
  { id: 16, text: "Organize files and create a database", icon: 'database', weights: { C: 0.9, R: 0.2 } },
  { id: 17, text: "Audit financial records for errors", icon: 'document', weights: { C: 0.8, I: 0.3 } },
  { id: 18, text: "Create a detailed spreadsheet plan", icon: 'spreadsheet', weights: { C: 0.7, I: 0.2 } },
]

export default function InstinctSwipe() {
  const { sessionId, updateTraits, advanceFlow } = useSession()
  const navigate = useNavigate()
  
  const [current, setCurrent] = useState(0)
  const [scores, setScores] = useState({ R: 0, I: 0, A: 0, S: 0, E: 0, C: 0 })
  const [maxScores, setMaxScores] = useState({ R: 0, I: 0, A: 0, S: 0, E: 0, C: 0 })
  const [cardTs, setCardTs] = useState(Date.now())
  const [direction, setDirection] = useState(null) // 'like' or 'dislike'
  const x = useMotionValue(0)
  const rotate = useTransform(x, [-200, 200], [-20, 20])
  const bgColor = useTransform(x, [-100, 0, 100], ['#F3A6B8', '#F5F1E3', '#D8F0E0'])
  const likeOpacity = useTransform(x, [0, 80], [0, 1])
  const dislikeOpacity = useTransform(x, [-80, 0], [1, 0])

  const handleSwipe = async (liked) => {
    const card = CARDS[current]
    const latencyMs = Date.now() - cardTs
    
    // Fast, decisive swipe = stronger signal
    const confidenceMultiplier = latencyMs < 2000 ? 1.0 : latencyMs < 5000 ? 0.8 : 0.6
    
    const updatedScores = { ...scores }
    const updatedMax = { ...maxScores }
    
    Object.entries(card.weights).forEach(([key, weight]) => {
      if (liked) {
        updatedScores[key] = (updatedScores[key] || 0) + (weight * confidenceMultiplier)
      }
      updatedMax[key] = (updatedMax[key] || 0) + weight
    })
    
    setScores(updatedScores)
    setMaxScores(updatedMax)
    setDirection(liked ? 'like' : 'dislike')
    
    setTimeout(() => {
      setDirection(null)
      x.set(0)
      
      if (current + 1 < CARDS.length) {
        setCurrent(c => c + 1)
        setCardTs(Date.now())
      } else {
        finishGame(updatedScores, updatedMax)
      }
    }, 200)
  }

  const finishGame = async (finalScores, finalMax) => {
    // Normalize all RIASEC scores to 0–1
    const normalized = {}
    Object.keys(finalScores).forEach(key => {
      normalized[key] = finalMax[key] > 0 
        ? Math.min(1.0, finalScores[key] / finalMax[key]) 
        : 0
    })

    updateTraits({
      R: normalized.R || 0,
      I: normalized.I || 0,
      A: normalized.A || 0,
      S: normalized.S || 0,
      E: normalized.E || 0,
      C: normalized.C || 0,
    })

    if (sessionId) {
      await recordResponse(sessionId, 'instinct_swipe', {
        riasec_normalized: normalized,
        total_cards: CARDS.length,
        completed: true
      }).catch(e => console.error("Firestore error:", e))
    }

    advanceFlow(navigate)
  }

  const card = CARDS[current]
  const progress = ((current) / CARDS.length) * 100

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-ivory text-green-dark pt-24 px-6 pb-6 relative overflow-hidden">
      <div className="absolute top-6 left-6 z-20">
        <button onClick={() => navigate('/')} className="text-green-secondary hover:text-green-dark font-medium flex items-center gap-2">
          ← Back to Home
        </button>
      </div>

      <div className="w-full max-w-md mb-8 mt-4">
        <h2 className="text-3xl font-medium tracking-tight mb-2 text-center">Instinct Swipe</h2>
        <p className="text-text-muted text-center mb-6">Swipe right to like, left to dislike. Trust your gut — there's no right answer.</p>
        
        {/* Progress Bar */}
        <div className="h-1.5 bg-green-primary/10 overflow-hidden progress-pixel">
          <div 
            className="h-full bg-green-primary transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>
        <p className="text-right text-xs text-text-muted mt-1">{current}/{CARDS.length}</p>
      </div>

      {/* Card Stack */}
      <div className="relative w-full max-w-md h-72 flex items-center justify-center">
        {/* Ghost card behind */}
        {current + 1 < CARDS.length && (
          <div className="absolute inset-0 pixel-panel scale-95 translate-y-2 opacity-50" />
        )}

        <AnimatePresence>
          <motion.div
            key={card.id}
            style={{ x, rotate, backgroundColor: bgColor }}
            drag="x"
            dragConstraints={{ left: 0, right: 0 }}
            onDragEnd={(e, info) => {
              if (info.offset.x > 80) handleSwipe(true)
              else if (info.offset.x < -80) handleSwipe(false)
              else x.set(0)
            }}
            className="absolute inset-0 pixel-panel cursor-grab active:cursor-grabbing flex flex-col items-center justify-center p-10 select-none"
          >
            {/* Like/Dislike Overlays */}
            <motion.div style={{ opacity: likeOpacity }} className="pixel-swipe-stamp like"><PixelIcon name="check" size={18} /> LIKE</motion.div>
            <motion.div style={{ opacity: dislikeOpacity }} className="pixel-swipe-stamp skip"><PixelIcon name="cross" size={18} /> SKIP</motion.div>

            <div className="pixel-game-icon" style={{ width: 88, height: 88, marginBottom: 20 }}><PixelIcon name={card.icon} size={54} /></div>
            <p className="text-xl font-medium text-center leading-relaxed text-green-dark">{card.text}</p>
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Button Controls (fallback for non-drag) */}
      <div className="flex gap-8 mt-10">
        <button 
          onClick={() => handleSwipe(false)}
          className="pixel-icon-btn"
          style={{ width: '64px', height: '64px', backgroundColor: '#FAF8EF' }}
        ><PixelIcon name="cross" size={24} color="#7F2439" /></button>
        <button 
          onClick={() => handleSwipe(true)}
          className="pixel-icon-btn"
          style={{ width: '64px', height: '64px', backgroundColor: '#104D38' }}
        ><PixelIcon name="check" size={24} color="#F5F1E3" /></button>
      </div>
    </div>
  )
}

