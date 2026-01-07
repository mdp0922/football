import React, { useEffect, useState, useRef } from 'react'
import { useParams } from 'react-router-dom'
import { Image, ImageViewer, Skeleton } from 'antd-mobile'
import request from '../utils/request'

// Radar Chart Constants
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

const UserProfile: React.FC = () => {
  const { id } = useParams()
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const pageRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    fetchUserProfile()
    const originalBg = document.body.style.backgroundColor
    document.body.style.backgroundColor = '#0f172a'
    return () => {
      document.body.style.backgroundColor = originalBg
    }
  }, [id])

  const fetchUserProfile = async () => {
    try {
      const res: any = await request.get(`/user/${id}`)
      
      // 智能获取球队信息（支持多球队，优先取第一个有效球队）
      let teamInfo = null;
      
      // 1. 尝试从 res.teamId 获取
      if (res.teamId) {
          if (res.team && res.team.logo) {
              teamInfo = res.team;
          } else if (typeof res.teamId === 'string') {
              try {
                  teamInfo = await request.get(`/teams/${res.teamId}`)
              } catch (e) { console.warn('Fetch team failed', e) }
          }
      } 
      // 2. 尝试从 res.teams 数组获取
      else if (Array.isArray(res.teams) && res.teams.length > 0) {
          const firstTeam = res.teams[0];
          // 如果已经是对象且有logo，直接使用
          if (typeof firstTeam === 'object' && firstTeam.logo) {
              teamInfo = firstTeam;
          } else {
              // 否则获取 ID 并请求详情
              const tid = typeof firstTeam === 'string' ? firstTeam : (firstTeam.id || firstTeam._id);
              if (tid) {
                  try {
                      teamInfo = await request.get(`/teams/${tid}`)
                  } catch (e) { console.warn('Fetch teams[0] failed', e) }
              }
          }
      }

      if (teamInfo) {
          res.teamName = teamInfo.name
          res.teamLogo = teamInfo.logo
      }
      setUser(res)
    } catch (error) {
      console.error(error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) return <Skeleton.Title animated />
  if (!user) return <div className="p-4 text-center text-white">用户不存在</div>

  // Calculate Overall Rating (Average)
  const defaultRadar = { speed: 50, shooting: 50, passing: 50, dribbling: 50, defense: 50, physical: 50 }
  const radarData = { ...defaultRadar, ...(user.radarData || {}) }
  const overall = Math.round(
      Object.values(radarData).reduce((a: any, b: any) => a + b, 0) as number / 6
  )

  const getGradeInfo = (score: number) => {
    if (score >= 90) return { grade: 'S', color: 'text-yellow-400', border: 'border-yellow-400', from: 'from-yellow-300', to: 'to-yellow-600', fill: 'rgba(250, 204, 21, 0.4)', stroke: '#eab308' }
    if (score >= 80) return { grade: 'A', color: 'text-purple-400', border: 'border-purple-400', from: 'from-purple-300', to: 'to-purple-600', fill: 'rgba(192, 132, 252, 0.4)', stroke: '#c084fc' }
    if (score >= 70) return { grade: 'B', color: 'text-violet-400', border: 'border-violet-400', from: 'from-violet-300', to: 'to-violet-600', fill: 'rgba(139, 92, 246, 0.4)', stroke: '#8b5cf6' }
    return { grade: 'C', color: 'text-gray-400', border: 'border-gray-400', from: 'from-gray-300', to: 'to-gray-500', fill: 'rgba(156, 163, 175, 0.4)', stroke: '#9ca3af' }
  }
  const gradeInfo = getGradeInfo(overall)

  // Radar Points Calculation
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
    
    // 3. 中文去重
    const uniqueParts = Array.from(new Set(cnParts))
    
    return uniqueParts.join('/')
  }

  return (
    <div className="min-h-screen bg-slate-900 flex justify-center font-sans" ref={pageRef}>
      <div className="w-full max-w-[480px] bg-slate-900 min-h-screen relative shadow-2xl overflow-x-hidden pb-safe">
      
      {/* Navigation */}
      <div className="absolute top-4 left-4 z-50" onClick={() => window.history.back()}>
        <div className="w-8 h-8 rounded-full bg-black/20 backdrop-blur-sm flex items-center justify-center border border-white/10 active:scale-95 transition-transform">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-white"><path d="m15 18-6-6 6-6"/></svg>
        </div>
      </div>

      {/* Hero Section */}
      <div className="relative pt-12 pb-4 px-4 overflow-hidden">
          {/* Background Grade Watermark */}
          <div className={`absolute top-20 left-1/2 -translate-x-1/2 text-[15rem] font-black opacity-5 pointer-events-none select-none leading-none z-0 ${gradeInfo.color}`}>
              {gradeInfo.grade}
          </div>

          {/* Background Decor */}
          <div className="absolute top-0 left-0 w-full h-[60vh] bg-gradient-to-b from-yellow-500/10 via-slate-900/50 to-slate-900 pointer-events-none" />
          
          {/* OVR Display (Top Right) - Moved out to prevent clipping */}
          <div className="absolute top-12 right-6 flex flex-col items-center z-20 pr-2">
              <div className="flex items-baseline relative">
                  <span className={`text-5xl sm:text-6xl font-black italic text-transparent bg-clip-text bg-gradient-to-b ${gradeInfo.from} ${gradeInfo.to} drop-shadow-[0_4px_8px_rgba(0,0,0,0.6)] leading-none pr-1`}>
                      {overall}
                  </span>
                  <span className={`text-[10px] sm:text-xs font-bold ${gradeInfo.color.replace('text-', 'text-').replace('400', '500/80')} tracking-widest ml-1 absolute -right-0 -bottom-1 sm:-bottom-2`}>OVR</span>
              </div>
              {/* Grade Badge */}
              <div className={`mt-1 sm:mt-2 px-3 sm:px-4 py-1 rounded-md border ${gradeInfo.border} bg-black/20 backdrop-blur-sm shadow-lg flex justify-center items-center`}>
                  <span className={`text-2xl sm:text-3xl font-black italic ${gradeInfo.color}`}>{gradeInfo.grade}</span>
              </div>
          </div>

          <div className="relative z-10 flex flex-col items-center">
              
              {/* Avatar */}
              <div className="relative w-32 h-32 sm:w-40 sm:h-40 my-4 group transition-all duration-300 mt-8">
                  <div className={`absolute inset-0 rounded-full bg-gradient-to-br ${gradeInfo.from} ${gradeInfo.to} blur-md opacity-50 group-hover:opacity-75 transition-opacity`} />
                  <div className={`relative w-full h-full rounded-full border-[3px] overflow-hidden bg-slate-800 shadow-2xl ${gradeInfo.color.replace('text-', 'border-').replace('400', '500/50')}`}>
                      {user.avatar ? (
                          <img src={user.avatar} className="w-full h-full object-cover" alt={user.name} />
                      ) : (
                          <div className="w-full h-full flex items-center justify-center text-gray-500">No Image</div>
                      )}
                  </div>
                  {user.sportsProfile?.footballAge && (
                      <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 bg-slate-900 border border-yellow-500/30 px-3 py-1 rounded-full text-[10px] sm:text-xs text-yellow-200 font-bold whitespace-nowrap shadow-lg">
                          {user.sportsProfile.footballAge}年球龄
                      </div>
                  )}
              </div>

              {/* Name & Title */}
              <h1 className="text-3xl font-black text-center text-transparent bg-clip-text bg-gradient-to-r from-white via-yellow-100 to-white uppercase tracking-wide drop-shadow-sm mt-2 max-w-[80%] truncate">
                  {user.name}
              </h1>
              
              {/* Info Row: Team | Number | Position */}
              <div className="flex flex-wrap justify-center items-center gap-3 mt-3">
                  {user.teamName && (
                      <div className="flex items-center gap-1 px-2 py-1 rounded bg-white/5 border border-white/10 backdrop-blur-sm">
                          {user.teamLogo && <img src={user.teamLogo} className="w-4 h-4 object-contain" alt="team" />}
                          <span className="text-xs text-white/90 font-bold">{user.teamName}</span>
                      </div>
                  )}
                  {user.jerseyNumber && (
                      <div className="flex items-center gap-1 px-2 py-1 rounded bg-white/5 border border-white/10 backdrop-blur-sm">
                          <span className="text-xs text-white/50 font-bold">NO.</span>
                          <span className="text-xs text-white/90 font-bold text-lg leading-none">{user.jerseyNumber}</span>
                      </div>
                  )}
                  <div className="px-2 py-1 rounded bg-yellow-500/10 border border-yellow-500/20 backdrop-blur-sm">
                      <span className="text-xs text-yellow-400 font-bold">{formatPosition(user.sportsProfile?.position)}</span>
                  </div>
              </div>

              {/* Physical Stats Row */}
              <div className="flex items-center gap-4 mt-4 text-xs font-medium text-white/40">
                  {user.sportsProfile?.age && (
                      <div className="flex flex-col items-center">
                          <span className="text-white font-bold text-sm">{user.sportsProfile.age}</span>
                          <span className="text-[10px] scale-90">AGE</span>
                      </div>
                  )}
                  {(user.sportsProfile?.height || user.sportsProfile?.weight) && <div className="w-[1px] h-6 bg-white/10" />}
                  {user.sportsProfile?.height && (
                      <div className="flex flex-col items-center">
                          <span className="text-white font-bold text-sm">{user.sportsProfile.height}<span className="text-[10px] ml-0.5 font-normal text-white/50">CM</span></span>
                          <span className="text-[10px] scale-90">HEIGHT</span>
                      </div>
                  )}
                  {user.sportsProfile?.weight && (
                      <div className="flex flex-col items-center">
                          <span className="text-white font-bold text-sm">{user.sportsProfile.weight}<span className="text-[10px] ml-0.5 font-normal text-white/50">KG</span></span>
                          <span className="text-[10px] scale-90">WEIGHT</span>
                      </div>
                  )}
              </div>
          </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-3 gap-2 px-4 mb-6">
          {[
              { label: '场次', value: user.stats?.matches || 0, color: 'text-white' },
              { label: '进球', value: user.stats?.goals || 0, color: 'text-yellow-400' },
              { label: '助攻', value: user.stats?.assists || 0, color: 'text-blue-400' },
          ].map((stat, i) => (
              <div key={i} className="bg-white/5 border border-white/5 rounded-xl p-2 sm:p-3 flex flex-col items-center backdrop-blur-sm hover:bg-white/10 transition-colors">
                  <span className={`text-xl sm:text-2xl font-black italic ${stat.color}`}>{stat.value}</span>
                  <span className="text-[9px] sm:text-[10px] text-white/40 uppercase tracking-wider mt-1">{stat.label}</span>
              </div>
          ))}
      </div>

      <div className="px-4 space-y-6 pb-8">
         {/* Radar Chart Section */}
         {/* Always show if data exists, regardless of status for now, or show unverified tag */}
         {radarData && (
             <div className="bg-slate-800/50 border border-white/5 rounded-2xl p-4 relative overflow-hidden">
                 <div className="flex justify-between items-center mb-2 relative z-10">
                     <h3 className={`font-bold italic text-lg flex items-center gap-2 ${gradeInfo.color}`}>
                         <span className={`w-1 h-4 rounded-full ${gradeInfo.color.replace('text-', 'bg-')}`} />
                         ATTRIBUTE
                     </h3>
                     {user.radarDataStatus !== 'approved' && (
                         <span className="text-[10px] bg-white/10 px-2 py-0.5 rounded text-white/50">未认证数据</span>
                     )}
                 </div>
                 
                 <div className="h-64 sm:h-72 relative z-10 mb-4 flex items-center justify-center">
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
                            fill={gradeInfo.fill} 
                            stroke={gradeInfo.stroke} 
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

                 {/* Background Hexagon Pattern */}
                 <div className={`absolute top-0 right-0 w-32 h-32 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 opacity-20 ${gradeInfo.color.replace('text-', 'bg-')}`} />
             </div>
         )}

         {/* Photos Section */}
         {user.profileImages && user.profileImages.length > 0 && (
             <div className="bg-slate-800/50 border border-white/5 rounded-2xl p-4">
                 <h3 className="text-white font-bold italic text-lg flex items-center gap-2 mb-4">
                     <span className="w-1 h-4 bg-violet-500 rounded-full" />
                     GALLERY
                 </h3>
                 <div className="grid grid-cols-3 gap-2">
                     {user.profileImages.map((img: string, idx: number) => (
                         <div key={idx} className="aspect-square rounded-lg overflow-hidden border border-white/10 relative group cursor-pointer" onClick={() => ImageViewer.Multi.show({ images: user.profileImages, defaultIndex: idx })}>
                             <Image 
                                src={img} 
                                fit="cover" 
                                className="w-full h-full transition-transform duration-500 group-hover:scale-110"
                             />
                             <div className="absolute inset-0 bg-black/20 group-hover:bg-transparent transition-colors" />
                         </div>
                     ))}
                 </div>
             </div>
         )}
         
         {/* Footer */}
         <div className="text-center py-8 opacity-30">
             <div className="text-[10px] tracking-[0.3em] uppercase text-white">Football League Profile</div>
             <div className="text-[10px] text-white mt-1">龙里县足球协会</div>
         </div>
      </div>
      </div>
    </div>
  )
}

export default UserProfile