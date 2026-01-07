import React, { useState } from 'react'
import { NavBar, Form, Button, Toast, Selector, ImageUploader, Card, Input } from 'antd-mobile'
import { useNavigate } from 'react-router-dom'
import { ImageUploadItem } from 'antd-mobile/es/components/image-uploader'
import request from '../utils/request'

const CertificationApply: React.FC = () => {
  const navigate = useNavigate()
  const [form] = Form.useForm()
  const [fileList, setFileList] = useState<ImageUploadItem[]>([])

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
    if (fileList.length === 0) {
      Toast.show({ content: '请上传资格证书', icon: 'fail' })
      return
    }

    try {
      await request.post('/user/apply-cert', {
        type: values.type[0],
        level: values.level?.[0], // 新增等级字段
        files: fileList.map(f => f.url)
      })
      Toast.show({
        icon: 'success',
        content: '申请已提交，等待审核',
      })
      setTimeout(() => navigate(-1), 1500)
    } catch (error) {
      console.error(error)
      Toast.show({ content: '提交失败，请重试', icon: 'fail' })
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 pt-safe-top">
      <NavBar onBack={() => navigate(-1)} style={{ background: 'transparent' }}>专业认证申请</NavBar>
      
      <div className="p-4">
        <Card className="mb-4">
          <div className="text-gray-500 text-sm mb-2">
            申请流程：
            <br/>1. 选择认证类型与等级
            <br/>2. 上传对应的资格证书/证明材料
            <br/>3. 等待管理员审核（预计1-3个工作日）
            <br/><span className="text-violet-500">注：重复提交将覆盖之前的申请。</span>
          </div>
        </Card>

        <Form
          form={form}
          onFinish={onFinish}
          footer={
            <Button block type='submit' color='primary' size='large'>
              提交申请
            </Button>
          }
          mode="card"
        >
          <Form.Item
            name='type'
            label='申请类型'
            rules={[{ required: true, message: '请选择申请类型' }]}
          >
            <Selector
              columns={2}
              options={[
                { label: '裁判员认证', value: '裁判员' },
                { label: '教练员认证', value: '教练员' },
              ]}
            />
          </Form.Item>

          <Form.Item
            name='realName'
            label='真实姓名'
            rules={[{ required: true, message: '请输入真实姓名' }]}
          >
            <Input placeholder='请输入真实姓名' />
          </Form.Item>

          <Form.Item
            name='idCard'
            label='身份证号'
            rules={[{ required: true, message: '请输入身份证号' }]}
          >
            <Input placeholder='请输入身份证号' />
          </Form.Item>

          <Form.Item shouldUpdate={(prev, next) => prev.type !== next.type}>
            {({ getFieldValue }) => {
                const type = getFieldValue('type')
                if (!type || type.length === 0) return null
                
                const isReferee = type[0] === '裁判员'
                return (
                    <Form.Item name="level" label="等级" rules={[{ required: true, message: '请选择等级' }]}>
                        <Selector
                            columns={2}
                            options={isReferee ? [
                                { label: '国家一级', value: '国家一级' },
                                { label: '国家二级', value: '国家二级' },
                                { label: '国家三级', value: '国家三级' },
                                { label: '实习', value: '实习' },
                            ] : [
                                { label: '职业级', value: '职业级' },
                                { label: 'A级', value: 'A级' },
                                { label: 'B级', value: 'B级' },
                                { label: 'C级', value: 'C级' },
                                { label: 'D级', value: 'D级' },
                                { label: 'E级', value: 'E级' },
                            ]}
                        />
                    </Form.Item>
                )
            }}
          </Form.Item>

          <Form.Item label='资格证书/证明材料'>
            <ImageUploader
              value={fileList}
              onChange={setFileList}
              upload={mockUpload}
              maxCount={3}
            />
          </Form.Item>
        </Form>
      </div>
    </div>
  )
}

export default CertificationApply