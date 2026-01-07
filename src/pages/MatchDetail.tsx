import React, { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Tag, Button, Toast, Modal, Form, Input, DatePicker, Selector, Dialog, List, Avatar, Image, TextArea, ImageUploader, ImageViewer, Tabs } from 'antd-mobile'
import type { ImageUploadItem } from 'antd-mobile'
import { Calendar, Users, MapPin, Edit3, Trash2, Clock, Shield, Share2, ChevronLeft, FileText } from 'lucide-react'
import request from '../utils/request'
import dayjs from 'dayjs'
import { getUser, checkLogin } from '../utils/auth'

const MatchDetail: React.FC = () => {
  const { id } = useParams()
  const navigate = useNavigate()
  const [match, setMatch] = useState<any>(null)
  const [editVisible, setEditVisible] = useState(false)
  const [editForm] = Form.useForm()
  const [startPickerVisible, setStartPickerVisible] = useState(false)
  const [endPickerVisible, setEndPickerVisible] = useState(false)
  const currentUser = getUser()

  useEffect(() => {
    fetchMatchDetail()
  }, [id])

  const fetchMatchDetail = async () => {
    try {
      const res: any = await request.get(`/matches/${id}`)
      setMatch(res)
    } catch (error) {
      console.error(error)
      Toast.show({ content: '获取详情失败', icon: 'fail' })
    }
  }

  const [registerVisible, setRegisterVisible] = useState(false)
  const [teamMembers, setTeamMembers] = useState<any[]>([])
  const [selectedPlayers, setSelectedPlayers] = useState<string[]>([])
  const [myTeam, setMyTeam] = useState<any>(null)
  const [myRegistration, setMyRegistration] = useState<any>(null)
  
  // Report related states
  const [reportVisible, setReportVisible] = useState(false)
  const [reportForm] = Form.useForm()
  const [timelineEvents, setTimelineEvents] = useState<any[]>([])
  const [reportPlayers, setReportPlayers] = useState<any[]>([])
  const [reportFileList, setReportFileList] = useState<ImageUploadItem[]>([])

  const [registeredTeams, setRegisteredTeams] = useState<any[]>([])
  const [regStartPickerVisible, setRegStartPickerVisible] = useState(false)
  const [regEndPickerVisible, setRegEndPickerVisible] = useState(false)

  useEffect(() => {
    fetchMatchDetail()
    if (currentUser?.teamId) {
      fetchMyTeam()
      fetchMyRegistration()
    }
  }, [id])

  useEffect(() => {
    if (match && match.teamRegistrations) {
      // Assuming teamRegistrations is loaded with team and team.captain
      // We might need to ensure backend loads these relations.
      // For now, let's assume they are present or we need to fetch them.
      // Actually match detail usually returns limited deep relations. 
      // If teamRegistrations are not fully populated, we might need a separate call or update backend.
      // Let's assume backend returns teamRegistrations with team info.
      const teams = match.teamRegistrations.map((tr: any) => ({
        ...tr.team,
        registrationStatus: tr.status,
        playerCount: tr.playerIds?.length || 0
      }))
      setRegisteredTeams(teams)
    }
  }, [match])

  const fetchReportPlayers = () => {
      if (!match || !match.registrations) return
      const players = match.registrations
          .filter((r: any) => r.user)
          .map((r: any) => ({
              id: r.user.id,
              name: r.user.name,
              avatar: r.user.avatar,
              teamName: r.side === 'HOME' ? match.homeTeam?.name : (r.side === 'AWAY' ? match.awayTeam?.name : ''),
              side: r.side
          }))
      setReportPlayers(players)
  }

  const fetchMyRegistration = async () => {
    try {
      const res: any = await request.get(`/matches/${id}/my-registration`)
      if (res && res.id) {
        setMyRegistration(res)
        if (res.playerIds) {
          setSelectedPlayers(res.playerIds)
        }
      } else {
        setMyRegistration(null)
        setSelectedPlayers([])
      }
    } catch (e) {
      console.error(e)
      setMyRegistration(null)
      setSelectedPlayers([])
    }
  }

  const fetchMyTeam = async () => {
    try {
      const res: any = await request.get(`/teams/${currentUser.teamId}`)
      setMyTeam(res)
      setTeamMembers(res.members || [])
    } catch (e) {
      console.error(e)
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

  const handleAutoLeagueRegister = async () => {
    if (!checkLogin(navigate)) return
    if (!myTeam) {
      Toast.show({ content: '您需要加入球队才能报名联赛', icon: 'fail' })
      return
    }
    // Check captain permission (support both relation object and direct ID)
    const isCaptain = (myTeam.captain?.id === currentUser.id) || (myTeam.captainId === currentUser.id)
    const isAdmin = myTeam.admins?.includes(currentUser.id)
    
    if (!isCaptain && !isAdmin) {
       Toast.show({ content: '仅球队管理员可进行报名', icon: 'fail' })
       return
    }

    Dialog.confirm({
        title: myRegistration ? '更新报名' : '一键报名',
        content: `确定要${myRegistration ? '更新' : '提交'}球队所有成员(${teamMembers.length}人)的报名信息吗？将自动上报头像、姓名、身份证、球衣号等信息。`,
        onConfirm: async () => {
            try {
                const res: any = await request.post(`/matches/${id}/auto-league-register`)
                Toast.show({ icon: 'success', content: res.message || '报名成功' })
                fetchMatchDetail()
                fetchMyRegistration()
            } catch (e: any) {
                Toast.show({ content: e.response?.data?.message || '报名失败', icon: 'fail' })
            }
        }
    })
  }
  
  const onLeagueRegisterFinish = async () => {
    if (selectedPlayers.length === 0) {
      Toast.show({ content: '请至少选择一名球员', icon: 'fail' })
      return
    }
    
    const invalidPlayers = teamMembers
      .filter(m => selectedPlayers.includes(m.id))
      .filter(m => !m.idCard || !m.jerseyNumber)
      
    if (invalidPlayers.length > 0) {
      Toast.show({ 
        content: `存在未完善信息的球员: ${invalidPlayers.map(p => p.name).join(', ')}。需完善身份证及球衣号。`, 
        icon: 'fail',
        duration: 3000
      })
      return
    }

    try {
      await request.post(`/matches/${id}/league-register`, {
        playerIds: selectedPlayers
      })
      Toast.show({ icon: 'success', content: '报名申请已提交' })
      setRegisterVisible(false)
      fetchMatchDetail()
    } catch (error) {
      Toast.show({ content: '报名失败', icon: 'fail' })
    }
  }

  const handleDelete = async () => {
    Dialog.confirm({
      content: '确定要删除该赛事吗？此操作不可撤销。',
      onConfirm: async () => {
        try {
          await request.delete(`/matches/${id}`)
          Toast.show({ icon: 'success', content: '删除成功' })
          navigate('/matches', { replace: true })
        } catch (error) {
          Toast.show({ content: '删除失败', icon: 'fail' })
        }
      }
    })
  }

  const handleEdit = () => {
    editForm.setFieldsValue({
      ...match,
      jerseyColor: match.jerseyColor || '',
      awayJerseyColor: match.awayJerseyColor || '',
      rules: match.rules || '',
      requirements: match.requirements || '',
      description: match.description || '',
      maxTeams: match.maxTeams ? String(match.maxTeams) : '',
      startTime: match.startTime ? dayjs(match.startTime).format('YYYY-MM-DD HH:mm') : '',
      endTime: match.endTime ? dayjs(match.endTime).format('YYYY-MM-DD HH:mm') : '',
      registrationStartTime: match.registrationStartTime ? dayjs(match.registrationStartTime).format('YYYY-MM-DD HH:mm') : '',
      registrationEndTime: match.registrationEndTime ? dayjs(match.registrationEndTime).format('YYYY-MM-DD HH:mm') : '',
    })
    setEditVisible(true)
  }

  const onEditFinish = async (values: any) => {
    try {
      const start = dayjs(values.startTime)
      const end = dayjs(values.endTime)
      const payload: any = {
        ...values,
        startTime: start.toDate(),
        endTime: end.toDate(),
        date: start.format('YYYY-MM-DD'),
        time: start.format('HH:mm'),
        maxTeams: values.maxTeams ? parseInt(values.maxTeams) : undefined,
      }
      if (values.registrationStartTime) payload.registrationStartTime = dayjs(values.registrationStartTime).toDate()
      if (values.registrationEndTime) payload.registrationEndTime = dayjs(values.registrationEndTime).toDate()
      
      await request.put(`/matches/${id}`, payload)
      Toast.show({ icon: 'success', content: '更新成功' })
      setEditVisible(false)
      fetchMatchDetail()
    } catch (error) {
      Toast.show({ content: '更新失败', icon: 'fail' })
    }
  }

  const handleReport = () => {
    reportForm.setFieldsValue({
      score: match.score,
      reportContent: match.reportContent
    })
    if (match.events) {
        setTimelineEvents(match.events)
    } else {
        setTimelineEvents([])
    }
    fetchReportPlayers()
    setReportVisible(true)
  }

  const onReportFinish = async () => {
    try {
      const values = reportForm.getFieldsValue()
      const payload = {
        ...values,
        reportImages: reportFileList.map(f => f.url),
        events: timelineEvents
      }
      await request.put(`/matches/${id}`, payload)
      Toast.show({ icon: 'success', content: '战报已发布' })
      setReportVisible(false)
      fetchMatchDetail()
    } catch (error) {
      Toast.show({ content: '发布失败', icon: 'fail' })
    }
  }

  const addTimelineEvent = () => {
    Dialog.show({
        content: <TimelineEventForm players={reportPlayers} onFinish={(event) => {
            setTimelineEvents([...timelineEvents, event].sort((a, b) => a.time - b.time))
            Dialog.clear()
        }} />,
        closeOnAction: true,
        actions: [{ key: 'cancel', text: '取消' }]
    })
  }

  const [searchUserVisible, setSearchUserVisible] = useState(false)
  const [searchSide, setSearchSide] = useState<'HOME' | 'AWAY'>('HOME')

  const handleDistribute = async () => {
    try {
      await request.post(`/matches/${id}/distribute`)
      Toast.show({ icon: 'success', content: '分队完成' })
      fetchMatchDetail()
    } catch (error: any) {
      const msg = error.response?.data?.message || '分队失败'
      Toast.show({ content: msg, icon: 'fail' })
    }
  }

  const handleSyncTeamPlayers = async (side: 'HOME' | 'AWAY') => {
      Dialog.confirm({
          content: '确定要将球队所有成员添加到本场比赛名单吗？',
          onConfirm: async () => {
              try {
                  const res: any = await request.post(`/matches/${id}/sync-team-players`, { side })
                  Toast.show({ icon: 'success', content: res.message || '同步完成' })
                  fetchMatchDetail()
              } catch (error: any) {
                  Toast.show({ content: error.response?.data?.message || '同步失败', icon: 'fail' })
              }
          }
      })
  }

  const handleAddPlayer = async (side: 'HOME' | 'AWAY') => {
    setSearchSide(side)
    if (currentUser?.teamId) {
        try {
            const res: any = await request.get(`/teams/${currentUser.teamId}`)
            setTeamMembers(res.members || [])
        } catch (e) {
            console.error(e)
        }
    }
    setSearchUserVisible(true)
  }

  const handleCancelRegistration = async () => {
      const isChallengeCancel = isTeamRegistered && isAwayAdmin
      Dialog.confirm({
          content: isChallengeCancel ? '确定要取消应战吗？这将移除球队所有报名成员。' : '确定要取消报名吗？',
          onConfirm: async () => {
              try {
                  await request.post(`/matches/${id}/cancel-registration`)
                  Toast.show({ icon: 'success', content: isChallengeCancel ? '已取消应战' : '已取消报名' })
                  setMyRegistration(null)
                  setSelectedPlayers([])
                  fetchMatchDetail()
                  fetchMyRegistration()
              } catch (error: any) {
                  Toast.show({ content: error.response?.data?.message || '取消失败', icon: 'fail' })
              }
          }
      })
  }

  const onAddPlayer = async (userId: string) => {
    try {
      await request.post(`/matches/${id}/add-player`, { playerId: userId, side: searchSide })
      Toast.show({ icon: 'success', content: '添加成功' })
      setSearchUserVisible(false)
      fetchMatchDetail()
    } catch (error) {
      Toast.show({ content: (error as any).response?.data?.message || '添加失败', icon: 'fail' })
    }
  }

  if (!match) return null

  const isInitiator = match.initiatorId === currentUser?.id
  const isRegistered = match.registrations?.some((r: any) => r.user?.id === currentUser?.id)
  
  const isTeamFriendly = match.type === 'TEAM_FRIENDLY'


  const isTeamRegistered = isTeamFriendly && currentUser?.teamId && (match.homeTeamId === currentUser.teamId || match.awayTeamId === currentUser.teamId)

  const isAdmin = currentUser?.role === 'admin' || currentUser?.role === 'super_admin'
  const canEdit = isAdmin || isInitiator

  const homePlayers = match.registrations?.filter((r: any) => r.side === 'HOME') || []
  const awayPlayers = match.registrations?.filter((r: any) => r.side === 'AWAY') || []
  
  if (match.homeTeam?.memberList) {
      match.homeTeam.memberList.forEach((m: any) => {
          if (!homePlayers.some((r: any) => r.user.id === m.id)) {
              homePlayers.push({ user: m, side: 'HOME', status: 'pending' })
          }
      })
  }
  if (match.awayTeam?.memberList) {
      match.awayTeam.memberList.forEach((m: any) => {
          if (!awayPlayers.some((r: any) => r.user.id === m.id)) {
              awayPlayers.push({ user: m, side: 'AWAY', status: 'pending' })
          }
      })
  }

  const unassignedPlayers = match.registrations?.filter((r: any) => r.side === 'NONE') || []

  const isHomeAdmin = isTeamFriendly && match.homeTeamId && (currentUser?.teamId === match.homeTeamId) && (match.homeTeam?.captainId === currentUser.id || match.homeTeam?.admins?.includes(currentUser.id))
  const isAwayAdmin = isTeamFriendly && match.awayTeamId && (currentUser?.teamId === match.awayTeamId) && (match.awayTeam?.captainId === currentUser.id || match.awayTeam?.admins?.includes(currentUser.id))
  
  const translatePosition = (pos: string) => {
    if (!pos || typeof pos !== 'string') return '未知'
    const map: any = {
      'F': '前锋', 'FW': '前锋', 'ST': '前锋',
      'M': '中场', 'MF': '中场', 'CAM': '中场', 'CDM': '中场', 'LM': '中场', 'RM': '中场',
      'D': '后卫', 'DF': '后卫', 'CB': '后卫', 'LB': '后卫', 'RB': '后卫',
      'G': '门将', 'GK': '门将'
    }
    return map[pos.toUpperCase()] || pos
  }

  const renderPlayerList = (players: any[], _side: 'HOME' | 'AWAY' | 'NONE') => (
    <div className="space-y-2">
      {players.map((reg: any) => (
        <div 
          key={reg.id || reg.user?.id || Math.random()} 
          className="flex items-center gap-3 bg-white p-3 rounded-xl border border-gray-100 shadow-sm active:bg-gray-50 transition-colors"
          onClick={() => navigate(`/user/${reg.user?.id}`)}
        >
          <Avatar src={reg.user?.avatar} className="w-10 h-10 rounded-full bg-gray-100 flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
                <div className="font-bold text-gray-800 truncate text-sm">{reg.user?.name || '匿名'}</div>
                {reg.status === 'pending' && <Tag color="warning" className="rounded-md scale-75 origin-left">未注册</Tag>}
            </div>
            <div className="flex flex-col items-start gap-1 mt-1">
                 <span className="bg-gray-100 px-2 py-0.5 rounded text-xs text-gray-500 leading-none">
                     {translatePosition(reg.user?.sportsProfile?.position?.[0])}
                 </span>
                 {reg.user?.jerseyNumber && (
                     <span className="text-xs text-gray-400 font-mono leading-none">
                         #{reg.user.jerseyNumber}
                     </span>
                 )}
             </div>
          </div>
        </div>
      ))}
      {players.length === 0 && <div className="text-center text-gray-400 text-xs py-6 bg-gray-50 rounded-xl border border-dashed border-gray-200">虚位以待</div>}
    </div>
  )

  const getStatusTag = (status: string) => {
    switch(status) {
      case 'registering': return <span className="bg-indigo-500 text-white text-xs px-2 py-1 rounded-lg font-bold shadow-sm">报名中</span>
      case 'ongoing': return <span className="bg-violet-500 text-white text-xs px-2 py-1 rounded-lg font-bold shadow-sm">进行中</span>
      case 'finished': return <span className="bg-gray-500 text-white text-xs px-2 py-1 rounded-lg font-bold shadow-sm">已结束</span>
      case 'upcoming': return <span className="bg-blue-500 text-white text-xs px-2 py-1 rounded-lg font-bold shadow-sm">即将报名</span>
      case 'pending': return <span className="bg-orange-500 text-white text-xs px-2 py-1 rounded-lg font-bold shadow-sm">待开赛</span>
      default: return null
    }
  }
  
  const getTypeTag = (type: string) => {
    switch(type) {
      case 'LEAGUE': return <Tag color="warning" className="rounded-md">联赛</Tag>
      case 'TEAM_FRIENDLY': return <Tag color="danger" className="rounded-md">球队友谊赛</Tag>
      case 'PICKUP': return <Tag color="success" className="rounded-md">散场友谊赛</Tag>
      case 'NIGHT': return <Tag color="#2db7f5" className="rounded-md">夜场</Tag>
      default: return null
    }
  }

  return (
    <div className="pb-32 bg-slate-50 min-h-screen">
      {/* Immersive Header */}
      <div className="relative h-64 bg-slate-900">
         {match.coverUrl ? (
            <Image src={match.coverUrl} fit="cover" className="w-full h-full opacity-60" />
         ) : (
            <div className="w-full h-full bg-gradient-to-br from-slate-800 to-slate-900" />
         )}
         <div className="absolute inset-0 bg-gradient-to-t from-slate-50 via-transparent to-transparent" />
         
         <div className="absolute top-0 left-0 right-0 z-20 pt-safe-top px-4 flex justify-between items-center h-14">
            <div className="w-8 h-8 bg-white/20 backdrop-blur-md rounded-full flex items-center justify-center text-white cursor-pointer" onClick={() => navigate(-1)}>
                <ChevronLeft size={20} />
            </div>
            <div className="flex gap-2">
                {canEdit && match.status !== 'finished' && (
                    <>
                        <div className="w-8 h-8 bg-white/20 backdrop-blur-md rounded-full flex items-center justify-center text-white cursor-pointer" onClick={handleEdit}>
                            <Edit3 size={16} />
                        </div>
                        <div className="w-8 h-8 bg-white/20 backdrop-blur-md rounded-full flex items-center justify-center text-white cursor-pointer" onClick={handleDelete}>
                            <Trash2 size={16} />
                        </div>
                    </>
                )}
                 <div className="w-8 h-8 bg-white/20 backdrop-blur-md rounded-full flex items-center justify-center text-white cursor-pointer">
                    <Share2 size={16} />
                </div>
            </div>
         </div>

         <div className="absolute bottom-4 left-4 right-4 z-10">
            <div className="flex items-center gap-2 mb-2">
                {getTypeTag(match.type)}
                {getStatusTag(match.status)}
            </div>
            <h1 className="text-2xl font-bold text-slate-800 leading-tight mb-2 drop-shadow-sm">{match.title}</h1>
            <div className="flex items-center gap-4 text-sm text-slate-600 font-medium">
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
         </div>
      </div>
      
      <div className="px-4 -mt-2 relative z-10 space-y-4">
        {/* Info Cards */}
        <div className="grid grid-cols-2 gap-3">
             <div className="bg-white rounded-2xl p-4 shadow-card flex flex-col justify-between h-24">
                <Users size={20} className="text-orange-500 mb-1" />
                <div>
                    <div className="text-xs text-gray-400">
                        {match.type === 'LEAGUE' || match.type === 'TEAM_FRIENDLY' ? '参赛队伍' : '参赛人数'}
                    </div>
                    <div className="font-bold text-lg text-gray-800">
                        {match.type === 'NIGHT' 
                        ? `${match.currentPlayers}/${match.minPlayers}`
                        : match.type === 'LEAGUE' || match.type === 'TEAM_FRIENDLY'
                            ? (match.teams?.includes('/') ? `${match.teams.split('/')[0]}队` : `${(match.homeTeamId ? 1 : 0) + (match.awayTeamId ? 1 : 0)}队`)
                            : `${match.currentPlayers} 人`
                        }
                    </div>
                </div>
             </div>
             <div className="bg-white rounded-2xl p-4 shadow-card flex flex-col justify-between h-24">
                <Clock size={20} className="text-violet-500 mb-1" />
                <div>
                    <div className="text-xs text-gray-400">比赛时间</div>
                    <div className="font-bold text-sm text-gray-800 line-clamp-2">
                         {match.startTime && match.endTime ? `${dayjs(match.startTime).format('YYYY-MM-DD')} 至 ${dayjs(match.endTime).format('YYYY-MM-DD')}` : (match.date || '待定')}
                    </div>
                </div>
             </div>
        </div>

        {/* Tabs for Squads / Rules */}
        <div className="bg-white rounded-2xl shadow-card overflow-hidden min-h-[300px]">
            <Tabs activeLineMode='fixed' style={{ '--content-padding': '16px' }}>
                <Tabs.Tab title="参赛名单" key="squads">
                    {match.type === 'LEAGUE' ? (
                        <div className="space-y-4">
                            <div className="grid grid-cols-1 gap-3">
                                {registeredTeams.map((team, index) => (
                                    <div 
                                        key={team.id} 
                                        className="bg-white p-3 rounded-xl border border-gray-100 shadow-sm flex items-center justify-between active:bg-gray-50 transition-colors cursor-pointer"
                                        onClick={() => navigate(`/teams/${team.id}`)}
                                    >
                                        <div className="flex items-center gap-3">
                                            <div className="font-bold text-gray-400 w-6">#{index + 1}</div>
                                            <Avatar src={team.logo} className="w-10 h-10 rounded-lg bg-gray-100" />
                                            <div>
                                                <div className="font-bold text-gray-800">{team.name}</div>
                                                <div className="text-xs text-gray-400">
                                                    {team.captain?.name} · {team.playerCount || 0}人
                                                </div>
                                            </div>
                                        </div>
                                        {team.registrationStatus && (
                                            <Tag color={team.registrationStatus === 'confirmed' ? 'success' : 'warning'}>
                                                {team.registrationStatus === 'confirmed' ? '已确认' : '审核中'}
                                            </Tag>
                                        )}
                                    </div>
                                ))}
                                {registeredTeams.length === 0 && (
                                    <div className="text-center py-8 text-gray-400 bg-gray-50 rounded-xl border border-dashed border-gray-200">
                                        暂无球队报名
                                    </div>
                                )}
                            </div>
                        </div>
                    ) : match.type === 'TEAM_FRIENDLY' ? (
                        <div className="space-y-6">
                            <div className="flex items-center justify-between px-2">
                                <div className="flex flex-col items-center w-1/3">
                                    <Avatar src={match.homeTeam?.logo} className="w-14 h-14 bg-gray-100 mb-2 rounded-2xl" />
                                    <div className="font-bold text-sm text-center line-clamp-1">{match.homeTeam?.name || '主队'}</div>
                                    <Tag color="primary" className="mt-1 scale-75">发起</Tag>
                                </div>
                                <div className="text-2xl font-bold text-slate-200">VS</div>
                                <div className="flex flex-col items-center w-1/3">
                                    <Avatar src={match.awayTeam?.logo} className="w-14 h-14 bg-gray-100 mb-2 rounded-2xl" />
                                    <div className="font-bold text-sm text-center line-clamp-1">{match.awayTeam?.name || (match.status === 'registering' ? '等待应战' : '客队')}</div>
                                    <Tag color="danger" className="mt-1 scale-75">应战</Tag>
                                </div>
                            </div>
                            
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <div className="flex justify-between items-center mb-2 px-1">
                                        <div className="text-xs font-bold text-gray-500">主队 ({homePlayers.length})</div>
                                        {isHomeAdmin && <div className="text-xs text-violet-500 cursor-pointer" onClick={() => handleAddPlayer('HOME')}>+添加</div>}
                                    </div>
                                    {renderPlayerList(homePlayers, 'HOME')}
                                    {isHomeAdmin && (
                                        <Button block size="small" fill="none" color="primary" className="mt-2 text-xs bg-violet-50" onClick={() => handleSyncTeamPlayers('HOME')}>
                                            同步全员
                                        </Button>
                                    )}
                                </div>
                                <div>
                                    <div className="flex justify-between items-center mb-2 px-1">
                                        <div className="text-xs font-bold text-gray-500">客队 ({awayPlayers.length})</div>
                                        {isAwayAdmin && <div className="text-xs text-violet-500 cursor-pointer" onClick={() => handleAddPlayer('AWAY')}>+添加</div>}
                                    </div>
                                    {renderPlayerList(awayPlayers, 'AWAY')}
                                    {isAwayAdmin && (
                                        <Button block size="small" fill="none" color="primary" className="mt-2 text-xs bg-violet-50" onClick={() => handleSyncTeamPlayers('AWAY')}>
                                            同步全员
                                        </Button>
                                    )}
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div>
                             <div className="grid grid-cols-2 gap-4 mb-6">
                                <div className="bg-red-50/50 p-3 rounded-2xl border border-red-100">
                                    <div className="text-center font-bold text-red-600 mb-3 text-sm">红队 ({homePlayers.length})</div>
                                    {renderPlayerList(homePlayers, 'HOME')}
                                </div>
                                <div className="bg-blue-50/50 p-3 rounded-2xl border border-blue-100">
                                    <div className="text-center font-bold text-blue-600 mb-3 text-sm">蓝队 ({awayPlayers.length})</div>
                                    {renderPlayerList(awayPlayers, 'AWAY')}
                                </div>
                             </div>
                             
                             {unassignedPlayers.length > 0 && (
                                 <div className="pt-4 border-t border-gray-100">
                                     <div className="flex justify-between items-center mb-3">
                                         <div className="font-bold text-gray-700 text-sm">待分队 ({unassignedPlayers.length})</div>
                                         {(isInitiator || isAdmin) && match.registrations?.length > 0 && match.status !== 'finished' && (
                                             <Button size="mini" color="primary" fill="outline" onClick={handleDistribute}>
                                                 智能分队
                                             </Button>
                                         )}
                                     </div>
                                     <div className="grid grid-cols-2 gap-2">
                                         {unassignedPlayers.map((reg: any) => (
                                             <div 
                                               key={reg.id} 
                                               className="flex items-center gap-2 bg-gray-50 p-2 rounded-lg"
                                               onClick={() => navigate(`/user/${reg.user?.id}`)}
                                             >
                                                 <Avatar src={reg.user?.avatar} className="w-6 h-6 rounded-full" />
                                                 <span className="text-xs truncate text-gray-700">{reg.user?.name}</span>
                                             </div>
                                         ))}
                                     </div>
                                 </div>
                             )}
                        </div>
                    )}
                </Tabs.Tab>
                
                <Tabs.Tab title="赛事详情" key="details">
                     <div className="space-y-4">
                        {match.description && (
                            <div className="bg-gray-50 p-4 rounded-xl">
                                <h3 className="font-bold text-gray-800 mb-2 flex items-center gap-2">
                                    <FileText size={16} className="text-violet-500" />
                                    赛事简介
                                </h3>
                                <p className="text-sm text-gray-600 leading-relaxed whitespace-pre-wrap">{match.description}</p>
                            </div>
                        )}
                        {(match.rules || match.requirements) ? (
                            <>
                                {match.rules && (
                                    <div className="bg-gray-50 p-4 rounded-xl">
                                        <h3 className="font-bold text-gray-800 mb-2 flex items-center gap-2">
                                            <Shield size={16} className="text-violet-500" />
                                            比赛规则
                                        </h3>
                                        <p className="text-sm text-gray-600 leading-relaxed whitespace-pre-wrap">{match.rules}</p>
                                    </div>
                                )}
                                {match.requirements && (
                                    <div className="bg-gray-50 p-4 rounded-xl">
                                        <h3 className="font-bold text-gray-800 mb-2 flex items-center gap-2">
                                            <Shield size={16} className="text-violet-500" />
                                            参赛要求
                                        </h3>
                                        <p className="text-sm text-gray-600 leading-relaxed whitespace-pre-wrap">{match.requirements}</p>
                                    </div>
                                )}
                            </>
                        ) : (
                            <div className="text-center py-8 text-gray-400">暂无额外说明</div>
                        )}
                        
                        {(match.jerseyColor || match.awayJerseyColor) && (
                            <div className="flex gap-4">
                                {match.jerseyColor && (
                                    <div className="flex-1 bg-gray-50 p-3 rounded-xl flex items-center gap-3">
                                        <div className="w-8 h-8 rounded-full shadow-sm border border-gray-200" style={{ backgroundColor: 'gray' }} />
                                        <div>
                                            <div className="text-xs text-gray-400">主队球衣</div>
                                            <div className="font-bold text-sm">{match.jerseyColor}</div>
                                        </div>
                                    </div>
                                )}
                                {match.awayJerseyColor && (
                                    <div className="flex-1 bg-gray-50 p-3 rounded-xl flex items-center gap-3">
                                        <div className="w-8 h-8 rounded-full shadow-sm border border-gray-200" style={{ backgroundColor: 'gray' }} />
                                        <div>
                                            <div className="text-xs text-gray-400">客队球衣</div>
                                            <div className="font-bold text-sm">{match.awayJerseyColor}</div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}
                     </div>
                </Tabs.Tab>

                {match.status === 'finished' && (match.score || match.reportContent) && (
                     <Tabs.Tab title="比赛战报" key="report">
                         <div className="text-center mb-6">
                             <div className="text-4xl font-black text-slate-800 font-mono tracking-widest">{match.score || '0 : 0'}</div>
                             <div className="text-xs text-gray-400 mt-1">最终比分</div>
                         </div>
                         
                         {match.reportContent && (
                             <div className="bg-gray-50 p-4 rounded-xl mb-4 text-sm leading-relaxed text-gray-700 whitespace-pre-wrap">
                                 {match.reportContent}
                             </div>
                         )}
                         
                         {match.reportImages && match.reportImages.length > 0 && (
                            <div className="grid grid-cols-3 gap-2 mb-6">
                                {match.reportImages.map((img: string, idx: number) => (
                                <Image 
                                    key={idx} 
                                    src={img} 
                                    fit="cover" 
                                    className="aspect-square rounded-lg shadow-sm"
                                    onClick={() => {
                                    ImageViewer.Multi.show({ images: match.reportImages, defaultIndex: idx })
                                    }}
                                />
                                ))}
                            </div>
                         )}

                         {match.events && match.events.length > 0 && (
                             <div>
                                 <h3 className="font-bold mb-4 px-2">进球时刻</h3>
                                 <div className="space-y-3 pl-4 border-l-2 border-violet-100 ml-2">
                                     {match.events.map((event: any, idx: number) => (
                                         <div key={idx} className="relative pl-6">
                                             <div className="absolute -left-[9px] top-1.5 w-4 h-4 rounded-full bg-white border-4 border-violet-400" />
                                             <div className="flex items-center gap-3 bg-white p-2 rounded-lg shadow-sm border border-gray-50">
                                                 <div className="font-mono font-bold text-violet-600 w-8">{event.time}'</div>
                                                 <div className="flex-1">
                                                     <div className="font-bold text-sm text-gray-800">{event.playerName}</div>
                                                     <div className="text-xs text-gray-400">{event.side === 'HOME' ? '主队' : '客队'}</div>
                                                 </div>
                                                 <div className="text-xs font-bold bg-violet-100 text-violet-600 px-2 py-1 rounded">GOAL</div>
                                             </div>
                                         </div>
                                     ))}
                                 </div>
                             </div>
                         )}
                     </Tabs.Tab>
                )}
            </Tabs>
        </div>
      </div>

      {/* Floating Action Bar */}
      <div className="fixed bottom-0 left-0 right-0 p-4 z-50 glass border-t border-white/50 safe-area-bottom">
         {match.status === 'registering' ? (
             match.type === 'LEAGUE' && myRegistration ? (
                 <div className="flex gap-2">
                    <Button 
                        block 
                        size="large" 
                        color="danger" 
                        fill="outline"
                        className="rounded-xl font-bold flex-1"
                        onClick={handleCancelRegistration}
                    >
                        取消报名
                    </Button>
                    <Button 
                        block 
                        size="large" 
                        color="primary" 
                        className="rounded-xl shadow-lg shadow-blue-500/20 font-bold flex-[2]"
                        onClick={handleAutoLeagueRegister}
                    >
                        更新名单
                    </Button>
                 </div>
             ) : (isRegistered || isTeamRegistered) ? (
                 <Button 
                    block 
                    size="large" 
                    color="success" 
                    className="rounded-xl shadow-lg shadow-violet-500/20 font-bold"
                    onClick={handleCancelRegistration}
                    disabled={isTeamRegistered && !isAwayAdmin}
                 >
                    {isTeamRegistered && isAwayAdmin ? '取消应战' : (isTeamRegistered ? '已报名 (等待开赛)' : '已报名 (点击取消)')}
                 </Button>
             ) : (
                <Button 
                    block 
                    size="large" 
                    className="bg-gradient-to-r from-violet-500 to-fuchsia-600 border-none rounded-xl shadow-lg shadow-violet-500/30 font-bold text-white"
                    onClick={() => {
                         if (match.type === 'TEAM_FRIENDLY') {
                            if (match.homeTeamId && match.awayTeamId) {
                                Toast.show({ content: '球队名额已满', icon: 'fail' })
                                return
                            }
                            Dialog.confirm({
                              content: '确定应战吗？您必须是球队管理员。',
                              onConfirm: async () => {
                                try {
                                  await request.post(`/matches/${match.id}/register`)
                                  Toast.show({ icon: 'success', content: '应战成功' })
                                  fetchMatchDetail()
                                } catch (error) {
                                  Toast.show({ content: '失败', icon: 'fail' })
                                }
                              }
                            })
                         } else if (match.type === 'LEAGUE') {
                             handleAutoLeagueRegister()
                         } else {
                            request.post(`/matches/${match.id}/register`, { side: 'NONE' }).then(() => {
                                Toast.show({ icon: 'success', content: '报名成功' })
                                fetchMatchDetail()
                            }).catch(() => Toast.show({ content: '报名失败', icon: 'fail' }))
                         }
                    }}
                >
                    {match.type === 'TEAM_FRIENDLY' ? '立即应战' : (match.type === 'LEAGUE' ? '一键报名' : '立即报名')}
                </Button>
             )
         ) : match.status === 'finished' && isInitiator ? (
             <Button block size="large" color="primary" className="rounded-xl font-bold" onClick={handleReport}>
                {match.reportContent ? '修改战报' : '填写战报'}
             </Button>
         ) : (
            <Button block size="large" disabled className="rounded-xl bg-slate-100 text-slate-400 border-none font-bold">
                {match.status === 'ongoing' ? '比赛进行中' : '比赛已结束'}
            </Button>
         )}
      </div>

      {/* Modals and other components remain... (Simplified for brevity, assuming they are kept) */}
      <Modal
        visible={reportVisible}
        title="填写战报"
        content={
          <Form form={reportForm} layout='horizontal'>
             <Form.Item name="score" label="比分" help="例如 3:2">
               <Input placeholder="主队 : 客队" className="text-center font-mono font-bold text-lg" />
             </Form.Item>
             <Form.Item name="reportContent" label="战报总结">
               <TextArea placeholder="记录比赛精彩瞬间..." rows={4} />
             </Form.Item>
             <Form.Item label="现场图片">
               <ImageUploader
                  value={reportFileList}
                  onChange={setReportFileList}
                  upload={mockUpload}
                  maxCount={9}
                  style={{'--cell-size': '70px'}}
               />
             </Form.Item>
             
             <div className="px-4 pb-4">
                 <div className="flex justify-between items-center mb-2">
                     <div className="font-bold text-sm">进球时间线</div>
                     <Button size="small" color="primary" fill="outline" onClick={addTimelineEvent}>+ 添加进球</Button>
                 </div>
                 <div className="space-y-2 max-h-40 overflow-y-auto">
                     {timelineEvents.map((event, idx) => (
                         <div key={idx} className="flex justify-between items-center bg-gray-50 p-2 rounded text-sm">
                             <span>{event.time}' {event.playerName}</span>
                             <Trash2 size={14} className="text-red-500 cursor-pointer" onClick={() => {
                                 setTimelineEvents(timelineEvents.filter((_, i) => i !== idx))
                             }} />
                         </div>
                     ))}
                 </div>
             </div>
          </Form>
        }
        closeOnAction
        onClose={() => setReportVisible(false)}
        actions={[
          { key: 'confirm', text: '发布', primary: true, onClick: onReportFinish },
          { key: 'cancel', text: '取消', onClick: () => setReportVisible(false) }
        ]}
      />
      
      <Modal visible={editVisible} title="编辑赛事" content={
          <Form form={editForm} onFinish={onEditFinish}>
            <Form.Item name="title" label="标题" rules={[{ required: true }]}><Input /></Form.Item>
            <Form.Item name="startTime" label="开始" trigger="onConfirm" onClick={() => setStartPickerVisible(true)}><Input readOnly /></Form.Item>
            <Form.Item name="endTime" label="结束" trigger="onConfirm" onClick={() => setEndPickerVisible(true)}><Input readOnly /></Form.Item>
            <Form.Item name="registrationStartTime" label="报名开始" trigger="onConfirm" onClick={() => setRegStartPickerVisible(true)}><Input readOnly /></Form.Item>
            <Form.Item name="registrationEndTime" label="报名截止" trigger="onConfirm" onClick={() => setRegEndPickerVisible(true)}><Input readOnly /></Form.Item>
            <Form.Item name="location" label="地点"><Input /></Form.Item>
            <Form.Item name="maxTeams" label="队伍数"><Input type="number" /></Form.Item>
            <Form.Item name="description" label="详情"><TextArea rows={4} /></Form.Item>
            <Form.Item name="rules" label="规则"><Input /></Form.Item>
            <Form.Item name="requirements" label="要求"><Input /></Form.Item>
          </Form>
      } onClose={() => setEditVisible(false)} closeOnAction actions={[
          { key: 'confirm', text: '保存', primary: true, onClick: () => editForm.submit() },
          { key: 'cancel', text: '取消', onClick: () => setEditVisible(false) }
      ]} />

      <DatePicker visible={startPickerVisible} onClose={() => setStartPickerVisible(false)} precision="minute" min={new Date()} onConfirm={v => editForm.setFieldsValue({ startTime: dayjs(v).format('YYYY-MM-DD HH:mm') })} />
      <DatePicker visible={endPickerVisible} onClose={() => setEndPickerVisible(false)} precision="minute" min={new Date()} onConfirm={v => editForm.setFieldsValue({ endTime: dayjs(v).format('YYYY-MM-DD HH:mm') })} />
      <DatePicker visible={regStartPickerVisible} onClose={() => setRegStartPickerVisible(false)} precision="minute" onConfirm={v => editForm.setFieldsValue({ registrationStartTime: dayjs(v).format('YYYY-MM-DD HH:mm') })} />
      <DatePicker visible={regEndPickerVisible} onClose={() => setRegEndPickerVisible(false)} precision="minute" onConfirm={v => editForm.setFieldsValue({ registrationEndTime: dayjs(v).format('YYYY-MM-DD HH:mm') })} />
      
      <Modal visible={registerVisible} title="选择参赛球员" content={
          <div className="max-h-60 overflow-y-auto">
             <Selector multiple columns={1} options={teamMembers.map(m => ({ label: `${m.name} ${(!m.idCard || !m.jerseyNumber) ? '(信息不全)' : ''}`, value: m.id, disabled: !m.idCard || !m.jerseyNumber }))} onChange={setSelectedPlayers} />
          </div>
      } onClose={() => setRegisterVisible(false)} closeOnAction actions={[
          { key: 'confirm', text: '提交', primary: true, onClick: onLeagueRegisterFinish },
          { key: 'cancel', text: '取消', onClick: () => setRegisterVisible(false) }
      ]} />

      <SearchUserModal visible={searchUserVisible} onClose={() => setSearchUserVisible(false)} onSelect={onAddPlayer} teamMembers={teamMembers} />
    </div>
  )
}

const SearchUserModal: React.FC<{ visible: boolean, onClose: () => void, onSelect: (userId: string) => void, teamMembers?: any[] }> = ({ visible, onClose, onSelect, teamMembers = [] }) => {
    const [keyword, setKeyword] = useState('')
    const [users, setUsers] = useState<any[]>([])
    
    const handleSearch = async () => {
        if (!keyword) return
        try {
            const res: any = await request.get(`/user/search?q=${keyword}`)
            setUsers(res || [])
        } catch (e) { console.error(e) }
    }

    return (
        <Modal visible={visible} title="添加球员" content={
            <div className="h-80 flex flex-col">
                <Tabs>
                    <Tabs.Tab title="搜索" key="search">
                         <div className="flex gap-2 mb-2 mt-2"><Input value={keyword} onChange={setKeyword} placeholder="搜昵称/手机" /><Button color="primary" size="small" onClick={handleSearch}>搜</Button></div>
                         <div className="flex-1 overflow-y-auto">
                            <List>{users.map(u => <List.Item key={u.id || Math.random().toString()} prefix={<Avatar src={u.avatar} />} extra={<Button size="mini" onClick={() => onSelect(u.id)}>添加</Button>}>{u.name}</List.Item>)}</List>
                         </div>
                    </Tabs.Tab>
                    <Tabs.Tab title="队员" key="team">
                        <div className="h-64 overflow-y-auto mt-2">
                           <List>{teamMembers.map(u => <List.Item key={u.id || Math.random().toString()} prefix={<Avatar src={u.avatar} />} extra={<Button size="mini" onClick={() => onSelect(u.id)}>添加</Button>}>{u.name}</List.Item>)}</List>
                        </div>
                    </Tabs.Tab>
                </Tabs>
            </div>
        } onClose={onClose} closeOnAction actions={[{ key: 'close', text: '关闭' }]} />
    )
}

const TimelineEventForm: React.FC<{ players: any[], onFinish: (event: any) => void }> = ({ players, onFinish }) => {
    const [form] = Form.useForm()
    const [manualName, setManualName] = useState('')
    return (
        <Form form={form} onFinish={(values) => {
            const player = players.find(p => p.id === values.playerId[0])
            onFinish({
                time: parseInt(values.time),
                playerId: player ? player.id : null,
                playerName: player ? player.name : manualName,
                side: player ? player.side : (values.side ? values.side[0] : 'NONE')
            })
        }}>
            <Form.Item name="time" label="时间" rules={[{ required: true }]}><Input type="number" /></Form.Item>
            <Form.Item name="playerId" label="球员"><Selector columns={1} options={[...players.map(p => ({ label: `${p.name}`, value: p.id })), { label: '手动输入', value: 'manual' }]} /></Form.Item>
            <Form.Subscribe to={['playerId']}>{({ playerId }) => playerId && playerId[0] === 'manual' ? <><Form.Item label="姓名"><Input value={manualName} onChange={setManualName} /></Form.Item><Form.Item name="side" label="归属"><Selector options={[{ label: '主队', value: 'HOME' }, { label: '客队', value: 'AWAY' }]} /></Form.Item></> : null}</Form.Subscribe>
            <Button block type="submit" color="primary" className="mt-4">确定</Button>
        </Form>
    )
}

export default MatchDetail
