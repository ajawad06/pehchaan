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
        const rawUrl = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000';
        const API_URL = rawUrl.endsWith('/') ? rawUrl.slice(0, -1) : rawUrl;
        
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
        
        if (!recResponse.ok) {
          const errText = await recResponse.text()
          throw new Error(`Failed to fetch recommendations: ${errText}`)
        }
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
        setError(`${err.message} (Using API: ${import.meta.env.VITE_API_URL || 'Localhost'})`)
      } finally {
        setLoading(false)
      }
    }
    
    fetchResults()
  }, [traits, sessionId])

  return (
    <div className="flex flex-col items-center p-8 min-h-screen bg-ivory text-green-dark relative overflow-y-auto">
      <div className="absolute top-6 left-6">
        <button onClick={() => window.location.href='/'} className="text-green-secondary hover:text-green-dark font-medium flex items-center gap-2">
          ← Back to Home
        </button>
      </div>

      <h1 className="text-5xl font-medium tracking-tight mb-2 text-center mt-8">Your Pehchaan</h1>
      <p className="text-text-muted text-lg mb-12 text-center">Based on your interests, performance, and behavioral patterns.</p>
      
      {loading && (
        <div className="flex flex-col items-center justify-center space-y-4 my-20">
          <div className="w-16 h-16 border-4 border-green-primary border-t-transparent rounded-full animate-spin"></div>
          <p className="text-green-secondary animate-pulse font-medium">Running behavioral analysis via AI...</p>
        </div>
      )}
      
      {error && (
        <div className="bg-red-500/10 p-6 rounded-2xl border border-red-500/20 max-w-2xl text-center mb-8">
          <p className="text-red-600 font-medium mb-2">{error}</p>
          <p className="text-sm text-red-500/80">Make sure your VITE_API_URL in Vercel is correct and pointing to your Render backend with https://</p>
        </div>
      )}
      
      {!loading && recommendations && (
        <div className="w-full max-w-5xl grid grid-cols-1 md:grid-cols-3 gap-8">
          
          {/* Left Column: Strengths & Interests */}
          <div className="col-span-1 space-y-6">
            <div className="bg-soft-white rounded-[32px] p-8 shadow-xl border border-border-glass">
              <h3 className="text-xl font-medium mb-6">Measured Strengths</h3>
              <div className="space-y-4">
                {Object.entries(traits).filter(([k,v]) => typeof v === 'number' && k !== 'decisiveness').map(([key, val]) => (
                  <div key={key}>
                    <div className="flex justify-between text-sm mb-2 font-medium capitalize text-green-secondary">
                      <span>{key.replace('_', ' ')}</span>
                      <span>{Math.round(val)}%</span>
                    </div>
                    <div className="h-2 bg-green-primary/10 rounded-full overflow-hidden">
                      <div className="h-full bg-green-primary transition-all duration-1000" style={{ width: `${Math.min(val, 100)}%` }}></div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {traits.interests && (
              <div className="bg-soft-white rounded-[32px] p-8 shadow-xl border border-border-glass">
                <h3 className="text-xl font-medium mb-6">Interest Prior</h3>
                <div className="flex flex-wrap gap-2">
                  {Object.keys(traits.interests).map(i => (
                    <span key={i} className="px-4 py-2 bg-sage/10 text-sage font-medium rounded-full text-sm capitalize">{i}</span>
                  ))}
                </div>
              </div>
            )}
          </div>
          
          {/* Right Column: Career Fits */}
          <div className="col-span-1 md:col-span-2 space-y-6">
            <AnimatePresence>
              {comprehensiveData && (
                <motion.div 
                  initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                  className="bg-green-primary/5 border border-green-primary/10 rounded-2xl p-6 shadow-sm"
                >
                  <p className="text-green-dark text-lg leading-relaxed font-medium">✨ {comprehensiveData.overall_summary}</p>
                </motion.div>
              )}
            </AnimatePresence>

            <h3 className="text-3xl font-medium mb-6">Your strongest directions</h3>
            
            <div className="space-y-6">
              {recommendations.map((rec, idx) => (
                <motion.div 
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.1 }}
                  key={rec.career} 
                  className="bg-green-primary text-ivory rounded-[32px] p-8 shadow-2xl relative overflow-hidden"
                >
                  <div className="absolute -right-10 -top-10 text-8xl opacity-5 font-bold">0{idx + 1}</div>
                  
                  <div className="flex justify-between items-start mb-6 relative z-10">
                    <div>
                      <h4 className="text-2xl font-medium">{rec.career}</h4>
                      <p className="text-sage mt-1">Potential Fit</p>
                    </div>
                    <div className="text-3xl font-medium text-sage">{rec.compatibility}%</div>
                  </div>
                  
                  {comprehensiveData?.explanations?.[rec.career] && (
                    <div className="text-ivory/90 text-sm leading-relaxed mb-6 font-light relative z-10">
                      <strong className="text-sage font-medium">Why?</strong> {comprehensiveData.explanations[rec.career]}
                    </div>
                  )}

                  <div className="space-y-4 relative z-10">
                    <div className="h-2 bg-green-dark rounded-full overflow-hidden">
                      <div className="h-full bg-ivory transition-all duration-1000" style={{ width: `${rec.compatibility}%` }}></div>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>

            {/* Uncertainty & Next Steps */}
            <AnimatePresence>
              {comprehensiveData && (
                <motion.div 
                  initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }}
                  className="bg-sage/10 border border-sage/20 rounded-2xl p-8 shadow-sm mt-8"
                >
                  <h3 className="text-xl font-medium text-green-secondary mb-2 uppercase tracking-widest text-sm">What's Uncertain?</h3>
                  <p className="text-green-dark/80 mb-6 leading-relaxed font-light">{comprehensiveData.uncertainty}</p>
                </motion.div>
              )}
            </AnimatePresence>
            
          </div>
        </div>
      )}
    </div>
  )
}
