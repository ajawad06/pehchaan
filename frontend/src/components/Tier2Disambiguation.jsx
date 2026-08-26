import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useSession } from '../store/SessionContext'
import { useNavigate, useSearchParams, useLocation } from 'react-router-dom'
import { recordResponse } from '../services/db'
import { Sparkles, Stethoscope, BarChart3, Drama, Scale, Cog, ArrowLeft, Check } from 'lucide-react'

// Cluster icon keys map to lucide components (replaces the retired PixelIcon set)
const CLUSTER_ICONS = {
  spark:       Sparkles,
  stethoscope: Stethoscope,
  chart:       BarChart3,
  theater:     Drama,
  scales:      Scale,
  gear:        Cog,
}

// ─── Cluster definitions ──────────────────────────────────────────────────────
// Each cluster: 3 questions × 4 choices, each choice writes specific trait
// scores (0-100 range, same as other cognitive activities).
// Differentiator traits are the keys that SEPARATE careers within that cluster.

const CLUSTERS = {
  technology: {
    title: 'Tech Pathway Finder',
    subtitle: 'Your profile fits all 5 tech fields. These 3 questions find where your instincts actually land.',
    icon: 'spark',
    accentClass: 'from-blue-600 to-indigo-700',
    differentiators: {
      'Software Engineering':        'systems_thinking',
      'Data Science':                'analytical_thinking',
      'Artificial Intelligence / ML':'pattern_recognition',
      'Cybersecurity':               'adversarial_thinking',
      'Computer Science / Research': 'abstract_reasoning',
    },
    questions: [
      {
        text: 'You have one week and unlimited compute. Which problem do you solve?',
        choices: [
          { label: 'Ship a complete product 10,000 people can use by Friday',             traits: { systems_thinking: 88, creativity: 72, persistence: 80 } },
          { label: 'Find the hidden signal in a 10-million-row health dataset',            traits: { analytical_thinking: 90, pattern_recognition: 78, numerical_reasoning: 82 } },
          { label: 'Probe a live system for vulnerabilities before the attackers do',      traits: { adversarial_thinking: 92, attention_to_detail: 85, logical_reasoning: 78 } },
          { label: 'Prove a new algorithm is fundamentally faster than the current best', traits: { abstract_reasoning: 90, numerical_reasoning: 82, logical_reasoning: 85 } },
        ]
      },
      {
        text: 'Which result would you most want to put your name on?',
        choices: [
          { label: 'A production app with 99.9% uptime and clean, readable architecture',  traits: { systems_thinking: 88, persistence: 82, learning_agility: 78 } },
          { label: 'A model that predicts patient outcomes better than senior clinicians',   traits: { analytical_thinking: 90, pattern_recognition: 85, numerical_reasoning: 80 } },
          { label: 'A zero-day responsibly disclosed and patched in a major vendor system', traits: { adversarial_thinking: 90, attention_to_detail: 88, persistence: 80 } },
          { label: 'A theorem or proof published in a top-tier CS theory journal',          traits: { abstract_reasoning: 92, numerical_reasoning: 80, persistence: 85 } },
        ]
      },
      {
        text: 'Everything breaks at 2am. What is your first thought?',
        choices: [
          { label: '"The deployment pipeline failed — let me trace the diff."',             traits: { systems_thinking: 85, logical_reasoning: 80 } },
          { label: '"The loss spiked — something shifted in the data distribution."',       traits: { analytical_thinking: 88, pattern_recognition: 80, numerical_reasoning: 75 } },
          { label: '"Someone triggered the anomaly detector. Where did they get in?"',      traits: { adversarial_thinking: 88, attention_to_detail: 85 } },
          { label: '"The complexity bound assumed n ≥ 1000. What if n equals 3?"',          traits: { abstract_reasoning: 88, numerical_reasoning: 82, logical_reasoning: 80 } },
        ]
      },
    ]
  },

  medicine: {
    title: 'Medical Path Finder',
    subtitle: 'You are drawn to health. These 3 questions identify whether you are a clinician, pharmacist, or care specialist.',
    icon: 'stethoscope',
    accentClass: 'from-emerald-600 to-teal-700',
    differentiators: {
      'Medicine (MBBS)':       'logical_reasoning',
      'Pharmacy':              'attention_to_detail',
      'Nursing / Allied Health':'empathy',
    },
    questions: [
      {
        text: 'Which moment in healthcare would feel most meaningful?',
        choices: [
          { label: 'Diagnosing a rare condition three other doctors missed',                 traits: { logical_reasoning: 88, analytical_thinking: 82 } },
          { label: 'Catching a lethal drug interaction before it reaches the patient',       traits: { attention_to_detail: 92, memory: 85, numerical_reasoning: 72 } },
          { label: 'Sitting with a frightened patient before surgery and making them calm',  traits: { empathy: 95, communication: 82 } },
          { label: 'Running a ward with zero medication errors for 30 straight days',        traits: { attention_to_detail: 88, persistence: 88, memory: 82 } },
        ]
      },
      {
        text: 'A senior colleague prescribes a dose you think is dangerously high. You:',
        choices: [
          { label: 'Document it, escalate formally, and note your reasoning clearly',        traits: { logical_reasoning: 82, verbal_reasoning: 78, persistence: 80 } },
          { label: 'Verify the pharmacology yourself before raising it with anyone',         traits: { attention_to_detail: 92, memory: 88, numerical_reasoning: 78 } },
          { label: 'Speak to them directly and respectfully explain your concern',           traits: { communication: 82, empathy: 78, persistence: 72 } },
          { label: 'Cross-check drug interaction databases and present hard evidence',       traits: { analytical_thinking: 88, memory: 82, attention_to_detail: 82 } },
        ]
      },
      {
        text: 'Five years from now, which role feels most like you?',
        choices: [
          { label: 'A specialist physician known for cracking unusual cases',                traits: { logical_reasoning: 92, analytical_thinking: 82, persistence: 82 } },
          { label: 'A clinical pharmacist optimizing drug regimens in an ICU',               traits: { numerical_reasoning: 88, attention_to_detail: 92, memory: 82 } },
          { label: 'A nurse practitioner managing long-term care for 50 families',           traits: { empathy: 92, persistence: 88, communication: 82 } },
          { label: 'An allied health specialist running a rehabilitation unit',              traits: { empathy: 82, persistence: 82, communication: 78, planning: 75 } },
        ]
      },
    ]
  },

  business: {
    title: 'Business Track Finder',
    subtitle: 'Your profile fits the business world — but that world splits sharply. Let\'s find your lane.',
    icon: 'chart',
    accentClass: 'from-amber-600 to-orange-700',
    differentiators: {
      'Business Administration':            'leadership',
      'Chartered Accountancy / Finance':    'numerical_reasoning',
      'Entrepreneurship':                   'risk_tolerance',
      'Civil Service (CSS)':               'verbal_reasoning',
    },
    questions: [
      {
        text: 'You have PKR 5 million to deploy. What is your first move?',
        choices: [
          { label: 'Hire three people with clear accountability and set weekly KPIs',        traits: { leadership: 88, planning: 72 } },
          { label: 'Build a full financial model before spending a single rupee',            traits: { numerical_reasoning: 92, analytical_thinking: 82, attention_to_detail: 82 } },
          { label: 'Launch a rough version in 3 weeks and let users tell you what to fix',  traits: { risk_tolerance: 92, creativity: 78 } },
          { label: 'Study the regulatory environment and register the entity properly',      traits: { verbal_reasoning: 82, planning: 88, attention_to_detail: 78 } },
        ]
      },
      {
        text: 'Which document do you want to own in a company?',
        choices: [
          { label: 'The org chart and quarterly OKRs',                                      traits: { leadership: 92, planning: 78 } },
          { label: 'The P&L statement, balance sheet, and variance analysis',               traits: { numerical_reasoning: 92, analytical_thinking: 82, attention_to_detail: 88 } },
          { label: 'The investor pitch deck and fundraising narrative',                      traits: { risk_tolerance: 78, creativity: 82, communication: 88 } },
          { label: 'The compliance manual and board resolution file',                        traits: { verbal_reasoning: 82, planning: 88, persistence: 78 } },
        ]
      },
      {
        text: 'Revenue drops 20% in one month. Your instinct is to:',
        choices: [
          { label: 'Restructure the team and reset clear performance targets',               traits: { leadership: 88, planning: 78, persistence: 72 } },
          { label: 'Audit every expense line and trace exactly where the margin went',       traits: { attention_to_detail: 92, numerical_reasoning: 88, analytical_thinking: 78 } },
          { label: 'Pivot the model — the old approach clearly isn\'t working',              traits: { risk_tolerance: 92, creativity: 72 } },
          { label: 'Draft an emergency restructuring proposal for the board',                traits: { verbal_reasoning: 82, communication: 82, persistence: 82 } },
        ]
      },
    ]
  },

  arts: {
    title: 'Creative Field Finder',
    subtitle: 'Your Artistic profile is strong — but the creative world branches sharply. Let\'s find your medium.',
    icon: 'theater',
    accentClass: 'from-purple-600 to-pink-700',
    differentiators: {
      'Visual & Fine Arts':                      'aesthetic_judgment',
      'Creative Writing / Journalism / Media':   'verbal_reasoning',
      'UX/UI Design':                            'empathy',
      'Architecture':                            'spatial_reasoning',
    },
    questions: [
      {
        text: 'You have one creative project with no constraints. Which do you make?',
        choices: [
          { label: 'A visual artwork — painting, sculpture, or digital illustration',       traits: { creativity: 95, aesthetic_judgment: 92 } },
          { label: 'A short story, essay, or long-form narrative podcast',                  traits: { verbal_reasoning: 92, creativity: 82, communication: 82 } },
          { label: 'An app or site whose UX makes people say "this just feels right"',      traits: { creativity: 85, empathy: 85, pattern_recognition: 72 } },
          { label: 'A physical space — a building, room layout, or landscape plan',         traits: { spatial_reasoning: 92, creativity: 82, planning: 72 } },
        ]
      },
      {
        text: 'Feedback: "Technically correct — but it doesn\'t feel alive." You:',
        choices: [
          { label: 'Go back and inject more raw emotional honesty into the piece',          traits: { creativity: 92, aesthetic_judgment: 88 } },
          { label: 'Rewrite the narrative structure from scratch — the arc is wrong',       traits: { verbal_reasoning: 92, creativity: 82 } },
          { label: 'Run three real users through it and watch where they hesitate',         traits: { empathy: 88, analytical_thinking: 78 } },
          { label: 'Rethink the spatial flow — nothing should feel accidental',             traits: { spatial_reasoning: 88, attention_to_detail: 82 } },
        ]
      },
      {
        text: 'Five years from now, which outcome makes you proudest?',
        choices: [
          { label: 'A solo exhibition of original work in a serious gallery',               traits: { creativity: 92, aesthetic_judgment: 92, persistence: 82 } },
          { label: 'A published novel or major journalism award',                           traits: { verbal_reasoning: 92, persistence: 88, creativity: 82 } },
          { label: 'A product used by millions — described as "the most intuitive app"',    traits: { empathy: 88, creativity: 82, pattern_recognition: 78 } },
          { label: 'A building I designed that people photograph and visit on purpose',     traits: { spatial_reasoning: 92, creativity: 88, persistence: 82 } },
        ]
      },
    ]
  },

  law: {
    title: 'Law & Service Track Finder',
    subtitle: 'Verbal reasoning and social drive — but two very different career paths. Let\'s narrow it down.',
    icon: 'scales',
    accentClass: 'from-slate-700 to-gray-900',
    differentiators: {
      'Law (LLB)':           'logical_reasoning',
      'Civil Service (CSS)': 'leadership',
    },
    questions: [
      {
        text: 'Which argument would you spend a month building?',
        choices: [
          { label: 'A legal brief for a landmark constitutional case',                      traits: { verbal_reasoning: 92, logical_reasoning: 88, persistence: 82 } },
          { label: 'A policy proposal to restructure urban planning in a major city',       traits: { planning: 88, verbal_reasoning: 82, leadership: 78 } },
          { label: 'A corporate negotiation strategy for a major M&A deal',                 traits: { risk_tolerance: 78, verbal_reasoning: 82, analytical_thinking: 78 } },
          { label: 'A case study on how a government failed — and exactly how to fix it',  traits: { analytical_thinking: 88, verbal_reasoning: 82, empathy: 72 } },
        ]
      },
      {
        text: 'You are the most senior person in the room. 60 seconds to speak. You:',
        choices: [
          { label: 'Make the sharpest, most precise legal argument you\'ve ever made',      traits: { verbal_reasoning: 92, logical_reasoning: 82 } },
          { label: 'Lay out the policy implications calmly and with total clarity',         traits: { verbal_reasoning: 82, leadership: 82, planning: 78 } },
          { label: 'Find the one statistic that changes how the room sees the problem',     traits: { analytical_thinking: 88, numerical_reasoning: 72 } },
          { label: 'Tell the story of the person this decision will actually affect',       traits: { communication: 88, empathy: 82, verbal_reasoning: 78 } },
        ]
      },
      {
        text: 'Five years from now, the work you\'re proudest of is:',
        choices: [
          { label: 'A precedent-setting case that changed Pakistani court procedure',       traits: { verbal_reasoning: 92, logical_reasoning: 88, persistence: 88 } },
          { label: 'A policy you wrote that a provincial government actually implemented',  traits: { planning: 88, leadership: 82, verbal_reasoning: 78 } },
          { label: 'A negotiation where every party left with more than they expected',     traits: { risk_tolerance: 72, communication: 88, analytical_thinking: 78 } },
          { label: 'A public interest case for someone who could not afford counsel',       traits: { empathy: 88, persistence: 88, verbal_reasoning: 82 } },
        ]
      },
    ]
  },

  engineering: {
    title: 'Engineering Track Finder',
    subtitle: 'Your Realistic + Investigative profile fits both engineering paths. These questions separate them.',
    icon: 'gear',
    accentClass: 'from-zinc-700 to-slate-800',
    differentiators: {
      'Civil Engineering':                    'spatial_reasoning',
      'Electrical / Mechanical Engineering':  'numerical_reasoning',
    },
    questions: [
      {
        text: 'Which project do you want to lead?',
        choices: [
          { label: 'Designing a bridge that will stand for 100 years',                     traits: { spatial_reasoning: 92, numerical_reasoning: 82, planning: 82 } },
          { label: 'Designing the control system for an industrial power plant',            traits: { numerical_reasoning: 92, logical_reasoning: 85, attention_to_detail: 85 } },
          { label: 'Planning the drainage and road network for a new city district',        traits: { spatial_reasoning: 88, planning: 88, numerical_reasoning: 78 } },
          { label: 'Building an electric motor controller from schematics',                 traits: { numerical_reasoning: 88, attention_to_detail: 88, logical_reasoning: 80 } },
        ]
      },
      {
        text: 'A structure/system fails during testing. What is your first move?',
        choices: [
          { label: 'Examine the load-bearing joints and material stress diagrams',         traits: { spatial_reasoning: 88, analytical_thinking: 82, attention_to_detail: 82 } },
          { label: 'Pull the circuit logs and trace the fault to its exact component',     traits: { numerical_reasoning: 88, logical_reasoning: 85, attention_to_detail: 88 } },
          { label: 'Revisit the site survey — the soil conditions were probably wrong',    traits: { spatial_reasoning: 85, analytical_thinking: 80, planning: 78 } },
          { label: 'Rebuild the simulation model and run edge-case scenarios',             traits: { numerical_reasoning: 85, pattern_recognition: 78, analytical_thinking: 82 } },
        ]
      },
      {
        text: 'Which output feels most satisfying?',
        choices: [
          { label: 'A physical structure that people cross, live in, or use every day',   traits: { spatial_reasoning: 92, creativity: 72, persistence: 82 } },
          { label: 'A machine or system running at peak efficiency with zero faults',      traits: { numerical_reasoning: 92, attention_to_detail: 85, persistence: 82 } },
          { label: 'A blueprint that solves a spatial problem no one had cracked before',  traits: { spatial_reasoning: 90, creativity: 78, logical_reasoning: 75 } },
          { label: 'An optimized algorithm that reduces energy consumption by 30%',        traits: { numerical_reasoning: 90, analytical_thinking: 82, creativity: 72 } },
        ]
      },
    ]
  },
}

