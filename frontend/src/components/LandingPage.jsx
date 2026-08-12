import { motion } from 'framer-motion'
import { Link } from 'react-router-dom'
import Navbar from './Navbar'

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-green-deepest text-ivory font-sans selection:bg-sage selection:text-green-deepest">
      <Navbar />

      {/* Hero Section */}
      <section className="relative min-h-screen flex flex-col items-center justify-center pt-32 px-6 overflow-hidden">
        {/* Subtle background paths/neural networks */}
        <div className="absolute inset-0 z-0 opacity-20 pointer-events-none">
          <svg className="w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
            <motion.path 
              d="M0,50 Q25,30 50,50 T100,50" 
              fill="none" 
              stroke="var(--sage)" 
              strokeWidth="0.1"
              initial={{ pathLength: 0, opacity: 0 }}
              animate={{ pathLength: 1, opacity: 1 }}
              transition={{ duration: 3, ease: "easeInOut" }}
            />
            <motion.path 
              d="M0,80 Q40,90 60,60 T100,20" 
              fill="none" 
              stroke="var(--sage)" 
              strokeWidth="0.05"
              initial={{ pathLength: 0, opacity: 0 }}
              animate={{ pathLength: 1, opacity: 1 }}
              transition={{ duration: 4, ease: "easeInOut", delay: 0.5 }}
            />
          </svg>
        </div>

        <div className="z-10 max-w-7xl w-full grid md:grid-cols-2 gap-12 items-center">
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 1, ease: [0.16, 1, 0.3, 1] }}
          >
            <h1 className="text-5xl md:text-7xl lg:text-8xl font-medium tracking-tight leading-[1.1] mb-6">
              You don't need <br className="hidden lg:block"/> another career test.
            </h1>
            <h2 className="text-4xl md:text-5xl font-medium text-sage mb-8 tracking-tight">
              You need to <br className="hidden lg:block"/> understand yourself.
            </h2>
            
            <p className="text-lg md:text-xl text-text-muted mb-10 font-light leading-relaxed max-w-lg">
              Pehchaan helps you discover the fields, strengths and career paths that fit the way you think, create and solve problems.
            </p>
            
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6">
              <Link 
                to="/start" 
                className="group relative bg-ivory text-green-dark px-8 py-4 rounded-full text-lg font-semibold hover:bg-soft-white transition-all hover:scale-[1.02] overflow-hidden shadow-lg"
              >
                <span className="relative z-10 flex items-center gap-2">
                  Discover My Path
                  <span className="group-hover:translate-x-1 transition-transform">→</span>
                </span>
              </Link>
              <a href="#how-it-works" className="text-text-muted hover:text-ivory transition-colors text-lg font-medium">
                How It Works
              </a>
            </div>
            
            <p className="mt-8 text-sm text-sage/70 font-light tracking-wide uppercase">No boring career tests.</p>
          </motion.div>

          {/* 3D Student Animation */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
            className="relative hidden md:block"
          >
            <motion.img 
              animate={{ y: [-15, 15, -15] }}
              transition={{ repeat: Infinity, duration: 6, ease: "easeInOut" }}
              src="/student-3d.png" 
              alt="Student exploring career paths"
              className="w-full max-w-lg mx-auto drop-shadow-2xl object-contain"
            />
          </motion.div>
        </div>
      </section>

      {/* Problem Section (Ivory) */}
      <section className="bg-ivory text-green-dark py-32 px-6">
        <div className="max-w-4xl mx-auto text-center">
          <motion.h2 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-100px" }}
            className="text-4xl md:text-6xl font-medium tracking-tight mb-16 leading-tight"
          >
            Most students choose a career before they know themselves.
          </motion.h2>
          
          <div className="grid md:grid-cols-2 gap-12 text-left">
            <motion.div 
              initial={{ opacity: 0, x: -20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              className="space-y-4"
            >
              <p className="text-xl md:text-2xl font-light text-green-secondary leading-relaxed">
                Marks tell you what you studied.<br/>
                <span className="font-medium text-green-dark">They don't always tell you what you're good at.</span>
              </p>
            </motion.div>
            
            <motion.div 
              initial={{ opacity: 0, x: 20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              className="space-y-4"
            >
              <p className="text-xl md:text-2xl font-light text-green-secondary leading-relaxed">
                Interests tell you what attracts you.<br/>
                <span className="font-medium text-green-dark">They don't always tell you where you'll thrive.</span>
              </p>
            </motion.div>
          </div>
          
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="mt-24 pt-12 border-t border-green-primary/10"
          >
            <p className="text-3xl font-medium text-green-primary">Pehchaan looks at both.</p>
          </motion.div>
        </div>
      </section>

      {/* How it Works */}
      <section id="how-it-works" className="bg-green-primary py-32 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="mb-20">
            <h2 className="text-sm font-bold tracking-widest text-sage uppercase mb-4">The Methodology</h2>
            <h3 className="text-4xl md:text-5xl font-medium tracking-tight">How Pehchaan Works</h3>
          </div>
          
          <div className="grid md:grid-cols-3 gap-8">
            <div className="bg-green-dark/40 border border-border-glass p-10 rounded-[28px] hover:border-sage/30 transition-colors">
              <div className="text-sage text-sm font-mono mb-6">01</div>
              <h4 className="text-2xl font-medium mb-4">Tell Us What Interests You</h4>
              <p className="text-text-muted font-light leading-relaxed">Choose broad areas you are curious about. This is a preference signal, not the final recommendation.</p>
            </div>
            
            <div className="bg-green-dark/40 border border-border-glass p-10 rounded-[28px] hover:border-sage/30 transition-colors">
              <div className="text-sage text-sm font-mono mb-6">02</div>
              <h4 className="text-2xl font-medium mb-4">Play. Don't Just Answer.</h4>
              <p className="text-text-muted font-light leading-relaxed">Interact with logic puzzles, spatial reasoning tasks, and creative challenges instead of boring MCQs.</p>
            </div>
            
            <div className="bg-green-dark/40 border border-border-glass p-10 rounded-[28px] hover:border-sage/30 transition-colors">
              <div className="text-sage text-sm font-mono mb-6">03</div>
              <h4 className="text-2xl font-medium mb-4">Discover Your Direction</h4>
              <p className="text-text-muted font-light leading-relaxed">See potential career fits based on your observed cognitive patterns and true problem-solving style.</p>
            </div>
          </div>
        </div>
      </section>
      
      {/* Insights Section */}
      <section id="insights" className="bg-ivory text-green-dark py-32 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="mb-20">
            <h2 className="text-sm font-bold tracking-widest text-green-secondary uppercase mb-4">The Science</h2>
            <h3 className="text-4xl md:text-5xl font-medium tracking-tight">The Pehchaan Engine</h3>
          </div>
          
          <div className="grid md:grid-cols-2 gap-16 items-center">
            <div className="space-y-8">
              <p className="text-xl font-light leading-relaxed">
                We don't just ask you what you want to be. We measure how you think. By analyzing your telemetry during interactive simulations, we build a multi-dimensional cognitive profile.
              </p>
              <ul className="space-y-4">
                <li className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-full bg-green-primary/10 flex items-center justify-center text-xl">🎯</div>
                  <span className="font-medium text-lg">Behavioral Telemetry</span>
                </li>
                <li className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-full bg-green-primary/10 flex items-center justify-center text-xl">🧠</div>
                  <span className="font-medium text-lg">Cognitive Pattern Analysis</span>
                </li>
                <li className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-full bg-green-primary/10 flex items-center justify-center text-xl">🤖</div>
                  <span className="font-medium text-lg">ML-Powered Career Clustering</span>
                </li>
              </ul>
            </div>
            
            <div className="bg-green-primary text-ivory p-10 rounded-[32px] shadow-2xl relative overflow-hidden">
              <div className="absolute top-0 right-0 w-64 h-64 bg-sage/10 rounded-full blur-3xl transform translate-x-1/2 -translate-y-1/2"></div>
              <h4 className="text-2xl font-medium mb-8">Data-Driven Discovery</h4>
              <div className="space-y-6">
                <div>
                  <div className="flex justify-between text-sm mb-2 text-sage">
                    <span>Spatial Reasoning</span>
                    <span>High Affinity</span>
                  </div>
                  <div className="h-2 w-full bg-green-dark rounded-full overflow-hidden">
                    <div className="h-full bg-ivory w-[85%] rounded-full"></div>
                  </div>
                </div>
                <div>
                  <div className="flex justify-between text-sm mb-2 text-sage">
                    <span>Creative Problem Solving</span>
                    <span>Strong</span>
                  </div>
                  <div className="h-2 w-full bg-green-dark rounded-full overflow-hidden">
                    <div className="h-full bg-ivory w-[72%] rounded-full"></div>
                  </div>
                </div>
                <div>
                  <div className="flex justify-between text-sm mb-2 text-sage">
                    <span>Numerical Logic</span>
                    <span>Developing</span>
                  </div>
                  <div className="h-2 w-full bg-green-dark rounded-full overflow-hidden">
                    <div className="h-full bg-ivory w-[45%] rounded-full"></div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Our Story Section */}
      <section id="our-story" className="bg-green-primary py-32 px-6 border-t border-border-glass">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-sm font-bold tracking-widest text-sage uppercase mb-4">Our Mission</h2>
          <h3 className="text-4xl md:text-5xl font-medium tracking-tight mb-12">Built for the decisions Pakistani students actually face.</h3>
          
          <p className="text-xl font-light text-text-muted leading-relaxed mb-8">
            Pehchaan was created because traditional career counseling in Pakistan relies too heavily on grades, societal pressure, and outdated assumptions. 
          </p>
          <p className="text-xl font-light text-text-muted leading-relaxed">
            We wanted to build an AI-native platform that helps the next generation of students in Pakistan discover their true potential based on how they actually think and solve problems, not just what they memorized for an exam.
          </p>
        </div>
      </section>
      
      {/* Footer CTA */}
      <section className="bg-green-deepest py-32 px-6 text-center border-t border-border-glass">
        <h2 className="text-4xl md:text-6xl font-medium tracking-tight mb-10">Ready to discover your direction?</h2>
        <Link 
          to="/start" 
          className="inline-block bg-ivory text-green-dark px-10 py-5 rounded-full text-xl font-semibold hover:bg-soft-white transition-all hover:scale-105"
        >
          Start Pehchaan →
        </Link>
        <div className="mt-20 flex justify-center items-center gap-2 text-sage/60 font-medium">
          <span className="text-xl font-serif">پہچان</span>
          <span className="text-sm">| Know yourself. Find your direction.</span>
        </div>
      </section>
    </div>
  )
}
