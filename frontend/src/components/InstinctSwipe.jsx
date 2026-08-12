import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useSession } from '../store/SessionContext'
import { recordResponse, updateSessionProgress } from '../services/db'
import TraitRadar from './TraitRadar'
import { useNavigate } from 'react-router-dom'

const CARDS = [
  { id: 1, text: "Fixing broken electronics", trait: "R" },
  { id: 2, text: "Solving complex math puzzles", trait: "I" },
  { id: 3, text: "Writing a short story", trait: "A" },
  { id: 4, text: "Helping a friend with a problem", trait: "S" },
  { id: 5, text: "Leading a group project", trait: "E" },
  { id: 6, text: "Organizing files by color", trait: "C" },
]

export default function InstinctSwipe() {
  const { sessionId, updateTraits, traits } = useSession()
  const [cards, setCards] = useState(CARDS)
  const [swipes, setSwipes] = useState(0)
  const navigate = useNavigate()

  const handleSwipe = async (dir, trait) => {
    const start = Date.now()
    const newValue = dir === 'right' ? Math.min(traits[trait] + 0.33, 1) : Math.max(traits[trait] - 0.1, 0)
    
    updateTraits({ [trait]: newValue })
    setSwipes(s => s + 1)
    
    if (sessionId) {
      await recordResponse(sessionId, 'instinct_swipe', {
        raw_response: dir,
        trait_updated: trait,
        latency_ms: Date.now() - start
      })
    }

    setCards(prev => prev.slice(1))

    if (cards.length === 1) {
      updateTraits({ decisiveness: Math.min(swipes / CARDS.length, 1) })
      if (sessionId) await updateSessionProgress(sessionId, 'instinct_swipe')
    }
  }

  if (cards.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-6 bg-green-dark rounded-xl shadow-lg">
        <h2 className="text-3xl font-baloo font-bold text-gold mb-4">Instinct Swipe Complete!</h2>
        <TraitRadar />
        <button onClick={() => navigate('/pattern-hunter')} className="mt-6 px-6 py-3 bg-gold-bright text-green-dark text-white rounded-lg">Next Activity</button>
      </div>
    )
  }

  return (
    <div className="flex flex-col items-center p-4">
      <h2 className="text-xl font-bold mb-8">Swipe Right if you like this, Left if you don't</h2>
      
      <div className="relative w-72 h-96">
        <AnimatePresence>
          {cards.map((card, i) => (
            i === 0 && (
              <motion.div
                key={card.id}
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ x: card.exitX, opacity: 0 }}
                drag="x"
                dragConstraints={{ left: 0, right: 0 }}
                onDragEnd={(e, { offset, velocity }) => {
                  const swipe = offset.x
                  if (swipe > 100) {
                    card.exitX = 200
                    handleSwipe('right', card.trait)
                  } else if (swipe < -100) {
                    card.exitX = -200
                    handleSwipe('left', card.trait)
                  }
                }}
                className="absolute w-full h-full bg-green-dark rounded-2xl shadow-xl flex items-center justify-center p-6 text-center text-xl cursor-grab active:cursor-grabbing border-2 border-gray-100"
              >
                {card.text}
              </motion.div>
            )
          ))}
        </AnimatePresence>
      </div>
      <div className="mt-12 w-full max-w-md">
        <TraitRadar />
      </div>
    </div>
  )
}
