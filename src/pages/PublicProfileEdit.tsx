import React, { useEffect, useState } from 'react'
import { NavBar, Form, Input, Button, Toast, ImageUploader, Card, Slider } from 'antd-mobile'
import { useNavigate } from 'react-router-dom'
import request from '../utils/request'
import { ImageUploadItem } from 'antd-mobile/es/components/image-uploader'

const PublicProfileEdit: React.FC = () => {
  const navigate = useNavigate()
  const [form] = Form.useForm()
  const [fileList, setFileList] = useState<ImageUploadItem[]>([])
  const [radarData, setRadarData] = useState<any>({
    speed: 50,
    shooting: 50,
    passing: 50,
    dribbling: 50,
    defense: 50,
    physical: 50
  })

  useEffect(() => {
    fetchProfile()
  }, [])

  const fetchProfile = async () => {
    try {
      const res: any = await request.get('/user/profile')
      if (res.profileImages) {
        setFileList(res.profileImages.map((url: string) => ({ url })))
      }
      if (res.radarData) {
        setRadarData(res.radarData)
      }
      form.setFieldsValue({
          intro: res.sportsProfile?.intro
      })
    } catch (error) {
      console.error(error)
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

  const onFinish = async (values: any) => {
    try {
      const payload = {
        profileImages: fileList.map(f => f.url),
        radarData: radarData,
        radarDataStatus: 'pending', // Re-submit for approval
        sportsProfile: {
            intro: values.intro
        }
      }
      await request.put('/user/profile', payload)
      Toast.show({ icon: 'success', content: '保存成功，五芒星数据待审核' })
      navigate(-1)
    } catch (error) {
      console.error(error)
      Toast.show({ content: '保存失败', icon: 'fail' })
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      <NavBar onBack={() => navigate(-1)} className="bg-white border-b border-gray-100">个人主页设置</NavBar>
      
      <Form form={form} onFinish={onFinish} layout='horizontal' footer={
        <Button block type='submit' color='primary' size='large'>
          保存并提交审核
        </Button>
      }>
        <Form.Header>基础展示</Form.Header>
        <Form.Item label="个人相册" help="最多上传9张，展示在个人主页">
          <ImageUploader
            value={fileList}
            onChange={setFileList}
            upload={mockUpload}
            maxCount={9}
          />
        </Form.Item>
        <Form.Item name="intro" label="一句话简介" help="不超过50字">
            <Input maxLength={50} placeholder="例如：热爱足球，专注中场" />
        </Form.Item>

        <Form.Header>五芒星数据 (自我评估)</Form.Header>
        <Card>
            {Object.keys(radarData).map(key => (
                <div key={key} className="mb-4">
                    <div className="flex justify-between mb-1">
                        <span className="capitalize font-medium">
                            {key === 'speed' ? '速度' : 
                             key === 'shooting' ? '射门' : 
                             key === 'passing' ? '传球' : 
                             key === 'dribbling' ? '盘带' : 
                             key === 'defense' ? '防守' : '力量'}
                        </span>
                        <span>{radarData[key]}</span>
                    </div>
                    <Slider 
                        value={radarData[key]} 
                        onChange={val => setRadarData({ ...radarData, [key]: val })} 
                        min={0} 
                        max={100} 
                    />
                </div>
            ))}
            <div className="text-xs text-gray-400 mt-2 text-center">
                注：修改数据后需经管理员审核才可对外展示
            </div>
        </Card>
      </Form>
    </div>
  )
}

export default PublicProfileEdit