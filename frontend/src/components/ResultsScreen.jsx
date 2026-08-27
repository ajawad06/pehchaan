import { useState, useEffect } from 'react'
import { useSession } from '../store/SessionContext'
import { saveRecommendations } from '../services/db'
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion'
import confetti from 'canvas-confetti'
import { ArrowLeft, AlertTriangle, Sparkles, Compass } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { detectTier2Cluster } from './Tier2Disambiguation'

export default function ResultsScreen() {
  const { traits, sessionId } = useSession()
  const navigate = useNavigate()
  const [recommendations, setRecommendations] = useState(null)
  const [comprehensiveData, setComprehensiveData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const reduceMotion = useReducedMotion()

  // Real milestone celebration: full confetti burst fires once, the moment
  // results actually finish loading. Governing principle 4 reserves this
  // for genuine milestones — this is the biggest one in the whole app.
  useEffect(() => {
    if (!loading && recommendations && !reduceMotion) {
      confetti({
        particleCount: 120,
        spread: 90,
        startVelocity: 45,
        origin: { y: 0.4 },
        colors: ['#F2C9CE', '#FBE4E7', '#F5F2E8', '#2F6844'],
      })
    }
  }, [loading, recommendations, reduceMotion])

  useEffect(() => {
    async function fetchResults() {
      try {
        const rawUrl = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000';
        const API_URL = rawUrl.endsWith('/') ? rawUrl.slice(0, -1) : rawUrl;
        
        // ─── Step 1: Build the 12-feature trait vector (all 0–1) ───
        // Activities store values in 0–100; the taxonomy engine works in 0–1 → divide by 100
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
        
        // ─── Step 2: Rank via /rank ───
        // One call. The backend scores all 21 careers with the deterministic
        // O*NET taxonomy, then has the LLM re-rank that shortlist in context.
        // If the LLM is unavailable it returns the taxonomy order instead, so
        // this never needs a fallback branch on the client.
        const rankRes = await fetch(`${API_URL}/rank`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            trait_vector: traitVector,
            abilities: {
              numerical_reasoning: traitVector.numerical_reasoning,
              analytical_thinking: traitVector.analytical_thinking,
              creativity: traitVector.creativity,
              communication: traitVector.communication,
              logical_reasoning: (traits.logical_reasoning || 0) / 100,
              spatial_reasoning: (traits.spatial_reasoning || 0) / 100,
              memory: (traits.working_memory || 0) / 100,
              attention_to_detail: (traits.attention_to_detail || 0) / 100,
              learning_agility: (traits.learning_agility || 0) / 100,
              persistence: (traits.persistence || 0) / 100,
              empathy: (traits.empathy || 0) / 100,
              verbal_reasoning: (traits.verbal_reasoning || 0) / 100,
              leadership: (traits.leadership || 0) / 100,
            },
            interests: traits.interests || {},
            career_values: traits.career_values || [],
            age_band: traits.age_group || '16-17',
          })
        })

        if (!rankRes.ok) {
          const errText = await rankRes.text()
          throw new Error(`Failed to fetch recommendations: ${errText} (Using API: ${API_URL})`)
        }

        const rankData = await rankRes.json()
        const ranked_clusters = rankData.ranked_clusters
        const model_version = rankData.model_version

        setRecommendations(ranked_clusters)
        
        if (sessionId) {
          await saveRecommendations(sessionId, ranked_clusters, model_version)
        }

        // ─── Step 3: Narrative prose via /explain ───
        try {
          const expRes = await fetch(`${API_URL}/explain`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              ranked_clusters: ranked_clusters,
              language: 'en',
              age_band: traits.age_group || '15-17',
              // Pass full numeric context so the LLM can write specific analysis
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
    <div className="flex flex-col items-center p-4 sm:p-8 min-h-screen bg-ivory text-green-dark relative overflow-y-auto">
      <div className="absolute top-4 left-4 sm:top-6 sm:left-6">
        <button onClick={() => window.location.href='/'} className="text-green-secondary hover:text-green-dark font-semibold flex items-center gap-1.5 sm:gap-2 bg-white/60 rounded-pill px-3 py-1.5 sm:px-4 sm:py-2 shadow-cushion-sm hover:shadow-cushion transition-shadow text-sm sm:text-base">
          <ArrowLeft size={16} className="shrink-0" /> Back
        </button>
      </div>

      <h1 className="font-playful text-3xl sm:text-5xl font-extrabold tracking-tight mb-2 text-center mt-16 sm:mt-8 px-2">Your Pehchaan</h1>
      <p className="text-text-muted text-sm sm:text-lg mb-8 sm:mb-12 text-center max-w-xl font-light px-4">A multidimensional career profile built from your cognitive performance, personality, and behavioral signals.</p>
      
      {loading && (
        <div className="flex flex-col items-center justify-center space-y-6 my-20">
          {/* Loading: three bouncing dots per DESIGN SYSTEM, never a flat spinner */}
          <div className="flex items-center gap-2">
            {[0, 1, 2].map((i) => (
              <span
                key={i}
                className={`w-4 h-4 rounded-full bg-blush ${reduceMotion ? '' : 'animate-dot-bounce'}`}
                style={{ animationDelay: `${i * 0.15}s` }}
              />
            ))}
          </div>
          <div className="text-center space-y-1 px-4">
            <p className="text-green-dark font-semibold text-lg">Running your AI analysis...</p>
            <p className="text-text-muted text-sm font-light">Matching your profile against 21 career paths, then writing up what the evidence shows.</p>
          </div>
        </div>
      )}
      
      {error && (
        <div className="bg-red-500/10 p-4 sm:p-6 rounded-card border border-red-500/20 max-w-2xl text-center mb-8 mx-4">
          <p className="text-red-600 font-semibold mb-2 flex items-center justify-center gap-1.5 break-words"><AlertTriangle size={18} className="shrink-0" /> {error}</p>
          <p className="text-sm text-red-500/80 break-words">Check that your VITE_API_URL in Vercel points to your Render backend (with https:// and no trailing slash). Then trigger a Manual Deploy on Render.</p>
          <p className="text-xs text-red-400/70 mt-2 font-mono break-all">API URL being used: {import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000 (local)'}</p>
        </div>
      )}
      
      {!loading && recommendations && (
        <motion.div
          initial={reduceMotion ? {} : { opacity: 0, y: 16 }}
          animate={reduceMotion ? {} : { opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
          className="w-full max-w-6xl space-y-10"
        >

          {/* ── Overall Analysis Banner ── */}
          {comprehensiveData?.overall_analysis && (
            <motion.div
              initial={reduceMotion ? {} : { opacity: 0, y: -10 }} animate={reduceMotion ? {} : { opacity: 1, y: 0 }}
              className="bg-green-primary rounded-card-lg p-6 sm:p-10 text-ivory shadow-cushion relative overflow-hidden"
            >
              <div className="absolute -right-12 -top-12 text-[120px] sm:text-[200px] opacity-5 font-black leading-none select-none">✦</div>
              <p className="text-xs uppercase tracking-widest font-bold text-sage mb-4">Your AI Career Analysis</p>
              <p className="text-base sm:text-xl leading-relaxed font-light text-ivory/95 relative z-10 break-words">{comprehensiveData.overall_analysis}</p>
            </motion.div>
          )}

          {/* ── Main Grid ── */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 sm:gap-8">

            {/* Left: Profile Panels */}
            <div className="col-span-1 space-y-6">

              {/* RIASEC */}
              <div className="bg-soft-white rounded-card-lg p-5 sm:p-8 shadow-cushion border border-border-glass">
                <h3 className="text-xs font-bold uppercase tracking-widest text-text-muted mb-5">RIASEC Profile</h3>
                <div className="space-y-3">
                  {[['R','Realistic'],['I','Investigative'],['A','Artistic'],['S','Social'],['E','Enterprising'],['C','Conventional']].map(([key, label]) => (
                    <div key={key}>
                      <div className="flex justify-between text-sm mb-1 font-medium text-green-secondary">
                        <span>{label}</span>
                        <span>{Math.round((traits[key] || 0) * 100)}%</span>
                      </div>
                      <div className="h-1.5 bg-green-primary/10 rounded-pill overflow-hidden">
                        <motion.div
                          className="h-full bg-green-primary rounded-pill"
                          initial={{ width: 0 }}
                          animate={{ width: `${Math.min((traits[key] || 0) * 100, 100)}%` }}
                          transition={{ duration: 1, ease: [0.22, 1, 0.36, 1] }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Cognitive */}
              <div className="bg-soft-white rounded-card-lg p-5 sm:p-8 shadow-cushion border border-border-glass">
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
                      <div className="h-1.5 bg-sage/10 rounded-pill overflow-hidden">
                        <motion.div
                          className="h-full bg-sage rounded-pill"
                          initial={{ width: 0 }}
                          animate={{ width: `${Math.min(traits[key] || 0, 100)}%` }}
                          transition={{ duration: 1, ease: [0.22, 1, 0.36, 1] }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Big Five */}
              {(traits.openness || traits.conscientiousness) ? (
                <div className="bg-soft-white rounded-card-lg p-5 sm:p-8 shadow-cushion border border-border-glass">
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
                        <div className="h-1.5 bg-green-primary/10 rounded-pill overflow-hidden">
                          <motion.div
                            className="h-full bg-green-dark/50 rounded-pill"
                            initial={{ width: 0 }}
                            animate={{ width: `${Math.min(traits[key] || 0, 100)}%` }}
                            transition={{ duration: 1, ease: [0.22, 1, 0.36, 1] }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : null}

              {/* Interests */}
              {traits.interests && Object.keys(traits.interests).length > 0 && (
                <div className="bg-soft-white rounded-card-lg p-5 sm:p-8 shadow-cushion border border-border-glass">
                  <h3 className="text-xs font-bold uppercase tracking-widest text-text-muted mb-5">Interest Areas</h3>
                  <div className="flex flex-wrap gap-2">
                    {Object.keys(traits.interests).map(i => (
                      <span key={i} className="px-4 py-2 bg-sage/10 text-sage font-semibold rounded-pill text-sm capitalize">{i}</span>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Right: Career Recommendations */}
            <div className="col-span-1 md:col-span-2 space-y-6">
              <h3 className="font-playful text-3xl font-extrabold">Your strongest directions</h3>

              <div className="space-y-6">
                {recommendations.map((rec, idx) => (
                  <motion.div
                    initial={reduceMotion ? {} : { opacity: 0, y: 24, scale: 0.97 }}
                    animate={reduceMotion ? {} : { opacity: 1, y: 0, scale: 1 }}
                    transition={{ delay: idx * 0.12, duration: 0.5, ease: [0.34, 1.56, 0.64, 1] }}
                    key={rec.cluster_id}
                    className={`rounded-card-lg p-5 sm:p-8 shadow-cushion relative overflow-hidden border ${
                      idx === 0 
                        ? 'bg-green-primary text-ivory border-transparent' 
                        : 'bg-soft-white text-green-dark border-border-glass'
                    }`}
                  >
                    <div className={`absolute -right-8 -top-8 text-[80px] sm:text-[120px] font-black opacity-5 select-none ${idx === 0 ? 'text-ivory' : 'text-green-primary'}`}>
                      {idx + 1}
                    </div>

                    <div className="flex flex-wrap gap-3 justify-between items-start mb-4 relative z-10">
                      <div className="min-w-0 flex-1">
                        {idx === 0 && (
                          <span className="text-xs text-blush uppercase tracking-widest font-bold mb-2 flex items-center gap-1.5">
                            <Sparkles size={13} className="shrink-0" /> Top Match
                          </span>
                        )}
                        <h4 className={`text-lg sm:text-2xl font-semibold capitalize break-words ${idx === 0 ? 'text-ivory' : 'text-green-dark'}`}>
                          {rec.cluster_id.replace(/_/g, ' ')}
                        </h4>
                        <p className={`text-xs sm:text-sm mt-1 ${idx === 0 ? 'text-sage' : 'text-text-muted'}`}>O*NET match + AI review</p>
                      </div>
                      <div className={`text-2xl sm:text-4xl font-bold shrink-0 ${idx === 0 ? 'text-blush' : 'text-green-primary'}`}>
                        {Math.round(rec.confidence * 100)}%
                      </div>
                    </div>

                    {/* Confidence bar — liquid-pour fill */}
                    <div className={`h-1.5 rounded-pill overflow-hidden mb-5 relative z-10 ${idx === 0 ? 'bg-green-dark/30' : 'bg-green-primary/10'}`}>
                      <motion.div
                        className={`h-full rounded-pill ${idx === 0 ? 'bg-blush' : 'bg-green-primary'}`}
                        initial={{ width: 0 }}
                        animate={{ width: `${rec.confidence * 100}%` }}
                        transition={{ duration: 1.1, delay: idx * 0.12 + 0.2, ease: [0.22, 1, 0.36, 1] }}
                      />
                    </div>

                    {/* Why this career landed here — the one-line judgement
                        from the re-ranking step, tied to the student's own
                        evidence rather than generic prose. */}
                    {rec.reasoning && (
                      <p className={`text-sm leading-relaxed relative z-10 font-medium mb-3 ${idx === 0 ? 'text-ivory' : 'text-green-dark'}`}>
                        {rec.reasoning}
                      </p>
                    )}

                    {comprehensiveData?.explanations?.[rec.cluster_id] && (
                      <div className={`text-sm leading-relaxed relative z-10 font-light ${idx === 0 ? 'text-ivory/90' : 'text-green-dark/80'}`}>
                        {comprehensiveData.explanations[rec.cluster_id]}
                      </div>
                    )}
                  </motion.div>
                ))}
              </div>

              {/* Uncertainty / Next Steps */}
              {comprehensiveData?.uncertainty && (
                <motion.div
                  initial={reduceMotion ? {} : { opacity: 0 }} animate={reduceMotion ? {} : { opacity: 1 }} transition={{ delay: 0.6 }}
                  className="bg-sage/10 border border-sage/25 rounded-card p-8 mt-4"
                >
                  <h3 className="text-xs font-bold uppercase tracking-widest text-sage mb-3">What We Cannot Yet Determine</h3>
                  <p className="text-green-dark/80 leading-relaxed text-sm font-light">{comprehensiveData.uncertainty}</p>
                </motion.div>
              )}

              {/* Tier 2 refinement — offered only when the top careers all sit
                  inside one cluster, so the ranking needs sharper separation. */}
              {(() => {
                const tier2Cluster = detectTier2Cluster(recommendations)
                if (!tier2Cluster || traits?.tier2_completed) return null
                return (
                  <motion.div
                    initial={reduceMotion ? {} : { opacity: 0 }} animate={reduceMotion ? {} : { opacity: 1 }} transition={{ delay: 0.7 }}
                    className="bg-soft-white border border-border-glass rounded-card p-8 text-center"
                  >
                    <div className="flex justify-center mb-4">
                      <span className="grid place-items-center w-14 h-14 rounded-card bg-green-primary/10 text-green-primary">
                        <Compass size={28} />
                      </span>
                    </div>
                    <h3 className="font-playful text-xl font-extrabold tracking-tight mb-2">Your top careers are close together</h3>
                    <p className="text-text-muted text-sm mb-6 font-light max-w-md mx-auto">
                      They all sit inside the same field, so the ranking between them is still soft.
                      Three quick questions will sharpen the separation.
                    </p>
                    <motion.button
                      onClick={() => navigate(`/tier2-disambiguation?cluster=${tier2Cluster}`)}
                      whileTap={reduceMotion ? {} : { scale: [1, 0.92, 1.03, 1] }}
                      transition={{ duration: 0.35, ease: [0.34, 1.56, 0.64, 1] }}
                      className="px-8 py-3 bg-green-primary text-ivory rounded-pill font-semibold hover:bg-green-dark transition-colors text-sm shadow-cushion-sm"
                    >
                      Refine My Results
                    </motion.button>
                  </motion.div>
                )
              })()}

              {/* Share / Download CTA */}
              <motion.div
                initial={reduceMotion ? {} : { opacity: 0 }} animate={reduceMotion ? {} : { opacity: 1 }} transition={{ delay: 0.8 }}
                className="bg-soft-white border border-border-glass rounded-card p-8 text-center"
              >
                <p className="text-text-muted text-sm mb-4 font-light">Want to save or share your Pehchaan report?</p>
                <div className="flex gap-4 justify-center">
                  <motion.button
                    onClick={() => window.print()}
                    whileTap={reduceMotion ? {} : { scale: [1, 0.92, 1.03, 1] }}
                    transition={{ duration: 0.35, ease: [0.34, 1.56, 0.64, 1] }}
                    className="px-8 py-3 bg-green-primary text-ivory rounded-pill font-semibold hover:bg-green-dark transition-colors text-sm shadow-cushion-sm"
                  >
                    Save as PDF
                  </motion.button>
                  <motion.button
                    onClick={() => window.location.href = '/start'}
                    whileTap={reduceMotion ? {} : { scale: [1, 0.92, 1.03, 1] }}
                    transition={{ duration: 0.35, ease: [0.34, 1.56, 0.64, 1] }}
                    className="px-8 py-3 border border-border-glass text-green-secondary rounded-pill font-semibold hover:bg-green-primary/5 transition-colors text-sm"
                  >
                    Retake Assessment
                  </motion.button>
                </div>
              </motion.div>

            </div>
          </div>
        </motion.div>
      )}
    </div>
  )
}
