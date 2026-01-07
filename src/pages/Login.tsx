import React, { useState } from 'react'
import { Form, Input, Button, Toast, Checkbox, Modal } from 'antd-mobile'
import { useNavigate } from 'react-router-dom'
import { ShieldCheck, ChevronLeft, Phone, Lock, User } from 'lucide-react'
import request from '../utils/request'

const Login: React.FC = () => {
  const navigate = useNavigate()
  const [isRegister, setIsRegister] = useState(false)
  const [agreed, setAgreed] = useState(false)
  const [agreementVisible, setAgreementVisible] = useState(false)

  const onFinish = async (values: any) => {
    if (!agreed) {
        Toast.show('请先阅读并同意用户使用说明')
        return
    }
    try {
      const url = isRegister ? '/auth/register' : '/auth/login'
      const res: any = await request.post(url, values)
      
      Toast.show({
        icon: 'success',
        content: isRegister ? '注册成功' : '登录成功',
      })

      localStorage.setItem('token', res.access_token)
      localStorage.setItem('user', JSON.stringify(res.user))

      setTimeout(() => navigate('/profile'), 500)
    } catch (error: any) {
      console.error('Login Error:', error)
      // Request util usually handles common errors, but we catch here just in case
    }
  }

  return (
    <div className="fixed inset-0 bg-[#0f172a] z-50 overflow-y-auto">
      <div className="min-h-full flex flex-col justify-center items-center relative py-10">
        {/* Background Decor */}
        <div className="absolute top-0 left-0 w-full h-full overflow-hidden z-0 pointer-events-none">
            <div className="absolute top-[-10%] right-[-10%] w-[80vw] h-[80vw] bg-violet-600/20 rounded-full blur-[120px]" />
            <div className="absolute bottom-[-10%] left-[-10%] w-[80vw] h-[80vw] bg-fuchsia-600/20 rounded-full blur-[120px]" />
        </div>

        <div className="absolute top-6 left-4 z-20">
            <div 
                className="w-10 h-10 rounded-full bg-white/5 backdrop-blur-md border border-white/10 flex items-center justify-center text-white active:scale-90 transition-transform cursor-pointer"
                onClick={() => navigate(-1)}
            >
                <ChevronLeft size={24} />
            </div>
        </div>

        <div className="relative z-10 w-full max-w-sm px-6">
            <div className="mb-10 text-center">
                <div className="w-20 h-20 bg-gradient-to-tr from-violet-500 to-fuchsia-600 rounded-2xl mx-auto flex items-center justify-center shadow-2xl shadow-violet-500/30 mb-6 rotate-3">
                    <ShieldCheck size={40} className="text-white" />
                </div>
                <h1 className="text-3xl font-bold text-white mb-2 tracking-tight drop-shadow-sm">
                    {isRegister ? '加入我们' : '欢迎回来'}
                </h1>
                <p className="text-slate-400 text-sm">
                    {isRegister ? '开启您的足球生涯' : '登录以继续精彩赛事'}
                </p>
            </div>

            <div className="backdrop-blur-xl bg-white/10 rounded-3xl p-1 shadow-2xl border border-white/10">
                <div className="bg-slate-900/40 rounded-[20px] p-6 backdrop-blur-sm">
                    <Form
                        layout='horizontal'
                        className="login-form"
                        footer={
                            <div className="mt-6 flex flex-col gap-4">
                                <Button 
                                    block 
                                    type='submit' 
                                    size='large' 
                                    disabled={!agreed}
                                    className={`border-none rounded-xl h-12 text-lg font-bold shadow-lg transition-all ${
                                        agreed 
                                        ? 'bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white shadow-violet-500/25 active:scale-[0.98]' 
                                        : 'bg-white/5 text-white/20'
                                    }`}
                                >
                                {isRegister ? '立即注册' : '登 录'}
                                </Button>
                                
                                <div className="flex items-center justify-center gap-2 text-xs text-slate-400">
                                    <Checkbox 
                                        checked={agreed} 
                                        onChange={setAgreed} 
                                        style={{ '--icon-size': '16px', '--checked-color': '#7c3aed' } as any}
                                    />
                                    <span>
                                        我已阅读并同意
                                        <span className="text-violet-400 font-medium cursor-pointer ml-1 hover:text-violet-300" onClick={() => setAgreementVisible(true)}>《用户协议》</span>
                                    </span>
                                </div>
                            </div>
                        }
                        onFinish={onFinish}
                    >
                        {isRegister && (
                            <Form.Item
                                name='name'
                                rules={[{ required: true, message: '请输入昵称' }]}
                                className="mb-4"
                            >
                                <div className="bg-black/20 rounded-xl px-4 py-3.5 flex items-center gap-3 border border-white/5 focus-within:border-violet-500/50 focus-within:bg-black/30 transition-all">
                                    <User size={20} className="text-slate-400" />
                                    <Input placeholder='昵称' clearable className="text-white placeholder:text-slate-500" style={{'--color': '#fff'}} />
                                </div>
                            </Form.Item>
                        )}

                        <Form.Item
                            name='phone'
                            rules={[
                            { required: true, message: '请输入手机号' },
                            { pattern: /^1[3-9]\d{9}$/, message: '请输入有效的11位手机号' }
                            ]}
                            className="mb-4"
                        >
                            <div className="bg-black/20 rounded-xl px-4 py-3.5 flex items-center gap-3 border border-white/5 focus-within:border-violet-500/50 focus-within:bg-black/30 transition-all">
                                <Phone size={20} className="text-slate-400" />
                                <Input placeholder='手机号' clearable className="text-white placeholder:text-slate-500" style={{'--color': '#fff'}} />
                            </div>
                        </Form.Item>

                        <Form.Item
                            name='password'
                            rules={[
                            { required: true, message: '请输入密码' },
                            { min: 6, message: '密码长度不能少于6位' }
                            ]}
                            className="mb-0"
                        >
                            <div className="bg-black/20 rounded-xl px-4 py-3.5 flex items-center gap-3 border border-white/5 focus-within:border-violet-500/50 focus-within:bg-black/30 transition-all">
                                <Lock size={20} className="text-slate-400" />
                                <Input placeholder='密码' type='password' clearable className="text-white placeholder:text-slate-500" style={{'--color': '#fff'}} />
                            </div>
                        </Form.Item>
                    </Form>

                    <div className="mt-8 text-center pt-6 border-t border-white/5">
                        <p className="text-slate-400 text-sm flex items-center justify-center gap-2">
                            {isRegister ? '已有账号？' : '还没有账号？'} 
                            <span 
                                className="text-violet-400 font-bold cursor-pointer hover:text-violet-300 transition-colors px-2 py-1 rounded-lg hover:bg-white/5" 
                                onClick={() => setIsRegister(!isRegister)}
                            >
                                {isRegister ? '去登录' : '去注册'}
                            </span>
                        </p>
                    </div>
                </div>
            </div>
        </div>

        <Modal
            visible={agreementVisible}
            title="用户使用说明"
            content={
                <div className="max-h-[50vh] overflow-y-auto text-sm leading-6 text-gray-600 px-2">
                    <p className="mb-2"><strong>1. 总则</strong><br/>欢迎使用龙里足协服务平台。本平台旨在为足球爱好者提供赛事报名、球队管理、社区交流等服务。</p>
                    <p className="mb-2"><strong>2. 账号注册与使用</strong><br/>用户需提供真实、准确的个人信息进行注册。您应妥善保管账号密码，对账号下的所有活动负责。</p>
                    <p className="mb-2"><strong>3. 用户行为规范</strong><br/>用户在社区发帖、评论时，应遵守法律法规，不得发布违法、违规或侵犯他人权益的内容。</p>
                    <p className="mb-2"><strong>4. 隐私保护</strong><br/>我们重视您的隐私保护，承诺不会向第三方出售您的个人信息，除非法律法规另有规定。</p>
                    <p className="mb-2"><strong>5. 赛事与活动</strong><br/>参加平台发布的线下赛事活动时，请注意人身安全。平台仅作为信息发布方，不对活动中的意外事故承担责任。</p>
                </div>
            }
            closeOnAction
            onClose={() => setAgreementVisible(false)}
            actions={[{ key: 'confirm', text: '我已阅读', primary: true }]}
        />
      </div>
    </div>
  )
}

export default Login