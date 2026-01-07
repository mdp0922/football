import React, { useEffect, useState } from 'react'
import { Card, List, Button, Tag, Tabs, Form, Input, Toast, NavBar, Dialog, Modal, TextArea, Selector, DatePicker, SearchBar, ImageUploader, ActionSheet } from 'antd-mobile'
import { useNavigate } from 'react-router-dom'
import { Plus, Trash2, Edit, ShieldCheck } from 'lucide-react'
import dayjs from 'dayjs'
import request from '../utils/request'
import { getUser } from '../utils/auth'

const Admin: React.FC = () => {
  const navigate = useNavigate()
  const [users, setUsers] = useState<any[]>([])
  const [teams, setTeams] = useState<any[]>([])
  const [venues, setVenues] = useState<any[]>([])
  const [announcements, setAnnouncements] = useState<any[]>([])
  const [ads, setAds] = useState<any[]>([])
  const [matches, setMatches] = useState<any[]>([])
  const [matchForm] = Form.useForm()
  const [matchCoverFileList, setMatchCoverFileList] = useState<any[]>([])
  const [matchModalVisible, setMatchModalVisible] = useState(false)
  const [selectedMatch, setSelectedMatch] = useState<any>(null)
  const [matchStartDatePickerVisible, setMatchStartDatePickerVisible] = useState(false)
  const [matchEndDatePickerVisible, setMatchEndDatePickerVisible] = useState(false)
  const [matchRegStartDatePickerVisible, setMatchRegStartDatePickerVisible] = useState(false)
  const [matchRegEndDatePickerVisible, setMatchRegEndDatePickerVisible] = useState(false)
  const [venueForm] = Form.useForm()
  const [announcementForm] = Form.useForm()
  const [certForm] = Form.useForm()
  const [adForm] = Form.useForm()
  const [venueModalVisible, setVenueModalVisible] = useState(false)
  const [venueFileList, setVenueFileList] = useState<any[]>([])
  const [announcementModalVisible, setAnnouncementModalVisible] = useState(false)
  const [certModalVisible, setCertModalVisible] = useState(false)
  const [adModalVisible, setAdModalVisible] = useState(false)
  const [adFileList, setAdFileList] = useState<any[]>([])
  const [selectedUser, setSelectedUser] = useState<any>(null)
  const [selectedVenue, setSelectedVenue] = useState<any>(null)
  const [selectedAd, setSelectedAd] = useState<any>(null)
  const [resetPasswordModalVisible, setResetPasswordModalVisible] = useState(false)
  const [resetPasswordUserId, setResetPasswordUserId] = useState('')
  const [resetPasswordForm] = Form.useForm()
  const [adminId, setAdminId] = useState('')
  const currentUser = getUser()
  const isSuperAdmin = currentUser?.role === 'super_admin'

  // User search & filter
  const [userSearchKeyword, setUserSearchKeyword] = useState('')
  const [userFilterCert, setUserFilterCert] = useState<string[]>([])

  const [registrations, setRegistrations] = useState<any[]>([])
  const [auditModalVisible, setAuditModalVisible] = useState(false)
  const [selectedRegistration, setSelectedRegistration] = useState<any>(null)
  const [auditForm] = Form.useForm()

  useEffect(() => {
    if (!currentUser || (currentUser.role !== 'admin' && currentUser.role !== 'super_admin')) {
      Toast.show({ content: '无权访问', icon: 'fail' })
      navigate('/')
      return
    }
    fetchUsers()
    fetchTeams()
    fetchVenues()
    fetchAnnouncements()
    fetchRegistrations()
    fetchAds()
    fetchMatches()
  }, [])

  const fetchMatches = async () => {
    try {
      const res: any = await request.get('/admin/matches')
      setMatches(res)
    } catch (error) {
      console.error(error)
    }
  }

  const fetchAds = async () => {
    try {
      const res: any = await request.get('/ads/admin')
      setAds(res)
    } catch (error) {
      console.error(error)
    }
  }

  const fetchRegistrations = async () => {
    try {
      const res: any = await request.get('/matches/registrations/all')
      setRegistrations(res)
    } catch (error) {
      console.error(error)
    }
  }

  const handleResetPassword = async (values: any) => {
    try {
      const res: any = await request.post(`/admin/users/${resetPasswordUserId}/reset-password`, {
        newPassword: values.newPassword
      })
      Toast.show({ icon: 'success', content: res.message || '重置成功' })
      setResetPasswordModalVisible(false)
      resetPasswordForm.resetFields()
    } catch (error) {
      console.error(error)
      Toast.show({ content: '重置失败', icon: 'fail' })
    }
  }

  const handleAudit = (reg: any) => {
    setSelectedRegistration(reg)
    auditForm.setFieldsValue({ status: reg.status, feedback: reg.feedback || '' })
    setAuditModalVisible(true)
  }

  const onAuditFinish = async (values: any) => {
    if (!selectedRegistration) return
    try {
      await request.put(`/matches/registrations/${selectedRegistration.id}/audit`, values)
      Toast.show({ icon: 'success', content: '审核完成' })
      setAuditModalVisible(false)
      fetchRegistrations()
    } catch (error) {
      Toast.show({ content: '操作失败', icon: 'fail' })
    }
  }

  const handleExport = async () => {
    // Extract unique matches from registrations
    const uniqueMatches = Array.from(new Set(registrations.map(r => r.match?.id)))
      .map(id => registrations.find(r => r.match?.id === id)?.match)
      .filter(m => !!m);

    if (uniqueMatches.length === 0) {
      Toast.show('暂无数据可导出');
      return;
    }

    const actions = uniqueMatches.map(m => ({
      text: m.title,
      key: m.id,
      onClick: async () => {
        try {
            const res = await request.get(`/admin/matches/${m.id}/export`, { responseType: 'blob' });
            const blob = new Blob([res as any]);
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `${m.title}-报名表.xlsx`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            window.URL.revokeObjectURL(url);
            Toast.show({ icon: 'success', content: '导出成功' });
        } catch (e) {
            Toast.show({ content: '导出失败', icon: 'fail' });
        }
      }
    }));

    ActionSheet.show({
        actions,
        extra: '请选择要导出的赛事',
        cancelText: '取消',
        closeOnAction: true
    });
  }
  
  const fetchAnnouncements = async () => {
    try {
      const res: any = await request.get('/admin/announcements')
      setAnnouncements(res)
    } catch (error) {
      console.error(error)
    }
  }

  const handleExportUsers = async () => {
    try {
        const res = await request.get('/admin/users/export', { responseType: 'blob' })
        const url = window.URL.createObjectURL(new Blob([res as any]))
        const link = document.createElement('a')
        link.href = url
        link.setAttribute('download', 'users.xlsx')
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
    } catch (e) {
        Toast.show({ content: '导出失败', icon: 'fail' })
    }
  }

  const fetchUsers = async () => {
    try {
      const params: any = {}
      if (userSearchKeyword) params.keyword = userSearchKeyword
      if (userFilterCert.length > 0) params.certification = userFilterCert[0]

      const res: any = await request.get('/admin/users', { params })
      setUsers(res)
    } catch (error) {
      console.error(error)
    }
  }

  const fetchTeams = async () => {
    try {
      const res: any = await request.get('/admin/teams')
      setTeams(res)
    } catch (error) {
      console.error(error)
    }
  }
  
  const fetchVenues = async () => {
    try {
      const res: any = await request.get('/venues')
      setVenues(res)
    } catch (error) {
      console.error(error)
    }
  }

  const handleAddAdmin = async () => {
    if (!adminId) {
      Toast.show('请输入用户ID')
      return
    }
    try {
      await request.post('/admin/add-admin', { userId: adminId })
      Toast.show({ icon: 'success', content: '添加成功' })
      setAdminId('')
      fetchUsers()
    } catch (error) {
      console.error(error)
      Toast.show({ content: '添加失败', icon: 'fail' })
    }
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

  const handleVenueSubmit = async (values: any) => {
    try {
      const data = {
        ...values,
        type: values.type ? values.type[0] : undefined,
        image: venueFileList.length > 0 ? venueFileList[0].url : values.image
      }
      
      if (selectedVenue) {
        await request.put(`/venues/${selectedVenue.id}`, data)
        Toast.show({ icon: 'success', content: '场地已更新' })
      } else {
        await request.post('/venues', data)
        Toast.show({ icon: 'success', content: '场地已添加' })
      }
      setVenueModalVisible(false)
      venueForm.resetFields()
      setVenueFileList([])
      setSelectedVenue(null)
      fetchVenues()
    } catch (error) {
      console.error(error)
      Toast.show({ content: selectedVenue ? '更新失败' : '添加失败', icon: 'fail' })
    }
  }

  const handleEditVenue = (venue: any) => {
    setSelectedVenue(venue)
    venueForm.setFieldsValue({
      ...venue,
      type: venue.type ? [venue.type] : [],
      description: venue.description || ''
    })
    if (venue.image) {
      setVenueFileList([{ url: venue.image }])
    } else {
      setVenueFileList([])
    }
    setVenueModalVisible(true)
  }
  
  const handleDeleteVenue = async (id: string) => {
    Dialog.confirm({
      content: '确定删除该场地吗？',
      onConfirm: async () => {
        try {
          await request.delete(`/venues/${id}`)
          Toast.show({ icon: 'success', content: '删除成功' })
          fetchVenues()
        } catch (error) {
          console.error(error)
        }
      }
    })
  }
  
  const handleAddAnnouncement = async (values: any) => {
    try {
      await request.post('/admin/announcements', values)
      Toast.show({ icon: 'success', content: '发布成功' })
      setAnnouncementModalVisible(false)
      announcementForm.resetFields()
      fetchAnnouncements()
    } catch (error) {
      console.error(error)
      Toast.show({ content: '发布失败', icon: 'fail' })
    }
  }

  const handleDeleteAnnouncement = async (id: string) => {
    Dialog.confirm({
      content: '确定删除该公告吗？',
      onConfirm: async () => {
        try {
          await request.delete(`/admin/announcements/${id}`)
          Toast.show({ icon: 'success', content: '删除成功' })
          fetchAnnouncements()
        } catch (error) {
          console.error(error)
        }
      }
    })
  }

  const onMatchFinish = async (values: any) => {
    try {
      const payload = {
          ...values,
          coverUrl: matchCoverFileList.length > 0 ? matchCoverFileList[0].url : (selectedMatch?.coverUrl || undefined)
      }
      
      if (selectedMatch) {
          await request.put(`/admin/matches/${selectedMatch.id}`, payload)
          Toast.show({ icon: 'success', content: '更新成功' })
      } else {
          await request.post('/admin/matches', payload)
          Toast.show({ icon: 'success', content: '发布成功' })
      }
      
      setMatchModalVisible(false)
      matchForm.resetFields()
      setMatchCoverFileList([])
      setSelectedMatch(null)
      fetchMatches()
    } catch (error) {
      console.error(error)
    }
  }

  const handleEditMatch = (match: any) => {
      setSelectedMatch(match)
      matchForm.setFieldsValue({
          ...match,
          startTime: match.startTime ? dayjs(match.startTime).format('YYYY-MM-DD HH:mm') : '',
          endTime: match.endTime ? dayjs(match.endTime).format('YYYY-MM-DD HH:mm') : '',
          registrationStartTime: match.registrationStartTime ? dayjs(match.registrationStartTime).format('YYYY-MM-DD HH:mm') : '',
          registrationEndTime: match.registrationEndTime ? dayjs(match.registrationEndTime).format('YYYY-MM-DD HH:mm') : '',
      })
      if (match.coverUrl) {
          setMatchCoverFileList([{ url: match.coverUrl }])
      } else {
          setMatchCoverFileList([])
      }
      setMatchModalVisible(true)
  }

  const handleDeleteMatch = async (id: number) => {
    Dialog.confirm({
        content: '确定删除该赛事吗？',
        onConfirm: async () => {
            try {
                await request.delete(`/admin/matches/${id}`)
                Toast.show({ icon: 'success', content: '删除成功' })
                fetchMatches()
            } catch (e) {
                console.error(e)
            }
        }
    })
  }

  const [certApps, setCertApps] = useState<any[]>([])
  
  const fetchCertApps = async () => {
    // 实际应该有一个单独的接口获取所有 pending 的申请
    // 暂时我们可以遍历所有用户（如果数据量小）或者后端提供 filter
    // 假设我们增加一个接口 GET /admin/cert-applications
    // 这里先用 mock 或者复用 users 过滤
    try {
      // 假设 users 已经包含了所有信息，我们前端过滤
      // 实际生产环境应该后端过滤
      const pendingUsers = users.filter(u => u.certificationStatus && u.certificationStatus.startsWith('pending'))
      setCertApps(pendingUsers)
    } catch (error) {
      console.error(error)
    }
  }

  useEffect(() => {
    if (users.length > 0) {
      fetchCertApps()
    }
  }, [users])

  const handleApproveCert = async (user: any, approved: boolean) => {
    if (!approved) {
        // Reject
        try {
            await request.put(`/admin/users/${user.id}/certification`, {
                certificationStatus: 'rejected'
            })
            Toast.show('已拒绝')
            fetchUsers()
        } catch (e) {
            console.error(e)
        }
        return
    }

    // Approve: parse type from certificationStatus "pending:Type"
    const typeStr = user.certificationStatus.split(':')[1]
    const types = typeStr ? typeStr.split(',') : []
    const currentCerts = user.certifications || []
    
    types.forEach((type: string) => {
        if (type && !currentCerts.includes(type)) {
            currentCerts.push(type)
        }
    })
    
    try {
        await request.put(`/admin/users/${user.id}/certification`, {
            certifications: currentCerts,
            certificationStatus: 'approved'
        })
        Toast.show('已通过')
        fetchUsers()
    } catch (e) {
        console.error(e)
    }
  }

  const [showRefereeLevel, setShowRefereeLevel] = useState(false)
  const [showCoachLevel, setShowCoachLevel] = useState(false)

  const handleEditCert = (user: any) => {
    setSelectedUser(user)
    const certs = user.certifications || []
    setShowRefereeLevel(certs.includes('裁判员'))
    setShowCoachLevel(certs.includes('教练员'))
    certForm.setFieldsValue({ 
      certifications: certs,
      refereeLevel: user.refereeLevel ? [user.refereeLevel] : [],
      coachLevel: user.coachLevel ? [user.coachLevel] : []
    })
    setCertModalVisible(true)
  }

  const onCertFinish = async (values: any) => {
    if (!selectedUser) return
    try {
      await request.put(`/admin/users/${selectedUser.id}/certification`, { 
        certifications: values.certifications,
        refereeLevel: values.refereeLevel?.[0],
        coachLevel: values.coachLevel?.[0]
      })
      Toast.show({ icon: 'success', content: '更新成功' })
      setCertModalVisible(false)
      fetchUsers()
    } catch (error) {
      console.error(error)
      Toast.show({ content: '更新失败', icon: 'fail' })
    }
  }

  const handleAuditRadar = async (userId: string, status: 'approved' | 'rejected') => {
    try {
        await request.put(`/admin/users/${userId}/radar`, { status })
        Toast.show({ icon: 'success', content: '操作成功' })
        fetchUsers()
    } catch (e) {
        Toast.show({ content: '操作失败', icon: 'fail' })
    }
  }

  const handleAdSubmit = async (values: any) => {
    try {
      const data = {
        ...values,
        image: adFileList.length > 0 ? adFileList[0].url : values.image,
        isActive: values.isActive && values.isActive.length > 0 ? (values.isActive[0] === 'true') : true
      }
      
      if (selectedAd) {
        await request.put(`/ads/${selectedAd.id}`, data)
        Toast.show({ icon: 'success', content: '广告已更新' })
      } else {
        await request.post('/ads', data)
        Toast.show({ icon: 'success', content: '广告已添加' })
      }
      setAdModalVisible(false)
      adForm.resetFields()
      setAdFileList([])
      setSelectedAd(null)
      fetchAds()
    } catch (error) {
      console.error(error)
      Toast.show({ content: selectedAd ? '更新失败' : '添加失败', icon: 'fail' })
    }
  }

  const handleEditAd = (ad: any) => {
    setSelectedAd(ad)
    adForm.setFieldsValue({
      ...ad,
      isActive: [String(ad.isActive)]
    })
    if (ad.image) {
      setAdFileList([{ url: ad.image }])
    } else {
      setAdFileList([])
    }
    setAdModalVisible(true)
  }
  
  const handleDeleteAd = async (id: string) => {
    Dialog.confirm({
      content: '确定删除该广告吗？',
      onConfirm: async () => {
        try {
          await request.delete(`/ads/${id}`)
          Toast.show({ icon: 'success', content: '删除成功' })
          fetchAds()
        } catch (error) {
          console.error(error)
        }
      }
    })
  }

  const onResetPasswordSubmit = () => {
    Dialog.confirm({
        content: '确定要重置该用户的密码吗？',
        onConfirm: async () => {
            const values = resetPasswordForm.getFieldsValue()
            await handleResetPassword(values)
        }
    })
  }

  return (
    <div className="min-h-screen pt-safe-top pb-24">
      <NavBar onBack={() => navigate('/profile')}>管理后台</NavBar>
      
      <Tabs>
        <Tabs.Tab title="用户管理" key="users">
          <div className="p-4">
            {certApps.length > 0 && (
                <Card title="待审核认证申请" className="mb-4 border-2 border-orange-100">
                    <List>
                        {certApps.map(app => (
                            <List.Item
                                key={app.id}
                                prefix={<Tag color="warning">待审核</Tag>}
                                description={
                                    <div>
                                        <div>申请类型: {app.certificationStatus.split(':')[1]}</div>
                                        <div className="flex gap-2 mt-2">
                                            {(app.certificationFiles || []).map((url: string, idx: number) => (
                                                <a href={url} target="_blank" key={idx} className="text-violet-500 underline text-xs">
                                                    证书{idx + 1}
                                                </a>
                                            ))}
                                        </div>
                                    </div>
                                }
                                extra={
                                    <div className="flex gap-2">
                                        <Button size="small" color="success" onClick={() => handleApproveCert(app, true)}>通过</Button>
                                        <Button size="small" color="danger" fill="outline" onClick={() => handleApproveCert(app, false)}>拒绝</Button>
                                    </div>
                                }
                            >
                                {app.name}
                            </List.Item>
                        ))}
                    </List>
                </Card>
            )}

            <List header="注册用户列表">
              <div className="bg-white p-3 mb-2 space-y-3">
                <SearchBar 
                  placeholder="搜索姓名、手机号或ID" 
                  value={userSearchKeyword}
                  onChange={val => {
                    setUserSearchKeyword(val)
                  }}
                  onSearch={() => fetchUsers()}
                />
                <div className="flex gap-2 items-center">
                  <div className="flex-1 overflow-x-auto">
                    <Selector
                      columns={2}
                      options={[
                        { label: '全部', value: '' },
                        { label: '未认证', value: '未认证' },
                        { label: '足协会员', value: '足协会员' },
                        { label: '县队成员', value: '县队成员' },
                        { label: '潜力新星', value: '潜力新星' },
                        { label: '官方认证', value: '官方认证' },
                        { label: '裁判员', value: '裁判员' },
                        { label: '教练员', value: '教练员' },
                      ]}
                      value={userFilterCert}
                      onChange={v => {
                        setUserFilterCert(v)
                      }}
                    />
                  </div>
                </div>
                <div className="flex gap-2">
                   <Button block color="primary" onClick={fetchUsers}>
                      搜索
                   </Button>
                   <Button block color="default" onClick={handleExportUsers}>
                      导出
                   </Button>
                </div>
              </div>

              {users.map(user => (
                <List.Item
                  key={user.id}
                  prefix={<Tag color={user.role === 'admin' ? 'danger' : 'primary'}>{user.role}</Tag>}
                  description={
                    <div>
                      <div>ID: {user.id} | 注册时间: {new Date(user.createdAt).toLocaleDateString()}</div>
                      <div className="flex items-center gap-1 flex-wrap mt-1">
                        {(user.certifications || []).map((c: string) => (
                           <Tag key={c} color="success" fill="outline">{c}</Tag>
                        ))}
                        {(!user.certifications || user.certifications.length === 0) && <Tag color="default">未认证</Tag>}
                      </div>
                      <div className="mt-2">
                        {user.radarDataStatus === 'pending' && user.radarData ? (
                            <div className="flex gap-2 items-center">
                                <span className="text-xs text-gray-500">五芒星审核:</span>
                                <Button size="mini" color="success" onClick={() => handleAuditRadar(user.id, 'approved')}>通过</Button>
                                <Button size="mini" color="danger" onClick={() => handleAuditRadar(user.id, 'rejected')}>拒绝</Button>
                            </div>
                        ) : (
                            <div className="text-xs text-gray-500 flex items-center gap-1">
                                五芒星: 
                                <Tag color={user.radarDataStatus === 'approved' ? 'success' : 'default'}>
                                    {user.radarDataStatus === 'approved' ? '已通过' : user.radarDataStatus === 'rejected' ? '已拒绝' : '无数据'}
                                </Tag>
                            </div>
                        )}
                      </div>
                    </div>
                  }
                  extra={
                    <div className="flex gap-2">
                        <Button size="small" fill="none" onClick={() => {
                            setResetPasswordUserId(user.id)
                            setResetPasswordModalVisible(true)
                        }}>
                            <ShieldCheck size={16} className="text-red-500" />
                        </Button>
                        <Button size="small" fill="none" onClick={() => handleEditCert(user)}>
                            <Edit size={16} className="text-violet-500" />
                        </Button>
                    </div>
                  }
                >
                  {user.name || '未命名'} ({user.phone})
                </List.Item>
              ))}
            </List>
          </div>
        </Tabs.Tab>

        <Tabs.Tab title="五芒星审核" key="radar">
            <div className="p-4">
                <List header="待审核五芒星数据">
                    {users.filter(u => u.radarDataStatus === 'pending' && u.radarData).map(user => (
                        <List.Item
                            key={user.id}
                            extra={
                                <div className="flex gap-2">
                                    <Button size="small" color="success" onClick={() => handleAuditRadar(user.id, 'approved')}>通过</Button>
                                    <Button size="small" color="danger" fill="outline" onClick={() => handleAuditRadar(user.id, 'rejected')}>拒绝</Button>
                                </div>
                            }
                        >
                            <div className="mb-2 font-bold">{user.name}</div>
                            <div className="grid grid-cols-3 gap-2 text-xs text-gray-600">
                                <div>速度: {user.radarData.speed}</div>
                                <div>射门: {user.radarData.shooting}</div>
                                <div>传球: {user.radarData.passing}</div>
                                <div>盘带: {user.radarData.dribbling}</div>
                                <div>防守: {user.radarData.defense}</div>
                                <div>力量: {user.radarData.physical}</div>
                            </div>
                        </List.Item>
                    ))}
                    {users.filter(u => u.radarDataStatus === 'pending' && u.radarData).length === 0 && (
                        <div className="text-center py-4 text-gray-400">暂无待审核数据</div>
                    )}
                </List>
            </div>
        </Tabs.Tab>

        <Tabs.Tab title="资质审核" key="cert-audit">
            <div className="p-4">
                <List header="待审核专业资质">
                    {certApps.map(app => (
                        <List.Item
                            key={app.id}
                            description={
                                <div>
                                    <div>申请类型: {app.certificationStatus.split(':')[1]}</div>
                                    {(app.refereeLevel || app.coachLevel) && (
                                        <div>申请等级: {app.refereeLevel || app.coachLevel}</div>
                                    )}
                                    <div className="flex gap-2 mt-2">
                                        {(app.certificationFiles || []).map((url: string, idx: number) => (
                                            <a href={url} target="_blank" key={idx} className="text-violet-500 underline text-xs">
                                                证书{idx + 1}
                                            </a>
                                        ))}
                                    </div>
                                </div>
                            }
                            extra={
                                <div className="flex gap-2">
                                    <Button size="small" color="success" onClick={() => handleApproveCert(app, true)}>通过</Button>
                                    <Button size="small" color="danger" fill="outline" onClick={() => handleApproveCert(app, false)}>拒绝</Button>
                                </div>
                            }
                        >
                            {app.name}
                        </List.Item>
                    ))}
                    {certApps.length === 0 && <div className="text-center py-4 text-gray-400">暂无待审核申请</div>}
                </List>
            </div>
        </Tabs.Tab>

        {isSuperAdmin && (
            <Tabs.Tab title="广告管理" key="ads">
                <div className="p-4">
                    <Button block color="primary" onClick={() => {
                        setSelectedAd(null)
                        adForm.resetFields()
                        setAdFileList([])
                        setAdModalVisible(true)
                    }} className="mb-4">
                        <Plus size={18} className="mr-1 inline" /> 添加广告
                    </Button>
                    <List>
                        {ads.map(ad => (
                            <List.Item
                                key={ad.id}
                                prefix={<img src={ad.image} className="w-20 h-12 object-cover rounded" />}
                                description={ad.link || '无链接'}
                                extra={
                                    <div className="flex gap-2">
                                        <Edit size={18} className="text-violet-500 cursor-pointer" onClick={() => handleEditAd(ad)} />
                                        <Trash2 size={18} className="text-red-500 cursor-pointer" onClick={() => handleDeleteAd(ad.id)} />
                                    </div>
                                }
                            >
                                排序: {ad.sortOrder} | 状态: {ad.isActive ? '启用' : '禁用'}
                            </List.Item>
                        ))}
                    </List>
                </div>
            </Tabs.Tab>
        )}

        <Tabs.Tab title="球队管理" key="teams">
          <div className="p-4">
            <List header="所有球队">
              {teams.map(team => (
                <List.Item
                  key={team.id}
                  description={`队长: ${team.captain?.name} | 创建时间: ${new Date(team.createdAt).toLocaleDateString()}`}
                >
                  {team.name} ({team.members?.length || 0}人)
                </List.Item>
              ))}
            </List>
          </div>
        </Tabs.Tab>

        {isSuperAdmin && (
          <Tabs.Tab title="管理员设置" key="admins">
            <div className="p-4">
              <Card title="添加管理员" className="mb-4">
                 <div className="flex gap-2">
                   <Input 
                     placeholder="输入用户ID" 
                     value={adminId} 
                     onChange={setAdminId} 
                     className="border border-gray-200 rounded px-2"
                   />
                   <Button color="primary" onClick={handleAddAdmin}>添加</Button>
                 </div>
              </Card>
              <List header="当前管理员">
                {users.filter(u => u.role === 'admin' || u.role === 'super_admin').map(user => (
                  <List.Item
                    key={user.id}
                    prefix={<Tag color={user.role === 'super_admin' ? 'danger' : 'primary'}>{user.role}</Tag>}
                    description={`ID: ${user.id}`}
                  >
                    {user.name} ({user.phone})
                  </List.Item>
                ))}
              </List>
            </div>
          </Tabs.Tab>
        )}

        <Tabs.Tab title="场地维护" key="venues">
          <div className="p-4">
             <Button block color="primary" onClick={() => {
               setSelectedVenue(null)
               venueForm.resetFields()
               setVenueModalVisible(true)
             }} className="mb-4">
               <Plus size={18} className="mr-1 inline" /> 添加场地
             </Button>
             <List>
               {venues.map(venue => (
                 <List.Item
                   key={venue.id}
                   prefix={<img src={venue.image} className="w-12 h-12 object-cover rounded" />}
                   description={
                      <div>
                        <div>{venue.address}</div>
                        {venue.contactPhone && <div className="text-xs text-gray-500 mt-1">电话: {venue.contactPhone}</div>}
                      </div>
                   }
                   extra={
                     <div className="flex gap-2">
                       <Edit size={18} className="text-violet-500 cursor-pointer" onClick={() => handleEditVenue(venue)} />
                       <Trash2 size={18} className="text-red-500 cursor-pointer" onClick={() => handleDeleteVenue(venue.id)} />
                     </div>
                   }
                 >
                   {venue.name} <Tag color="success" fill="outline">{venue.type}</Tag>
                 </List.Item>
               ))}
             </List>
          </div>
        </Tabs.Tab>

        <Tabs.Tab title="系统公告" key="announcements">
          <div className="p-4">
             <Button block color="primary" onClick={() => setAnnouncementModalVisible(true)} className="mb-4">
               <Plus size={18} className="mr-1 inline" /> 发布公告
             </Button>
             <List>
               {announcements.map(item => (
                 <List.Item
                   key={item.id}
                   description={new Date(item.createdAt).toLocaleString()}
                   extra={
                     <Trash2 size={18} className="text-red-500 cursor-pointer" onClick={() => handleDeleteAnnouncement(item.id)} />
                   }
                 >
                   <div className="font-bold">{item.title}</div>
                   <div className="text-sm text-gray-500 mt-1">{item.content}</div>
                 </List.Item>
               ))}
             </List>
          </div>
        </Tabs.Tab>

        <Tabs.Tab title="报名审核" key="registrations">
          <div className="p-4">
            <Button block color="primary" fill="outline" onClick={handleExport} className="mb-4">
              导出报名数据
            </Button>
            <List header="联赛球队报名">
              {registrations.map(reg => (
                <List.Item
                  key={reg.id}
                  prefix={
                    <Tag 
                      color={
                        reg.status === 'approved' ? 'success' : 
                        reg.status === 'rejected' ? 'danger' : 'warning'
                      }
                    >
                      {
                        reg.status === 'approved' ? '已通过' : 
                        reg.status === 'rejected' ? '已拒绝' : '待审核'
                      }
                    </Tag>
                  }
                  description={
                    <div>
                      <div>赛事: {reg.match?.title}</div>
                      <div>队长: {reg.team?.captain?.name}</div>
                      <div className="text-xs mt-1">
                        提交时间: {dayjs(reg.createdAt).format('MM-DD HH:mm')}
                      </div>
                    </div>
                  }
                  extra={
                    <Button size="small" onClick={() => handleAudit(reg)}>
                      审核
                    </Button>
                  }
                >
                  {reg.team?.name} ({reg.playerIds?.length || 0}人)
                </List.Item>
              ))}
              {registrations.length === 0 && <div className="text-center p-4 text-gray-400">暂无报名</div>}
            </List>
          </div>
        </Tabs.Tab>

        <Tabs.Tab title="赛事管理" key="matches">
          <div className="p-4">
             <Button block color="primary" onClick={() => {
               setSelectedMatch(null)
               matchForm.resetFields()
               setMatchCoverFileList([])
               setMatchModalVisible(true)
             }} className="mb-4">
               <Plus size={18} className="mr-1 inline" /> 发布赛事
             </Button>
             
             <List>
               {matches.map(match => (
                 <List.Item
                   key={match.id}
                   prefix={match.coverUrl ? <img src={match.coverUrl} className="w-16 h-12 object-cover rounded" /> : <div className="w-16 h-12 bg-gray-200 rounded flex items-center justify-center text-xs text-gray-400">无图</div>}
                   description={
                      <div>
                        <div>{dayjs(match.startTime).format('MM-DD HH:mm')} 开始 | {match.status === 'registering' ? '报名中' : match.status}</div>
                        <div className="text-xs text-gray-500">{match.location}</div>
                      </div>
                   }
                   extra={
                     <div className="flex gap-2">
                       <Edit size={18} className="text-violet-500 cursor-pointer" onClick={() => handleEditMatch(match)} />
                       <Trash2 size={18} className="text-red-500 cursor-pointer" onClick={() => handleDeleteMatch(match.id)} />
                     </div>
                   }
                 >
                   {match.title}
                 </List.Item>
               ))}
             </List>
          </div>
        </Tabs.Tab>
      </Tabs>

      <Modal
        visible={matchModalVisible}
        title={selectedMatch ? "编辑赛事" : "发布赛事"}
        content={
              <Form
                form={matchForm}
                layout='horizontal'
                onFinish={onMatchFinish}
              >
                <Form.Item name='title' label='标题' rules={[{ required: true }]}>
                  <Input placeholder='请输入赛事标题' />
                </Form.Item>
                <Form.Item label="封面图">
                  <ImageUploader
                    value={matchCoverFileList}
                    onChange={setMatchCoverFileList}
                    upload={mockUpload}
                    maxCount={1}
                  />
                </Form.Item>
                <Form.Item name='startTime' label='开始时间' rules={[{ required: true }]} trigger="onConfirm" onClick={() => setMatchStartDatePickerVisible(true)}>
                  <Input placeholder='选择开始时间' readOnly />
                </Form.Item>
                <Form.Item name='endTime' label='结束时间' rules={[{ required: true }]} trigger="onConfirm" onClick={() => setMatchEndDatePickerVisible(true)}>
                  <Input placeholder='选择结束时间' readOnly />
                </Form.Item>
                <Form.Item name='registrationStartTime' label='报名开始' trigger="onConfirm" onClick={() => setMatchRegStartDatePickerVisible(true)}>
                  <Input placeholder='选择报名开始时间' readOnly />
                </Form.Item>
                <Form.Item name='registrationEndTime' label='报名截止' trigger="onConfirm" onClick={() => setMatchRegEndDatePickerVisible(true)}>
                  <Input placeholder='选择报名截止时间' readOnly />
                </Form.Item>
                <Form.Item name='maxTeams' label='队伍数量' initialValue={16}>
                  <Input type='number' placeholder='请输入队伍数量限制' />
                </Form.Item>
                <Form.Item name='description' label='赛事详情'>
                  <TextArea placeholder='请输入赛事详细介绍' rows={4} />
                </Form.Item>
                <Form.Item name='location' label='地点' rules={[{ required: true }]}>
                  <Input placeholder='请输入比赛地点' />
                </Form.Item>
                <Form.Item name='tags' label='标签'>
                  <Input placeholder='逗号分隔，如: 联赛,七人制' />
                </Form.Item>
                {selectedMatch && (
                    <Form.Item name='status' label='状态'>
                        <Selector
                            columns={3}
                            options={[
                                { label: '报名中', value: 'registering' },
                                { label: '进行中', value: 'ongoing' },
                                { label: '已结束', value: 'finished' },
                            ]}
                        />
                    </Form.Item>
                )}
              </Form>
        }
        closeOnAction={false}
        onClose={() => setMatchModalVisible(false)}
        actions={[
          { key: 'confirm', text: '提交', primary: true, onClick: () => matchForm.submit() },
          { key: 'cancel', text: '取消', onClick: () => setMatchModalVisible(false) }
        ]}
      />

      <DatePicker
        visible={matchRegStartDatePickerVisible}
        onClose={() => setMatchRegStartDatePickerVisible(false)}
        onConfirm={v => {
          matchForm.setFieldsValue({ registrationStartTime: dayjs(v).format('YYYY-MM-DD HH:mm') })
        }}
      />
      <DatePicker
        visible={matchRegEndDatePickerVisible}
        onClose={() => setMatchRegEndDatePickerVisible(false)}
        onConfirm={v => {
          matchForm.setFieldsValue({ registrationEndTime: dayjs(v).format('YYYY-MM-DD HH:mm') })
        }}
      />
      <Modal
        visible={venueModalVisible}
        title={selectedVenue ? "编辑场地" : "添加场地"}
        content={
          <Form form={venueForm} onFinish={handleVenueSubmit}>
            <Form.Item name="name" label="名称" rules={[{ required: true }]}>
              <Input placeholder="场地名称" />
            </Form.Item>
            <Form.Item name="type" label="类型">
              <Selector
                columns={3}
                options={[
                  { label: '11人制', value: '11人制' },
                  { label: '8人制', value: '8人制' },
                  { label: '5人制', value: '5人制' },
                ]}
              />
            </Form.Item>
            <Form.Item name="price" label="价格">
              <Input placeholder="例如: 300" />
            </Form.Item>
            <Form.Item name="contactPhone" label="联系电话">
              <Input placeholder="请输入联系电话" />
            </Form.Item>
            <Form.Item name="address" label="地址">
              <Input placeholder="详细地址" />
            </Form.Item>
            <Form.Item label="图片">
              <ImageUploader
                value={venueFileList}
                onChange={setVenueFileList}
                upload={mockUpload}
                maxCount={1}
              />
            </Form.Item>
            <Form.Item name="description" label="描述">
              <TextArea placeholder="场地描述" />
            </Form.Item>
          </Form>
        }
        closeOnAction
        onClose={() => setVenueModalVisible(false)}
        actions={[
          { key: 'confirm', text: '提交', primary: true, onClick: () => venueForm.submit() },
          { key: 'cancel', text: '取消', onClick: () => setVenueModalVisible(false) }
        ]}
      />
      <Modal
        visible={announcementModalVisible}
        title="发布公告"
        content={
          <Form form={announcementForm} onFinish={handleAddAnnouncement}>
            <Form.Item name="title" label="标题" rules={[{ required: true }]}>
              <Input placeholder="公告标题" />
            </Form.Item>
            <Form.Item name="content" label="内容" rules={[{ required: true }]}>
              <TextArea placeholder="公告内容" rows={4} />
            </Form.Item>
          </Form>
        }
        closeOnAction
        onClose={() => setAnnouncementModalVisible(false)}
        actions={[
          { key: 'confirm', text: '发布', primary: true, onClick: () => announcementForm.submit() },
          { key: 'cancel', text: '取消', onClick: () => setAnnouncementModalVisible(false) }
        ]}
      />

      <Modal
        visible={certModalVisible}
        title="设置用户认证"
        content={
          <Form form={certForm} onFinish={onCertFinish}>
            <Form.Item name="certifications" label="认证类型 (多选)" rules={[{ required: true }]}>
              <Selector
                multiple
                columns={2}
                onChange={(vals) => {
                  setShowRefereeLevel(vals.includes('裁判员'))
                  setShowCoachLevel(vals.includes('教练员'))
                }}
                options={[
                  { label: '足协会员', value: '足协会员' },
                  { label: '县队成员', value: '县队成员' },
                  { label: '潜力新星', value: '潜力新星' },
                  { label: '官方认证', value: '官方认证' },
                  { label: '裁判员', value: '裁判员' },
                  { label: '教练员', value: '教练员' },
                ]}
              />
            </Form.Item>
            {showRefereeLevel && (
              <Form.Item name="refereeLevel" label="裁判等级" rules={[{ required: true }]}>
                <Selector
                  columns={2}
                  options={[
                    { label: '国家一级', value: '国家一级' },
                    { label: '国家二级', value: '国家二级' },
                    { label: '国家三级', value: '国家三级' },
                    { label: '实习', value: '实习' },
                  ]}
                />
              </Form.Item>
            )}
            {showCoachLevel && (
              <Form.Item name="coachLevel" label="教练等级" rules={[{ required: true }]}>
                <Selector
                  columns={2}
                  options={[
                    { label: '职业级', value: '职业级' },
                    { label: 'A级', value: 'A级' },
                    { label: 'B级', value: 'B级' },
                    { label: 'C级', value: 'C级' },
                    { label: 'D级', value: 'D级' },
                    { label: 'E级', value: 'E级' },
                  ]}
                />
              </Form.Item>
            )}
          </Form>
        }
        closeOnAction={false}
        onClose={() => setCertModalVisible(false)}
        actions={[
          { key: 'confirm', text: '保存', primary: true, onClick: () => certForm.submit() },
          { key: 'cancel', text: '取消', onClick: () => setCertModalVisible(false) }
        ]}
      />
      <Modal
        visible={auditModalVisible}
        title="报名审核"
        content={
          <Form form={auditForm} onFinish={onAuditFinish}>
            <Form.Item name="status" label="状态" rules={[{ required: true }]}>
              <Selector
                columns={3}
                options={[
                  { label: '待审核', value: 'pending' },
                  { label: '通过', value: 'approved' },
                  { label: '拒绝', value: 'rejected' },
                ]}
              />
            </Form.Item>
            <Form.Item name="feedback" label="反馈意见">
              <TextArea placeholder="如有问题，请填写反馈意见" rows={3} />
            </Form.Item>
          </Form>
        }
        closeOnAction={false}
        onClose={() => setAuditModalVisible(false)}
        actions={[
          { key: 'confirm', text: '提交', primary: true, onClick: () => auditForm.submit() },
          { key: 'cancel', text: '取消', onClick: () => setAuditModalVisible(false) }
        ]}
      />
      <DatePicker
        visible={matchStartDatePickerVisible}
        onClose={() => setMatchStartDatePickerVisible(false)}
        onConfirm={v => {
          matchForm.setFieldsValue({ startTime: dayjs(v).format('YYYY-MM-DD HH:mm') })
        }}
      />
      <DatePicker
        visible={matchEndDatePickerVisible}
        onClose={() => setMatchEndDatePickerVisible(false)}
        onConfirm={v => {
          matchForm.setFieldsValue({ endTime: dayjs(v).format('YYYY-MM-DD HH:mm') })
        }}
      />
      <Modal
        visible={adModalVisible}
        title={selectedAd ? "编辑广告" : "添加广告"}
        content={
          <Form form={adForm} onFinish={handleAdSubmit}>
            <Form.Item name="image" label="图片链接" rules={[{ required: true }]}>
               <Input placeholder="图片URL或上传" />
            </Form.Item>
             <Form.Item label="上传图片">
              <ImageUploader
                value={adFileList}
                onChange={setAdFileList}
                upload={mockUpload}
                maxCount={1}
              />
            </Form.Item>
            <Form.Item name="link" label="跳转链接">
              <Input placeholder="点击跳转的URL" />
            </Form.Item>
            <Form.Item name="sortOrder" label="排序权重">
              <Input type="number" placeholder="数字越小越靠前" />
            </Form.Item>
            <Form.Item name="isActive" label="状态" initialValue={['true']}>
               <Selector
                 columns={2}
                 options={[
                   { label: '启用', value: 'true' },
                   { label: '禁用', value: 'false' },
                 ]}
               />
            </Form.Item>
          </Form>
        }
        closeOnAction={false}
        onClose={() => setAdModalVisible(false)}
        actions={[
          { key: 'confirm', text: '提交', primary: true, onClick: () => adForm.submit() },
          { key: 'cancel', text: '取消', onClick: () => setAdModalVisible(false) }
        ]}
      />

        <Modal
        visible={resetPasswordModalVisible}
        title="重置用户密码"
        content={
            <Form form={resetPasswordForm} layout='horizontal'>
                <Form.Item name="newPassword" label="新密码" rules={[{ min: 6, message: '至少6位' }]}>
                    <Input placeholder="留空则默认为 123456" />
                </Form.Item>
                <div className="text-xs text-gray-500 p-2">
                    如果不输入新密码，将默认重置为 123456
                </div>
            </Form>
        }
        closeOnAction={false}
        onClose={() => setResetPasswordModalVisible(false)}
        actions={[
            { key: 'confirm', text: '确认重置', primary: true, onClick: onResetPasswordSubmit },
            { key: 'cancel', text: '取消', onClick: () => setResetPasswordModalVisible(false) }
        ]}
      />
    </div>
  )
}

export default Admin
