import React, { useEffect, useState } from 'react'
import { NavBar, List, Tag, DotLoading, Empty, SwipeAction, Toast } from 'antd-mobile'
import { useNavigate } from 'react-router-dom'
import { Bell } from 'lucide-react'
import request from '../utils/request'
import dayjs from 'dayjs'

const Notifications: React.FC = () => {
  const navigate = useNavigate()
  const [notifications, setNotifications] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchNotifications()
  }, [])

  const fetchNotifications = async () => {
    try {
      const res: any = await request.get('/notifications')
      setNotifications(res)
    } catch (error) {
      console.error(error)
    } finally {
      setLoading(false)
    }
  }

  const handleMarkRead = async (id: string) => {
    try {
      await request.post(`/notifications/${id}/read`)
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, isRead: true } : n))
    } catch (error) {
      console.error(error)
    }
  }

  const handleMarkAllRead = async () => {
    try {
      await request.post('/notifications/read-all')
      setNotifications(prev => prev.map(n => ({ ...n, isRead: true })))
      Toast.show('已全部标记为已读')
    } catch (error) {
      console.error(error)
    }
  }

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'SYSTEM': return 'default'
      case 'TEAM_REQUEST': return 'warning'
      case 'TEAM_AUDIT': return 'success'
      case 'COMMUNITY_LIKE': return 'danger'
      case 'COMMUNITY_COMMENT': return 'primary'
      case 'MATCH_REMINDER': return 'primary'
      case 'CERTIFICATION_RESULT': return 'success'
      default: return 'default'
    }
  }

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'SYSTEM': return '系统'
      case 'TEAM_REQUEST': return '球队申请'
      case 'TEAM_AUDIT': return '审核结果'
      case 'COMMUNITY_LIKE': return '点赞'
      case 'COMMUNITY_COMMENT': return '评论'
      case 'MATCH_REMINDER': return '赛事提醒'
      case 'CERTIFICATION_RESULT': return '认证结果'
      default: return '通知'
    }
  }

  const handleItemClick = (notification: any) => {
    if (!notification.isRead) {
      handleMarkRead(notification.id)
    }
    
    // Navigate based on type
    if (notification.type === 'TEAM_REQUEST' && notification.relatedId) {
       // Ideally go to team management -> requests tab
       // For now go to team detail
       navigate(`/teams/${notification.relatedId}`)
    } else if (notification.type === 'COMMUNITY_COMMENT' || notification.type === 'COMMUNITY_LIKE') {
        navigate('/community')
    } else if (notification.type === 'MATCH_REMINDER') {
        navigate(`/matches/${notification.relatedId}`)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-10">
      <NavBar onBack={() => navigate(-1)} right={<span onClick={handleMarkAllRead} className="text-sm">全部已读</span>}>
        消息中心
      </NavBar>

      {loading ? (
        <div className="flex justify-center p-8">
          <DotLoading />
        </div>
      ) : notifications.length === 0 ? (
        <Empty description="暂无消息" />
      ) : (
        <List>
          {notifications.map(item => (
            <SwipeAction
              key={item.id}
              rightActions={[
                {
                  key: 'read',
                  text: '已读',
                  color: 'primary',
                  onClick: () => handleMarkRead(item.id),
                },
              ]}
            >
              <List.Item
                prefix={
                   <div className="relative">
                     <Bell size={24} className={item.isRead ? "text-gray-300" : "text-violet-500"} />
                     {!item.isRead && <div className="absolute -top-1 -right-1 w-2 h-2 bg-red-500 rounded-full" />}
                   </div>
                }
                description={
                    <div className="mt-1">
                        <div className="text-gray-500 text-sm mb-1">{item.content}</div>
                        <div className="text-xs text-gray-400">{dayjs(item.createdAt).format('MM-DD HH:mm')}</div>
                    </div>
                }
                onClick={() => handleItemClick(item)}
              >
                <div className="flex items-center gap-2">
                   <Tag color={getTypeColor(item.type)} fill='outline'>
                      {getTypeLabel(item.type)}
                   </Tag>
                   <span className={item.isRead ? "text-gray-500" : "font-bold"}>{item.title}</span>
                </div>
              </List.Item>
            </SwipeAction>
          ))}
        </List>
      )}
    </div>
  )
}

export default Notifications
