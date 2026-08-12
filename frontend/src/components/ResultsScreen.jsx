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
        
        // ─── Step 1: Build the 12-feature trait vector (all 0–1) ───
        // Activities store values in 0–100; RF model was trained on 0–1 → divide by 100
        const traitVector = {
          R: traits.R || 0,
          I: traits.I || 0,
          A: traits.A || 0,
          S: traits.S || 0,
          E: traits.E || 0,
          C: traits.C || 0,
          numerical_reasoning: (traits.numerical_reasoning || 0) / 100,
          analytical_thinking: (traits.analytical_thinking || 0) / 100,
          creativity: (traits.creativity || 0) / 100,
          communication: (traits.communication || 0) / 100,
          risk_tolerance: (traits.risk_tolerance || 0) / 100,
          domain_exposure: (traits.domain_exposure || 0) / 100,
        }
        
        let ranked_clusters = null
        let model_version = null
        
        // ─── Step 2: Try /predict (real RF model) first ───
        try {
          const predRes = await fetch(`${API_URL}/predict`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ trait_vector: traitVector })
          })
          
          if (predRes.ok) {
            const predData = await predRes.json()
            ranked_clusters = predData.ranked_clusters
            model_version = predData.model_version
          }
        } catch (predErr) {
          console.warn('RF /predict failed, falling back to taxonomy engine:', predErr)
        }
        
        // ─── Step 3: Fallback to /recommend_careers (cold-start taxonomy) ───
        if (!ranked_clusters) {
          const profile = {
            user_id: sessionId || "anonymous",
            interests: traits.interests || { "technology": 0.5 },
            abilities: {
              numerical_reasoning: traitVector.numerical_reasoning,
              analytical_thinking: traitVector.analytical_thinking,
              creativity: traitVector.creativity,
              logical_reasoning: (traits.logical_reasoning || 0) / 100,
              spatial_reasoning: (traits.spatial_reasoning || 0) / 100,
            },
            career_values: traits.career_values || []
          }
          
          const recRes = await fetch(`${API_URL}/recommend_careers`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(profile)
          })
          
          if (!recRes.ok) {
            const errText = await recRes.text()
            throw new Error(`Failed to fetch recommendations: ${errText} (Using API: ${API_URL})`)
          }
          
          const recData = await recRes.json()
          // Reshape taxonomy output to match /predict shape
          ranked_clusters = recData.recommendations.map(r => ({
            cluster_id: r.career,
            confidence: r.compatibility / 100
          }))
          model_version = 'cold_start_v1'
        }
        
        setRecommendations(ranked_clusters)
        
        if (sessionId) {
          await saveRecommendations(sessionId, ranked_clusters, model_version)
        }

        // ─── Step 4: Get Gemini narrative via /explain ───
        try {
          const expRes = await fetch(`${API_URL}/explain`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              ranked_clusters: ranked_clusters,
              language: 'en',
              age_band: traits.age_group || '15-17',
              // Pass full numeric context so Gemini can write specific analysis
              trait_vector: {
                R: traits.R || 0,
                I: traits.I || 0,
                A: traits.A || 0,
                S: traits.S || 0,
                E: traits.E || 0,
                C: traits.C || 0,
                numerical_reasoning: (traits.numerical_reasoning || 0) / 100,
                analytical_thinking: (traits.analytical_thinking || 0) / 100,
                creativity: (traits.creativity || 0) / 100,
                communication: (traits.communication || 0) / 100,
                risk_tolerance: (traits.risk_tolerance || 0) / 100,
                domain_exposure: (traits.domain_exposure || 0) / 100,
              },
              big_five: {
                openness: traits.openness || 0,
                conscientiousness: traits.conscientiousness || 0,
                extraversion: traits.extraversion || 0,
                agreeableness: traits.agreeableness || 0,
                neuroticism: traits.neuroticism || 0,
              }
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
        setError(`${err.message}`)
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
      <p className="text-text-muted text-lg mb-12 text-center max-w-xl">A multidimensional career profile built from your cognitive performance, personality, and behavioral signals.</p>
      
      {loading && (
        <div className="flex flex-col items-center justify-center space-y-6 my-20">
          <div className="relative">
            <div className="w-20 h-20 border-4 border-green-primary/20 border-t-green-primary rounded-full animate-spin"></div>
            <div className="w-12 h-12 border-4 border-sage/20 border-t-sage rounded-full animate-spin absolute inset-0 m-auto" style={{animationDirection: 'reverse', animationDuration: '0.7s'}}></div>
          </div>
          <div className="text-center space-y-1">
            <p className="text-green-dark font-medium text-lg">Running your AI analysis...</p>
            <p className="text-text-muted text-sm">Your RandomForest model is predicting career clusters. Gemini is writing your personalized report.</p>
          </div>
        </div>
      )}
      
      {error && (
        <div className="bg-red-500/10 p-6 rounded-2xl border border-red-500/20 max-w-2xl text-center mb-8">
          <p className="text-red-600 font-medium mb-2">⚠️ {error}</p>
          <p className="text-sm text-red-500/80">Check that your VITE_API_URL in Vercel points to your Render backend (with https:// and no trailing slash). Then trigger a Manual Deploy on Render.</p>
          <p className="text-xs text-red-400/70 mt-2 font-mono">API URL being used: {import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000 (local)'}</p>
        </div>
      )}
      
      {!loading && recommendations && (
        <div className="w-full max-w-6xl space-y-10">

          {/* ── Gemini Overall Analysis Banner ── */}
          {comprehensiveData?.overall_analysis && (
            <motion.div
              initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
              className="bg-green-primary rounded-[32px] p-10 text-ivory shadow-2xl relative overflow-hidden"
            >
              <div className="absolute -right-12 -top-12 text-[200px] opacity-5 font-black leading-none select-none">✦</div>
              <p className="text-xs uppercase tracking-widest font-bold text-sage mb-4">Your AI Career Analysis</p>
              <p className="text-xl leading-relaxed font-light text-ivory/95 relative z-10">{comprehensiveData.overall_analysis}</p>
            </motion.div>
          )}

          {/* ── Main Grid ── */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">

            {/* Left: Profile Panels */}
            <div className="col-span-1 space-y-6">

              {/* RIASEC */}
              <div className="bg-soft-white rounded-[32px] p-8 shadow-xl border border-border-glass">
                <h3 className="text-xs font-bold uppercase tracking-widest text-text-muted mb-5">RIASEC Profile</h3>
                <div className="space-y-3">
                  {[['R','Realistic'],['I','Investigative'],['A','Artistic'],['S','Social'],['E','Enterprising'],['C','Conventional']].map(([key, label]) => (
                    <div key={key}>
                      <div className="flex justify-between text-sm mb-1 font-medium text-green-secondary">
                        <span>{label}</span>
                        <span>{Math.round((traits[key] || 0) * 100)}%</span>
                      </div>
                      <div className="h-1.5 bg-green-primary/10 rounded-full overflow-hidden">
                        <div className="h-full bg-green-primary transition-all duration-1000 rounded-full" style={{ width: `${Math.min((traits[key] || 0) * 100, 100)}%` }}></div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Cognitive */}
              <div className="bg-soft-white rounded-[32px] p-8 shadow-xl border border-border-glass">
                <h3 className="text-xs font-bold uppercase tracking-widest text-text-muted mb-5">Cognitive Profile</h3>
                <div className="space-y-3">
                  {[
                    ['logical_reasoning','Pattern Recognition'],
                    ['numerical_reasoning','Numerical Reasoning'],
                    ['spatial_reasoning','Spatial Reasoning'],
                    ['working_memory','Working Memory'],
                    ['processing_speed','Processing Speed'],
                    ['learning_agility','Learning Agility'],
                    ['creativity','Creativity'],
                    ['analytical_thinking','Analytical Thinking'],
                  ].map(([key, label]) => (
                    <div key={key}>
                      <div className="flex justify-between text-sm mb-1 font-medium text-green-secondary">
                        <span>{label}</span>
                        <span>{Math.round(traits[key] || 0)}%</span>
                      </div>
                      <div className="h-1.5 bg-sage/10 rounded-full overflow-hidden">
                        <div className="h-full bg-sage transition-all duration-1000 rounded-full" style={{ width: `${Math.min(traits[key] || 0, 100)}%` }}></div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Big Five */}
              {(traits.openness || traits.conscientiousness) ? (
                <div className="bg-soft-white rounded-[32px] p-8 shadow-xl border border-border-glass">
                  <h3 className="text-xs font-bold uppercase tracking-widest text-text-muted mb-5">Big Five Personality</h3>
                  <div className="space-y-3">
                    {[
                      ['openness','Openness'],
                      ['conscientiousness','Conscientiousness'],
                      ['extraversion','Extraversion'],
                      ['agreeableness','Agreeableness'],
                      ['neuroticism','Emotional Stability'],
                    ].map(([key, label]) => (
                      <div key={key}>
                        <div className="flex justify-between text-sm mb-1 font-medium text-green-secondary">
                          <span>{label}</span>
                          <span>{Math.round(traits[key] || 0)}%</span>
                        </div>
                        <div className="h-1.5 bg-green-primary/10 rounded-full overflow-hidden">
                          <div className="h-full bg-green-dark/50 transition-all duration-1000 rounded-full" style={{ width: `${Math.min(traits[key] || 0, 100)}%` }}></div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : null}

              {/* Interests */}
              {traits.interests && Object.keys(traits.interests).length > 0 && (
                <div className="bg-soft-white rounded-[32px] p-8 shadow-xl border border-border-glass">
                  <h3 className="text-xs font-bold uppercase tracking-widest text-text-muted mb-5">Interest Areas</h3>
                  <div className="flex flex-wrap gap-2">
                    {Object.keys(traits.interests).map(i => (
                      <span key={i} className="px-4 py-2 bg-sage/10 text-sage font-medium rounded-full text-sm capitalize">{i}</span>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Right: Career Recommendations */}
            <div className="col-span-1 md:col-span-2 space-y-6">
              <h3 className="text-3xl font-medium">Your strongest directions</h3>

              <div className="space-y-6">
                {recommendations.map((rec, idx) => (
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.12 }}
                    key={rec.cluster_id}
                    className={`rounded-[32px] p-8 shadow-2xl relative overflow-hidden border ${
                      idx === 0 
                        ? 'bg-green-primary text-ivory border-transparent' 
                        : 'bg-soft-white text-green-dark border-border-glass'
                    }`}
                  >
                    <div className={`absolute -right-8 -top-8 text-[120px] font-black opacity-5 select-none ${idx === 0 ? 'text-ivory' : 'text-green-primary'}`}>
                      {idx + 1}
                    </div>

                    <div className="flex justify-between items-start mb-4 relative z-10">
                      <div>
                        {idx === 0 && <span className="text-xs text-sage uppercase tracking-widest font-bold mb-2 block">Top Match</span>}
                        <h4 className={`text-2xl font-medium capitalize ${idx === 0 ? 'text-ivory' : 'text-green-dark'}`}>
                          {rec.cluster_id.replace(/_/g, ' ')}
                        </h4>
                        <p className={`text-sm mt-1 ${idx === 0 ? 'text-sage' : 'text-text-muted'}`}>ML Confidence · RandomForest rf_v2</p>
                      </div>
                      <div className={`text-4xl font-bold ${idx === 0 ? 'text-sage' : 'text-green-primary'}`}>
                        {Math.round(rec.confidence * 100)}%
                      </div>
                    </div>

                    {/* Confidence bar */}
                    <div className={`h-1.5 rounded-full overflow-hidden mb-5 relative z-10 ${idx === 0 ? 'bg-green-dark/30' : 'bg-green-primary/10'}`}>
                      <div
                        className={`h-full rounded-full transition-all duration-1000 ${idx === 0 ? 'bg-sage' : 'bg-green-primary'}`}
                        style={{ width: `${rec.confidence * 100}%` }}
                      />
                    </div>

                    {comprehensiveData?.explanations?.[rec.cluster_id] && (
                      <div className={`text-sm leading-relaxed relative z-10 ${idx === 0 ? 'text-ivory/90' : 'text-green-dark/80'}`}>
                        {comprehensiveData.explanations[rec.cluster_id]}
                      </div>
                    )}
                  </motion.div>
                ))}
              </div>

              {/* Uncertainty / Next Steps */}
              {comprehensiveData?.uncertainty && (
                <motion.div
                  initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.6 }}
                  className="bg-sage/10 border border-sage/25 rounded-[24px] p-8 mt-4"
                >
                  <h3 className="text-xs font-bold uppercase tracking-widest text-sage mb-3">What We Cannot Yet Determine</h3>
                  <p className="text-green-dark/80 leading-relaxed text-sm">{comprehensiveData.uncertainty}</p>
                </motion.div>
              )}

              {/* Share / Download CTA */}
              <motion.div
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.8 }}
                className="bg-soft-white border border-border-glass rounded-[24px] p-8 text-center"
              >
                <p className="text-text-muted text-sm mb-4">Want to save or share your Pehchaan report?</p>
                <div className="flex gap-4 justify-center">
                  <button
                    onClick={() => window.print()}
                    className="px-8 py-3 bg-green-primary text-ivory rounded-full font-medium hover:bg-green-dark transition-colors text-sm"
                  >
                    Save as PDF
                  </button>
                  <button
                    onClick={() => window.location.href = '/start'}
                    className="px-8 py-3 border border-border-glass text-green-secondary rounded-full font-medium hover:bg-green-primary/5 transition-colors text-sm"
                  >
                    Retake Assessment
                  </button>
                </div>
              </motion.div>

            </div>
          </div>
        </div>
      )}
    </div>
  )
}
