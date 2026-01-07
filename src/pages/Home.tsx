import React, { useEffect, useState } from 'react'
import { Button, Swiper, Image, Skeleton } from 'antd-mobile'
import { useNavigate } from 'react-router-dom'
import { UserCheck, Trophy, MapPin, Users, MoreHorizontal, Bell, Calendar, ChevronRight, ArrowRight } from 'lucide-react'
import { getUser } from '../utils/auth'
import request from '../utils/request'
import dayjs from 'dayjs'

const Home: React.FC = () => {
  const navigate = useNavigate()
  const [user, setUser] = useState<any>(null)
  const [matches, setMatches] = useState<any[]>([])
  const [notices, setNotices] = useState<string[]>([])
  const [ads, setAds] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const currentUser = getUser()
    if (currentUser) {
      setUser(currentUser)
    }
    Promise.all([fetchAnnouncements(), fetchMatches(), fetchAds()]).finally(() => {
      setLoading(false)
    })
  }, [])

  const fetchAds = async () => {
    try {
      const res: any = await request.get('/ads')
      if (res && res.length > 0) {
        setAds(res)
      }
    } catch (error) {
      console.error(error)
    }
  }

  const fetchMatches = async () => {
    try {
      const res: any = await request.get('/matches')
      if (res && res.length > 0) {
        setMatches(res.slice(0, 5)) // Take first 5 matches
      }
    } catch (error) {
      console.error(error)
    }
  }

  const fetchAnnouncements = async () => {
    try {
      const res: any = await request.get('/admin/announcements')
      if (res && res.length > 0) {
        setNotices(res.map((a: any) => a.title))
      }
    } catch (error) {
      console.error(error)
    }
  }

  const shortcuts = [
    { title: '赛事报名', icon: <Trophy size={28} className="text-white" />, path: '/matches', color: 'from-violet-500 to-violet-600' },
    { title: '场地预约', icon: <MapPin size={28} className="text-white" />, path: '/venues', color: 'from-fuchsia-500 to-fuchsia-600' },
    { title: '球队入驻', icon: <Users size={28} className="text-white" />, path: '/teams', color: 'from-purple-500 to-purple-600' },
    { title: '社区互动', icon: <MoreHorizontal size={28} className="text-white" />, path: '/community', color: 'from-pink-500 to-pink-600' },
  ]

  const getStatusTag = (status: string) => {
    switch(status) {
      case 'registering': return { text: '报名中', className: 'bg-violet-100 text-violet-700' }
      case 'ongoing': return { text: '进行中', className: 'bg-fuchsia-100 text-fuchsia-700' }
      case 'finished': return { text: '已结束', className: 'bg-gray-100 text-gray-600' }
      default: return { text: '未知', className: 'bg-gray-100 text-gray-600' }
    }
  }

  return (
    <div className="pb-24">
      {/* Immersive Header */}
      <div className="relative overflow-hidden bg-slate-900 pb-8 rounded-b-[32px] shadow-xl z-0">
        <div className="absolute top-0 left-0 w-full h-full opacity-30">
             <div className="absolute -top-24 -right-24 w-64 h-64 bg-violet-600 rounded-full blur-[80px]" />
             <div className="absolute top-1/2 -left-24 w-48 h-48 bg-fuchsia-600 rounded-full blur-[60px]" />
        </div>
        
        <div className="relative z-10 px-6 pt-8 pb-4">
          <div className="flex justify-between items-center mb-6">
            <div>
              <div className="flex items-center gap-1 text-violet-200 text-xs mb-1 bg-white/10 w-fit px-2 py-0.5 rounded-full backdrop-blur-md">
                 <MapPin size={10} />
                 <span>贵州省·黔南州</span>
              </div>
              <h1 className="text-2xl font-bold text-white tracking-tight">
                Hi, {user ? (user.name || '球友') : '欢迎回来'}
              </h1>
            </div>
            {user && (!user.certifications || user.certifications.length === 0) && (
              <Button 
                size="small" 
                className="glass text-white border-white/20 active:bg-white/10 rounded-full px-4"
                onClick={() => navigate('/auth')}
              >
                <div className="flex items-center gap-1.5">
                  <UserCheck size={16} />
                  <span>立即认证</span>
                </div>
              </Button>
            )}
          </div>

          {/* Ads Banner */}
          <div className="rounded-2xl overflow-hidden shadow-2xl border border-white/10 relative transform transition-transform active:scale-[0.99]">
             {loading ? (
                 <Skeleton.Paragraph lineCount={5} animated />
             ) : ads.length > 0 ? (
                <Swiper autoplay loop indicatorProps={{ className: 'custom-swiper-indicator' }}>
                  {ads.map((ad: any) => (
                    <Swiper.Item key={ad.id}>
                      <div 
                        className="w-full aspect-[21/9] bg-slate-800 relative"
                        onClick={() => {
                          if (ad.link) {
                            let url = ad.link
                            if (!url.startsWith('http') && !url.startsWith('/')) {
                              url = `http://${url}`
                            }
                            window.location.href = url
                          }
                        }}
                      >
                        <img src={ad.image} className="w-full h-full object-cover block" alt="ad" />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent pointer-events-none z-[1]" />
                      </div>
                    </Swiper.Item>
                  ))}
                </Swiper>
             ) : (
                <div className="w-full aspect-[21/9] bg-slate-800 relative">
                    <Image 
                        src="https://coresg-normal.trae.ai/api/ide/v1/text_to_image?prompt=Longli%20River%20Bridge%20in%20Guizhou%2C%20majestic%20suspension%20bridge%20spanning%20a%20deep%20canyon%2C%20misty%20mountains%20background%2C%20cinematic%20lighting%2C%20high%20quality%2C%20photorealistic%2C%20aerial%20view&image_size=landscape_16_9" 
                        fit="cover" 
                        className="w-full h-full" 
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent pointer-events-none" />
                    <div className="absolute bottom-4 left-4 z-10">
                        <h3 className="text-white font-bold text-lg drop-shadow-md">龙里河大桥</h3>
                        <p className="text-white/80 text-xs">连接你我，通向未来</p>
                    </div>
                </div>
             )}
          </div>
        </div>
      </div>

      <div className="px-5 -mt-6 relative z-10 space-y-6">
        {/* Shortcuts Grid */}
        <div className="grid grid-cols-4 gap-3">
            {shortcuts.map((item, index) => (
                <div key={index} className="flex flex-col items-center gap-2" onClick={() => navigate(item.path)}>
                    <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${item.color} flex items-center justify-center shadow-lg shadow-gray-200 active:scale-95 transition-transform duration-200`}>
                        {item.icon}
                    </div>
                    <span className="text-xs font-semibold text-gray-700">{item.title}</span>
                </div>
            ))}
        </div>

        {/* Announcements Ticker */}
        {notices.length > 0 && (
            <div className="bg-white rounded-xl p-3 shadow-sm flex items-center gap-3 border border-gray-100">
                <div className="bg-violet-100 p-1.5 rounded-lg">
                    <Bell size={16} className="text-violet-600" />
                </div>
                <div className="flex-1 h-6 overflow-hidden">
                    <Swiper direction='vertical' autoplay loop indicator={() => null} style={{ '--height': '24px' }}>
                        {notices.map((notice, index) => (
                            <Swiper.Item key={index}>
                                <div className="text-sm text-gray-700 truncate leading-6 font-medium">{notice}</div>
                            </Swiper.Item>
                        ))}
                    </Swiper>
                </div>
                <ChevronRight size={14} className="text-gray-300" />
            </div>
        )}

        {/* Upcoming Matches */}
        <div>
          <div className="flex justify-between items-center mb-4 px-1">
            <h3 className="font-bold text-xl text-gray-800 flex items-center gap-2">
                <span className="w-1.5 h-6 bg-violet-600 rounded-full inline-block"></span>
                热门赛事
            </h3>
            <div 
                className="flex items-center gap-1 text-sm text-gray-500 font-medium active:text-violet-600 transition-colors" 
                onClick={() => navigate('/matches')}
            >
              全部
              <ArrowRight size={14} />
            </div>
          </div>
          
          <div className="space-y-4">
            {loading ? (
                 <>
                    <Skeleton.Title animated />
                    <Skeleton.Paragraph lineCount={2} animated />
                 </>
            ) : matches.length === 0 ? (
                <div className="text-center py-12 text-gray-400 bg-white rounded-2xl border border-gray-100">
                    <Trophy size={48} className="mx-auto mb-3 opacity-20" />
                    <p>暂无热门赛事</p>
                </div>
            ) : (
                matches.map(match => {
                    const status = getStatusTag(match.status)
                    return (
                    <div 
                        key={match.id} 
                        className="bg-white rounded-2xl p-0 shadow-card active:scale-[0.99] transition-transform duration-200 overflow-hidden"
                        onClick={() => navigate(`/matches/${match.id}`)}
                    >
                        {match.coverUrl && (
                            <div className="h-36 w-full relative bg-gray-100">
                                <img src={match.coverUrl} className="w-full h-full object-cover block" alt={match.title} />
                                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent pointer-events-none z-[1]" />
                                <div className="absolute top-3 right-3 z-10">
                                    <span className={`px-2.5 py-1 rounded-lg text-xs font-bold shadow-sm backdrop-blur-md ${status.className} bg-opacity-90`}>
                                        {status.text}
                                    </span>
                                </div>
                                <div className="absolute bottom-3 left-4 right-4 z-10">
                                    <h4 className="font-bold text-lg text-white line-clamp-1 shadow-black/50 drop-shadow-md">{match.title}</h4>
                                </div>
                            </div>
                        )}
                        
                        {!match.coverUrl && (
                             <div className="px-4 pt-4 flex justify-between items-start">
                                <h4 className="font-bold text-lg text-gray-800 line-clamp-1">{match.title}</h4>
                                <span className={`px-2.5 py-1 rounded-lg text-xs font-bold ${status.className}`}>
                                    {status.text}
                                </span>
                             </div>
                        )}

                        <div className="p-4 pt-3 flex items-center justify-between">
                            <div className="flex flex-col gap-1.5 text-xs text-gray-500">
                                <div className="flex items-center gap-1.5">
                                    <Calendar size={14} className="text-violet-500" />
                                    <span>
                                        {match.startTime 
                                            ? dayjs(match.startTime).format('MM月DD日 HH:mm') 
                                            : match.date
                                        }
                                    </span>
                                </div>
                                <div className="flex items-center gap-1.5">
                                    <MapPin size={14} className="text-violet-500" />
                                    <span className="truncate max-w-[150px]">{match.location}</span>
                                </div>
                            </div>

                            <div className="flex items-center gap-1.5 bg-gray-50 px-3 py-1.5 rounded-full">
                                <Users size={14} className="text-gray-400" />
                                <span className="font-bold text-gray-700">
                                    {match.type === 'NIGHT' 
                                    ? `${match.currentPlayers}/${match.minPlayers}`
                                    : match.type === 'LEAGUE' || match.type === 'TEAM_FRIENDLY'
                                        ? `${match.teams || '0'}队`
                                        : `${match.currentPlayers}人`
                                    }
                                </span>
                            </div>
                        </div>
                    </div>
                    )
                })
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default Home
