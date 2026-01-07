import React from 'react'
import { TabBar } from 'antd-mobile'
import { useNavigate, useLocation } from 'react-router-dom'
import { Home, Trophy, MapPin, Users, User } from 'lucide-react'

export const BottomNav: React.FC = () => {
  const navigate = useNavigate()
  const location = useLocation()
  const { pathname } = location

  const tabs = [
    {
      key: '/',
      title: '首页',
      icon: <Home size={24} strokeWidth={pathname === '/' ? 2.5 : 2} />,
    },
    {
      key: '/matches',
      title: '赛事',
      icon: <Trophy size={24} strokeWidth={pathname === '/matches' ? 2.5 : 2} />,
    },
    {
      key: '/venues',
      title: '场地',
      icon: <MapPin size={24} strokeWidth={pathname === '/venues' ? 2.5 : 2} />,
    },
    {
      key: '/community',
      title: '社区',
      icon: <Users size={24} strokeWidth={pathname === '/community' ? 2.5 : 2} />,
    },
    {
      key: '/profile',
      title: '我的',
      icon: <User size={24} strokeWidth={pathname === '/profile' ? 2.5 : 2} />,
    },
  ]

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 pointer-events-none flex justify-center">
      <div className="w-full max-w-md pointer-events-auto">
        {/* Gradient Mask */}
        <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-slate-50 via-slate-50/90 to-transparent pointer-events-none -z-10" />
        
        <div className="px-4 pb-6 pt-2">
            <div className="bg-white/90 backdrop-blur-md rounded-full shadow-lg border border-white/50 overflow-hidden">
                <TabBar 
                    activeKey={pathname} 
                    onChange={value => navigate(value)}
                    className="py-1.5"
                >
                {tabs.map(item => (
                    <TabBar.Item key={item.key} icon={item.icon} title={item.title} />
                ))}
                </TabBar>
            </div>
        </div>
      </div>
    </div>
  )
}
