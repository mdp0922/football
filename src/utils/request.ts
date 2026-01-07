import axios from 'axios'
import { Toast } from 'antd-mobile'

const request = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api', 
  timeout: 5000,
})

// 请求拦截器
request.interceptors.request.use(
  config => {
    const token = localStorage.getItem('token')
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  error => {
    return Promise.reject(error)
  }
)

// 响应拦截器
request.interceptors.response.use(
  response => {
    return response.data
  },
  error => {
    console.error('[Response Error]', error)
    if (error.response) {
        console.error('Status:', error.response.status)
        console.error('Data:', error.response.data)
        console.error('Headers:', error.response.headers)
    }
    let msg = error.response?.data?.message || '请求失败'
    
    // 处理 NestJS ValidationPipe 返回的数组错误信息
    if (Array.isArray(msg)) {
      msg = msg.join(', ')
    }

    // 如果是对象，尝试转字符串
    if (typeof msg === 'object') {
        msg = JSON.stringify(msg)
    }

    Toast.show({
      content: msg,
      icon: 'fail',
    })
    
    if (error.response?.status === 401) {
      const isLoginRequest = error.config?.url?.includes('/auth/login')
      
      if (!isLoginRequest) {
        // Token 失效，跳转登录
        localStorage.removeItem('token')
        localStorage.removeItem('user')
        window.location.href = '/login'
      }
    }
    
    // 如果是获取用户信息报 404 (用户可能被删除)，也退出登录
    if (error.response?.status === 404 && error.config?.url?.includes('/user/profile')) {
      localStorage.removeItem('token')
      localStorage.removeItem('user')
      window.location.href = '/login'
    }
    
    return Promise.reject(error)
  }
)

export default request
