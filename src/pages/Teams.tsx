import React, { useEffect, useState } from 'react'
import { Avatar, Button, Modal, Form, Input, TextArea, Toast, FloatingBubble, ImageUploader, DatePicker } from 'antd-mobile'
import { ImageUploadItem } from 'antd-mobile/es/components/image-uploader'
import { Plus, Award, Search, Users } from 'lucide-react'
import dayjs from 'dayjs'
import request from '../utils/request'
import { checkLogin, getUser } from '../utils/auth'
import { useNavigate } from 'react-router-dom'

const Teams: React.FC = () => {
  const navigate = useNavigate()
  const [teams, setTeams] = useState<any[]>([])
  const [pendingRequests, setPendingRequests] = useState<any[]>([])
  const [visible, setVisible] = useState(false)
  const [datePickerVisible, setDatePickerVisible] = useState(false)
  const [form] = Form.useForm()
  const [fileList, setFileList] = useState<ImageUploadItem[]>([])
  const currentUser = getUser()

  useEffect(() => {
    fetchTeams()
  }, [])

  useEffect(() => {
    if (currentUser) {
      fetchPendingRequests()
    }
  }, [currentUser?.id])

  const fetchTeams = async () => {
    try {
      const res: any = await request.get('/teams')
      setTeams(res)
    } catch (error) {
      console.error(error)
    }
  }

  const fetchPendingRequests = async () => {
    try {
      const res: any = await request.get('/teams/user/pending')
      setPendingRequests(res)
    } catch (error) {
      console.error(error)
    }
  }

  const handleCreate = () => {
    if (!checkLogin(navigate)) return
    setVisible(true)
  }

  const getDefaultLogo = (seed: string) => `https://api.dicebear.com/9.x/initials/svg?seed=${seed}`

  const mockUpload = async (file: File) => {
    const formData = new FormData()
    formData.append('file', file)
    try {
      const res: any = await request.post('/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      return { url: res.url }
    } catch (e) {
      Toast.show({ content: '上传失败', icon: 'fail' })
      throw e
    }
  }

  const onFinish = async (values: any) => {
    try {
      const logo = fileList.length > 0 ? fileList[0].url : getDefaultLogo(values.name)
      const establishmentDate = values.establishmentDate ? dayjs(values.establishmentDate).format('YYYY-MM-DD') : null
      await request.post('/teams', { ...values, logo, establishmentDate })
      Toast.show({ icon: 'success', content: '创建成功' })
      setVisible(false)
      form.resetFields()
      setFileList([])
      fetchTeams()
    } catch (error) {
      console.error(error)
    }
  }

  const handleJoin = async (teamId: string, e: React.MouseEvent) => {
    e.stopPropagation()
    if (!checkLogin(navigate)) return
    
    if (currentUser && currentUser.teamId && currentUser.teamId !== teamId) {
      Toast.show({ content: '请先退出当前球队后再加入', icon: 'fail' })
      return
    }

    try {
      await request.post(`/teams/${teamId}/join`)
      Toast.show({ icon: 'success', content: '申请已提交，请等待审核' })
      fetchPendingRequests()
    } catch (error) {
      console.error(error)
    }
  }

  const renderJoinButton = (team: any) => {
    if (!currentUser) {
      return (
        <Button size="small" color="primary" fill="outline" onClick={(e) => handleJoin(team.id, e)} className="rounded-full px-4 border-violet-500 text-violet-600">
          加入
        </Button>
      )
    }

    if (team.members?.includes(currentUser.id)) {
      return (
        <Button size="small" color="default" disabled className="rounded-full px-4 bg-gray-100 border-none text-gray-400">
          已加入
        </Button>
      )
    }

    const isPending = pendingRequests.some(req => req.team.id === team.id)
    if (isPending) {
      return (
        <Button size="small" color="warning" fill="outline" disabled className="rounded-full px-4">
          审核中
        </Button>
      )
    }

    return (
      <Button 
        size="small" 
        color="primary" 
        fill="outline" 
        onClick={(e) => handleJoin(team.id, e)}
        className="rounded-full px-4 border-violet-500 text-violet-600 hover:bg-violet-50"
      >
        加入
      </Button>
    )
  }

  return (
    <div className="pb-24 pt-20">
      {/* Sticky Header */}
      <div className="fixed top-0 left-0 right-0 z-40 bg-white/80 backdrop-blur-md border-b border-gray-100 transition-all duration-300">
        <div className="px-4 py-3 pt-safe-top max-w-md mx-auto">
             <div className="bg-gray-100/80 rounded-full px-4 py-2 flex items-center gap-2 transition-colors focus-within:bg-white focus-within:ring-2 focus-within:ring-violet-500/20 shadow-inner">
                <Search size={18} className="text-gray-400" />
                <input 
                    type="text" 
                    placeholder="搜索球队..." 
                    className="bg-transparent border-none outline-none text-base w-full text-gray-800 placeholder:text-gray-400"
                />
             </div>
        </div>
      </div>

      <div className="p-4 space-y-4 max-w-md mx-auto">
        {teams.map(team => (
          <div 
            key={team.id} 
            onClick={() => navigate(`/teams/${team.id}`)}
            className="bg-white rounded-2xl p-4 shadow-card flex items-center gap-4 active:scale-[0.99] transition-transform duration-200"
          >
            <Avatar src={team.logo || getDefaultLogo(team.name)} className="w-16 h-16 bg-gray-100 rounded-2xl shrink-0" />
            <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5 mb-1">
                    <h3 className="font-bold text-lg text-gray-800 truncate">{team.name}</h3>
                    {team.isCertified && <Award size={14} className="text-orange-500 shrink-0" />}
                </div>
                <p className="text-sm text-gray-500 mb-2 truncate">{team.slogan || '暂无口号'}</p>
                <div className="flex items-center gap-3 text-xs text-gray-400">
                    <div className="flex items-center gap-1">
                        <Users size={12} />
                        <span>{team.members?.length || 0}人</span>
                    </div>
                    <div className="flex items-center gap-1">
                        <span className="bg-gray-100 px-1.5 py-0.5 rounded text-gray-500">队长: {team.captain?.name || '未知'}</span>
                    </div>
                </div>
            </div>
            <div className="shrink-0">
                {renderJoinButton(team)}
            </div>
          </div>
        ))}
        
        {teams.length === 0 && (
           <div className="text-center py-20 text-gray-400">
               <Users size={48} className="mx-auto mb-4 opacity-20" />
               <p>暂无球队</p>
           </div>
        )}
      </div>

      <FloatingBubble
        axis="xy"
        magnetic="x"
        style={{
          '--initial-position-bottom': '100px',
          '--initial-position-right': '24px',
          '--edge-distance': '24px',
          '--size': '56px',
        }}
        onClick={handleCreate}
      >
        <div className="flex items-center justify-center w-full h-full bg-gradient-to-r from-violet-500 to-fuchsia-600 rounded-full text-white shadow-xl shadow-violet-500/30 active:scale-90 transition-transform">
          <Plus size={28} strokeWidth={2.5} />
        </div>
      </FloatingBubble>

      <Modal
        visible={visible}
        title="创建球队"
        content={
          <Form form={form} onFinish={onFinish} layout='horizontal'>
            <Form.Item label="队徽">
              <div className="flex flex-col items-center py-2">
                <ImageUploader
                  value={fileList}
                  onChange={setFileList}
                  upload={mockUpload}
                  maxCount={1}
                  style={{ '--cell-size': '80px' }}
                >
                  <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center text-gray-300 border border-dashed border-gray-200">
                    <Plus size={24} />
                  </div>
                </ImageUploader>
                <div className="text-xs text-gray-400 mt-2">点击上传队徽</div>
              </div>
            </Form.Item>
            <Form.Item
              name="name"
              label="队名"
              rules={[
                { required: true, message: '请输入球队名称' },
                { min: 2, message: '队名至少2个字符' },
                { max: 20, message: '队名最多20个字符' }
              ]}
            >
              <Input placeholder="请输入球队名称" clearable className="text-right" />
            </Form.Item>
            <Form.Item
              name="slogan"
              label="口号"
              rules={[
                { max: 20, message: '口号最多20个字符' }
              ]}
            >
              <Input placeholder="一句话介绍" clearable className="text-right" />
            </Form.Item>
            <Form.Item
              name="establishmentDate"
              label="成立"
              trigger="onConfirm"
              onClick={() => setDatePickerVisible(true)}
            >
              <Input placeholder="选择时间" readOnly className="text-right" />
            </Form.Item>
            <Form.Item
              name="contactPhone"
              label="联系"
              rules={[
                { pattern: /^1[3-9]\d{9}$/, message: '请输入正确的手机号' }
              ]}
            >
              <Input placeholder="联系电话" clearable className="text-right" />
            </Form.Item>
            <Form.Item
              name="description"
              label="简介"
              rules={[
                { max: 200, message: '简介最多200个字符' }
              ]}
            >
              <TextArea placeholder="详细介绍一下你的球队..." rows={3} showCount maxLength={200} />
            </Form.Item>
          </Form>
        }
        closeOnAction
        onClose={() => setVisible(false)}
        actions={[
          {
            key: 'confirm',
            text: '立即创建',
            primary: true,
            onClick: () => form.submit(),
          },
          {
            key: 'cancel',
            text: '取消',
            onClick: () => setVisible(false),
          },
        ]}
      />
      <DatePicker
        visible={datePickerVisible}
        onClose={() => setDatePickerVisible(false)}
        max={new Date()}
        onConfirm={v => {
          form.setFieldsValue({ establishmentDate: v })
        }}
      />
    </div>
  )
}

export default Teams