// ─── Cluster detector (used by ResultsScreen to decide if Tier 2 is needed) ──
export const DOMAIN_CLUSTER_MAP = {
  technology:  ['Software Engineering', 'Computer Science / Research', 'Data Science', 'Artificial Intelligence / ML', 'Cybersecurity'],
  medicine:    ['Medicine (MBBS)', 'Pharmacy', 'Nursing / Allied Health'],
  business:    ['Business Administration', 'Chartered Accountancy / Finance', 'Entrepreneurship', 'Civil Service (CSS)'],
  arts:        ['Architecture', 'UX/UI Design', 'Visual & Fine Arts', 'Creative Writing / Journalism / Media'],
  law:         ['Law (LLB)', 'Civil Service (CSS)'],
  engineering: ['Civil Engineering', 'Electrical / Mechanical Engineering'],
}

// The two engines label careers differently: /recommend_careers (taxonomy)
// returns display names like 'Software Engineering', while /predict (RF model)
// returns snake_case ids like 'software_engineering'. Fold both to one key so
// detection works no matter which engine produced the ranking.
const canon = (s) => String(s || '').toLowerCase().replace(/[^a-z0-9]/g, '')

export function detectTier2Cluster(top5) {
  if (!Array.isArray(top5) || top5.length < 2) return null

  const matches = (ids, careers) => {
    const canonCareers = careers.map(canon)
    return ids.every(c => canonCareers.includes(canon(c)))
  }

  // Returns cluster name if top 3 careers all come from the same cluster
  const top3 = top5.slice(0, 3).map(r => r.cluster_id)
  if (top3.length === 3) {
    for (const [cluster, careers] of Object.entries(DOMAIN_CLUSTER_MAP)) {
      if (matches(top3, careers)) return cluster
    }
  }
  // Relax: top 2 from same cluster
  const top2 = top5.slice(0, 2).map(r => r.cluster_id)
  for (const [cluster, careers] of Object.entries(DOMAIN_CLUSTER_MAP)) {
    if (matches(top2, careers)) return cluster
  }
  return null
}

