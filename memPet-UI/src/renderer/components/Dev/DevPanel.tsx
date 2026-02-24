import { useState, useEffect } from 'react'
import { useMemU } from '@renderer/hooks/useMemU'

/**
 * 开发工具面板 - 用于测试后端服务
 */
export default function DevPanel() {
  const {
    loading,
    error,
    memorizeConversation,
    retrieveConversation,
    proactiveAnalyze,
    proactiveGenerate,
    getSystemContext,
    checkService,
  } = useMemU()

  const [serviceReady, setServiceReady] = useState(false)
  const [systemContext, setSystemContext] = useState<any>(null)
  const [testResult, setTestResult] = useState<string>('')

  // 检查服务状态
  useEffect(() => {
    const checkStatus = async () => {
      const ready = await checkService()
      setServiceReady(ready)
    }
    
    checkStatus()
    const interval = setInterval(checkStatus, 5000)
    return () => clearInterval(interval)
  }, [checkService])

  // 获取系统上下文
  const handleGetContext = async () => {
    try {
      const context = await getSystemContext()
      setSystemContext(context)
      setTestResult('✓ 系统上下文获取成功')
    } catch (err: any) {
      setTestResult(`✗ 失败: ${err.message}`)
    }
  }

  // 测试存储对话
  const handleTestMemorize = async () => {
    try {
      const content = [
        {
          role: 'user',
          content: { text: '测试消息：今天工作了 2 小时' },
          created_at: new Date().toISOString(),
        },
        {
          role: 'assistant',
          content: { text: '收到！已记录你的工作时长' },
          created_at: new Date().toISOString(),
        },
      ]
      
      const result = await memorizeConversation(content)
      setTestResult(`✓ 对话存储成功: ${JSON.stringify(result, null, 2)}`)
    } catch (err: any) {
      setTestResult(`✗ 失败: ${err.message}`)
    }
  }

  // 测试检索对话
  const handleTestRetrieve = async () => {
    try {
      const result = await retrieveConversation('今天的工作情况', 3)
      setTestResult(`✓ 检索成功: ${JSON.stringify(result, null, 2)}`)
    } catch (err: any) {
      setTestResult(`✗ 失败: ${err.message}`)
    }
  }

  // 测试主动推理
  const handleTestProactive = async () => {
    try {
      if (!systemContext) {
        await handleGetContext()
        return
      }
      
      // 构造测试上下文（确保能触发建议）
      const testContext = {
        ...systemContext,
        working_duration: 7200,  // 2小时
        fatigue_level: 'Tired',  // 疲劳
        is_late_night: false,
        idle_time: 0,
      }
      
      // 测试时跳过冷却机制
      const result = await proactiveAnalyze(testContext, true)
      setTestResult(`✓ 主动推理成功: ${JSON.stringify(result, null, 2)}`)
      
      // 如果有建议，生成消息
      if (result.suggestions && result.suggestions.length > 0) {
        const message = await proactiveGenerate(
          result.suggestions[0],
          testContext,
          'friendly'
        )
        setTestResult(prev => `${prev}\n\n✓ 生成消息: ${message.message}`)
      } else {
        setTestResult(prev => `${prev}\n\n⚠️ 无建议（当前状态正常）`)
      }
    } catch (err: any) {
      setTestResult(`✗ 失败: ${err.message}`)
    }
  }

  return (
    <div className="fixed bottom-4 right-4 w-96 bg-slate-900 text-white rounded-lg shadow-2xl border border-slate-700 overflow-hidden">
      {/* 标题栏 */}
      <div className="bg-slate-800 px-4 py-3 border-b border-slate-700">
        <div className="flex items-center justify-between">
          <h3 className="font-mono text-sm font-semibold">Dev Tools</h3>
          <div className="flex items-center gap-2">
            <div className={`w-2 h-2 rounded-full ${serviceReady ? 'bg-green-500' : 'bg-red-500'}`} />
            <span className="text-xs text-slate-400">
              {serviceReady ? 'Ready' : 'Not Ready'}
            </span>
          </div>
        </div>
      </div>

      {/* 内容区 */}
      <div className="p-4 space-y-3 max-h-96 overflow-y-auto">
        {/* 系统上下文 */}
        <div>
          <button
            onClick={handleGetContext}
            disabled={loading || !serviceReady}
            className="w-full px-3 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-700 disabled:text-slate-500 rounded text-sm font-medium transition-colors"
          >
            获取系统上下文
          </button>
          
          {systemContext && (
            <div className="mt-2 p-2 bg-slate-800 rounded text-xs font-mono">
              <div>App: {systemContext.active_app}</div>
              <div>Work: {systemContext.working_duration}s ({Math.floor(systemContext.working_duration / 60)}m {systemContext.working_duration % 60}s)</div>
              <div>Fatigue: {systemContext.fatigue_level}</div>
              <div>Focus: {systemContext.focus_level}</div>
            </div>
          )}
        </div>

        {/* 测试按钮 */}
        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={handleTestMemorize}
            disabled={loading || !serviceReady}
            className="px-3 py-2 bg-green-600 hover:bg-green-700 disabled:bg-slate-700 disabled:text-slate-500 rounded text-sm font-medium transition-colors"
          >
            测试存储
          </button>
          
          <button
            onClick={handleTestRetrieve}
            disabled={loading || !serviceReady}
            className="px-3 py-2 bg-purple-600 hover:bg-purple-700 disabled:bg-slate-700 disabled:text-slate-500 rounded text-sm font-medium transition-colors"
          >
            测试检索
          </button>
          
          <button
            onClick={handleTestProactive}
            disabled={loading || !serviceReady || !systemContext}
            className="col-span-2 px-3 py-2 bg-orange-600 hover:bg-orange-700 disabled:bg-slate-700 disabled:text-slate-500 rounded text-sm font-medium transition-colors"
          >
            测试主动推理
          </button>
        </div>

        {/* 加载状态 */}
        {loading && (
          <div className="text-center text-sm text-slate-400">
            处理中...
          </div>
        )}

        {/* 错误信息 */}
        {error && (
          <div className="p-2 bg-red-900/50 border border-red-700 rounded text-xs text-red-200">
            {error}
          </div>
        )}

        {/* 测试结果 */}
        {testResult && (
          <div className="p-2 bg-slate-800 rounded text-xs font-mono whitespace-pre-wrap max-h-48 overflow-y-auto">
            {testResult}
          </div>
        )}
      </div>
    </div>
  )
}
