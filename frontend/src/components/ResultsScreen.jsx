import { useState, useEffect } from 'react'
import PixelIcon from './PixelIcon'
import { useSession } from '../store/SessionContext'
import { saveRecommendations } from '../services/db'
import { motion, AnimatePresence } from 'framer-motion'
import { useNavigate, useLocation } from 'react-router-dom'
import { detectTier2Cluster } from './Tier2Disambiguation'
import BackButton from './BackButton'

// All skills used anywhere in the taxonomy — used to build the abilities object
// from traits without a hardcoded shortlist.
const ALL_TAXONOMY_SKILLS = [
  'numerical_reasoning', 'analytical_thinking', 'creativity', 'logical_reasoning',
  'spatial_reasoning', 'empathy', 'memory', 'persistence', 'pattern_recognition',
  'verbal_reasoning', 'aesthetic_judgment', 'communication', 'risk_tolerance',
  'leadership', 'planning', 'systems_thinking', 'abstract_reasoning',
  'adversarial_thinking', 'attention_to_detail', 'decision_making', 'learning_agility',
  'working_memory', 'processing_speed',
]

// Domain cluster map — which careers belong to which recognizable cluster.
// Used to build the comparison block when careers in the same cluster are close.
const DOMAIN_CLUSTERS = {
  technology: ['Software Engineering', 'Computer Science / Research', 'Data Science', 'Artificial Intelligence / ML', 'Cybersecurity'],
  medicine:   ['Medicine (MBBS)', 'Pharmacy', 'Nursing / Allied Health'],
  business:   ['Business Administration', 'Chartered Accountancy / Finance', 'Entrepreneurship', 'Civil Service (CSS)'],
  law:        ['Law (LLB)', 'Civil Service (CSS)'],
  engineering: ['Civil Engineering', 'Electrical / Mechanical Engineering'],
  arts:       ['Architecture', 'UX/UI Design', 'Visual & Fine Arts', 'Creative Writing / Journalism / Media'],
}

// Key distinguishing traits per career (shown in comparison block)
const CAREER_DISTINGUISHERS = {
  'Software Engineering':           'systems_thinking · logical_reasoning · persistence',
  'Computer Science / Research':    'abstract_reasoning · logical_reasoning · numerical_reasoning',
  'Data Science':                   'numerical_reasoning · pattern_recognition · analytical_thinking',
  'Artificial Intelligence / ML':   'pattern_recognition · analytical_thinking · numerical_reasoning',
  'Cybersecurity':                  'adversarial_thinking · attention_to_detail · persistence',
  'Medicine (MBBS)':                'memory · empathy · persistence',
  'Pharmacy':                       'memory · attention_to_detail · numerical_reasoning',
  'Nursing / Allied Health':        'empathy · persistence · attention_to_detail',
  'Civil Engineering':              'spatial_reasoning · numerical_reasoning · planning',
  'Electrical / Mechanical Engineering': 'logical_reasoning · numerical_reasoning · spatial_reasoning',
  'Law (LLB)':                      'verbal_reasoning · logical_reasoning · communication',
  'Civil Service (CSS)':            'verbal_reasoning · planning · leadership',
  'Business Administration':        'leadership · communication · risk_tolerance',
  'Chartered Accountancy / Finance':'numerical_reasoning · attention_to_detail · persistence',
  'Entrepreneurship':               'risk_tolerance · creativity · leadership',
  'Architecture':                   'spatial_reasoning · creativity · logical_reasoning',
  'UX/UI Design':                   'creativity · empathy · pattern_recognition',
  'Visual & Fine Arts':             'creativity · aesthetic_judgment',
  'Creative Writing / Journalism / Media': 'verbal_reasoning · creativity · communication',
  'Teaching / Education':           'communication · empathy · persistence',
  'Psychology':                     'empathy · analytical_thinking · communication',
  'Scientific Research':            'numerical_reasoning · analytical_thinking · persistence',
  'Languages / Linguistics':        'verbal_reasoning · analytical_thinking · communication',
}

