import React from 'react'

interface PlayerCardModalProps {
  visible: boolean
  onClose: () => void
  data: {
    name?: string
    jerseyNumber?: string | number
    position?: string
    avatar?: string
    teamName?: string
    teamLogo?: string
    height?: number
    weight?: number
    age?: number
    footballAge?: number
    matches?: number
    goals?: number
    assists?: number
    mvp?: number
    radarData?: {
      speed: number
      shooting: number
      passing: number
      dribbling: number
      defense: number
      physical: number
    }
  }
}

const PlayerCardModal: React.FC<PlayerCardModalProps> = ({ visible, onClose, data }) => {
    if (!visible) return null

    const positionMap: Record<string, string> = {
        'FW': '前锋', 'ST': '中锋', 'RW': '右边锋', 'LW': '左边锋',
        'MF': '中场', 'CM': '中前卫', 'CDM': '后腰', 'CAM': '前腰', 'RM': '右前卫', 'LM': '左前卫',
        'DF': '后卫', 'CB': '中后卫', 'RB': '右后卫', 'LB': '左后卫',
        'GK': '门将'
    }

    const formatPosition = (pos?: string | string[]) => {
        if (!pos || pos === 'undefined') return '未设置位置'
        
        let parts: string[] = []
        if (Array.isArray(pos)) {
            parts = pos.map(p => p.trim().toUpperCase()).filter(Boolean)
        } else if (typeof pos === 'string') {
            parts = pos.split('/').map(p => p.trim().toUpperCase()).filter(Boolean)
        } else {
            return '未设置位置'
        }
        
        // 2. 映射为中文
        const cnParts = parts.map(p => positionMap[p] || p)
        
        // 3. 中文去重 (防止不同代码映射到同一中文导致的重复)
        const uniqueParts = Array.from(new Set(cnParts))
        
        return uniqueParts.join('/')
    }

    // Safe access to radarData with defaults
    const radarData = data.radarData || {
        speed: 50,
        shooting: 50,
        passing: 50,
        dribbling: 50,
        defense: 50,
        physical: 50
    }

    // Radar Chart Logic
    const size = 200
    const center = size / 2
    const radius = 70
    const dimensions = [
        { key: 'speed', label: '速度' },
        { key: 'shooting', label: '射门' },
        { key: 'passing', label: '传球' },
        { key: 'dribbling', label: '盘带' },
        { key: 'defense', label: '防守' },
        { key: 'physical', label: '力量' },
    ]

    const getCoordinates = (value: number, index: number, max: number = 100) => {
        const angle = (Math.PI * 2 * index) / 6 - Math.PI / 2
        const r = (value / max) * radius
        const x = center + r * Math.cos(angle)
        const y = center + r * Math.sin(angle)
        return { x, y }
    }

    const points = dimensions.map((dim, i) => {
        // @ts-ignore
        const value = radarData[dim.key] || 50
        const { x, y } = getCoordinates(value, i)
        return `${x},${y}`
    }).join(' ')

    const gridPoints = [20, 40, 60, 80, 100].map(level => {
        return dimensions.map((_, i) => {
            const { x, y } = getCoordinates(level, i)
            return `${x},${y}`
        }).join(' ')
    })

    // Calculate Overall Rating (Average)
    const overall = Math.round(
        Object.values(radarData).reduce((a: any, b: any) => a + b, 0) as number / 6
    )

    // Calculate Grade
    const getGradeInfo = (score: number) => {
        if (score >= 90) return { grade: 'S', color: 'text-yellow-400', border: 'border-yellow-400', shadow: 'shadow-yellow-500/50', bg: 'bg-yellow-500/10' }
        if (score >= 80) return { grade: 'A', color: 'text-purple-400', border: 'border-purple-400', shadow: 'shadow-purple-500/50', bg: 'bg-purple-500/10' }
        if (score >= 70) return { grade: 'B', color: 'text-violet-400', border: 'border-violet-400', shadow: 'shadow-violet-500/50', bg: 'bg-violet-500/10' }
        return { grade: 'C', color: 'text-gray-300', border: 'border-gray-400', shadow: 'shadow-gray-500/50', bg: 'bg-gray-500/10' }
    }
    const { grade, color, border, shadow, bg } = getGradeInfo(overall)
    const isStarPlayer = overall >= 90

    return (
        <div className="fixed inset-0 z-50 bg-black flex flex-col items-center justify-center animate-in fade-in duration-300" onClick={onClose}>
            
            <div className="relative w-full h-full bg-slate-900 overflow-hidden text-white flex flex-col" onClick={e => e.stopPropagation()}>
                {/* Background Grade Watermark */}
                <div className={`absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 text-[25rem] font-black pointer-events-none select-none leading-none opacity-5 ${color}`}>
                    {grade}
                </div>
                
                {/* Background Decor */}
                <div className={`absolute top-0 right-0 w-[500px] h-[500px] rounded-full ${bg} blur-[100px] -translate-y-1/2 translate-x-1/2 pointer-events-none`} />
                <div className="absolute bottom-0 left-0 w-[300px] h-[300px] rounded-full bg-violet-500/5 blur-[80px] translate-y-1/3 -translate-x-1/3 pointer-events-none" />

                {/* Main Content */}
                <div className="relative flex-1 flex flex-col items-center justify-between py-6 px-6 safe-area-inset-bottom h-full">
                    
                    {/* Header Row */}
                    <div className="w-full flex justify-between items-start pt-2 shrink-0">
                        {/* Left: OVR & Position */}
                        <div className="flex flex-col items-center">
                            <div className="relative">
                                <span className={`text-6xl sm:text-7xl font-black italic ${color} leading-none drop-shadow-2xl`} style={{ fontFamily: 'Impact, sans-serif' }}>
                                    {overall}
                                </span>
                                {isStarPlayer && (
                                    <span className="absolute -top-2 -right-3 text-xl sm:text-2xl animate-pulse">⭐</span>
                                )}
                            </div>
                            <span className="text-lg sm:text-xl font-black text-white/90 uppercase mt-1 tracking-wider border-b-2 border-white/20 pb-1 max-w-[120px] sm:max-w-full truncate text-center">
                                {formatPosition(data.position)}
                            </span>
                        </div>

                        {/* Right: Team & Info */}
                        <div className="flex flex-col items-end gap-2">
                             {data.teamLogo ? (
                                 <img src={data.teamLogo} className="w-12 h-12 sm:w-16 sm:h-16 object-contain drop-shadow-xl" alt="team" />
                             ) : (
                                 <div className="w-12 h-12 sm:w-16 sm:h-16 rounded-full bg-white/5 border border-white/10 flex items-center justify-center">
                                     <span className="text-[10px] text-white/30">LOGO</span>
                                 </div>
                             )}
                             <div className="flex flex-col items-end">
                                 <span className="text-2xl sm:text-3xl font-bold italic text-white/90 leading-none">{data.jerseyNumber || '-'}</span>
                                 <span className="text-[10px] text-white/50 tracking-[0.2em] font-bold">NUMBER</span>
                             </div>
                        </div>
                    </div>

                    {/* Center: Avatar & Radar */}
                    <div className="flex-1 flex flex-col items-center justify-center w-full min-h-0">
                        {/* Avatar */}
                        <div className={`relative w-32 h-32 sm:w-40 sm:h-40 rounded-full border-[3px] ${border} ${shadow} overflow-hidden bg-slate-800 z-10 shrink-0`}>
                            {data.avatar ? (
                                <img src={data.avatar} className="w-full h-full object-cover" alt="avatar" />
                            ) : (
                                <div className="w-full h-full bg-slate-700 flex items-center justify-center text-slate-500">
                                    No Image
                                </div>
                            )}
                        </div>
                        
                        {/* Name */}
                        <h1 className="text-3xl sm:text-4xl font-black text-white italic uppercase tracking-tighter mt-3 mb-1 text-center drop-shadow-lg leading-none max-w-full truncate px-4 shrink-0">
                            {data.name || 'Unknown'}
                        </h1>
                        
                        {/* Physical Info */}
                        <div className="flex items-center gap-3 text-[10px] sm:text-xs font-bold text-white/40 tracking-widest mb-2 shrink-0">
                             {data.age && <span>{data.age} AGE</span>}
                             {data.footballAge && <span>{data.footballAge} YEAR</span>}
                             {(data.height || data.weight) && (
                                <>
                                    <span>|</span>
                                    <span>{data.height}CM</span>
                                    <span>{data.weight}KG</span>
                                </>
                             )}
                        </div>

                        {/* Radar Chart - Flexible Height */}
                        <div className="w-full flex-1 flex items-center justify-center min-h-[180px] max-h-[260px] relative">
                             <div className="absolute inset-0 flex items-center justify-center scale-105 sm:scale-110">
                                <svg width="100%" height="100%" viewBox="0 0 200 200" className="overflow-visible w-full h-full max-w-[280px] max-h-[280px]">
                                    {/* Grid */}
                                    {gridPoints.map((points, i) => (
                                        <polygon 
                                            key={i} 
                                            points={points} 
                                            fill={i === 4 ? "rgba(255,255,255,0.03)" : "none"}
                                            stroke="rgba(255,255,255,0.15)" 
                                            strokeWidth="0.5" 
                                        />
                                    ))}
                                    {/* Axis Lines */}
                                    {dimensions.map((_, i) => {
                                        const { x, y } = getCoordinates(100, i)
                                        return (
                                            <line 
                                                key={i} 
                                                x1={center} 
                                                y1={center} 
                                                x2={x} 
                                                y2={y} 
                                                stroke="rgba(255,255,255,0.1)" 
                                                strokeWidth="0.5" 
                                            />
                                        )
                                    })}
                                    
                                    {/* Data Area */}
                                    <polygon 
                                        points={points} 
                                        fill={grade === 'S' ? "rgba(250, 204, 21, 0.4)" : grade === 'A' ? "rgba(192, 132, 252, 0.4)" : grade === 'B' ? "rgba(139, 92, 246, 0.4)" : "rgba(156, 163, 175, 0.4)"} 
                                        stroke={grade === 'S' ? "#eab308" : grade === 'A' ? "#c084fc" : grade === 'B' ? "#8b5cf6" : "#9ca3af"} 
                                        strokeWidth="2"
                                        className="drop-shadow-[0_0_10px_rgba(255,255,255,0.3)]"
                                    />

                                    {/* Labels */}
                                    {dimensions.map((dim, i) => {
                                        const { x, y } = getCoordinates(125, i)
                                        return (
                                            <text 
                                                key={i} 
                                                x={x} 
                                                y={y} 
                                                fill="rgba(255,255,255,0.6)" 
                                                fontSize="9" 
                                                fontWeight="bold"
                                                textAnchor="middle" 
                                                dominantBaseline="middle"
                                                className="uppercase tracking-wider"
                                            >
                                                {dim.label}
                                            </text>
                                        )
                                    })}
                                </svg>
                            </div>
                        </div>
                    </div>

                    {/* Bottom Stats */}
                    <div className="w-full grid grid-cols-3 gap-2 mb-6 shrink-0 z-10 relative">
                        <div className="flex flex-col items-center bg-white/5 rounded-lg py-2 backdrop-blur-sm border border-white/5">
                            <span className="text-xl sm:text-2xl font-black italic text-white">{data.matches || 0}</span>
                            <span className="text-[9px] text-white/40 uppercase tracking-widest">APP</span>
                        </div>
                        <div className="flex flex-col items-center bg-white/5 rounded-lg py-2 backdrop-blur-sm border border-white/5">
                            <span className="text-xl sm:text-2xl font-black italic text-yellow-400">{data.goals || 0}</span>
                            <span className="text-[9px] text-white/40 uppercase tracking-widest">GOAL</span>
                        </div>
                        <div className="flex flex-col items-center bg-white/5 rounded-lg py-2 backdrop-blur-sm border border-white/5">
                            <span className="text-xl sm:text-2xl font-black italic text-violet-400">{data.assists || 0}</span>
                            <span className="text-[9px] text-white/40 uppercase tracking-widest">AST</span>
                        </div>
                    </div>

                    {/* Footer Association */}
                    <div className="absolute bottom-2 w-full text-center">
                        <span className="text-[9px] text-white/20 tracking-[0.5em] uppercase font-bold">龙里县足球协会</span>
                    </div>
                </div>
            </div>
        </div>
    )
}

export default PlayerCardModal