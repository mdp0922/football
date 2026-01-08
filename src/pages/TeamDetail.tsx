import React, { useEffect, useState } from 'react'
import { useParams, useNavigate, useLocation } from 'react-router-dom'
import { NavBar, Avatar, Button, List, Toast, Tag, Form, Input, TextArea, Modal, DatePicker, Popup, Tabs, Badge, Dialog, ImageUploader } from 'antd-mobile'
import { ImageUploadItem } from 'antd-mobile/es/components/image-uploader'
import { Users, Trophy, MessageSquare, Phone, Edit3, Settings, LogOut, CheckCircle, XCircle, Plus, Trash2 } from 'lucide-react'
import dayjs from 'dayjs'
import request from '../utils/request'
import { checkLogin, getUser } from '../utils/auth'

const TeamDetail: React.FC = () => {
  const { id } = useParams()
  const navigate = useNavigate()
  const location = useLocation()
  const [team, setTeam] = useState<any>(null)
  const [members, setMembers] = useState<any[]>([])
  const [requests, setRequests] = useState<any[]>([])
  const [pendingRequests, setPendingRequests] = useState<any[]>([])
  const [manageVisible, setManageVisible] = useState(false)
  const [activeTab, setActiveTab] = useState('requests')
  const [editVisible, setEditVisible] = useState(false)
  const [datePickerVisible, setDatePickerVisible] = useState(false)
  const [honorFormVisible, setHonorFormVisible] = useState(false)
  const [honorForm] = Form.useForm()
  const [fileList, setFileList] = useState<ImageUploadItem[]>([])
  const [editForm] = Form.useForm()
  const currentUser = getUser()

  useEffect(() => {
    if (id) {
      fetchTeamDetail()
    }
    if (currentUser) {
      fetchPendingRequests()
    }
  }, [id])

  useEffect(() => {
    if (team && currentUser) {
      const params = new URLSearchParams(location.search)
      if (params.get('action') === 'requests') {
        const isTeamAdmin = team.captain?.id === currentUser.id || team.admins?.includes(currentUser.id)
        if (isTeamAdmin) {
          setManageVisible(true)
          setActiveTab('requests')
        }
      }
    }
  }, [team, location.search])

  const fetchTeamDetail = async () => {
    try {
      const res: any = await request.get(`/teams/${id}`)
      setTeam(res)
      setMembers(res.memberDetails || [])
      
      const isTeamAdmin = res.captain?.id === currentUser?.id || res.admins?.includes(currentUser?.id)
      if (isTeamAdmin) {
        fetchRequests()
      }
    } catch (error) {
      console.error(error)
      Toast.show({ content: '获取球队详情失败', icon: 'fail' })
    }
  }

  const fetchRequests = async () => {
    try {
      const res: any = await request.get(`/teams/${id}/requests`)
      setRequests(res)
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

  const handleJoin = async () => {
    if (!checkLogin(navigate)) return
    
    if (currentUser.teamId && currentUser.teamId !== team.id) {
      Toast.show({ content: '请先退出当前球队后再加入', icon: 'fail' })
      return
    }

    try {
      await request.post(`/teams/${id}/join`)
      Toast.show({ icon: 'success', content: '申请已提交，请等待审核' })
      fetchPendingRequests()
    } catch (error) {
      console.error(error)
    }
  }

  const handleLeave = async () => {
    Dialog.confirm({
      content: '确定要退出球队吗？需要管理员审核。',
      onConfirm: async () => {
        try {
          await request.post(`/teams/${id}/leave`)
          Toast.show({ icon: 'success', content: '申请已提交' })
        } catch (error) {
          console.error(error)
        }
      }
    })
  }

  const handleAudit = async (requestId: string, status: 'APPROVED' | 'REJECTED') => {
    try {
      await request.post(`/teams/${id}/requests/${requestId}/audit`, { status })
      Toast.show({ icon: 'success', content: '操作成功' })
      fetchRequests()
      fetchTeamDetail() // Refresh members
    } catch (error) {
      console.error(error)
    }
  }

  const handleSetAdmin = async (userId: string) => {
    try {
      await request.post(`/teams/${id}/admins`, { userId })
      Toast.show({ icon: 'success', content: '设置成功' })
      fetchTeamDetail()
    } catch (error) {
      console.error(error)
    }
  }

  const handleRemoveAdmin = async (adminId: string) => {
    try {
      await request.delete(`/teams/${id}/admins/${adminId}`)
      Toast.show({ icon: 'success', content: '移除成功' })
      fetchTeamDetail()
    } catch (error) {
      console.error(error)
    }
  }

  const handleTransfer = async (userId: string) => {
    Dialog.confirm({
      content: '确定要将球队转让给该成员吗？转让后您将失去创始人身份。',
      onConfirm: async () => {
        try {
          await request.post(`/teams/${id}/transfer`, { userId })
          Toast.show({ icon: 'success', content: '转让成功' })
          fetchTeamDetail()
        } catch (error) {
          console.error(error)
        }
      }
    })
  }

  const handleDisband = async () => {
    Dialog.confirm({
      content: <div className="text-red-500">确定要解散球队吗？此操作不可撤销！所有成员将被移除，所有数据将被永久删除。</div>,
      confirmText: '确认解散',
      cancelText: '取消',
      onConfirm: async () => {
        try {
          await request.delete(`/teams/${id}`)
          Toast.show({ icon: 'success', content: '球队已解散' })
          navigate('/teams', { replace: true })
        } catch (error) {
          console.error(error)
          Toast.show({ content: '解散失败', icon: 'fail' })
        }
      }
    })
  }

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

  const handleAddHonor = async (values: any) => {
    try {
      const honor = {
        id: Date.now().toString(),
        title: values.title,
        date: dayjs(values.date).format('YYYY-MM-DD'),
        description: values.description,
        image: fileList[0]?.url || ''
      }
      
      const newHonors = [...(team.honors || []), honor]
      await request.post(`/teams/${id}`, { honors: newHonors })
      
      Toast.show({ icon: 'success', content: '添加成功' })
      setHonorFormVisible(false)
      honorForm.resetFields()
      setFileList([])
      fetchTeamDetail()
    } catch (error) {
      console.error(error)
    }
  }

  const handleDeleteHonor = async (honorId: string) => {
    Dialog.confirm({
      content: '确定删除该荣誉记录吗？',
      onConfirm: async () => {
        try {
          const newHonors = team.honors.filter((h: any) => h.id !== honorId)
          await request.post(`/teams/${id}`, { honors: newHonors })
          Toast.show({ icon: 'success', content: '删除成功' })
          fetchTeamDetail()
        } catch (error) {
          console.error(error)
        }
      }
    })
  }

  const handleEdit = () => {
    const roles: any = {}
    members.forEach(m => {
      roles[`role_${m.id}`] = team.memberRoles?.[m.id] || ''
      roles[`number_${m.id}`] = m.jerseyNumber !== undefined && m.jerseyNumber !== null ? m.jerseyNumber : ''
    })
    
    setEditVisible(true)
    
    // 使用 setTimeout 确保 Form 组件已挂载
    setTimeout(() => {
        editForm.setFieldsValue({
          name: team.name,
          slogan: team.slogan,
          description: team.description,
          contactPhone: team.contactPhone,
          establishmentDate: team.establishmentDate ? new Date(team.establishmentDate) : null,
          ...roles
        })
    }, 0)
  }

  const onEditFinish = async (values: any) => {
    try {
      const memberRoles: any = {}
      const memberNumbers: any = {}
      
      members.forEach(m => {
        if (values[`role_${m.id}`]) {
          memberRoles[m.id] = values[`role_${m.id}`]
        }
        if (values[`number_${m.id}`] !== undefined && values[`number_${m.id}`] !== '') {
          memberNumbers[m.id] = values[`number_${m.id}`]
        }
      })

      const payload = {
        name: values.name,
        slogan: values.slogan,
        description: values.description,
        contactPhone: values.contactPhone,
        memberRoles,
        memberNumbers, // New field to handle batch update of jersey numbers
        establishmentDate: values.establishmentDate ? dayjs(values.establishmentDate).format('YYYY-MM-DD') : null
      }

      await request.post(`/teams/${id}`, payload)
      Toast.show({ icon: 'success', content: '更新成功' })
      setEditVisible(false)
      fetchTeamDetail()
    } catch (error) {
      console.error(error)
      Toast.show({ content: '更新失败', icon: 'fail' })
    }
  }

  if (!team) return null

  const isMember = team.members?.includes(currentUser?.id)
  const isCaptain = team.captain?.id === currentUser?.id
  const isAdmin = team.admins?.includes(currentUser?.id)
  const isTeamAdmin = isCaptain || isAdmin
  const isPending = pendingRequests.some(req => req.team.id === team.id)

  const positionMap: Record<string, string> = {
    'FW': '前锋', 'ST': '中锋', 'RW': '右边锋', 'LW': '左边锋',
    'MF': '中场', 'CM': '中前卫', 'CDM': '后腰', 'CAM': '前腰', 'RM': '右前卫', 'LM': '左前卫',
    'DF': '后卫', 'CB': '中后卫', 'RB': '右后卫', 'LB': '左后卫',
    'GK': '门将',
    'FORWARD': '前锋', 'MIDFIELDER': '中场', 'DEFENDER': '后卫', 'GOALKEEPER': '门将'
  }

  const translatePosition = (pos: string) => {
    if (!pos) return ''
    return positionMap[pos.toUpperCase()] || pos
  }

  const renderJoinButton = () => {
    if (!currentUser) {
      return (
        <Button block shape="rounded" color="primary" className="font-bold" onClick={handleJoin}>
          申请加入
        </Button>
      )
    }
    
    if (isPending) {
      return (
        <Button block shape="rounded" color="warning" fill="outline" className="font-bold" disabled>
          审核中
        </Button>
      )
    }

    return (
      <Button block shape="rounded" color="primary" className="font-bold" onClick={handleJoin}>
        申请加入
      </Button>
    )
  }

  const captainDetails = members.find(m => m.id === team.captain?.id) || team.captain

  return (
    <div className="min-h-screen bg-slate-50 pb-20">
      <NavBar 
        onBack={() => navigate(-1)}
        style={{ '--border-bottom': '0', backgroundColor: 'transparent', position: 'absolute', top: 0, left: 0, right: 0, zIndex: 10, color: 'white', paddingTop: 'env(safe-area-inset-top)' }}
        right={isTeamAdmin && (
          <div className="flex items-center justify-end h-full text-white">
            <Badge content={requests.length ? requests.length : null}>
              <Settings size={28} onClick={() => setManageVisible(true)} className="cursor-pointer" />
            </Badge>
          </div>
        )}
      >
        {/* Empty title for transparent effect */}
      </NavBar>

      {/* Header Banner */}
      <div className="relative h-48 bg-gradient-to-r from-violet-500 to-fuchsia-600">
         <div className="absolute inset-0 bg-black/20" />
      </div>

      <div className="relative px-4 -mt-12 pb-24">
        {/* Team Basic Info Card */}
        <div className="bg-white rounded-xl shadow-sm p-4 text-center mb-4">
          <div className="relative inline-block">
             <Avatar 
               src={team.logo} 
               style={{ '--size': '8rem', '--border-radius': '50%' }} 
               className="border-4 border-white shadow-md bg-gray-200" 
             />
             {isCaptain && <div className="absolute bottom-0 right-0 bg-yellow-500 rounded-full p-2 border-2 border-white"><Trophy size={20} className="text-white"/></div>}
          </div>
          
          <h1 className="text-xl font-bold mt-2 text-gray-800">{team.name}</h1>
          <p className="text-gray-500 text-sm mt-1">{team.slogan || '暂无口号'}</p>
          
          <div className="flex gap-2 mt-3 justify-center flex-wrap">
            <Tag color="primary" fill="outline" className="rounded-full px-2">{team.members?.length || 1} 成员</Tag>
            <Tag color="success" fill="outline" className="rounded-full px-2">
              成立于 {team.establishmentDate ? dayjs(team.establishmentDate).format('YYYY') : new Date(team.createdAt).getFullYear()}
            </Tag>
            {team.contactPhone && (
               <Tag color="warning" fill="outline" className="rounded-full px-2 flex items-center gap-1">
                 <Phone size={10} /> {team.contactPhone}
               </Tag>
            )}
          </div>
        </div>

        {/* Description Card */}
        <div className="bg-white rounded-xl shadow-sm p-4 mb-4">
          <div className="flex items-center gap-2 mb-2 font-bold text-gray-800">
            <MessageSquare size={18} className="text-violet-500"/>
            <span>简介</span>
          </div>
          <div className="text-gray-600 text-sm leading-relaxed whitespace-pre-wrap">
            {team.description || '暂无简介'}
          </div>
        </div>

        {/* Members Card */}
        <div className="bg-white rounded-xl shadow-sm p-4 mb-4">
           <div className="flex items-center gap-2 mb-3 font-bold text-gray-800">
            <Users size={18} className="text-violet-500"/>
            <span>成员列表</span>
          </div>
          <div className="space-y-3">
             <div className="flex items-center justify-between" onClick={() => captainDetails?.id && navigate(`/user/${captainDetails.id}`)}>
                <div className="flex items-center gap-3">
                  <Avatar src={captainDetails?.avatar} className="w-10 h-10" />
                  <div>
                    <div className="font-medium text-gray-800 flex items-center gap-1">
                       {captainDetails?.name}
                       <span className="bg-yellow-100 text-yellow-700 text-xs px-1.5 py-0.5 rounded font-normal">队长</span>
                    </div>
                    <div className="text-xs text-gray-400">
                      {[
                        captainDetails?.footballAge ? `${captainDetails.footballAge}年球龄` : null,
                        team.memberRoles?.[captainDetails?.id] || translatePosition(captainDetails?.position) || '创始人',
                        (captainDetails?.jerseyNumber !== undefined && captainDetails?.jerseyNumber !== null) ? `#${captainDetails.jerseyNumber}` : null,
                        captainDetails?.age ? `${captainDetails.age}岁` : null
                      ].filter(Boolean).join(' | ')}
                    </div>
                  </div>
                </div>
             </div>
             
             {members.filter(m => m.id !== team.captain?.id).map(member => (
               <div key={member.id} className="flex items-center justify-between border-t border-gray-50 pt-3" onClick={() => navigate(`/user/${member.id}`)}>
                  <div className="flex items-center gap-3">
                    <Avatar src={member.avatar} className="w-10 h-10" />
                    <div>
                      <div className="font-medium text-gray-800 flex items-center gap-1">
                         {member.name}
                         {team.admins?.includes(member.id) && <span className="bg-violet-100 text-violet-700 text-xs px-1.5 py-0.5 rounded font-normal">管理员</span>}
                      </div>
                      <div className="text-xs text-gray-400">
                        {[
                          member.footballAge ? `${member.footballAge}年球龄` : null,
                          team.memberRoles?.[member.id] || translatePosition(member.position) || '成员',
                          (member.jerseyNumber !== undefined && member.jerseyNumber !== null) ? `#${member.jerseyNumber}` : null,
                          member.age ? `${member.age}岁` : null
                        ].filter(Boolean).join(' | ')}
                      </div>
                    </div>
                  </div>
               </div>
             ))}
          </div>
        </div>

        {/* Honors Card */}
        <div className="bg-white rounded-xl shadow-sm p-4 mb-4">
          <div className="flex items-center justify-between mb-3">
             <div className="flex items-center gap-2 font-bold text-gray-800">
               <Trophy size={18} className="text-yellow-500"/>
               <span>球队荣誉</span>
             </div>
             {isTeamAdmin && (
                <Button size="mini" color="primary" fill="none" onClick={() => setHonorFormVisible(true)}>
                  <Plus size={16} />
                </Button>
              )}
          </div>
          
          {(!team.honors || team.honors.length === 0) ? (
            <div className="text-center py-6 text-gray-400 bg-gray-50 rounded-lg text-sm">
              暂无荣誉记录
            </div>
          ) : (
            <div className="space-y-3">
              {team.honors.map((honor: any) => (
                <div key={honor.id} className="flex gap-3 bg-gray-50 p-2 rounded-lg">
                  {honor.image ? (
                    <img src={honor.image} alt={honor.title} className="w-16 h-16 object-cover rounded bg-white" />
                  ) : (
                    <div className="w-16 h-16 bg-white rounded flex items-center justify-center text-gray-300">
                      <Trophy size={24} />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-start">
                      <h4 className="font-bold text-sm text-gray-800 truncate pr-2">{honor.title}</h4>
                      {isTeamAdmin && (
                        <Trash2 
                          size={14} 
                          className="text-gray-400 cursor-pointer hover:text-red-500 flex-shrink-0" 
                          onClick={() => handleDeleteHonor(honor.id)}
                        />
                      )}
                    </div>
                    <div className="text-xs text-violet-500 mt-0.5">{honor.date}</div>
                    <p className="text-xs text-gray-500 mt-1 line-clamp-2">{honor.description}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Fixed Bottom Action Bar */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 p-3 px-4 z-50 safe-area-bottom">
        {isTeamAdmin ? (
          <Button 
            block 
            shape="rounded"
            color="primary" 
            onClick={handleEdit}
            className="font-bold"
          >
            <Edit3 size={18} className="mr-1.5 inline" /> 编辑球队资料
          </Button>
        ) : isMember ? (
          <Button 
            block 
            shape="rounded"
            color="danger" 
            fill="outline"
            onClick={handleLeave}
            className="font-bold"
          >
            <LogOut size={18} className="mr-1.5 inline" /> 退出球队
          </Button>
        ) : (
          renderJoinButton()
        )}
      </div>

      <Popup
        visible={manageVisible}
        onMaskClick={() => setManageVisible(false)}
        bodyStyle={{ height: '60vh' }}
      >
        <div className="p-4 h-full flex flex-col">
          <div className="text-lg font-bold mb-4 text-center">球队管理</div>
          <Tabs className="flex-1 overflow-hidden" activeKey={activeTab} onChange={setActiveTab}>
            <Tabs.Tab title={<Badge content={requests.length ? requests.length : null}>申请审核</Badge>} key="requests">
              <div className="overflow-y-auto h-full pb-10">
                {requests.length === 0 ? (
                  <div className="text-center text-gray-400 py-10">暂无申请</div>
                ) : (
                  <List>
                    {requests.map(req => (
                      <List.Item
                        key={req.id}
                        prefix={<Avatar src={req.user.avatar} />}
                        description={req.type === 'JOIN' ? '申请加入' : '申请退出'}
                        extra={
                          <div className="flex gap-2">
                            <Button size="small" color="success" onClick={() => handleAudit(req.id, 'APPROVED')}>
                              <CheckCircle size={16} />
                            </Button>
                            <Button size="small" color="danger" onClick={() => handleAudit(req.id, 'REJECTED')}>
                              <XCircle size={16} />
                            </Button>
                          </div>
                        }
                      >
                        {req.user.name}
                      </List.Item>
                    ))}
                  </List>
                )}
              </div>
            </Tabs.Tab>
            
            {isCaptain && (
              <Tabs.Tab title="管理员设置" key="admins">
                <List header="成员列表">
                  {members.filter(m => m.id !== team.captain.id).map(member => {
                    const isAdmin = team.admins?.includes(member.id)
                    return (
                      <List.Item
                        key={member.id}
                        prefix={<Avatar src={member.avatar} />}
                        extra={
                          isAdmin ? (
                            <Button size="small" color="danger" fill="outline" onClick={() => handleRemoveAdmin(member.id)}>
                              移除管理员
                            </Button>
                          ) : (
                            <Button size="small" color="primary" fill="outline" onClick={() => handleSetAdmin(member.id)}>
                              设为管理员
                            </Button>
                          )
                        }
                      >
                        {member.name}
                      </List.Item>
                    )
                  })}
                </List>
              </Tabs.Tab>
            )}

            {isCaptain && (
              <Tabs.Tab title="球队转让" key="transfer">
                <div className="p-2 bg-yellow-50 text-yellow-600 text-sm mb-2 rounded">
                  注意：转让后您将失去创始人身份，且无法撤销。
                </div>
                <List>
                  {members.filter(m => m.id !== team.captain.id).map(member => (
                    <List.Item
                      key={member.id}
                      prefix={<Avatar src={member.avatar} />}
                      extra={
                        <Button size="small" color="warning" onClick={() => handleTransfer(member.id)}>
                          转让
                        </Button>
                      }
                    >
                      {member.name}
                    </List.Item>
                  ))}
                </List>
              </Tabs.Tab>
            )}

            {isCaptain && (
              <Tabs.Tab title="高级设置" key="advanced">
                <List header="危险操作">
                  <List.Item
                    prefix={<LogOut className="text-red-500" />}
                    onClick={handleDisband}
                    className="text-red-500"
                  >
                    解散球队
                  </List.Item>
                </List>
              </Tabs.Tab>
            )}
          </Tabs>
        </div>
      </Popup>

      <Modal
        visible={honorFormVisible}
        title="添加荣誉"
        content={
          <Form form={honorForm} onFinish={handleAddHonor}>
            <Form.Item label="图片">
              <ImageUploader
                value={fileList}
                onChange={setFileList}
                upload={mockUpload}
                maxCount={1}
              >
                <div className="w-20 h-20 bg-gray-100 rounded flex items-center justify-center text-gray-400">
                  <Plus size={24} />
                </div>
              </ImageUploader>
            </Form.Item>
            <Form.Item name="title" label="标题" rules={[{ required: true }]}>
              <Input placeholder="例如：2023春季联赛冠军" />
            </Form.Item>
            <Form.Item name="date" label="时间" rules={[{ required: true }]} trigger="onConfirm" onClick={() => setDatePickerVisible(true)}>
              <Input placeholder="选择获奖时间" readOnly />
            </Form.Item>
            <Form.Item name="description" label="描述">
              <TextArea placeholder="详细描述..." rows={2} />
            </Form.Item>
          </Form>
        }
        closeOnAction
        onClose={() => setHonorFormVisible(false)}
        actions={[
          { key: 'confirm', text: '添加', primary: true, onClick: () => honorForm.submit() },
          { key: 'cancel', text: '取消', onClick: () => setHonorFormVisible(false) }
        ]}
      />

      <Modal
        visible={editVisible}
        title="编辑球队信息"
        content={
          <Form form={editForm} onFinish={onEditFinish}>
            <Form.Item name="name" label="队名" rules={[{ required: true }]}>
              <Input />
            </Form.Item>
            <Form.Item name="slogan" label="口号">
              <Input />
            </Form.Item>
            <Form.Item name="establishmentDate" label="成立时间" trigger="onConfirm" onClick={() => setDatePickerVisible(true)}>
              <Input readOnly placeholder="选择日期" />
            </Form.Item>
            <Form.Item name="contactPhone" label="联系电话" rules={[{ pattern: /^1[3-9]\d{9}$/, message: '格式错误' }]}>
              <Input />
            </Form.Item>
            <Form.Item name="description" label="简介">
              <TextArea rows={3} showCount maxLength={200} />
            </Form.Item>
            
            <div className="text-sm font-bold mt-4 mb-2 text-gray-500">成员信息管理</div>
            {members.map(member => (
              <div key={member.id} className="mb-4 p-2 bg-gray-50 rounded">
                <div className="font-medium mb-2">{member.name}</div>
                <Form.Item name={`role_${member.id}`} label="职务">
                  <Input placeholder="输入职务，如：前锋" />
                </Form.Item>
                <Form.Item name={`number_${member.id}`} label="球衣号">
                  <Input type="number" placeholder="输入号码 (0-99)" />
                </Form.Item>
              </div>
            ))}
          </Form>
        }
        closeOnAction
        onClose={() => setEditVisible(false)}
        actions={[
          { key: 'confirm', text: '保存', primary: true, onClick: () => editForm.submit() },
          { key: 'cancel', text: '取消', onClick: () => setEditVisible(false) }
        ]}
      />
      
      <DatePicker
        visible={datePickerVisible}
        onClose={() => setDatePickerVisible(false)}
        max={new Date()}
        min={honorFormVisible ? undefined : new Date('1900-01-01')}
        onConfirm={v => {
          if (honorFormVisible) {
            honorForm.setFieldsValue({ date: v })
          } else {
            editForm.setFieldsValue({ establishmentDate: v })
          }
        }}
      />
    </div>
  )
}

export default TeamDetail