// ─── Component ────────────────────────────────────────────────────────────────
export default function Tier2Disambiguation() {
  const { updateTraits, sessionId } = useSession()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const location = useLocation()

  const clusterKey = searchParams.get('cluster') || location.state?.cluster || 'technology'
  const cluster = CLUSTERS[clusterKey] || CLUSTERS.technology

  const [current, setCurrent] = useState(0)
  const [selected, setSelected] = useState(null)
  const [done, setDone] = useState(false)
  // Accumulate: { traitKey: [val, val, ...] } — averaged at the end
  const [accum, setAccum] = useState({})

  const totalQ = cluster.questions.length
  const progress = (current / totalQ) * 100

  const handleChoice = (choice) => {
    if (selected !== null) return
    setSelected(choice)

    // Accumulate this choice's traits
    setAccum(prev => {
      const next = { ...prev }
      Object.entries(choice.traits).forEach(([k, v]) => {
        next[k] = prev[k] ? [...prev[k], v] : [v]
      })
      return next
    })

    setTimeout(() => {
      if (current + 1 < totalQ) {
        setCurrent(c => c + 1)
        setSelected(null)
      } else {
        setDone(true)
      }
    }, 600)
  }

  const handleFinish = () => {
    // Average all accumulated trait values and write once
    const averaged = {}
    Object.entries(accum).forEach(([k, vals]) => {
      averaged[k] = Math.round(vals.reduce((s, v) => s + v, 0) / vals.length)
    })
    // Mark tier 2 complete so ResultsScreen doesn't re-suggest it
    averaged.tier2_completed = 1

    updateTraits(averaged)

    if (sessionId) {
      recordResponse(sessionId, `tier2_${clusterKey}`, {
        cluster: clusterKey,
        trait_deltas: averaged,
      }).catch(() => {})
    }

    navigate('/results', { state: { refined: true, cluster: clusterKey } })
  }

  const q = cluster.questions[current]

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-ivory text-green-dark pt-24 px-6 pb-6 relative overflow-hidden">

      {/* Back */}
      <div className="absolute top-6 left-6 z-20">
        <button
          onClick={() => navigate('/results')}
          className="text-green-secondary hover:text-green-dark font-semibold flex items-center gap-2 bg-white/60 rounded-pill px-3 py-1.5 sm:px-4 sm:py-2 shadow-cushion-sm text-sm hover:shadow-cushion transition-shadow"
        >
          <ArrowLeft size={16} className="shrink-0" /> Back to Results
        </button>
      </div>

      <div className="max-w-2xl w-full mx-auto">

        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex justify-center mb-3">
            <span className="grid place-items-center w-16 h-16 rounded-card bg-green-primary/10 text-green-primary shadow-cushion-sm">
              {(() => { const Icon = CLUSTER_ICONS[cluster.icon] || Sparkles; return <Icon size={32} /> })()}
            </span>
          </div>
          <h1 className="font-playful text-3xl font-extrabold tracking-tight mb-2">{cluster.title}</h1>
          <p className="text-text-muted text-sm max-w-md mx-auto">{cluster.subtitle}</p>
        </div>

        {/* Progress */}
        {!done && (
          <div className="mb-8">
            <div className="flex justify-between text-xs text-text-muted mb-2 font-medium uppercase tracking-widest">
              <span>Question {current + 1} of {totalQ}</span>
              <span>{Math.round(progress)}% through</span>
            </div>
            <div className="h-1.5 bg-green-primary/10 rounded-pill overflow-hidden">
              <motion.div
                className="h-full bg-green-primary rounded-pill"
                initial={{ width: 0 }}
                animate={{ width: `${progress}%` }}
                transition={{ duration: 0.4 }}
              />
            </div>
          </div>
        )}

        <AnimatePresence mode="wait">
          {!done ? (
            <motion.div
              key={current}
              initial={{ opacity: 0, x: 40 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -40 }}
              transition={{ duration: 0.3 }}
            >
              {/* Question */}
              <div className="bg-soft-white border border-border-glass rounded-card-lg shadow-cushion p-8 mb-6">
                <p className="text-xl font-medium leading-relaxed text-center text-green-dark">
                  {q.text}
                </p>
              </div>

              {/* Choices */}
              <div className="space-y-3">
                {q.choices.map((choice, i) => {
                  const isSelected = selected === choice
                  return (
                    <motion.button
                      key={i}
                      onClick={() => handleChoice(choice)}
                      disabled={selected !== null}
                      whileHover={selected === null ? { scale: 1.01 } : {}}
                      whileTap={selected === null ? { scale: 0.99 } : {}}
                      className={`w-full text-left px-6 py-5 rounded-card border font-medium transition-all duration-200 shadow-cushion-sm
                        ${isSelected
                          ? 'bg-green-primary text-ivory border-green-primary shadow-cushion'
                          : selected !== null
                            ? 'bg-soft-white border-border-glass text-text-muted opacity-50'
                            : 'bg-soft-white border-border-glass text-green-dark hover:border-green-primary hover:bg-green-primary/5'
                        }`}
                    >
                      <span className="flex items-start gap-3">
                        <span className={`text-xs font-bold mt-0.5 uppercase tracking-widest min-w-[18px] ${isSelected ? 'text-ivory/70' : 'text-text-muted'}`}>
                          {String.fromCharCode(65 + i)}
                        </span>
                        <span className="leading-relaxed">{choice.label}</span>
                      </span>
                    </motion.button>
                  )
                })}
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="done"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-soft-white border border-border-glass rounded-card-lg shadow-cushion p-10 text-center"
            >
              <div className="flex justify-center mb-4">
                <span className="grid place-items-center w-16 h-16 rounded-pill bg-green-primary text-ivory shadow-cushion">
                  <Check size={32} strokeWidth={3} />
                </span>
              </div>
              <h2 className="font-playful text-2xl font-extrabold tracking-tight mb-3">Disambiguation complete</h2>
              <p className="text-text-muted mb-8 max-w-sm mx-auto">
                Your answers have sharpened the profile. Your results will now show better separation between careers in the same field.
              </p>

              {/* Preview which traits were updated */}
              <div className="flex flex-wrap gap-2 justify-center mb-8">
                {Object.keys(accum).map(k => (
                  <span key={k} className="px-3 py-1 bg-green-primary/10 text-green-primary text-xs font-semibold rounded-pill uppercase tracking-wide">
                    {k.replace(/_/g, ' ')}
                  </span>
                ))}
              </div>

              <button
                onClick={handleFinish}
                className="w-full py-4 bg-green-primary text-ivory font-bold rounded-pill hover:bg-green-dark transition-colors shadow-cushion-sm text-lg"
              >
                View Refined Results →
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Differentiator legend */}
        {!done && (
          <div className="mt-8 p-5 bg-soft-white/60 border border-border-glass rounded-card">
            <p className="text-xs text-text-muted font-semibold uppercase tracking-widest mb-3">What this round measures</p>
            <div className="flex flex-wrap gap-2">
              {Object.entries(cluster.differentiators).map(([career, trait]) => (
                <span key={career} className="text-xs bg-ivory border border-border-glass px-3 py-1 rounded-pill text-green-dark">
                  <span className="font-semibold">{career.split('/')[0].trim()}</span>
                  <span className="text-text-muted"> → {trait.replace(/_/g, ' ')}</span>
                </span>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
