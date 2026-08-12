import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'

export default function Navbar() {
  return (
    <motion.nav 
      initial={{ y: -50, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
      className="fixed top-6 left-1/2 -translate-x-1/2 z-50 w-[90%] max-w-5xl"
    >
      <div className="flex items-center justify-between px-8 py-4 bg-bg-glass backdrop-blur-xl border border-border-glass rounded-full shadow-2xl">
        <Link to="/" className="text-xl font-bold tracking-widest text-ivory flex items-center gap-2">
          PEHCHAAN
        </Link>
        
        <div className="hidden md:flex items-center gap-8 text-sm font-medium text-text-muted">
          <Link to="/" onClick={() => window.scrollTo(0,0)} className="hover:text-ivory transition-colors">Discover</Link>
          <a href="#how-it-works" className="hover:text-ivory transition-colors">How It Works</a>
          <a href="#insights" className="hover:text-ivory transition-colors">Insights</a>
          <a href="#our-story" className="hover:text-ivory transition-colors">Our Story</a>
        </div>
        
        <Link to="/start" className="bg-ivory text-green-dark px-6 py-2.5 rounded-full text-sm font-semibold hover:bg-soft-white transition-all hover:scale-105 shadow-sm">
          Start Exploring
        </Link>
      </div>
    </motion.nav>
  )
}
