import React, { useEffect, useState } from 'react'
import { List, Button, Tag, Toast, Skeleton, Badge, Dialog, Form, Input, Modal } from 'antd-mobile'
import { useNavigate } from 'react-router-dom'
import { Bell, FileText, ShieldCheck, ChevronRight, Copy, Settings, User as UserIcon, Medal } from 'lucide-react'
import request from '../utils/request'

const Profile: React.FC = () => {
  const navigate = useNavigate()
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [unreadCount, setUnreadCount] = useState(0)
  const [changePasswordModalVisible, setChangePasswordModalVisible] = useState(false)
  const [passwordForm] = Form.useForm()

  useEffect(() => {
    const token = localStorage.getItem('token')
    if (token) {
      fetchProfile()
      fetchUnreadCount()
    } else {
      setLoading(false)
      setUser(null)
    }
  }, [])

  const fetchUnreadCount = async () => {
    try {
      const res: any = await request.get('/notifications/unread-count')
      setUnreadCount(res)
    } catch (error) {
      console.error(error)
    }
  }

  const fetchProfile = async () => {
    try {
      const localUser = localStorage.getItem('user')
      if (localUser) {
        setUser(JSON.parse(localUser))
      }
      
      const res: any = await request.get('/user/profile')
      if (res.teamId) {
        try {
          const teamRes: any = await request.get(`/teams/${res.teamId}`)
          res.teamName = teamRes.name
        } catch (e) {
            // ignore
        }
      }

      setUser(res)
      localStorage.setItem('user', JSON.stringify(res))
    } catch (error) {
      console.error(error)
      if (!user) setUser(null)
    } finally {
      setLoading(false)
    }
  }

  const handleLogout = () => {
    Dialog.confirm({
        content: '确定要退出登录吗？',
        confirmText: '退出',
        cancelText: '取消',
        onConfirm: () => {
            localStorage.removeItem('token')
            localStorage.removeItem('user')
            setUser(null)
            Toast.show({ content: '已退出登录', position: 'bottom' })
        }
    })
  }

  const handleDeleteAccount = () => {
      Dialog.confirm({
          title: '注销账户',
          content: '注销后，您的所有数据将被永久删除且无法恢复，是否继续？',
          confirmText: '确认注销',
          cancelText: '取消',
          onConfirm: async () => {
              try {
                  await request.delete('/user')
                  localStorage.clear()
                  setUser(null)
                  Toast.show({ content: '账户已注销', icon: 'success' })
                  navigate('/login')
              } catch (e) {
                  Toast.show({ content: '注销失败', icon: 'fail' })
              }
          }
      })
  }

  const handleCopyId = () => {
    if (!user) return
    navigator.clipboard.writeText(user.id?.toString())
    Toast.show({
      content: 'ID已复制',
      position: 'bottom',
    })
  }

  const handleChangePassword = async (values: any) => {
    if (values.newPassword !== values.confirmPassword) {
      Toast.show('两次输入的密码不一致')
      return
    }
    try {
      await request.post('/user/change-password', {
        oldPassword: values.oldPassword,
        newPassword: values.newPassword
      })
      Toast.show({ icon: 'success', content: '密码修改成功，请重新登录' })
      setChangePasswordModalVisible(false)
      passwordForm.resetFields()
      localStorage.removeItem('token')
      localStorage.removeItem('user')
      setUser(null)
      navigate('/login')
    } catch (e: any) {
      console.error(e)
    }
  }

  if (loading) return (
      <div className="p-4 space-y-4">
          <Skeleton.Title animated />
          <Skeleton.Paragraph lineCount={5} animated />
      </div>
  )

  const stats = [
    { label: '参赛', value: user?.stats?.matches || 0 },
    { label: '进球', value: user?.stats?.goals || 0 },
    { label: '助攻', value: user?.stats?.assists || 0 },
  ]

  // Not logged in UI
  if (!user) {
    return (
      <div className="pb-24 min-h-screen">
        <div className="relative bg-slate-900 pb-12 pt-16 px-6 rounded-b-[32px] overflow-hidden shadow-xl">
             <div className="absolute inset-0 opacity-30">
                 <div className="absolute -top-20 -right-20 w-80 h-80 bg-violet-600 rounded-full blur-[80px]" />
             </div>
             <div className="relative z-10 flex flex-col items-center text-white">
                <div className="w-20 h-20 bg-white/10 rounded-full flex items-center justify-center backdrop-blur-md mb-4 border border-white/20">
                    <UserIcon size={32} className="opacity-80" />
                </div>
                <h2 className="text-2xl font-bold mb-2">未登录</h2>
                <p className="text-white/60 mb-6 text-sm">登录解锁更多精彩赛事功能</p>
                <Button 
                    color="primary" 
                    size="large" 
                    className="w-48 font-bold shadow-lg shadow-violet-500/30"
                    onClick={() => navigate('/login')}
                >
                    立即登录
                </Button>
             </div>
        </div>

        <div className="px-5 -mt-6 relative z-10">
           <div className="bg-white rounded-2xl shadow-card overflow-hidden p-2">
            <List>
                <List.Item prefix={<Bell size={20} className="text-gray-400"/>} onClick={() => navigate('/login')} arrow>消息通知</List.Item>
                <List.Item prefix={<FileText size={20} className="text-gray-400"/>} onClick={() => navigate('/login')} arrow>参赛记录</List.Item>
                <List.Item prefix={<Medal size={20} className="text-gray-400"/>} onClick={() => navigate('/login')} arrow>我的荣誉</List.Item>
            </List>
           </div>
        </div>
      </div>
    )
  }

  const getDefaultAvatar = (seed: string) => `https://api.dicebear.com/9.x/adventurer/svg?seed=${seed}`

  return (
    <div className="min-h-screen bg-slate-50 pb-24">
      {/* Header */}
      <div className="relative bg-slate-900 pt-14 pb-16 rounded-b-[40px] shadow-2xl overflow-hidden">
        {/* Abstract Background */}
        <div className="absolute top-0 left-0 w-full h-full">
            <div className="absolute -top-10 -right-10 w-64 h-64 bg-violet-500/20 rounded-full blur-[60px]" />
            <div className="absolute bottom-0 left-0 w-80 h-80 bg-fuchsia-600/20 rounded-full blur-[80px]" />
            <div className="absolute top-1/2 left-1/2 w-full h-full bg-slate-900/40 backdrop-blur-[1px]" />
        </div>

        <div className="relative z-10 flex items-center px-6 gap-6">
          <div className="relative group cursor-pointer" onClick={() => navigate('/profile/edit')}>
            <div className="absolute -inset-0.5 bg-gradient-to-r from-violet-500 to-fuchsia-500 rounded-xl blur opacity-75 group-hover:opacity-100 transition duration-200"></div>
            <img 
              src={user?.avatar || getDefaultAvatar(user?.name || 'user')} 
              className="relative w-[144px] h-[144px] object-cover rounded-xl border-4 border-white shadow-2xl bg-slate-800" 
            />
          </div>
          
          <div className="flex-1 flex flex-col items-start min-w-0">
            <h2 className="text-2xl font-bold text-white tracking-wide mb-2 truncate w-full text-left">{user?.name || '未设置昵称'}</h2>
            
            <div 
              className="flex items-center gap-2 text-xs bg-white/10 backdrop-blur-md px-3 py-1 rounded-full mb-3 cursor-pointer active:bg-white/20 transition-colors border border-white/5"
              onClick={handleCopyId}
            >
              <span className="text-violet-300 font-mono tracking-wider">ID: {user?.id?.substring(0, 5).toUpperCase()}</span>
              <Copy size={12} className="text-white/40" />
            </div>

            {user?.sportsProfile?.intro && (
               <div className="text-sm text-gray-300 mb-3 text-left leading-relaxed line-clamp-2 italic w-full">
                 "{user.sportsProfile.intro}"
               </div>
            )}

            <div className="flex flex-wrap justify-start gap-2 mb-2">
            {(user?.certifications || [])
              .filter((cert: string) => {
                 if (!cert) return false;
                 const c = cert.trim();
                 if (/^\d+$/.test(c)) return false; 
                 if (c.length > 10) return false;
                 if (user?.sportsProfile?.intro && c === user.sportsProfile.intro.trim()) return false;
                 return true;
              })
              .map((cert: string) => {
              let text = cert;
              if (cert === '裁判员' && user.refereeLevel) text += `·${user.refereeLevel}`;
              if (cert === '教练员' && user.coachLevel) text += `·${user.coachLevel}`;
              
              return (
                <Tag key={cert} className="bg-violet-600 border-none text-white px-2 py-1 rounded">
                  {text}
                </Tag>
              )
            })}
            
            {user?.teamName && (
              <Tag className="bg-violet-600 border-none text-white px-2 py-1 rounded">{user.teamName}</Tag>
            )}
            
            {(!user?.certifications?.length && !user?.teamName) && (
               <Tag className="bg-white/10 border-none text-white/60 px-2 py-1 rounded">暂无标签</Tag>
            )}
          </div>
        </div>
      </div>
      </div>

      {/* Stats Card - Floating overlap */}
      <div className="px-5 -mt-10 relative z-20">
        <div className="bg-white rounded-2xl shadow-xl p-5 flex justify-between items-center border border-gray-100/50">
            {stats.map((item, idx) => (
              <div key={idx} className="flex flex-col items-center flex-1 relative first:after:content-[''] first:after:absolute first:after:right-0 first:after:top-1/2 first:after:-translate-y-1/2 first:after:h-8 first:after:w-[1px] first:after:bg-gray-100 last:before:content-[''] last:before:absolute last:before:left-0 last:before:top-1/2 last:before:-translate-y-1/2 last:before:h-8 last:before:w-[1px] last:before:bg-gray-100">
                <div className="text-2xl font-bold font-mono text-slate-800">{item.value}</div>
                <div className="text-xs text-gray-400 uppercase tracking-wider font-medium mt-1">{item.label}</div>
              </div>
            ))}
        </div>
      </div>

      {/* Menu List */}
      <div className="mt-6 px-5 space-y-6">
        <div className="bg-white rounded-2xl shadow-card overflow-hidden">
          <List>
            <List.Item 
              prefix={<div className="p-2 bg-violet-50 rounded-lg"><Bell size={18} className="text-violet-500" /></div>} 
              onClick={() => navigate('/notifications')}
              arrow={<ChevronRight size={18} className="text-gray-300" />}
              extra={unreadCount > 0 ? <Badge content={unreadCount} /> : null}
              className="py-1"
            >
              消息通知
            </List.Item>
            <List.Item 
              prefix={<div className="p-2 bg-fuchsia-50 rounded-lg"><Medal size={18} className="text-fuchsia-500" /></div>} 
              onClick={() => navigate('/certification-apply')}
              extra={<span className="text-xs text-gray-400">申请专业认证</span>}
              arrow={<ChevronRight size={18} className="text-gray-300" />}
              className="py-1"
            >
              我的认证
            </List.Item>
            <List.Item 
              prefix={<div className="p-2 bg-purple-50 rounded-lg"><Settings size={18} className="text-purple-500" /></div>} 
              onClick={() => navigate('/profile/edit')}
              arrow={<ChevronRight size={18} className="text-gray-300" />}
              className="py-1"
            >
              个人设置
            </List.Item>
            <List.Item 
              prefix={<div className="p-2 bg-orange-50 rounded-lg"><ShieldCheck size={18} className="text-orange-500" /></div>} 
              onClick={() => setChangePasswordModalVisible(true)}
              arrow={<ChevronRight size={18} className="text-gray-300" />}
              className="py-1"
            >
              安全中心
            </List.Item>
          </List>
        </div>

        {(user?.role === 'admin' || user?.role === 'super_admin') && (
            <div className="bg-gradient-to-r from-slate-800 to-slate-900 rounded-2xl shadow-lg overflow-hidden p-1">
                <List style={{ '--border-top': 'none', '--border-bottom': 'none' }}>
                    <List.Item 
                    prefix={<div className="p-2 bg-white/10 rounded-lg"><ShieldCheck size={18} className="text-violet-400" /></div>} 
                    onClick={() => navigate('/admin')}
                    arrow={<ChevronRight size={18} className="text-white/30" />}
                    className="bg-transparent text-white"
                    >
                    <span className="text-white font-medium">管理员后台</span>
                    </List.Item>
                </List>
            </div>
        )}

        <div className="px-2">
            <div className="text-center py-4">
                 <div className="text-red-500 font-bold text-lg cursor-pointer mb-2" onClick={handleLogout}>退出登录</div>
                 <div className="text-xs text-gray-300 cursor-pointer" onClick={handleDeleteAccount}>注销账户</div>
            </div>
            <div className="mt-4 text-center text-[14px] text-gray-300 pb-4 font-mono">
                <div>Powered by LongLi Football v1.0.0</div>
                <div className="mt-1">@我不是莫莫丶</div>
            </div>
        </div>
      </div>

      <Modal
        visible={changePasswordModalVisible}
        title="修改密码"
        content={
          <Form form={passwordForm} onFinish={handleChangePassword} layout='horizontal'>
            <Form.Item name="oldPassword" label="旧密码" rules={[{ required: true, message: '请输入旧密码' }]}>
              <Input type="password" placeholder="当前密码" className="text-right" />
            </Form.Item>
            <Form.Item name="newPassword" label="新密码" rules={[{ required: true, message: '请输入新密码' }, { min: 6, message: '至少6位' }]}>
              <Input type="password" placeholder="新密码" className="text-right" />
            </Form.Item>
            <Form.Item name="confirmPassword" label="确认" rules={[{ required: true, message: '请确认新密码' }]}>
              <Input type="password" placeholder="再次输入" className="text-right" />
            </Form.Item>
          </Form>
        }
        closeOnAction={false}
        onClose={() => setChangePasswordModalVisible(false)}
        actions={[
          { key: 'confirm', text: '确认修改', primary: true, onClick: () => passwordForm.submit() },
          { key: 'cancel', text: '取消', onClick: () => setChangePasswordModalVisible(false) }
        ]}
      />
    </div>
  )
}

export default Profile
