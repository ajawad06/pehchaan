import { useState, useRef } from 'react'
import { motion, AnimatePresence, useMotionValue, useTransform } from 'framer-motion'
import { useSession } from '../store/SessionContext'
import { recordResponse } from '../services/db'
import { useNavigate } from 'react-router-dom'
import {
  ArrowLeft, Wrench, HardHat, Pickaxe, BarChart3, FlaskConical, FileText,
  Palette, PenLine, Clapperboard, HeartHandshake, Heart, BookOpen,
  Megaphone, Crown, Handshake, FolderCog, Receipt, ClipboardList, X, Check
} from 'lucide-react'

// 18 cards, 3 per RIASEC letter, each with weights that accumulate
const CARDS = [
  // Realistic (R)
  { id: 1, text: "Fix a broken machine or engine", icon: Wrench, weights: { R: 0.9, I: 0.2 } },
  { id: 2, text: "Build something with your hands", icon: HardHat, weights: { R: 0.8, C: 0.1 } },
  { id: 3, text: "Work outdoors on a construction site", icon: Pickaxe, weights: { R: 0.7, E: 0.1 } },
  // Investigative (I)
  { id: 4, text: "Analyze a complex dataset to find patterns", icon: BarChart3, weights: { I: 0.9, C: 0.3 } },
  { id: 5, text: "Conduct a science experiment", icon: FlaskConical, weights: { I: 0.8, R: 0.1 } },
  { id: 6, text: "Research and write a technical report", icon: FileText, weights: { I: 0.7, C: 0.3 } },
  // Artistic (A)
  { id: 7, text: "Design a poster or visual artwork", icon: Palette, weights: { A: 0.9, E: 0.2 } },
  { id: 8, text: "Write a short story or poem", icon: PenLine, weights: { A: 0.8, I: 0.2 } },
  { id: 9, text: "Direct a short film or music video", icon: Clapperboard, weights: { A: 0.7, E: 0.3 } },
  // Social (S)
  { id: 10, text: "Help a classmate who is struggling", icon: HeartHandshake, weights: { S: 0.9, A: 0.2 } },
  { id: 11, text: "Volunteer at a community event", icon: Heart, weights: { S: 0.8, E: 0.2 } },
  { id: 12, text: "Teach someone a new skill", icon: BookOpen, weights: { S: 0.7, C: 0.1 } },
  // Enterprising (E)
  { id: 13, text: "Pitch a business idea to investors", icon: Megaphone, weights: { E: 0.9, S: 0.3 } },
  { id: 14, text: "Lead a project and delegate tasks", icon: Crown, weights: { E: 0.8, C: 0.2 } },
  { id: 15, text: "Negotiate the best deal in a transaction", icon: Handshake, weights: { E: 0.7, R: 0.1 } },
  // Conventional (C)
  { id: 16, text: "Organize files and create a database", icon: FolderCog, weights: { C: 0.9, R: 0.2 } },
  { id: 17, text: "Audit financial records for errors", icon: Receipt, weights: { C: 0.8, I: 0.3 } },
  { id: 18, text: "Create a detailed spreadsheet plan", icon: ClipboardList, weights: { C: 0.7, I: 0.2 } },
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
  const bgColor = useTransform(x, [-100, 0, 100], ['#FEE2E2', '#F5F2E8', '#D1FAE5'])
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
      })
    }

    advanceFlow(navigate)
  }

  const card = CARDS[current]
  const progress = ((current) / CARDS.length) * 100

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-ivory text-green-dark p-4 sm:p-6 relative overflow-hidden">
      <div className="absolute top-4 left-4 sm:top-6 sm:left-6">
        <button onClick={() => navigate('/')} className="text-green-secondary hover:text-green-dark font-semibold flex items-center gap-2 bg-white/60 rounded-pill px-3 py-1.5 sm:px-4 sm:py-2 shadow-cushion-sm text-sm sm:text-base hover:shadow-cushion transition-shadow">
          <ArrowLeft size={16} className="shrink-0" /> Back
        </button>
      </div>

      <div className="w-full max-w-md mb-6 sm:mb-8">
        <h2 className="font-playful text-2xl sm:text-3xl font-extrabold tracking-tight mb-2 text-center">Instinct Swipe</h2>
        <p className="text-text-muted text-center mb-4 sm:mb-6 text-sm sm:text-base px-2">Swipe right to like, left to dislike. Trust your gut — there's no right answer.</p>
        
        {/* Progress Bar — liquid-pour fill per DESIGN SYSTEM */}
        <div className="h-2 bg-green-primary/10 rounded-pill overflow-hidden">
          <div 
            className="h-full bg-blush transition-all duration-300 rounded-pill animate-pour-wobble"
            style={{ width: `${progress}%` }}
          />
        </div>
        <p className="text-right text-xs text-text-muted mt-1">{current}/{CARDS.length}</p>
      </div>

      {/* Card Stack */}
      <div className="relative w-full max-w-md h-64 sm:h-72 flex items-center justify-center">
        {/* Ghost card behind */}
        {current + 1 < CARDS.length && (
          <div className="absolute inset-0 bg-soft-white rounded-card-lg border border-border-glass shadow-cushion-sm scale-95 translate-y-2" />
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
            className="absolute inset-0 rounded-card-lg border border-border-glass shadow-cushion cursor-grab active:cursor-grabbing flex flex-col items-center justify-center p-6 sm:p-10 select-none"
          >
            {/* Like/Dislike Overlays */}
            <motion.div style={{ opacity: likeOpacity }} className="absolute top-4 left-4 sm:top-6 sm:left-6 text-green-600 font-bold text-lg sm:text-xl border-2 border-green-600 rounded-card px-2.5 py-1 sm:px-3 sm:py-1 rotate-[-15deg] flex items-center gap-1">
              LIKE <Check size={18} />
            </motion.div>
            <motion.div style={{ opacity: dislikeOpacity }} className="absolute top-4 right-4 sm:top-6 sm:right-6 text-red-500 font-bold text-lg sm:text-xl border-2 border-red-500 rounded-card px-2.5 py-1 sm:px-3 sm:py-1 rotate-[15deg] flex items-center gap-1">
              SKIP <X size={18} />
            </motion.div>

            <card.icon size={56} strokeWidth={1.5} className="mb-4 sm:mb-6 text-green-primary shrink-0" />
            <p className="text-base sm:text-xl font-medium text-center leading-snug sm:leading-relaxed text-green-dark px-2 break-words">{card.text}</p>
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Button Controls (fallback for non-drag) */}
      <div className="flex gap-6 sm:gap-8 mt-8 sm:mt-10">
        <motion.button 
          onClick={() => handleSwipe(false)}
          aria-label="No, not for me"
          whileTap={{ scale: [1, 0.85, 1.05, 1] }}
          transition={{ duration: 0.3, ease: [0.34, 1.56, 0.64, 1] }}
          className="w-14 h-14 sm:w-16 sm:h-16 rounded-pill bg-soft-white border border-red-400 text-red-500 shadow-cushion-sm hover:bg-red-50 transition-colors flex items-center justify-center"
        >
          <X size={24} />
        </motion.button>
        <motion.button 
          onClick={() => handleSwipe(true)}
          aria-label="Yes, this appeals to me"
          whileTap={{ scale: [1, 0.85, 1.05, 1] }}
          transition={{ duration: 0.3, ease: [0.34, 1.56, 0.64, 1] }}
          className="w-14 h-14 sm:w-16 sm:h-16 rounded-pill bg-green-primary text-ivory shadow-cushion-sm hover:bg-green-dark transition-colors flex items-center justify-center"
        >
          <Check size={24} />
        </motion.button>
      </div>
    </div>
  )
}
