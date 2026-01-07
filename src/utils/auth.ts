import { Modal } from 'antd-mobile'

export const checkLogin = (navigate: (path: string) => void): boolean => {
  const token = localStorage.getItem('token')
  if (!token) {
    Modal.confirm({
      content: '该功能需要登录后使用',
      confirmText: '去登录',
      onConfirm: () => navigate('/login'),
    })
    return false
  }
  return true
}

export const getToken = () => localStorage.getItem('token')

export const getUser = () => {
  const userStr = localStorage.getItem('user')
  return userStr ? JSON.parse(userStr) : null
}
