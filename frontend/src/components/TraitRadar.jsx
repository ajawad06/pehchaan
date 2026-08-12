import { Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer } from 'recharts'
import { useSession } from '../store/SessionContext'

export default function TraitRadar() {
  const { traits } = useSession()
  
  const data = [
    { subject: 'Realistic (R)', A: traits.R, fullMark: 1 },
    { subject: 'Investigative (I)', A: traits.I, fullMark: 1 },
    { subject: 'Artistic (A)', A: traits.A, fullMark: 1 },
    { subject: 'Social (S)', A: traits.S, fullMark: 1 },
    { subject: 'Enterprising (E)', A: traits.E, fullMark: 1 },
    { subject: 'Conventional (C)', A: traits.C, fullMark: 1 },
  ]

  return (
    <div className="w-full h-64 mt-8">
      <ResponsiveContainer width="100%" height="100%">
        <RadarChart cx="50%" cy="50%" outerRadius="80%" data={data}>
          <PolarGrid />
          <PolarAngleAxis dataKey="subject" />
          <PolarRadiusAxis angle={30} domain={[0, 1]} />
          <Radar name="Traits" dataKey="A" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.6} />
        </RadarChart>
      </ResponsiveContainer>
    </div>
  )
}
