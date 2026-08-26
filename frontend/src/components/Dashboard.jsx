import { useState, useEffect } from 'react'
import { motion, useReducedMotion, AnimatePresence } from 'framer-motion'
import { Link } from 'react-router-dom'
import confetti from 'canvas-confetti'
import {
  User, Pencil, Check, Flame, Trophy, Brain, Compass, Puzzle,
  Briefcase, Zap, LineChart, Lock, Sparkles, ArrowRight, Calendar
} from 'lucide-react'
import { useSession } from '../store/SessionContext'
import { getUserRecord, updateDisplayName, getUserSessions } from '../services/db'
import Navbar from './Navbar'
import TraitRadar from './TraitRadar'

/* ---------------------------------------------------------------------
   GAME META — maps each trait key SessionContext already tracks to a
   label/icon/route, so progress rings are driven by real trait values,
   not invented ones. Source: SessionContext.jsx `traits` initial state.
--------------------------------------------------------------------- */
const GAME_CATEGORIES = [
  { key: 'working_memory', label: 'Memory', icon: Brain, to: '/memory-game', max: 100 },
  { key: 'logical_reasoning', label: 'Pattern Hunter', icon: Puzzle, to: '/pattern-hunter', max: 100 },
  { key: 'decision_making', label: 'Decision Lab', icon: Compass, to: '/decision-lab', max: 100 },
  { key: 'creativity', label: 'Creative Uses', icon: Sparkles, to: '/creative-uses', max: 100 },
  { key: 'processing_speed', label: 'Attention', icon: Zap, to: '/attention-game', max: 100 },
  { key: 'analytical_thinking', label: 'Data Detective', icon: LineChart, to: '/data-detective', max: 100 },
]

// Badges are DERIVED, not stored — there is no badge collection in Firestore
// yet (flagged in Phase 0 audit). Each badge unlocks off a real signal already
// present in `traits` or `sessionCount`, so nothing here is fabricated —
// it's a rule applied to real data, clearly commented per-badge.
function computeBadges(traits, sessionCount) {
  const completedTraits = Object.entries(traits).filter(
    ([k, v]) => typeof v === 'number' && v > 0
  ).length

  return [
    {
      id: 'first-play',
      label: 'First Play',
      desc: 'Completed your first mini-game',
      icon: Trophy,
      unlocked: completedTraits > 0, // real: at least one trait score > 0
    },
    {
      id: 'well-rounded',
      label: 'Well Rounded',
      desc: 'Scored on 5+ different traits',
      icon: Sparkles,
      unlocked: completedTraits >= 5, // real: trait breadth from SessionContext
    },
    {
      id: 'returning-player',
      label: 'Returning Player',
      desc: 'Came back for a second session',
      icon: Flame,
      unlocked: sessionCount >= 2, // real: Firestore sessions count for this user
    },
    {
      id: 'full-profile',
      label: 'Full Profile',
      desc: 'Completed every core trait',
      icon: Check,
      unlocked: completedTraits >= 12, // real: all core trait keys scored
    },
  ]
}

/* Digit pop-up odometer numeral — same pattern as LandingPage's PopNumber */
function PopNumber({ value, className }) {
  const digits = String(value).split('')
  return (
    <span className={className} aria-label={String(value)}>
      {digits.map((d, i) => (
        <motion.span
          key={`${i}-${d}`}
          initial={{ opacity: 0, y: 14, scale: 0.7 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ delay: i * 0.06, duration: 0.4, ease: [0.34, 1.56, 0.64, 1] }}
          className="inline-block"
        >
          {d}
        </motion.span>
      ))}
    </span>
  )
}

/* Three bouncing dots — DESIGN SYSTEM loading spec, never a flat spinner */
function BouncingDots() {
  return (
    <div className="flex items-center gap-1.5 justify-center py-12" role="status" aria-label="Loading">
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          className="w-3 h-3 rounded-full bg-blush animate-dot-bounce"
          style={{ animationDelay: `${i * 0.15}s` }}
        />
      ))}
    </div>
  )
}

