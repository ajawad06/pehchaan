import React, { Component } from 'react'
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { SessionProvider } from './store/SessionContext'
import OnboardingFlow from './components/OnboardingFlow'
import PatternHunter from './components/PatternHunter'
import CreativeUses from './components/CreativeUses'
import CreativeProblemSolver from './components/CreativeProblemSolver'
import DataDetective from './components/DataDetective'
import CareerSimulation from './components/CareerSimulation'
import ResultsScreen from './components/ResultsScreen'
import LandingPage from './components/LandingPage'
import DecisionLab from './components/DecisionLab'
import NumericalReasoning from './components/NumericalReasoning'
import VisualSpatial from './components/VisualSpatial'
import PersonalityAssessment from './components/PersonalityAssessment'
import MemoryGame from './components/MemoryGame'
import AttentionGame from './components/AttentionGame'
import LearningAgility from './components/LearningAgility'
import InstinctSwipe from './components/InstinctSwipe'
import CreativeComposition from './components/CreativeComposition'
import NarrativeBuilder from './components/NarrativeBuilder'
import EmpathyScenario from './components/EmpathyScenario'
import Tier2Disambiguation from './components/Tier2Disambiguation'
import { useOfflineSync } from './services/offlineQueue'

import './index.css'

class ErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error }
  }

  componentDidCatch(error, errorInfo) {
    console.error("Uncaught UI Error:", error, errorInfo)
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-green-deepest text-ivory flex flex-col items-center justify-center p-6 text-center">
          <div className="pixel-panel p-8 max-w-md w-full">
            <h2 className="text-2xl font-bold mb-4">Something went wrong</h2>
            <p className="text-sm mb-6 text-text-muted">An error occurred while loading this activity.</p>
            <button 
              onClick={() => window.location.href = '/'}
              className="pixel-button light w-full"
            >
              Return Home
            </button>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}

function App() {
  const isOnline = useOfflineSync()

  return (
    <ErrorBoundary>
      <SessionProvider>
        <Router>
          {!isOnline && (
            <div className="offline-ribbon">Offline Mode Active</div>
          )}
          <div className={!isOnline ? 'offline-ribbon-spacer' : undefined}>
          <Routes>
            <Route path="/" element={<LandingPage />} />
            <Route path="/start" element={<OnboardingFlow />} />
            <Route path="/personality" element={<PersonalityAssessment />} />
            <Route path="/instinct-swipe" element={<InstinctSwipe />} />
            <Route path="/memory-game" element={<MemoryGame />} />
            <Route path="/attention-game" element={<AttentionGame />} />
            <Route path="/learning-agility" element={<LearningAgility />} />
            <Route path="/pattern-hunter" element={<PatternHunter />} />
            <Route path="/decision-lab" element={<DecisionLab />} />
            <Route path="/creative-uses" element={<CreativeUses />} />
            <Route path="/creative-problem-solver" element={<CreativeProblemSolver />} />
            <Route path="/data-detective" element={<DataDetective />} />
            <Route path="/numerical-reasoning" element={<NumericalReasoning />} />
            <Route path="/visual-spatial" element={<VisualSpatial />} />
            <Route path="/creative-composition" element={<CreativeComposition />} />
            <Route path="/narrative-builder" element={<NarrativeBuilder />} />
            <Route path="/empathy-scenario" element={<EmpathyScenario />} />
            <Route path="/career-simulation" element={<CareerSimulation />} />
            <Route path="/tier2-disambiguation" element={<Tier2Disambiguation />} />
            <Route path="/results" element={<ResultsScreen />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
          </div>
        </Router>
      </SessionProvider>
    </ErrorBoundary>
  )
}

export default App
