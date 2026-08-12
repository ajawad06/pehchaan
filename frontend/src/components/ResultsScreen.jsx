import { useState, useEffect } from 'react'
import { useSession } from '../store/SessionContext'
import { saveRecommendations } from '../services/db'
import { motion, AnimatePresence } from 'framer-motion'

export default function ResultsScreen() {
  const { traits, sessionId } = useSession()
  const [recommendations, setRecommendations] = useState(null)
  const [comprehensiveData, setComprehensiveData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    async function fetchResults() {
      try {
        const API_URL = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000';
        
        // Build the UserProfile object from traits
        const profile = {
          user_id: sessionId || "anonymous",
          interests: traits.interests || { "technology": 0.8 }, // Fallback if missing
          abilities: {},
          career_values: traits.career_values || []
        }
        
        // Extract cognitive abilities from traits
        const knownAbilities = ["numerical_reasoning", "logical_reasoning", "pattern_recognition", "creativity"]
        knownAbilities.forEach(ab => {
          if (traits[ab] !== undefined) profile.abilities[ab] = traits[ab] / 100.0 // Normalize to 0-1
        })

        // Step 1: Get base numerical recommendations
        const recResponse = await fetch(`${API_URL}/recommend_careers`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(profile)
        })
        
        if (!recResponse.ok) throw new Error('Failed to fetch recommendations')
        const recData = await recResponse.json()
        setRecommendations(recData.recommendations)

        if (sessionId) {
          await saveRecommendations(sessionId, recData.recommendations, 'cold_start_v1')
        }

        // Step 2: Get Gemini detailed explanations
        try {
          const expRes = await fetch(`${API_URL}/comprehensive_explain`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              profile: profile,
              recommendations: recData.recommendations
            })
          })
          if (expRes.ok) {
            const expData = await expRes.json()
            setComprehensiveData(expData)
          }
        } catch (e) {
          console.error('Explanation fetch failed:', e)
        }

      } catch (err) {
        setError(err.message)
      } finally {
        setLoading(false)
      }
    }
    
    fetchResults()
  }, [traits, sessionId])

  return (
    <div className="flex flex-col items-center p-8 min-h-screen relative overflow-y-auto">
      <h1 className="text-5xl font-baloo font-bold text-gold mb-2 text-center mt-8">Your Pehchaan</h1>
      <p className="text-cream/80 text-lg mb-12 text-center">Based on your interests, performance, and behavioral patterns.</p>
      
      {loading && (
        <div className="flex flex-col items-center justify-center space-y-4 my-20">
          <div className="w-16 h-16 border-4 border-gold border-t-transparent rounded-full animate-spin"></div>
          <p className="text-cream animate-pulse">Running behavioral analysis...</p>
        </div>
      )}
      
      {error && <p className="text-red-500 bg-red-500/10 p-4 rounded-xl border border-red-500/20">{error}</p>}
      
      {!loading && recommendations && (
        <div className="w-full max-w-4xl grid grid-cols-1 md:grid-cols-3 gap-6">
          
          {/* Left Column: Strengths & Interests */}
          <div className="col-span-1 space-y-6">
            <div className="bg-green-dark/80 backdrop-blur-md rounded-2xl p-6 shadow-xl border border-gold/10">
              <h3 className="text-xl font-baloo font-bold text-gold mb-4">Measured Strengths</h3>
              <div className="space-y-3">
                {Object.entries(traits).filter(([k,v]) => typeof v === 'number' && k !== 'decisiveness').map(([key, val]) => (
                  <div key={key}>
                    <div className="flex justify-between text-sm text-cream/90 mb-1 capitalize">
                      <span>{key.replace('_', ' ')}</span>
                      <span>{Math.round(val)}</span>
                    </div>
                    <div className="w-full bg-green-deepest rounded-full h-2">
                      <div className="bg-gold-bright h-2 rounded-full" style={{ width: `${Math.min(val, 100)}%` }}></div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {traits.interests && (
              <div className="bg-green-dark/80 backdrop-blur-md rounded-2xl p-6 shadow-xl border border-gold/10">
                <h3 className="text-xl font-baloo font-bold text-gold mb-4">Stated Interests</h3>
                <ul className="space-y-2">
                  {Object.entries(traits.interests).map(([interest, weight]) => (
                    <li key={interest} className="flex justify-between text-sm text-cream/90 capitalize">
                      <span>{interest}</span>
                      <span className="text-gold opacity-70">{(weight * 100).toFixed(0)}%</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          {/* Right Column: Recommendations & AI Analysis */}
          <div className="col-span-1 md:col-span-2 space-y-6">
            
            {/* Overview Box */}
            <AnimatePresence>
              {comprehensiveData && (
                <motion.div 
                  initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                  className="bg-gold/10 border border-gold/30 rounded-2xl p-6 shadow-xl"
                >
                  <p className="text-cream text-lg leading-relaxed">✨ {comprehensiveData.overall_summary}</p>
                </motion.div>
              )}
            </AnimatePresence>

            <h2 className="text-2xl font-baloo font-bold text-gold mt-8 mb-4">Potential Career Matches</h2>
            
            <div className="space-y-4">
              {recommendations.map((rec, i) => (
                <motion.div 
                  initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.1 }}
                  key={rec.career} 
                  className="bg-green-dark/80 backdrop-blur-md border border-gold/20 rounded-2xl p-6 hover:border-gold/50 transition-colors"
                >
                  <div className="flex flex-wrap justify-between items-start mb-4 gap-4">
                    <h3 className="text-2xl font-baloo font-bold text-cream">
                      {i === 0 ? '🥇' : i === 1 ? '🥈' : '🥉'} {rec.career}
                    </h3>
                    
                    <div className="flex gap-2">
                      <div className="bg-gold text-green-deepest px-3 py-1 rounded-full text-sm font-bold shadow-sm">
                        Compatibility: {rec.compatibility}%
                      </div>
                      <div className="bg-green-mid border border-gold/30 text-cream px-3 py-1 rounded-full text-sm font-semibold shadow-sm">
                        Confidence: {rec.confidence}%
                      </div>
                    </div>
                  </div>

                  {comprehensiveData?.explanations?.[rec.career] ? (
                    <div className="text-cream/90 text-sm leading-relaxed mb-3">
                      <strong>Why?</strong> {comprehensiveData.explanations[rec.career]}
                    </div>
                  ) : (
                    <div className="h-10 animate-pulse bg-green-mid rounded w-3/4 mb-3"></div>
                  )}
                </motion.div>
              ))}
            </div>

            {/* Uncertainty & Next Steps */}
            <AnimatePresence>
              {comprehensiveData && (
                <motion.div 
                  initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }}
                  className="bg-red-500/5 border border-red-500/20 rounded-2xl p-6 shadow-xl mt-8"
                >
                  <h3 className="text-xl font-baloo font-bold text-gold-bright mb-2">What's Uncertain?</h3>
                  <p className="text-cream/80 mb-6">{comprehensiveData.uncertainty}</p>
                  
                  <button className="paper-badge text-lg px-6 py-2">
                    Explore Next Simulation →
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
            
          </div>
        </div>
      )}
    </div>
  )
}
