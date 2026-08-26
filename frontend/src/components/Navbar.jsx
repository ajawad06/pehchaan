import { useState } from 'react'
import { Link } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { Menu, X } from 'lucide-react'

export default function Navbar() {
  const [menuOpen, setMenuOpen] = useState(false)

  return (
    <motion.nav 
      initial={{ y: -50, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
      className="fixed top-4 sm:top-6 left-1/2 -translate-x-1/2 z-50 w-[92%] sm:w-[90%] max-w-5xl"
    >
      <div className="flex items-center justify-between px-4 sm:px-8 py-3 sm:py-4 bg-bg-glass backdrop-blur-xl border border-border-glass rounded-pill shadow-cushion">
        <Link to="/" className="text-base sm:text-xl font-bold tracking-wide sm:tracking-widest text-ivory flex items-center gap-2 shrink-0">
          PEHCHAAN
        </Link>
        
        <div className="hidden md:flex items-center gap-8 text-sm font-medium text-text-muted">
          <Link to="/" onClick={() => window.scrollTo(0,0)} className="hover:text-ivory transition-colors">Discover</Link>
          <a href="#how-it-different" className="hover:text-ivory transition-colors">How It Works</a>
          <Link to="/dashboard" className="hover:text-ivory transition-colors">Dashboard</Link>
        </div>
        
        <div className="flex items-center gap-2 sm:gap-3">
          <motion.div whileTap={{ scale: [1, 0.92, 1.03, 1] }} transition={{ duration: 0.3, ease: [0.34, 1.56, 0.64, 1] }} className="shrink-0">
            <Link to="/start" className="inline-block bg-ivory text-green-dark px-4 py-2 sm:px-6 sm:py-2.5 rounded-pill text-xs sm:text-sm font-semibold hover:bg-soft-white transition-colors hover:scale-105 shadow-cushion-sm whitespace-nowrap">
              Start
            </Link>
          </motion.div>

          <button
            onClick={() => setMenuOpen((v) => !v)}
            className="md:hidden text-ivory p-1.5 shrink-0"
            aria-label={menuOpen ? "Close menu" : "Open menu"}
          >
            {menuOpen ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>
      </div>

      {/* Mobile dropdown menu */}
      <AnimatePresence>
        {menuOpen && (
          <motion.div
            initial={{ opacity: 0, y: -8, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.97 }}
            transition={{ duration: 0.25, ease: [0.34, 1.56, 0.64, 1] }}
            className="md:hidden mt-2 bg-bg-glass backdrop-blur-xl border border-border-glass rounded-card shadow-cushion overflow-hidden"
          >
            <Link
              to="/"
              onClick={() => { window.scrollTo(0, 0); setMenuOpen(false) }}
              className="block px-6 py-3.5 text-ivory text-sm font-medium border-b border-border-glass/50"
            >
              Discover
            </Link>
            <a
              href="#how-it-different"
              onClick={() => setMenuOpen(false)}
              className="block px-6 py-3.5 text-ivory text-sm font-medium border-b border-border-glass/50"
            >
              How It Works
            </a>
            <Link
              to="/dashboard"
              onClick={() => setMenuOpen(false)}
              className="block px-6 py-3.5 text-ivory text-sm font-medium"
            >
              Dashboard
            </Link>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.nav>
  )
}