/* Circular progress ring — clockwise fill with spring pop at 100% */
function ProgressRing({ value, max, reduceMotion }) {
  const pct = Math.min(100, Math.round((value / max) * 100))
  const r = 34
  const c = 2 * Math.PI * r
  const offset = c - (pct / 100) * c
  const isComplete = pct >= 100

  return (
    <div className="relative w-20 h-20 shrink-0">
      <svg viewBox="0 0 80 80" className="w-full h-full -rotate-90">
        <circle cx="40" cy="40" r={r} fill="none" stroke="var(--green-dark)" strokeWidth="8" />
        <motion.circle
          cx="40" cy="40" r={r} fill="none"
          stroke="var(--color-blush)" strokeWidth="8" strokeLinecap="round"
          strokeDasharray={c}
          initial={{ strokeDashoffset: c }}
          animate={{ strokeDashoffset: offset }}
          transition={{ duration: 1, ease: [0.34, 1.56, 0.64, 1] }}
        />
      </svg>
      <motion.span
        animate={isComplete && !reduceMotion ? { scale: [1, 1.25, 1] } : {}}
        transition={{ duration: 0.4, ease: [0.34, 1.56, 0.64, 1] }}
        className="absolute inset-0 flex items-center justify-center font-playful font-bold text-sm text-ivory"
      >
        {pct}%
      </motion.span>
    </div>
  )
}

