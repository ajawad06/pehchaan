import { useState, useEffect } from 'react'
import { useSession } from '../store/SessionContext'
import TraitRadar from './TraitRadar'
import { saveRecommendations } from '../services/db'

export default function ResultsScreen() {
  const { traits, sessionId } = useSession()
  const [results, setResults] = useState(null)
  const [explanations, setExplanations] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    async function fetchPrediction() {
      try {
        const response = await fetch('http://127.0.0.1:8000/predict', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ trait_vector: traits })
        })
        if (!response.ok) throw new Error('Prediction failed')
        const data = await response.json()
        setResults(data.ranked_clusters)
        
        if (sessionId) {
          await saveRecommendations(sessionId, data.ranked_clusters, data.model_version)
        }
        
        try {
          const expRes = await fetch('http://127.0.0.1:8000/explain', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              ranked_clusters: data.ranked_clusters,
              language: 'en',
              age_band: '15-17'
            })
          })
          if (expRes.ok) {
            const expData = await expRes.json()
            setExplanations(expData.explanations)
          }
        } catch (e) {
          console.error('Explanation fetch failed:', e)
        }
      } catch (err) {
        setError(err.message)
      } finally {
        setLoading(false)
      }
    }
    
    fetchPrediction()
  }, [traits, sessionId])

  return (
    <div className="flex flex-col items-center p-8 bg-green-dark min-h-screen">
      <h1 className="text-4xl font-baloo font-bold text-gold mb-8">Your Career Profile</h1>
      
      <div className="w-full max-w-2xl bg-green-mid rounded-xl p-6 shadow-md mb-8">
        <h2 className="text-xl font-semibold mb-4 text-center">Trait Analysis</h2>
        <TraitRadar />
      </div>

      <div className="w-full max-w-2xl bg-green-dark rounded-xl shadow-md p-6 border">
        <h2 className="text-xl font-semibold mb-6">Top Career Matches</h2>
        
        {loading && <p>Analyzing your traits...</p>}
        {error && <p className="text-red-500">Error: {error}</p>}
        
        {results && (
          <div className="space-y-4">
            {results.map((cluster, i) => (
              <div key={cluster.cluster_id} className="flex flex-col p-4 border rounded-lg hover:shadow-sm">
                <div className="flex justify-between items-center w-full">
                  <span className="font-medium text-lg text-gold capitalize">
                    {i + 1}. {cluster.cluster_id.replace('_', ' ')}
                  </span>
                  <span className="text-gold-bright font-bold bg-green-mid px-3 py-1 rounded-full whitespace-nowrap ml-4">
                    {Math.round(cluster.confidence * 100)}% Match
                  </span>
                </div>
                {explanations && explanations[cluster.cluster_id] && (
                  <div className="mt-3 text-sm text-cream/90 bg-green-mid/50 p-3 rounded-lg border border-gold/20">
                    ✨ {explanations[cluster.cluster_id]}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
