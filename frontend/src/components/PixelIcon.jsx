const C = {
  ink: '#062A1F',
  green: '#2E8B57',
  sage: '#7FA58E',
  mid: '#176044',
  cream: '#F5F1E3',
  gold: '#E8C95A',
  pink: '#F3A6B8',
  blue: '#7DA9C4',
  orange: '#E49A4A',
}

export default function PixelIcon({ name = 'spark', size = 32, className = '', title }) {
  const common = { fill: 'none', stroke: C.ink, strokeWidth: 2.5, strokeLinecap: 'square', strokeLinejoin: 'miter' }
  const icon = (() => {
    switch (name) {
      case 'wrench': return <><path {...common} d="M20 5a6 6 0 0 0-7.2 7.2L5 20l3 3 7.8-7.8A6 6 0 0 0 20 5Z"/><path {...common} d="m14 10 3 3"/><rect x="3" y="20" width="5" height="5" fill={C.orange} stroke={C.ink} strokeWidth="2"/></>
      case 'building': return <><rect x="6" y="3" width="20" height="26" fill={C.cream} stroke={C.ink} strokeWidth="2.5"/><path d="M9 7h4v4H9zM19 7h4v4h-4zM9 14h4v4H9zM19 14h4v4h-4z" fill={C.blue}/><path d="M14 22h5v7h-5z" fill={C.orange} stroke={C.ink} strokeWidth="2"/></>
      case 'hammer': return <><path d="M5 7h13v5H5z" fill={C.orange} stroke={C.ink} strokeWidth="2.5"/><path {...common} d="M18 10 8 27"/><rect x="7" y="25" width="5" height="4" fill={C.mid}/></>
      case 'chart': return <><path {...common} d="M5 27V7M5 27h22"/><rect x="9" y="18" width="4" height="7" fill={C.sage}/><rect x="15" y="13" width="4" height="12" fill={C.green}/><rect x="21" y="7" width="4" height="18" fill={C.gold}/></>
      case 'flask': return <><path d="M11 4h10M14 4v8l-7 13h18l-7-13V4" fill={C.cream} stroke={C.ink} strokeWidth="2.5"/><path d="M10 21h12l2 4H8z" fill={C.blue}/><rect x="13" y="16" width="6" height="3" fill={C.green}/></>
      case 'document': return <><path d="M7 3h13l6 6v20H7z" fill={C.cream} stroke={C.ink} strokeWidth="2.5"/><path d="M20 3v7h6" fill={C.gold} stroke={C.ink} strokeWidth="2.5"/><path {...common} d="M11 16h10M11 21h10M11 26h7"/></>
      case 'palette': return <><path d="M16 4C9 4 4 9 4 15c0 7 7 12 13 12h2c2 0 3-3 1-4l-2-2c-1-1 0-3 2-3h3c3 0 5-2 5-5 0-5-5-9-12-9Z" fill={C.cream} stroke={C.ink} strokeWidth="2.5"/><rect x="9" y="10" width="3" height="3" fill={C.pink}/><rect x="15" y="8" width="3" height="3" fill={C.blue}/><rect x="21" y="11" width="3" height="3" fill={C.gold}/><rect x="10" y="17" width="3" height="3" fill={C.green}/></>
      case 'film': return <><rect x="5" y="6" width="22" height="20" fill={C.cream} stroke={C.ink} strokeWidth="2.5"/><path d="M5 11h22M5 21h22" stroke={C.ink} strokeWidth="2.5"/><path d="M10 6v5M18 6v5M10 21v5M18 21v5" stroke={C.orange} strokeWidth="2.5"/><path d="m14 14 6 3-6 3z" fill={C.green} stroke={C.ink} strokeWidth="2"/></>
      case 'users': return <><circle cx="11" cy="10" r="4" fill={C.gold} stroke={C.ink} strokeWidth="2.5"/><circle cx="22" cy="11" r="3" fill={C.blue} stroke={C.ink} strokeWidth="2.5"/><path d="M4 27c0-5 3-8 7-8s7 3 7 8M17 27c0-3 2-6 5-6s5 2 6 6" fill={C.cream} stroke={C.ink} strokeWidth="2.5"/></>
      case 'heart': return <path d="M16 27 6 17c-4-4-2-10 3-11 3-.6 5 1 7 3 2-2 4-3.6 7-3 5 1 7 7 3 11Z" fill={C.pink} stroke={C.ink} strokeWidth="2.5"/>
      case 'book': return <><path d="M5 6h9c3 0 5 2 5 5v16H10c-3 0-5-2-5-5z" fill={C.cream} stroke={C.ink} strokeWidth="2.5"/><path d="M19 11c0-3 2-5 5-5h3v16c0 3-2 5-5 5h-3z" fill={C.blue} stroke={C.ink} strokeWidth="2.5"/><path {...common} d="M9 11h5M9 16h5"/></>
      case 'crown': return <path d="m5 10 6 5 5-9 5 9 6-5-2 15H7z" fill={C.gold} stroke={C.ink} strokeWidth="2.5"/>
      case 'calculator': return <><rect x="6" y="3" width="20" height="26" fill={C.cream} stroke={C.ink} strokeWidth="2.5"/><rect x="10" y="7" width="12" height="5" fill={C.blue} stroke={C.ink} strokeWidth="2"/><path d="M10 16h4v4h-4zM18 16h4v4h-4zM10 22h4v4h-4zM18 22h4v4h-4z" fill={C.green}/></>
      case 'database': return <><ellipse cx="16" cy="7" rx="10" ry="4" fill={C.blue} stroke={C.ink} strokeWidth="2.5"/><path d="M6 7v9c0 2 4 4 10 4s10-2 10-4V7M6 16v9c0 2 4 4 10 4s10-2 10-4v-9" fill={C.cream} stroke={C.ink} strokeWidth="2.5"/><path d="M7 12c3 2 15 2 18 0" stroke={C.ink} strokeWidth="2"/></>
      case 'spreadsheet': return <><rect x="5" y="4" width="22" height="24" fill={C.cream} stroke={C.ink} strokeWidth="2.5"/><path d="M5 10h22M5 17h22M5 23h22M12 4v24M20 4v24" stroke={C.ink} strokeWidth="2"/><rect x="13" y="11" width="6" height="5" fill={C.green}/></>
      case 'scales': return <><path d="M16 5v21M9 8h14M6 27h20" stroke={C.ink} strokeWidth="2.5"/><path d="m4 9-5 9h10zM28 9l-5 9h10z" fill={C.gold} stroke={C.ink} strokeWidth="2.5"/></>
      case 'briefcase': return <><rect x="4" y="9" width="24" height="17" fill={C.orange} stroke={C.ink} strokeWidth="2.5"/><path d="M11 9V6h10v3M4 15h24M13 15v3h6v-3" fill="none" stroke={C.ink} strokeWidth="2.5"/></>
      case 'spark': return <path d="M16 2v8M16 22v8M2 16h8M22 16h8M6 6l6 6M20 20l6 6M26 6l-6 6M12 20l-6 6" stroke={C.gold} strokeWidth="3"/>
      case 'rocket': return <><path d="M17 5c5-3 9-2 9-2s1 4-2 9l-8 8-6-6z" fill={C.blue} stroke={C.ink} strokeWidth="2.5"/><path d="m10 14-6 2 4 4 2-6M14 22l-2 6 4-4z" fill={C.orange} stroke={C.ink} strokeWidth="2"/><circle cx="20" cy="8" r="2" fill={C.cream}/></>
      case 'dna': return <><path d="M10 3c12 5 12 21 0 26M22 3C10 8 10 24 22 29M11 8h10M10 14h12M10 20h12M11 26h10" stroke={C.blue} strokeWidth="2.5"/></>
      case 'city': return <><path d="M4 28V13h7V8h7v7h7v13" fill={C.cream} stroke={C.ink} strokeWidth="2.5"/><path d="M7 17h2v3H7zM13 12h2v3h-2zM20 19h2v3h-2z" fill={C.blue}/><path d="M14 23h4v5h-4z" fill={C.orange}/></>
      case 'lightbulb': return <><path d="M10 18c-2-2-3-4-3-7a9 9 0 0 1 18 0c0 3-1 5-3 7l-2 3h-8z" fill={C.gold} stroke={C.ink} strokeWidth="2.5"/><path {...common} d="M11 25h10M13 29h6"/></>
      case 'stethoscope': return <><path d="M7 4v8a5 5 0 0 0 10 0V4M7 4H4M17 4h3" stroke={C.blue} strokeWidth="2.5" fill="none"/><path d="M17 17h3a7 7 0 0 1 7 7v2" stroke={C.ink} strokeWidth="2.5" fill="none"/><circle cx="27" cy="27" r="3" fill={C.green} stroke={C.ink} strokeWidth="2"/></>
      case 'theater': return <><path d="M4 6h24v20H4z" fill={C.cream} stroke={C.ink} strokeWidth="2.5"/><path d="M9 11c3-2 6 1 5 4-1 4-6 5-8 2 0-2 1-4 3-6ZM23 11c-3-2-6 1-5 4 1 4 6 5 8 2 0-2-1-4-3-6Z" fill={C.pink} stroke={C.ink} strokeWidth="2"/></>
      case 'gear': return <path d="m13 3 2 3a10 10 0 0 1 3 0l2-3 4 3-2 3a10 10 0 0 1 2 3l4 1-1 5-4-1a10 10 0 0 1-2 3l2 3-4 3-2-3a10 10 0 0 1-3 0l-2 3-4-3 2-3a10 10 0 0 1-2-3l-4 1-1-5 4-1a10 10 0 0 1 2-3L5 6z" fill={C.green} stroke={C.ink} strokeWidth="2.5"/>
      case 'target': return <><circle cx="16" cy="16" r="12" fill={C.cream} stroke={C.ink} strokeWidth="2.5"/><circle cx="16" cy="16" r="7" fill={C.pink} stroke={C.ink} strokeWidth="2.5"/><circle cx="16" cy="16" r="2.5" fill={C.green}/></>
      case 'check': return <path d="m6 17 6 6 14-15" stroke={C.green} strokeWidth="4" fill="none"/>
      case 'cross': return <path d="m7 7 18 18M25 7 7 25" stroke={C.pink} strokeWidth="4"/>
      case 'warning': return <><path d="M16 4 29 27H3z" fill={C.gold} stroke={C.ink} strokeWidth="2.5"/><path d="M16 11v8M16 23v1" stroke={C.ink} strokeWidth="3"/></>
      case 'menu': return <path d="M5 8h22M5 16h22M5 24h22" stroke={C.cream} strokeWidth="3"/>
      case 'close': return <path d="m7 7 18 18M25 7 7 25" stroke={C.cream} strokeWidth="3"/>
      case 'back': return <><path d="M27 16H6M6 16l8-8M6 16l8 8" stroke={C.green} strokeWidth="3"/></>
      case 'forward': return <path d="M5 16h21M26 16l-8-8M26 16l-8 8" stroke={C.cream} strokeWidth="3"/>
      case 'hint': return <><path d="M10 18c-2-2-3-4-3-7a9 9 0 0 1 18 0c0 3-1 5-3 7l-2 3h-8z" fill={C.gold} stroke={C.ink} strokeWidth="2.5"/><path d="M16 8v6M13 11h6" stroke={C.ink} strokeWidth="2.5"/></>
      default: return <path d="M16 3v26M3 16h26" stroke={C.gold} strokeWidth="3"/>
    }
  })()
  return (
    <svg className={`pixel-icon ${className}`} width={size} height={size} viewBox="0 0 32 32" aria-hidden={title ? undefined : true} role={title ? 'img' : undefined} shapeRendering="crispEdges">
      {title && <title>{title}</title>}
      {icon}
    </svg>
  )
}