export default function Dashboard() {
  const { user, traits, ageGroup } = useSession()
  const reduceMotion = useReducedMotion()

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [userRecord, setUserRecord] = useState(null)
  const [sessions, setSessions] = useState([])
  const [sessionsError, setSessionsError] = useState(null) // separate: index may not exist yet

  const [editingName, setEditingName] = useState(false)
  const [nameInput, setNameInput] = useState('')
  const [savingName, setSavingName] = useState(false)

  const [celebrated, setCelebrated] = useState({}) // badge tap puff, per-id, small win only

  useEffect(() => {
    if (!user?.uid) return
    let cancelled = false

    async function load() {
      setLoading(true)
      setError(null)
      setSessionsError(null)
      try {
        const record = await getUserRecord(user.uid)
        if (!cancelled) setUserRecord(record)
      } catch (err) {
        console.error('Dashboard: failed to load user record', err)
        if (!cancelled) setError('Could not load your profile right now.')
      }

      try {
        const s = await getUserSessions(user.uid)
        if (!cancelled) setSessions(s)
      } catch (err) {
        // Likely a missing Firestore composite index (where + orderBy).
        // Degrade gracefully rather than blocking the whole dashboard.
        console.error('Dashboard: failed to load session history', err)
        if (!cancelled) setSessionsError('Recent activity is temporarily unavailable.')
      }

      if (!cancelled) setLoading(false)
    }
    load()
    return () => { cancelled = true }
  }, [user?.uid])

  const handleSaveName = async () => {
    if (!nameInput.trim() || !user?.uid) return
    setSavingName(true)
    try {
      await updateDisplayName(user.uid, nameInput.trim())
      setUserRecord((prev) => ({ ...(prev || {}), display_name: nameInput.trim() }))
      setEditingName(false)
    } catch (err) {
      console.error('Dashboard: failed to save name', err)
    } finally {
      setSavingName(false)
    }
  }

  const sessionCount = sessions.length
  const badges = computeBadges(traits, sessionCount)
  const gamesCompleted = Object.entries(traits).filter(
    ([k, v]) => typeof v === 'number' && v > 0
  ).length
  const hasAnyData = gamesCompleted > 0

  const handleBadgeTap = (badgeId, unlocked) => {
    if (!unlocked || reduceMotion) return
    // Small win puff only — full confetti is reserved for the real unlock
    // moment, which fires elsewhere (ResultsScreen), not on re-viewing here.
    setCelebrated((prev) => ({ ...prev, [badgeId]: true }))
    setTimeout(() => setCelebrated((prev) => ({ ...prev, [badgeId]: false })), 350)
  }

  const displayName = userRecord?.display_name

  return (
    <div className="min-h-screen bg-green-deepest text-ivory font-sans pb-24">
      <Navbar />

      <div className="max-w-5xl mx-auto pt-28 sm:pt-32 px-4 sm:px-6">
        {loading ? (
          <BouncingDots />
        ) : error ? (
          <div className="bg-green-dark/50 border border-border-glass rounded-card p-5 sm:p-8 text-center">
            <p className="text-text-muted">{error}</p>
          </div>
        ) : (
          <>
            {/* ============ PROFILE HEADER ============ */}
            <motion.section
              initial={reduceMotion ? {} : { opacity: 0, y: 16 }}
              animate={reduceMotion ? {} : { opacity: 1, y: 0 }}
              transition={{ duration: 0.5, ease: [0.34, 1.56, 0.64, 1] }}
              className="bg-green-primary rounded-card-lg p-5 sm:p-8 shadow-cushion flex flex-col sm:flex-row items-start sm:items-center gap-4 sm:gap-6 mb-8 sm:mb-10"
            >
              <div className={`w-20 h-20 rounded-full bg-blush/20 border-2 border-blush/40 flex items-center justify-center shrink-0 ${reduceMotion ? '' : 'animate-idle-bob'}`}>
                <User size={32} className="text-blush" />
              </div>

              <div className="flex-1 min-w-0">
                {editingName ? (
                  <div className="flex items-center gap-2">
                    <input
                      autoFocus
                      value={nameInput}
                      onChange={(e) => setNameInput(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleSaveName()}
                      placeholder="Your name"
                      maxLength={40}
                      className="bg-green-dark/60 border border-border-glass rounded-pill px-4 py-2 text-lg font-semibold text-ivory outline-none focus:border-blush/50 w-full max-w-xs"
                    />
                    <button
                      onClick={handleSaveName}
                      disabled={savingName || !nameInput.trim()}
                      className="bg-blush text-green-deepest rounded-pill p-2.5 shadow-cushion-sm disabled:opacity-50"
                    >
                      <Check size={18} />
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center gap-3">
                    <h1 className="font-playful text-2xl sm:text-3xl font-extrabold truncate">
                      {displayName || 'Explorer'}
                    </h1>
                    <button
                      onClick={() => { setNameInput(displayName || ''); setEditingName(true) }}
                      className="text-text-muted hover:text-ivory transition-colors shrink-0"
                      aria-label="Edit name"
                    >
                      <Pencil size={16} />
                    </button>
                  </div>
                )}

                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-2 text-sm text-text-muted">
                  {ageGroup && (
                    <span className="flex items-center gap-1.5">
                      <Compass size={14} /> Age band {ageGroup}
                    </span>
                  )}
                  {userRecord?.created_at?.toDate && (
                    <span className="flex items-center gap-1.5">
                      <Calendar size={14} />
                      Joined {userRecord.created_at.toDate().toLocaleDateString(undefined, { month: 'short', year: 'numeric' })}
                    </span>
                  )}
                </div>
              </div>

              <Link
                to="/start"
                className="bg-blush text-green-deepest px-6 py-3 rounded-pill font-bold text-sm shadow-cushion-sm hover:shadow-cushion transition-shadow whitespace-nowrap"
              >
                Play Again
              </Link>
            </motion.section>

            {!hasAnyData ? (
              /* ============ EMPTY STATE ============ */
              <motion.section
                initial={reduceMotion ? {} : { opacity: 0, y: 16 }}
                animate={reduceMotion ? {} : { opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.1 }}
                className="bg-green-dark/40 border border-border-glass rounded-card-lg p-6 sm:p-12 text-center"
              >
                <div className={`w-16 h-16 mx-auto rounded-full bg-blush/15 flex items-center justify-center mb-6 ${reduceMotion ? '' : 'animate-idle-bob'}`}>
                  <Sparkles className="text-blush" size={28} />
                </div>
                <h2 className="font-playful text-2xl font-bold mb-3">No games played yet</h2>
                <p className="text-text-muted max-w-sm mx-auto mb-8">
                  Your stats, badges, and progress rings show up here the moment
                  you finish your first mini-game.
                </p>
                <Link
                  to="/start"
                  className={`inline-flex items-center gap-2 bg-blush text-green-deepest px-8 py-4 rounded-pill font-bold shadow-cushion hover:shadow-cushion-hover transition-shadow ${reduceMotion ? '' : 'animate-heartbeat'}`}
                >
                  Start Playing <ArrowRight size={20} />
                </Link>
              </motion.section>
            ) : (
              <>
                {/* ============ STATS STRIP ============ */}
                <motion.section
                  initial={reduceMotion ? {} : { opacity: 0, y: 16 }}
                  animate={reduceMotion ? {} : { opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: 0.1 }}
                  className="grid grid-cols-2 sm:grid-cols-3 gap-4 mb-10"
                >
                  <div className="bg-green-dark/40 border border-border-glass rounded-card p-6 text-center">
                    <PopNumber value={gamesCompleted} className="font-playful text-3xl sm:text-4xl font-extrabold text-blush block" />
                    <p className="text-xs text-text-muted font-medium mt-2 uppercase tracking-wide">Traits Scored</p>
                  </div>
                  <div className="bg-green-dark/40 border border-border-glass rounded-card p-6 text-center">
                    <div className="flex items-center justify-center gap-1.5">
                      <Flame size={22} className="text-blush" />
                      <PopNumber value={sessionCount} className="font-playful text-3xl sm:text-4xl font-extrabold text-blush block" />
                    </div>
                    <p className="text-xs text-text-muted font-medium mt-2 uppercase tracking-wide">Sessions Played</p>
                  </div>
                  <div className="bg-green-dark/40 border border-border-glass rounded-card p-6 text-center col-span-2 sm:col-span-1">
                    <PopNumber
                      value={badges.filter(b => b.unlocked).length}
                      className="font-playful text-3xl sm:text-4xl font-extrabold text-blush block"
                    />
                    <p className="text-xs text-text-muted font-medium mt-2 uppercase tracking-wide">Badges Unlocked</p>
                  </div>
                </motion.section>

                {/* ============ PROGRESS RINGS ============ */}
                <motion.section
                  initial={reduceMotion ? {} : { opacity: 0, y: 16 }}
                  animate={reduceMotion ? {} : { opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: 0.15 }}
                  className="mb-10"
                >
                  <h2 className="font-playful text-xl font-bold mb-5">Your Progress</h2>
                  <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {GAME_CATEGORIES.map(({ key, label, icon: Icon, to, max }, i) => (
                      <motion.div
                        key={key}
                        initial={reduceMotion ? {} : { opacity: 0, y: 20, scale: 0.95 }}
                        animate={reduceMotion ? {} : { opacity: 1, y: 0, scale: 1 }}
                        transition={{ duration: 0.4, delay: 0.05 * i, ease: [0.34, 1.56, 0.64, 1] }}
                      >
                        <Link
                          to={to}
                          className="flex items-center gap-4 bg-green-dark/40 border border-border-glass hover:border-blush/30 rounded-card p-5 transition-colors"
                        >
                          <ProgressRing value={traits[key] || 0} max={max} reduceMotion={reduceMotion} />
                          <div className="min-w-0">
                            <div className="flex items-center gap-2 text-blush mb-1">
                              <Icon size={16} />
                              <span className="text-xs font-semibold uppercase tracking-wide">{label}</span>
                            </div>
                            <p className="text-sm text-text-muted">
                              {traits[key] > 0 ? `${Math.round(traits[key])}/${max}` : 'Not played yet'}
                            </p>
                          </div>
                        </Link>
                      </motion.div>
                    ))}
                  </div>
                </motion.section>

                {/* ============ TRAIT RADAR (reused component) ============ */}
                {(traits.R > 0 || traits.I > 0 || traits.A > 0) && (
                  <motion.section
                    initial={reduceMotion ? {} : { opacity: 0, y: 16 }}
                    animate={reduceMotion ? {} : { opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, delay: 0.2 }}
                    className="bg-green-dark/40 border border-border-glass rounded-card-lg p-6 mb-10"
                  >
                    <h2 className="font-playful text-xl font-bold mb-2">Your RIASEC Shape</h2>
                    <p className="text-sm text-text-muted mb-2">From Instinct Swipe — live from your session data.</p>
                    <TraitRadar />
                  </motion.section>
                )}

                {/* ============ BADGES GRID ============ */}
                <motion.section
                  initial={reduceMotion ? {} : { opacity: 0, y: 16 }}
                  animate={reduceMotion ? {} : { opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: 0.25 }}
                  className="mb-10"
                >
                  <h2 className="font-playful text-xl font-bold mb-5">Badges</h2>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                    {badges.map(({ id, label, desc, icon: Icon, unlocked }, i) => (
                      <motion.button
                        key={id}
                        initial={reduceMotion ? {} : { opacity: 0, y: 20, scale: 0.9 }}
                        animate={reduceMotion ? {} : { opacity: 1, y: 0, scale: 1 }}
                        transition={{ duration: 0.4, delay: 0.05 * i, ease: [0.34, 1.56, 0.64, 1] }}
                        onClick={() => handleBadgeTap(id, unlocked)}
                        className={`relative flex flex-col items-center text-center p-5 rounded-card border transition-colors ${
                          unlocked
                            ? 'bg-blush/10 border-blush/30 hover:border-blush/50'
                            : 'bg-green-dark/30 border-border-glass opacity-50'
                        }`}
                      >
                        <div className={`w-12 h-12 rounded-full flex items-center justify-center mb-3 ${
                          unlocked ? `bg-blush/20 text-blush ${reduceMotion ? '' : 'animate-twinkle'}` : 'bg-green-dark/50 text-text-muted'
                        }`}>
                          {unlocked ? <Icon size={20} /> : <Lock size={18} />}
                        </div>
                        <span className="text-sm font-semibold">{label}</span>
                        <span className="text-xs text-text-muted mt-1">{desc}</span>

                        <AnimatePresence>
                          {celebrated[id] && (
                            <motion.span
                              initial={{ opacity: 0, y: 0, scale: 0.6 }}
                              animate={{ opacity: 1, y: -20, scale: 1 }}
                              exit={{ opacity: 0 }}
                              transition={{ duration: 0.3 }}
                              className="absolute -top-2 text-lg pointer-events-none"
                            >
                              <Sparkles size={18} className="text-blush" />
                            </motion.span>
                          )}
                        </AnimatePresence>
                      </motion.button>
                    ))}
                  </div>
                </motion.section>

                {/* ============ RECENT ACTIVITY ============ */}
                <motion.section
                  initial={reduceMotion ? {} : { opacity: 0, y: 16 }}
                  animate={reduceMotion ? {} : { opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: 0.3 }}
                >
                  <h2 className="font-playful text-xl font-bold mb-5">Recent Activity</h2>
                  {sessionsError ? (
                    <div className="bg-green-dark/30 border border-border-glass rounded-card p-6 text-sm text-text-muted">
                      {sessionsError}
                    </div>
                  ) : sessions.length === 0 ? (
                    <div className="bg-green-dark/30 border border-border-glass rounded-card p-6 text-sm text-text-muted">
                      No past sessions recorded yet.
                    </div>
                  ) : (
                    <ul className="space-y-3">
                      {sessions.slice(0, 6).map((s, i) => (
                        <motion.li
                          key={s.id}
                          initial={reduceMotion ? {} : { opacity: 0, x: -12 }}
                          animate={reduceMotion ? {} : { opacity: 1, x: 0 }}
                          transition={{ duration: 0.35, delay: 0.04 * i }}
                          className="flex items-center justify-between gap-3 bg-green-dark/30 border border-border-glass rounded-card px-4 sm:px-5 py-4"
                        >
                          <div className="min-w-0">
                            <p className="font-medium text-sm truncate">
                              {s.completion_status === 'in_progress' ? 'Session in progress' : 'Session completed'}
                            </p>
                            <p className="text-xs text-text-muted mt-0.5 truncate">
                              {s.last_activity ? `Last: ${s.last_activity.replace('/', '').replace(/-/g, ' ')}` : 'Just started'}
                            </p>
                          </div>
                          {s.start_time?.toDate && (
                            <span className="text-xs text-text-muted whitespace-nowrap">
                              {s.start_time.toDate().toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                            </span>
                          )}
                        </motion.li>
                      ))}
                    </ul>
                  )}
                </motion.section>
              </>
            )}
          </>
        )}
      </div>
    </div>
  )
}