export default function ResultsScreen() {
  const { traits, sessionId } = useSession()
  const navigate = useNavigate()
  const location = useLocation()
  const isRefined = location.state?.refined === true

  const [recommendations, setRecommendations] = useState(null)
  const [comprehensiveData, setComprehensiveData] = useState(null)
  const [allResults, setAllResults] = useState([])
  const [modelVersion, setModelVersion] = useState('taxonomy_v2')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [suggestedCluster, setSuggestedCluster] = useState(null)

  useEffect(() => {
    async function fetchResults() {
      try {
        const rawUrl = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000';
        const API_URL = rawUrl.endsWith('/') ? rawUrl.slice(0, -1) : rawUrl;
        
        // ─── Build the RF trait vector (0–1 normalized) ───────────────────────
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

        // ─── Build full abilities map from ALL measured traits ─────────────────
        // Normalise: scores >1 were stored as 0-100 → divide by 100
        const abilities = {}
        ALL_TAXONOMY_SKILLS.forEach(skill => {
          const raw = traits[skill]
          if (raw !== undefined && raw !== null) {
            abilities[skill] = raw > 1.0 ? raw / 100 : raw
          }
        })

        // Include measured RIASEC vector \u2014 triggers O*NET cosine-similarity path
        // in the backend instead of legacy tag-matching
        const riasecVector = {
          R: traits.R || 0,
          I: traits.I || 0,
          A: traits.A || 0,
          S: traits.S || 0,
          E: traits.E || 0,
          C: traits.C || 0,
        }
        const hasRiasec = Object.values(riasecVector).some(v => v > 0)

        const userProfile = {
          user_id: sessionId || 'anonymous',
          interests: traits.interests || {},
          abilities,
          career_values: traits.career_values || [],
          riasec: hasRiasec ? riasecVector : undefined,
        }

        // ─── Run BOTH engines in parallel ─────────────────────────────────────
        // We always need the taxonomy result (a) for the interest-gated suppression
        // logic and (b) to populate the domain comparison block.
        // The RF model is kept as a secondary signal but its career labels are
        // from an old training run — the taxonomy is primary when interests exist.
        const [rfResult, taxResult] = await Promise.allSettled([
          // RF model
          fetch(`${API_URL}/predict`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ trait_vector: traitVector }),
          }).then(r => r.ok ? r.json() : Promise.reject('rf_not_ok')),

          // Taxonomy engine (always runs — not a fallback)
          fetch(`${API_URL}/recommend_careers`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(userProfile),
          }).then(r => r.ok ? r.json() : Promise.reject('tax_not_ok')),
        ])

        const hasInterests = Object.keys(traits.interests || {}).length > 0
        let ranked_clusters = null
        let model_version = null

        // ─── Decision: which engine wins? ─────────────────────────────────────
        // Taxonomy wins when the user has declared interests, because:
        //   1. The interest suppression gate (interest_match < 0.15 → ×0.15) only
        //      lives in the taxonomy engine — the RF model ignores interests entirely.
        //   2. The RF model was trained on old career labels that don't match our
        //      22-career Pakistan taxonomy, so its cluster_ids are stale.
        // RF model only wins as a tiebreaker when no interests were declared.

        if (taxResult.status === 'fulfilled') {
          const fullList = taxResult.value.recommendations.map(r => ({
            cluster_id: r.career,
            confidence: r.compatibility / 100,
          }))
          setAllResults(fullList)

          // ─── Tier 2: detect if top 3 are all the same domain ──────────────
          if (!isRefined && !traits.tier2_completed) {
            const cluster = detectTier2Cluster(fullList.slice(0, 5))
            if (cluster) setSuggestedCluster(cluster)
          }

          if (hasInterests || rfResult.status === 'rejected') {
            ranked_clusters = fullList.slice(0, 5)
            model_version = 'taxonomy_v2'
          }
        }

        // RF model supplements when taxonomy didn't run or no interests declared
        if (!ranked_clusters && rfResult.status === 'fulfilled') {
          ranked_clusters = rfResult.value.ranked_clusters
          model_version = rfResult.value.model_version
        }

        // Last-resort: taxonomy without the interest gate
        if (!ranked_clusters && taxResult.status === 'fulfilled') {
          ranked_clusters = taxResult.value.recommendations
            .map(r => ({ cluster_id: r.career, confidence: r.compatibility / 100 }))
            .slice(0, 5)
          model_version = 'taxonomy_v2'
        }

        if (!ranked_clusters) {
          throw new Error(`Both recommendation engines failed. Check backend is running at ${API_URL}`)
        }

        
        setRecommendations(ranked_clusters)
        setModelVersion(model_version || 'taxonomy_v2')
        
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

  // ─── Domain Comparison Block helpers ───────────────────────────────────────
  // Determines which domain cluster the top result belongs to, then gathers
  // all careers from that cluster that appear in allResults (full ranked list).
  function getDomainComparison(topCareer, fullList) {
    for (const [domain, careers] of Object.entries(DOMAIN_CLUSTERS)) {
      if (careers.includes(topCareer)) {
        const clusterEntries = fullList
          .filter(r => careers.includes(r.cluster_id))
          .sort((a, b) => b.confidence - a.confidence)
        return { domain, clusterEntries }
      }
    }
    return null
  }

  const domainComparison = recommendations && allResults.length > 0
    ? getDomainComparison(recommendations[0]?.cluster_id, allResults)
    : null



  return (
    <div className="flex flex-col items-center p-8 pt-20 min-h-screen bg-ivory text-green-dark relative overflow-y-auto">
      <BackButton />

      <h1 className="text-5xl font-medium tracking-tight mb-2 text-center">
        Your Pehchaan
        {isRefined && (
          <span className="ml-3 text-base font-semibold text-green-primary align-middle bg-green-primary/10 px-3 py-1 rounded-full">
            ✓ Refined
          </span>
        )}
      </h1>
      <p className="text-text-muted text-lg mb-12 text-center max-w-xl">A multidimensional career profile built from your cognitive performance, personality, and behavioral signals.</p>
      
      {/* ─── Tier 2 Refinement CTA ──────────────────────────────────────── */}
      {!loading && !error && suggestedCluster && !isRefined && (
        <motion.div
          initial={{ opacity: 0, y: -12 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-2xl mb-8 bg-green-primary/8 border border-green-primary/25 rounded-[24px] p-6 flex items-start gap-5"
        >
          <div className="text-3xl mt-0.5"><PixelIcon name="target" size={30} /></div>
          <div className="flex-1">
            <p className="font-semibold text-green-dark mb-1">
              Your top matches are all in the same field — can we narrow it down?
            </p>
            <p className="text-sm text-text-muted mb-4">
              3 quick questions will separate{' '}
              <span className="font-medium text-green-dark capitalize">{suggestedCluster.replace('_', ' ')}</span>{' '}
              careers by the specific traits that actually distinguish them. Takes under 2 minutes.
            </p>
            <button
              onClick={() => navigate(`/tier2-disambiguation?cluster=${suggestedCluster}`)}
              className="px-6 py-2.5 bg-green-primary text-ivory font-medium rounded-full hover:bg-green-dark transition-colors text-sm shadow-md"
            >
              Refine my results →
            </button>
          </div>
          <button
            onClick={() => setSuggestedCluster(null)}
            className="text-text-muted hover:text-green-dark text-lg leading-none mt-0.5"
            aria-label="Dismiss"
          ><PixelIcon name="cross" size={22} /></button>
        </motion.div>
      )}

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
          <p className="text-red-600 font-medium mb-2">{error}</p>
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
              <div className="absolute -right-12 -top-12 opacity-5 select-none"><PixelIcon name="spark" size={180} /></div>
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
                  ].map(([key, label]) => {
                    // Normalize: values > 1 are already 0-100, values <= 1.0 multiply by 100
                    const raw = traits[key] || 0
                    const displayVal = raw > 1.0 ? Math.round(raw) : Math.round(raw * 100)
                    return (
                    <div key={key}>
                      <div className="flex justify-between text-sm mb-1 font-medium text-green-secondary">
                        <span>{label}</span>
                        <span>{displayVal}%</span>
                      </div>
                      <div className="h-1.5 bg-sage/10 rounded-full overflow-hidden">
                        <div className="h-full bg-sage transition-all duration-1000 rounded-full" style={{ width: `${Math.min(displayVal, 100)}%` }}></div>
                      </div>
                    </div>
                    )
                  })}
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
                        <p className={`text-sm mt-1 ${idx === 0 ? 'text-sage' : 'text-text-muted'}`}>
                          {modelVersion === 'taxonomy_v2' ? 'Interest-Gated Taxonomy v2' : `ML Confidence · RandomForest ${modelVersion}`}
                        </p>
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

              {/* ── Domain Sub-specialization Comparison Block ── */}
              {domainComparison && domainComparison.clusterEntries.length > 1 && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.55 }}
                  className="bg-soft-white border border-border-glass rounded-[28px] p-8 mt-2"
                >
                  <div className="flex items-center gap-3 mb-6">
                    <div className="w-2 h-8 bg-green-primary rounded-full" />
                    <div>
                      <p className="text-xs uppercase tracking-widest font-bold text-text-muted">Domain Breakdown</p>
                      <h3 className="text-xl font-medium text-green-dark capitalize">
                        All paths within {domainComparison.domain} — ranked for you
                      </h3>
                    </div>
                  </div>
                  <p className="text-sm text-text-muted mb-6 leading-relaxed">
                    These paths belong to the same broad field. Here's how your profile scores on each — so you can see <em>why</em> one ranks above another for you specifically.
                  </p>

                  <div className="space-y-5">
                    {domainComparison.clusterEntries.map((entry, i) => {
                      const pct = Math.round(entry.confidence * 100)
                      const maxPct = Math.round(domainComparison.clusterEntries[0].confidence * 100)
                      const barWidth = maxPct > 0 ? (pct / maxPct) * 100 : 0
                      return (
                        <div key={entry.cluster_id}>
                          <div className="flex justify-between items-baseline mb-1">
                            <span className={`text-sm font-semibold ${i === 0 ? 'text-green-primary' : 'text-green-dark'}`}>
                              {i === 0 && <span className="mr-2 text-xs bg-green-primary text-ivory px-2 py-0.5 rounded-full">Top</span>}
                              {entry.cluster_id}
                            </span>
                            <span className={`text-lg font-bold ${i === 0 ? 'text-green-primary' : 'text-green-secondary'}`}>
                              {pct}%
                            </span>
                          </div>
                          {/* Comparison bar */}
                          <div className="h-2 bg-green-primary/10 rounded-full overflow-hidden mb-1">
                            <div
                              className={`h-full rounded-full transition-all duration-700 ${i === 0 ? 'bg-green-primary' : 'bg-sage/60'}`}
                              style={{ width: `${barWidth}%` }}
                            />
                          </div>
                          {/* Distinguishing traits */}
                          {CAREER_DISTINGUISHERS[entry.cluster_id] && (
                            <p className="text-xs text-text-muted">
                              Key traits: <span className="font-medium text-green-secondary">{CAREER_DISTINGUISHERS[entry.cluster_id]}</span>
                            </p>
                          )}
                        </div>
                      )
                    })}
                  </div>
                </motion.div>
              )}

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
