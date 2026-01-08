import React, { Component, ErrorInfo, ReactNode } from 'react'
import { Button } from 'antd-mobile'
import { AlertTriangle } from 'lucide-react'

interface Props {
  children: ReactNode
}

interface State {
  hasError: boolean
  error: Error | null
}

class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null
  }

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error:', error, errorInfo)
  }

  private handleReset = () => {
    localStorage.clear()
    window.location.reload()
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-slate-50 text-center">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mb-4 text-red-500">
            <AlertTriangle size={32} />
          </div>
          <h2 className="text-xl font-bold text-gray-800 mb-2">出错了</h2>
          <p className="text-gray-500 mb-6 text-sm">
            抱歉，应用遇到了一个意料之外的错误。<br/>
            可能是网络问题或缓存导致的。
          </p>
          <div className="space-y-3 w-full max-w-xs">
            <Button block color="primary" onClick={() => window.location.reload()}>
              刷新页面
            </Button>
            <Button block color="danger" fill="outline" onClick={this.handleReset}>
              清除缓存并重试
            </Button>
          </div>
          <div className="mt-8 p-4 bg-gray-100 rounded text-left w-full max-w-md overflow-auto text-xs text-gray-400 font-mono">
             {this.state.error?.toString()}
          </div>
        </div>
      )
    }

    return this.props.children
  }
}

export default ErrorBoundary
