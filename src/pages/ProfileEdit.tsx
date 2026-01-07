import React, { useEffect, useState, useRef } from 'react'
import { Form, Input, Button, NavBar, Toast, ImageUploader, Slider, Card, Selector, TextArea } from 'antd-mobile'
import { ImageUploadItem } from 'antd-mobile/es/components/image-uploader'
import { useNavigate } from 'react-router-dom'
import { RefreshCcw, Share2, Info } from 'lucide-react'
import request from '../utils/request'
import { getUser } from '../utils/auth'
import ImageCropper from '../components/ImageCropper'

const ProfileEdit: React.FC = () => {
  const navigate = useNavigate()
  const [form] = Form.useForm()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [avatar, setAvatar] = useState('')
  const [fileList, setFileList] = useState<ImageUploadItem[]>([])
  const [galleryFileList, setGalleryFileList] = useState<ImageUploadItem[]>([])
  const [cropperVisible, setCropperVisible] = useState(false)
  const [cropperImage, setCropperImage] = useState<File | null>(null)
  const [radarData, setRadarData] = useState({
    speed: 50,
    shooting: 50,
    passing: 50,
    dribbling: 50,
    defense: 50,
    physical: 50
  })
  const [initialRadarData, setInitialRadarData] = useState<any>(null)
  const [user, setUser] = useState<any>(null)

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      handleBeforeUpload(file)
    }
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const handleBeforeUpload = async (file: File) => {
    setCropperImage(file)
    setCropperVisible(true)
    return null // Prevent auto upload
  }

  const handleCropComplete = async (file: File) => {
    try {
      const res = await mockUpload(file)
      setFileList([{ url: res.url }])
      setAvatar(res.url)
      setCropperVisible(false)
    } catch (e) {
      console.error(e)
    }
  }

  useEffect(() => {
    const currentUser = getUser()
    if (currentUser) {
      // 获取最新信息
      request.get('/user/profile').then((res: any) => {
        setUser(res)
        form.setFieldsValue({
          name: res.name || '',
          realName: res.realName || '',
          idCard: res.idCard || '',
          jerseyNumber: res.jerseyNumber || '',
          position: typeof res.sportsProfile?.position === 'string' 
            ? res.sportsProfile.position.split('/').map((p: string) => p.trim().toUpperCase()) 
            : (res.sportsProfile?.position || []).map((p: string) => p.toUpperCase()),
          intro: res.sportsProfile?.intro || '',
          height: res.sportsProfile?.height || '',
          weight: res.sportsProfile?.weight || '',
          age: res.sportsProfile?.age || '',
          footballAge: res.sportsProfile?.footballAge || ''
        })
        
        // 头像
        const currentAvatar = res.avatar || `https://api.dicebear.com/9.x/adventurer/svg?seed=${res.name}`
        setAvatar(currentAvatar)
        if (res.avatar && !res.avatar.includes('dicebear')) {
          setFileList([{ url: res.avatar }])
        }

        // 五芒星
        if (res.radarData) {
            setRadarData(res.radarData)
            setInitialRadarData(res.radarData)
        } else {
            setInitialRadarData({
                speed: 50,
                shooting: 50,
                passing: 50,
                dribbling: 50,
                defense: 50,
                physical: 50
            })
        }

        // 相册
        if (res.profileImages && res.profileImages.length > 0) {
            setGalleryFileList(res.profileImages.map((url: string) => ({ url })))
        }
      })
    }
  }, [])

  const handleRandomAvatar = () => {
    const seed = Math.random().toString(36).substring(7)
    const newAvatar = `https://api.dicebear.com/9.x/adventurer/svg?seed=${seed}`
    setAvatar(newAvatar)
    setFileList([])
  }

  const mockUpload = async (file: File) => {
    const formData = new FormData()
    formData.append('file', file)
    try {
      const res: any = await request.post('/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      // setAvatar(res.url) // Rely on onChange to update avatar
      return { url: res.url }
    } catch (e) {
      Toast.show({ content: '上传失败', icon: 'fail' })
      throw e
    }
  }

  const onFinish = async () => {
    try {
      // 验证表单
      await form.validateFields()
      
      const values = form.getFieldsValue()
      
      // 处理位置信息，统一转为大写并去重
      let positionStr = ''
      if (Array.isArray(values.position)) {
          // 统一大写并去重
          const uniquePos = Array.from(new Set(values.position.map((p: string) => p.toUpperCase())))
          positionStr = uniquePos.join('/')
      } else if (typeof values.position === 'string') {
          const uniquePos = Array.from(new Set(values.position.split('/').map((p: string) => p.trim().toUpperCase())))
          positionStr = uniquePos.join('/')
      }

      const updateData = {
        ...values,
        sportsProfile: {
             ...user?.sportsProfile,
             height: values.height,
             weight: values.weight,
             age: values.age,
             position: positionStr,
             footballAge: values.footballAge,
             intro: values.intro
        },
        avatar: fileList.length > 0 ? fileList[0].url : avatar,
        radarData,
        profileImages: galleryFileList.map(f => f.url)
      }
      await request.put('/user/profile', updateData)
      
      const hasRadarChange = JSON.stringify(radarData) !== JSON.stringify(initialRadarData)
      Toast.show({
        icon: 'success',
        content: hasRadarChange ? '保存成功，五芒星数据已提交审核' : '保存成功',
      })
      setTimeout(() => navigate(-1), 1000)
    } catch (error) {
      console.error(error)
    }
  }

  const handleShare = async () => {
    if (user?.id) {
        navigate(`/user/${user.id}/card`)
    } else {
        Toast.show('无法获取用户信息')
    }
  }

  const radarDimensions = [
      { key: 'speed', label: '速度' },
      { key: 'shooting', label: '射门' },
      { key: 'passing', label: '传球' },
      { key: 'dribbling', label: '盘带' },
      { key: 'defense', label: '防守' },
      { key: 'physical', label: '力量' },
  ]

  return (
    <div className="min-h-screen bg-slate-50 pt-safe-top">
      <NavBar 
        onBack={() => navigate(-1)}  
        right={<Share2 size={20} onClick={handleShare} />}
        style={{ background: 'transparent' }}
      >
        维护个人主页
      </NavBar>
      
      <div className="p-4 space-y-4">
        {/* 头像区域 */}
        <div className="flex flex-col items-center gap-4 bg-white p-4 rounded-xl shadow-sm">
          {/* 隐藏的文件输入框 */}
          <input 
            type="file" 
            ref={fileInputRef} 
            accept="image/*" 
            onChange={handleFileChange} 
            style={{ visibility: 'hidden', position: 'absolute', width: 0, height: 0, zIndex: -1 }}
          />
          
          <div className="relative group">
             <div 
               className="w-24 h-24 rounded-full overflow-hidden bg-gray-200 cursor-pointer relative border-4 border-white shadow-md"
               onClick={(e) => {
                 e.preventDefault()
                 fileInputRef.current?.click()
               }}
             >
               <img src={avatar} className="w-full h-full object-cover" alt="avatar" />
             </div>
             
             <div className="mt-2 text-center relative">
                <Button 
                    size="mini" 
                    color="primary" 
                    fill="outline" 
                    onClick={(e) => {
                        // 防止事件冒泡或默认行为干扰
                        // e.stopPropagation()
                        fileInputRef.current?.click()
                    }}
                >
                    更换头像
                </Button>
             </div>
          </div>

          <Button 
            size="mini" 
            fill="none"
            onClick={handleRandomAvatar}
          >
            <div className="flex items-center gap-1 text-gray-500">
              <RefreshCcw size={12} />
              <span>随机生成头像</span>
            </div>
          </Button>
        </div>

        {/* 基础资料 */}
        <Card title="基础资料">
            <Form
            form={form}
            layout='horizontal'
            mode="card"
            initialValues={{
                name: '',
                realName: '',
                idCard: '',
                jerseyNumber: '',
                position: [],
                intro: '',
                height: '',
                weight: '',
                footballAge: ''
            }}
            style={{ padding: 0, border: 'none', boxShadow: 'none', background: 'transparent' }}
            >
            <Form.Item
                name='name'
                label='昵称'
                rules={[{ required: true }]}
            >
                <Input placeholder='请输入昵称' />
            </Form.Item>

            <Form.Item
                name='realName'
                label='真实姓名'
            >
                <Input placeholder='请输入真实姓名' />
            </Form.Item>

            <Form.Item
                name='idCard'
                label='身份证号'
            >
                <Input placeholder='请输入身份证号' />
            </Form.Item>

            <Form.Item
                name='jerseyNumber'
                label='球衣号码'
            >
                <Input type='number' placeholder='请输入球衣号码' />
            </Form.Item>

            <Form.Item
                name='footballAge'
                label='球龄(年)'
            >
                <Input type='number' placeholder='请输入球龄' />
            </Form.Item>

            <Form.Item
                name='age'
                label='年龄(岁)'
            >
                <Input type='number' placeholder='请输入年龄' />
            </Form.Item>

            <Form.Item
                name='position'
                label='场上位置'
            >
                <Selector
                    columns={3}
                    multiple
                    options={[
                        { label: '前锋', value: 'FW' },
                        { label: '中场', value: 'MF' },
                        { label: '后卫', value: 'DF' },
                        { label: '门将', value: 'GK' },
                        { label: '中锋', value: 'ST' },
                        { label: '边锋', value: 'RW/LW' },
                        { label: '前腰', value: 'CAM' },
                        { label: '后腰', value: 'CDM' },
                        { label: '中卫', value: 'CB' },
                        { label: '边卫', value: 'RB/LB' },
                    ]}
                />
            </Form.Item>

            <Form.Item
                name='intro'
                label='个人简介'
            >
                <TextArea placeholder='简单介绍一下您的足球经历...' rows={3} showCount maxLength={100} />
            </Form.Item>

            <Form.Item
                name='height'
                label='身高(CM)'
            >
                <Input type='number' placeholder='请输入身高' />
            </Form.Item>

            <Form.Item
                name='weight'
                label='体重(KG)'
            >
                <Input type='number' placeholder='请输入体重' />
            </Form.Item>
            </Form>
        </Card>

        {/* 五芒星数据 */}
        <Card 
            title={
                <div className="flex items-center gap-2">
                    <span>能力数据 (五芒星)</span>
                    {user?.radarDataStatus === 'pending' && <span className="text-xs text-orange-500 bg-orange-50 px-1 rounded">审核中</span>}
                    {user?.radarDataStatus === 'rejected' && <span className="text-xs text-red-500 bg-red-50 px-1 rounded">已拒绝</span>}
                    {user?.radarDataStatus === 'approved' && <span className="text-xs text-green-500 bg-green-50 px-1 rounded">已认证</span>}
                </div>
            }
            extra={<Info size={16} className="text-gray-400" onClick={() => Toast.show('调整后需管理员审核才能生效')} />}
        >
            <div className="space-y-4 pt-2">
                {radarDimensions.map(dim => (
                    <div key={dim.key} className="flex items-center gap-4">
                        <div className="w-10 text-sm text-gray-600">{dim.label}</div>
                        <div className="flex-1">
                            <Slider 
                                value={radarData[dim.key as keyof typeof radarData]} 
                                onChange={val => {
                                    setRadarData(prev => ({ ...prev, [dim.key]: val as number }))
                                }}
                                min={0} 
                                max={100} 
                                step={1}
                                ticks
                            />
                        </div>
                        <div className="w-8 text-right text-sm font-bold text-primary">{radarData[dim.key as keyof typeof radarData]}</div>
                    </div>
                ))}
            </div>
        </Card>

        {/* 个人风采 */}
        <Card title="个人风采 (最多9张)">
            <ImageUploader
                value={galleryFileList}
                onChange={setGalleryFileList}
                upload={mockUpload}
                maxCount={9}
                columns={3}
            />
            <div className="text-xs text-gray-400 mt-2">上传比赛照片或个人生活照，展示你的风采！</div>
        </Card>

        <div className="h-4"></div>
        
        <div className="grid grid-cols-2 gap-4">
            <Button block color='default' size='large' onClick={handleShare}>
                生成球员卡
            </Button>
            <Button block color='primary' size='large' onClick={onFinish}>
                保存修改
            </Button>
        </div>
        <div className="h-8"></div>
      </div>

      <ImageCropper
        visible={cropperVisible}
        image={cropperImage}
        aspect={1}
        onClose={() => setCropperVisible(false)}
        onCrop={handleCropComplete}
      />
    </div>
  )
}

export default ProfileEdit
