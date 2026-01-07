import React, { useState } from 'react'
import { NavBar, Steps, Form, Input, Button, Radio, Selector, TextArea, Dialog, Toast } from 'antd-mobile'
import { useNavigate } from 'react-router-dom'
import request from '../utils/request'

const Auth: React.FC = () => {
  const navigate = useNavigate()
  const [currentStep, setCurrentStep] = useState(0)
  const [form] = Form.useForm()
  const [formData, setFormData] = useState<any>({})

  const onNext = async () => {
    try {
      if (currentStep < 2) {
        // 校验当前步骤的表单
        await form.validateFields()
        const values = form.getFieldsValue()
        setFormData({ ...formData, ...values })
        setCurrentStep(currentStep + 1)
      } else {
        // 提交所有数据
        const finalData = { ...formData }
        if (Array.isArray(finalData.position)) {
            finalData.position = finalData.position.join('/')
        }
        await request.put('/user/auth', finalData)
        
        Dialog.alert({
          content: '提交成功，已自动通过认证',
          onConfirm: () => {
            navigate('/profile')
          },
        })
      }
    } catch (error) {
      console.error(error)
      // 如果是表单校验错误，不需要提示网络错误
      if (!(error as any).errorFields) {
        Toast.show({ content: '提交失败，请重试', icon: 'fail' })
      }
    }
  }

  const Step1 = () => (
    <Form 
      layout='horizontal' 
      form={form} 
      initialValues={formData}
    >
      <Form.Item 
        label='真实姓名' 
        name='name' 
        rules={[
          { required: true, message: '请输入真实姓名' },
          { min: 2, message: '姓名至少2个字符' },
          { max: 10, message: '姓名最多10个字符' }
        ]}
      >
        <Input placeholder='请输入真实姓名' clearable />
      </Form.Item>
      <Form.Item 
        label='身份证号' 
        name='idCard' 
        rules={[
          { required: true, message: '请输入身份证号' },
          { pattern: /(^\d{15}$)|(^\d{18}$)|(^\d{17}(\d|X|x)$)/, message: '请输入有效的身份证号' }
        ]}
      >
        <Input placeholder='请输入身份证号' clearable />
      </Form.Item>
      <Form.Item label='性别' name='gender' initialValue='1'>
        <Radio.Group>
          <div className="flex gap-4">
            <Radio value='1'>男</Radio>
            <Radio value='2'>女</Radio>
          </div>
        </Radio.Group>
      </Form.Item>
    </Form>
  )

  const Step2 = () => (
    <Form 
      layout='horizontal' 
      form={form}
      initialValues={formData}
    >
      <Form.Item 
        label='球龄(年)' 
        name='footballAge'
        rules={[{ required: true, message: '请输入球龄' }]}
      >
        <Input type='number' placeholder='请输入球龄' />
      </Form.Item>
      <Form.Item label='场上位置' name='position'>
        <Selector
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
          columns={3}
        />
      </Form.Item>
      <Form.Item label='自我介绍' name='intro'>
        <TextArea placeholder='简单介绍一下您的足球经历...' rows={4} />
      </Form.Item>
    </Form>
  )

  const Step3 = () => (
    <div className="text-center py-10">
      <div className="text-6xl mb-4">✅</div>
      <h2 className="text-xl font-bold mb-2">确认提交认证信息？</h2>
      <p className="text-gray-500 text-sm">提交后工作人员将在1-3个工作日内完成审核</p>
    </div>
  )

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      <NavBar onBack={() => navigate(-1)}>球员认证</NavBar>
      
      <div className="bg-white p-4 mb-4">
        <Steps current={currentStep}>
          <Steps.Step title='基本信息' />
          <Steps.Step title='运动档案' />
          <Steps.Step title='提交审核' />
        </Steps>
      </div>

      <div className="p-4">
        {currentStep === 0 && <Step1 />}
        {currentStep === 1 && <Step2 />}
        {currentStep === 2 && <Step3 />}
      </div>

      <div className="fixed bottom-0 left-0 right-0 p-4 bg-white border-t border-gray-100 pb-safe">
        <div className="flex gap-4">
          {currentStep > 0 && (
            <Button block onClick={() => setCurrentStep(currentStep - 1)}>
              上一步
            </Button>
          )}
          <Button block color='primary' onClick={onNext}>
            {currentStep === 2 ? '确认提交' : '下一步'}
          </Button>
        </div>
      </div>
    </div>
  )
}

export default Auth
