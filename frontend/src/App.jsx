import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { useState } from 'react'
import { SessionProvider } from './store/SessionContext'
import OnboardingFlow from './components/OnboardingFlow'
import PatternHunter from './components/PatternHunter'
import CreativeUses from './components/CreativeUses'
import CreativeProblemSolver from './components/CreativeProblemSolver'
import DataDetective from './components/DataDetective'
import CareerSimulation from './components/CareerSimulation'
import ResultsScreen from './components/ResultsScreen'
import AzaadiHero from './components/AzaadiHero'
import { useOfflineSync } from './services/offlineQueue'

import './index.css'

function App() {
  const [theme, setTheme] = useState('theme-12-14')
  const isOnline = useOfflineSync()

  return (
    <SessionProvider>
      <Router>
        {!isOnline && (
          <div className="w-full bg-red-600 text-white text-center py-1 font-bold text-sm absolute top-0 z-50">
            Offline Mode Active
          </div>
        )}
        <Routes>
          <Route path="/" element={<AzaadiHero />} />
          <Route path="/start" element={<OnboardingFlow />} />
              <Route path="/pattern-hunter" element={<PatternHunter />} />
              <Route path="/decision-lab" element={<CreativeUses />} />
              <Route path="/creative-problem-solver" element={<CreativeProblemSolver />} />
              <Route path="/data-detective" element={<DataDetective />} />
          <Route path="/career-simulation" element={<CareerSimulation />} />
          <Route path="/results" element={<ResultsScreen />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Router>
    </SessionProvider>
  )
}

export default App
