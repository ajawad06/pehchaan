import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import Navbar from './Navbar'
import PixelIcon from './PixelIcon'

const games = [
  { title: 'Memory Match', desc: 'Test how sharply you recall details.', icon: 'book', path: '/memory-game' },
  { title: 'Pattern Hunter', desc: 'Spot the logic hiding in a sequence.', icon: 'chart', path: '/pattern-hunter' },
  { title: 'Decision Lab', desc: 'Trade-offs under pressure, gamified.', icon: 'scales', path: '/decision-lab' },
  { title: 'Career Simulation', desc: 'Live a day in a role before you pick it.', icon: 'briefcase', path: '/career-simulation' },
  { title: 'Instinct Swipe', desc: 'Quick gut calls, no overthinking.', icon: 'wrench', path: '/instinct-swipe' },
  { title: 'Data Detective', desc: 'Follow the clues hidden in the numbers.', icon: 'chart', path: '/data-detective' },
]

const compareQuiz = [
  'Rate yourself on abstract traits',
  'Pick A, B, C or D repeatedly',
  'Answer from memory, not instinct',
]

const comparePehchaan = [
  'Match cards to test working memory',
  'Swipe for gut-first decisions',
  'Play a real career scenario for a day',
]

export default function LandingPage() {
  return (
    <div className="pixel-landing">
      <Navbar />

      <section className="pixel-hero">
        <div className="pixel-hero-content">
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: .55 }}
          >
            <div className="pixel-label" style={{ color: '#E8C95A' }}><PixelIcon name="spark" size={14} /> Not a quiz. A playground.</div>
            <div className="pixel-kicker" style={{ marginTop: 18 }}>Career discovery / playable</div>
            <h1 className="pixel-title">
              Find your path by <span className="accent">playing,</span> not filling bubbles.
            </h1>
            <p className="pixel-lede">
              Pehchaan replaces long career questionnaires with short interactive games that notice how you remember, solve, decide, create and adapt.
            </p>
            <div className="pixel-hero-actions">
              <Link to="/start" className="pixel-button light">Play the Games</Link>
              <a href="#how-it-works" className="pixel-button ghost">See how it works</a>
            </div>
            <div className="pixel-proof">Zero multiple choice. Zero score-bashing. Just signals.</div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, scale: .96 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: .55, delay: .08 }}
            className="pixel-hero-card"
            aria-label="Pehchaan pixel explorer scene"
          >
            <span className="pixel-float one">+1 badge earned!</span>
            <span className="pixel-float two">Explore →</span>
            <span className="pixel-float three">▣ traits</span>
            <div className="pixel-spark" style={{ position:'absolute', left:22, top:24 }}><PixelIcon name="spark" size={18} /></div>
            <div className="pixel-spark" style={{ position:'absolute', right:34, top:38 }}><PixelIcon name="spark" size={18} /></div>
            <div className="pixel-explorer" aria-hidden="true">
              <span className="hair" />
              <span className="head" />
              <span className="bag" />
              <span className="body" />
              <span className="tablet" />
              <span className="leg left" />
              <span className="leg right" />
              <span className="boot left" />
              <span className="boot right" />
            </div>
          </motion.div>
        </div>
        <div className="forest-floor" aria-hidden="true" />
      </section>

      <section id="how-it-works" className="pixel-section dark">
        <div className="pixel-container">
          <div className="pixel-section-kicker" style={{color:'#E8C95A'}}>01 / how it works</div>
          <h2 className="pixel-section-title">Quizzes ask. Games reveal.</h2>
          <p style={{maxWidth:720, color:'#B7C8BE', lineHeight:1.7, marginBottom:26}}>
            A checkbox tells us what you like to believe about yourself. A game shows what you actually do when the choice is live.
          </p>

          <div className="pixel-compare">
            <div className="pixel-compare-panel light">
              <div className="pixel-label" style={{color:'#7B8B84'}}>Typical career quiz</div>
              <h3 style={{margin:'18px 0 6px', fontSize:24}}>45 static questions</h3>
              <div className="pixel-list">
                {compareQuiz.map(item => <div className="pixel-list-row" key={item}><span className="pixel-x">×</span><span>{item}</span></div>)}
              </div>
              <div style={{marginTop:22, height:12, background:'#C9CEC7', border:'2px solid #10261D'}}><div style={{width:'30%', height:'100%', background:'#7FA58E'}} /></div>
              <small style={{display:'block', marginTop:8, color:'#6B7B73'}}>A flat progress bar. That’s it.</small>
            </div>

            <div className="pixel-compare-panel dark">
              <div className="pixel-label" style={{color:'#E8C95A'}}>Pehchaan</div>
              <h3 style={{margin:'18px 0 6px', fontSize:24}}>9 short mini-games</h3>
              <div className="pixel-list">
                {comparePehchaan.map(item => <div className="pixel-list-row" key={item}><span className="pixel-check"><PixelIcon name="check" size={18} /></span><span>{item}</span></div>)}
              </div>
              <div style={{marginTop:22, height:12, background:'#123B2A', border:'2px solid #062A1F'}}><div style={{width:'72%', height:'100%', background:'#F3A6B8'}} /></div>
              <small style={{display:'block', marginTop:8, color:'#AFC1B6'}}>Every tap teaches the model something real.</small>
            </div>
          </div>
        </div>
      </section>

      <section id="games" className="pixel-section dark" style={{paddingTop:10}}>
        <div className="pixel-container">
          <div className="pixel-section-kicker" style={{color:'#E8C95A'}}>02 / games hub</div>
          <h2 className="pixel-section-title">Six ways to show us who you are</h2>
          <div className="pixel-games">
            {games.map(game => (
              <Link key={game.path} to={game.path} className="pixel-game-card">
                <span className="pixel-game-icon"><PixelIcon name={game.icon} size={38} /></span>
                <span className="pixel-game-title">{game.title}</span>
                <span className="pixel-game-desc">{game.desc}</span>
                <span className="pixel-game-arrow">Open game</span>
              </Link>
            ))}
          </div>
          <div className="pixel-stats">
            <div className="pixel-stat"><strong>9</strong><span>Mini-games per run</span></div>
            <div className="pixel-stat"><strong>12</strong><span>Traits measured</span></div>
            <div className="pixel-stat"><strong>6</strong><span>Signal families</span></div>
            <div className="pixel-stat"><strong>15m</strong><span>Typical start-to-finish</span></div>
          </div>
        </div>
      </section>

      <section id="journey" className="pixel-section light">
        <div className="pixel-container" style={{textAlign:'center'}}>
          <div className="pixel-section-kicker" style={{color:'#176044'}}>03 / your journey</div>
          <h2 className="pixel-section-title">Curious → playing → discovering → exploring.</h2>
          <p style={{maxWidth:760, margin:'0 auto', color:'#40564C', lineHeight:1.7}}>
            Your results are framed as signals, patterns and strengths — not a clinical label. The goal is to help you explore possible paths with more context and more confidence.
          </p>
          <div style={{marginTop:28, display:'flex', justifyContent:'center', flexWrap:'wrap', gap:8}}>
            {['Curious','Playing','Discovering','Progressing','Revealing','Exploring'].map((item, i) => (
              <span key={item} className="pixel-label" style={{color:'#104D38'}}>{String(i+1).padStart(2,'0')} · {item}</span>
            ))}
          </div>
          <div style={{marginTop:34}}>
            <Link to="/start" className="pixel-button">Start your first run</Link>
          </div>
        </div>
      </section>

      <footer className="pixel-footer">
        <div className="forest-floor" aria-hidden="true" />
      </footer>
    </div>
  )
}
