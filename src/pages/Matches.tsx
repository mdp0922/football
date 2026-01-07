import React, { useEffect, useState } from 'react'
import { Tabs, Tag, Button, Toast, Modal, FloatingBubble, Form, Input, Selector, DatePicker, TextArea, ImageUploader, Dialog } from 'antd-mobile'
import { Calendar, Users, MapPin, Plus, Filter, Search } from 'lucide-react'
import request from '../utils/request'
import { useNavigate } from 'react-router-dom'
import dayjs from 'dayjs'
import { checkLogin, getUser } from '../utils/auth'

const Matches: React.FC = () => {
  const navigate = useNavigate()
  const [matches, setMatches] = useState<any[]>([])
  const [createVisible, setCreateVisible] = useState(false)
  const [createForm] = Form.useForm()
  const [matchType, setMatchType] = useState<string>('PICKUP')
  const [startPickerVisible, setStartPickerVisible] = useState(false)
  const [endPickerVisible, setEndPickerVisible] = useState(false)
  const currentUser = getUser()
  const [statusFilter, setStatusFilter] = useState('all')
  const [matchImageFileList, setMatchImageFileList] = useState<any[]>([])

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

  useEffect(() => {
    fetchMatches()
  }, [])

  const fetchMatches = async () => {
    try {
      const res: any = await request.get('/matches')
      setMatches(res)
    } catch (error) {
      console.error(error)
    }
  }

  const filteredMatches = matches.filter(match => {
    if (statusFilter === 'all') return true
    return match.status === statusFilter
  })

  const handleCreate = async () => {
    if (!checkLogin(navigate)) return
    setCreateVisible(true)
  }

  const onCreateFinish = async (values: any) => {
    try {
      const start = dayjs(values.startTime)
      const end = dayjs(values.endTime)

      const payload = {
        ...values,
        startTime: start.toDate(),
        endTime: end.toDate(),
        date: start.format('YYYY-MM-DD'),
        time: start.format('HH:mm'),
        type: values.type[0],
        coverUrl: matchImageFileList[0]?.url
      }
      await request.post('/matches', payload)
      Toast.show({ icon: 'success', content: '创建成功' })
      setCreateVisible(false)
      createForm.resetFields()
      setMatchImageFileList([])
      fetchMatches()
    } catch (error) {
      console.error(error)
      Toast.show({ content: '创建失败: ' + (error as any).response?.data?.message, icon: 'fail' })
    }
  }

  const handleRegister = async (match: any) => {
    if (!checkLogin(navigate)) return

    if (match.type === 'TEAM_FRIENDLY' && match.initiatorId === currentUser?.id) {
       return 
    }

    if (match.type === 'TEAM_FRIENDLY') {
       const result = await Dialog.confirm({
         content: '确定应战吗？您必须是球队管理员。',
       })
       if (result) {
           try {
             await request.post(`/matches/${match.id}/register`)
             Toast.show({ icon: 'success', content: '应战成功' })
             fetchMatches()
           } catch (error) {
             Toast.show({ content: (error as any).response?.data?.message || '失败', icon: 'fail' })
           }
       }
       return
    }
    
    try {
      await request.post(`/matches/${match.id}/register`, { side: 'NONE' })
      Toast.show({ icon: 'success', content: '报名成功' })
      fetchMatches()
    } catch (error) {
      Toast.show({ content: (error as any).response?.data?.message || '报名失败', icon: 'fail' })
    }
  }

  const getStatusTag = (status: string) => {
    switch(status) {
      case 'registering': return <span className="bg-indigo-100 text-indigo-600 text-xs px-2 py-0.5 rounded-full font-bold">报名中</span>
      case 'ongoing': return <span className="bg-violet-100 text-violet-600 text-xs px-2 py-0.5 rounded-full font-bold">进行中</span>
      case 'finished': return <span className="bg-gray-100 text-gray-500 text-xs px-2 py-0.5 rounded-full font-bold">已结束</span>
      default: return null
    }
  }
  
  const getTypeTag = (type: string) => {
    switch(type) {
      case 'LEAGUE': return <Tag color="warning" className="rounded-md">联赛</Tag>
      case 'TEAM_FRIENDLY': return <Tag color="danger" className="rounded-md">友谊赛</Tag>
      case 'PICKUP': return <Tag color="success" className="rounded-md">散场</Tag>
      case 'NIGHT': return <Tag color="#7c3aed" className="rounded-md">夜场</Tag>
      default: return null
    }
  }

  return (
    <div className="pb-24 pt-28">
      {/* Sticky Header */}
      <div className="fixed top-0 left-0 right-0 z-40 bg-white/80 backdrop-blur-md border-b border-gray-100 shadow-sm transition-all duration-300">
        <div className="pt-safe-top px-4 pb-2 pt-4 max-w-md mx-auto">
          <div className="flex items-center gap-3 mb-3">
             <div className="flex-1 bg-gray-100/80 rounded-full px-3 py-1.5 flex items-center gap-2 transition-colors focus-within:bg-white focus-within:ring-2 focus-within:ring-violet-500/20">
                <Search size={16} className="text-gray-400" />
                <input 
                    type="text" 
                    placeholder="搜索赛事..." 
                    className="bg-transparent border-none outline-none text-sm w-full"
                />
             </div>
             <Button size="small" fill="none" className="p-0 text-gray-500">
                <Filter size={20} />
             </Button>
          </div>
          
          <Tabs 
            activeKey={statusFilter} 
            onChange={setStatusFilter}
            style={{ '--active-line-height': '3px', '--active-title-color': '#7c3aed', '--title-font-size': '15px' }}
          >
            <Tabs.Tab title="全部" key="all" />
            <Tabs.Tab title="报名中" key="registering" />
            <Tabs.Tab title="进行中" key="ongoing" />
            <Tabs.Tab title="已结束" key="finished" />
          </Tabs>
        </div>
      </div>

      <div className="px-4 space-y-4 max-w-md mx-auto">
        {filteredMatches.map(match => (
          <div 
            key={match.id} 
            onClick={() => navigate(`/matches/${match.id}`)} 
            className="bg-white rounded-2xl overflow-hidden shadow-card active:scale-[0.99] transition-transform duration-200 group"
          >
            {match.coverUrl ? (
                <div className="h-36 w-full relative">
                    <img src={match.coverUrl} className="w-full h-full object-cover" alt={match.title} />
                    <div className="absolute top-3 left-3">
                        {getTypeTag(match.type)}
                    </div>
                    <div className="absolute top-3 right-3 shadow-sm">
                        {getStatusTag(match.status)}
                    </div>
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-90" />
                    <div className="absolute bottom-3 left-4 right-4 text-white">
                        <h3 className="font-bold text-lg leading-tight shadow-black/50 drop-shadow-md">{match.title}</h3>
                    </div>
                </div>
            ) : (
                <div className="p-4 pb-2">
                    <div className="flex justify-between items-start mb-2">
                        <div className="flex items-center gap-2">
                            {getTypeTag(match.type)}
                            <h3 className="font-bold text-lg text-gray-800">{match.title}</h3>
                        </div>
                        {getStatusTag(match.status)}
                    </div>
                </div>
            )}
            
            <div className="p-4 pt-3">
                <div className="flex items-center justify-between text-sm text-gray-500 mb-4">
                    <div className="space-y-1.5">
                        <div className="flex items-center gap-2">
                            <Calendar size={14} className="text-emerald-500" />
                            <span>
                                {match.registrationEndTime 
                                ? `${dayjs(match.registrationEndTime).format('MM-DD HH:mm')} 截止`
                                : match.startTime 
                                    ? `${dayjs(match.startTime).format('MM-DD HH:mm')} 截止`
                                    : `${match.date} ${match.time} 截止`
                                }
                            </span>
                        </div>
                        <div className="flex items-center gap-2">
                            <MapPin size={14} className="text-blue-500" />
                            <span className="truncate max-w-[200px]">{match.location}</span>
                        </div>
                    </div>
                    <div className="text-right">
                        <div className="flex items-center justify-end gap-1.5 bg-gray-50 px-3 py-1.5 rounded-full">
                            <Users size={14} className="text-gray-400" />
                            <span className="font-bold text-gray-700">
                                {match.type === 'NIGHT' 
                                    ? `${match.currentPlayers}/${match.minPlayers}`
                                    : match.type === 'LEAGUE' || match.type === 'TEAM_FRIENDLY'
                                    ? (match.teams?.includes('/') ? `${match.teams.split('/')[0]}队` : `${(match.homeTeamId ? 1 : 0) + (match.awayTeamId ? 1 : 0)}队`)
                                    : `${match.currentPlayers}人`
                                }
                            </span>
                        </div>
                    </div>
                </div>

                <div className="border-t border-gray-100 pt-3 flex justify-end" onClick={e => e.stopPropagation()}>
                {match.status === 'registering' ? (
                    match.isRegistered ? (
                        <Button 
                            size="small" 
                            disabled 
                            className="rounded-lg px-6 font-bold bg-green-100 text-green-600 border-none opacity-100"
                        >
                            已报名
                        </Button>
                    ) : match.type === 'TEAM_FRIENDLY' && match.initiatorId === currentUser?.id ? (
                    <Button size="small" disabled color="default" className="rounded-lg px-4 bg-gray-100 border-none text-gray-400">等待应战</Button>
                    ) : (
                    <Button 
                        size="small" 
                        color="primary" 
                        className="rounded-lg px-6 font-bold shadow-lg shadow-violet-200"
                        onClick={() => handleRegister(match)}
                    >
                        {match.type === 'TEAM_FRIENDLY' ? '立即应战' : '立即报名'}
                    </Button>
                    )
                ) : (
                    <Button 
                    size="small" 
                    fill="outline" 
                    color="primary" 
                    className="rounded-lg px-6 border-violet-200 text-violet-600 hover:bg-violet-50"
                    onClick={() => navigate(`/matches/${match.id}`)}
                    >
                    查看详情
                    </Button>
                )}
                </div>
            </div>
          </div>
        ))}

        {filteredMatches.length === 0 && (
            <div className="text-center py-20 text-gray-400">
                <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Search size={24} className="opacity-40" />
                </div>
                <p>暂无相关赛事</p>
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
        visible={createVisible}
        title="发起比赛"
        content={
          <Form form={createForm} onFinish={onCreateFinish} initialValues={{ type: ['PICKUP'], format: ['8'] }} layout='horizontal'>
            <Form.Item name="type" label="类型" rules={[{ required: true }]}>
              <Selector
                columns={1}
                options={[
                  { label: '散场友谊赛 (任意人发起/参与)', value: 'PICKUP' },
                  { label: '球队友谊赛 (需球队管理员)', value: 'TEAM_FRIENDLY' },
                  { label: '夜场比赛 (随机组队)', value: 'NIGHT' },
                ]}
                onChange={v => setMatchType(v[0])}
              />
            </Form.Item>
            <Form.Item name="title" label="标题" rules={[{ required: true }]}>
              <Input placeholder="给比赛起个响亮的名字" />
            </Form.Item>
            <Form.Item name="startTime" label="开始" trigger="onConfirm" onClick={() => setStartPickerVisible(true)} rules={[{ required: true }]}>
              <Input placeholder="选择时间" readOnly className="text-right" />
            </Form.Item>
            <Form.Item name="endTime" label="结束" trigger="onConfirm" onClick={() => setEndPickerVisible(true)} rules={[{ required: true }]}>
              <Input placeholder="选择时间" readOnly className="text-right" />
            </Form.Item>
            <Form.Item name="location" label="地点" rules={[{ required: true }]}>
              <Input placeholder="比赛场馆/地点" />
            </Form.Item>
            <Form.Item name="format" label="赛制">
              <Selector
                columns={3}
                options={[
                  { label: '5人制', value: '5' },
                  { label: '8人制', value: '8' },
                  { label: '11人制', value: '11' },
                ]}
              />
            </Form.Item>
            <Form.Item name="jerseyColor" label="主队球衣" rules={[{ required: matchType === 'PICKUP', message: '请输入主队球衣颜色' }]}>
              <Input placeholder="如：红色" />
            </Form.Item>
            {(matchType === 'PICKUP' || matchType === 'TEAM_FRIENDLY') && (
              <Form.Item name="awayJerseyColor" label="客队球衣" rules={[{ required: matchType === 'PICKUP', message: '请输入客队球衣颜色' }]}>
                <Input placeholder="如：蓝色" />
              </Form.Item>
            )}
            
            <Form.Item name="description" label="说明">
              <TextArea placeholder="补充说明比赛规则、费用等..." rows={3} />
            </Form.Item>
            <Form.Item label="封面">
              <ImageUploader
                value={matchImageFileList}
                onChange={setMatchImageFileList}
                upload={mockUpload}
                maxCount={1}
              />
            </Form.Item>
          </Form>
        }
        closeOnAction
        onClose={() => setCreateVisible(false)}
        actions={[
          { key: 'confirm', text: '立即发布', primary: true, onClick: () => createForm.submit() },
          { key: 'cancel', text: '取消', onClick: () => setCreateVisible(false) }
        ]}
      />
      
      <DatePicker
        visible={startPickerVisible}
        onClose={() => setStartPickerVisible(false)}
        precision="minute"
        min={new Date()}
        onConfirm={v => {
          createForm.setFieldsValue({ startTime: dayjs(v).format('YYYY-MM-DD HH:mm') })
        }}
      />
      <DatePicker
        visible={endPickerVisible}
        onClose={() => setEndPickerVisible(false)}
        precision="minute"
        min={new Date()}
        onConfirm={v => {
          createForm.setFieldsValue({ endTime: dayjs(v).format('YYYY-MM-DD HH:mm') })
        }}
      />
    </div>
  )
}

export default Matches
