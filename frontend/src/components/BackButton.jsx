import { useNavigate } from 'react-router-dom'
import PixelIcon from './PixelIcon'

export default function BackButton({ to = '/', label = 'Back to Home', light = false }) {
  const navigate = useNavigate()
  return (
    <div className="absolute top-4 left-4 sm:top-6 sm:left-6 z-50 pointer-events-none">
      <button 
        onClick={() => navigate(to)} 
        className={`pixel-button ghost text-xs sm:text-sm py-1.5 px-3 sm:py-2 sm:px-4 pointer-events-auto flex items-center gap-1.5 ${light ? 'light' : ''}`}
        style={{ fontSize: '13px' }}
      >
        <span className="font-mono">←</span> {label}
      </button>
    </div>
  )
}
