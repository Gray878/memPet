import { useEffect, useState } from 'react'

/**
 * API 诊断组件
 * 用于检查 electronAPI 是否正确加载
 */
export default function ApiDiagnostic() {
  const [apiStatus, setApiStatus] = useState<any>(null)

  useEffect(() => {
    const checkAPI = () => {
      const status = {
        electronAPIExists: !!window.electronAPI,
        chat: {
          exists: !!window.electronAPI?.chat,
          methods: window.electronAPI?.chat ? Object.keys(window.electronAPI.chat) : [],
        },
        events: {
          exists: !!window.electronAPI?.events,
          methods: window.electronAPI?.events ? Object.keys(window.electronAPI.events) : [],
        },
        memory: {
          exists: !!window.electronAPI?.memory,
          methods: window.electronAPI?.memory ? Object.keys(window.electronAPI.memory) : [],
        },
        pet: {
          exists: !!window.electronAPI?.pet,
          methods: window.electronAPI?.pet ? Object.keys(window.electronAPI.pet) : [],
        },
        system: {
          exists: !!window.electronAPI?.system,
          methods: window.electronAPI?.system ? Object.keys(window.electronAPI.system) : [],
        },
      }
      setApiStatus(status)
      console.log('[API Diagnostic]', status)
    }

    checkAPI()
  }, [])

  if (!apiStatus) {
    return <div className="p-4">正在检查 API...</div>
  }

  const getStatusColor = (exists: boolean) => {
    return exists ? 'text-green-500' : 'text-red-500'
  }

  const getStatusIcon = (exists: boolean) => {
    return exists ? '✓' : '✗'
  }

  return (
    <div className="p-6 bg-gray-900 text-white font-mono text-sm">
      <h2 className="text-xl font-bold mb-4">electronAPI 诊断</h2>

      <div className="space-y-4">
        {/* 总体状态 */}
        <div className="border border-gray-700 rounded p-4">
          <div className={`text-lg font-bold ${getStatusColor(apiStatus.electronAPIExists)}`}>
            {getStatusIcon(apiStatus.electronAPIExists)} window.electronAPI{' '}
            {apiStatus.electronAPIExists ? '已加载' : '未加载'}
          </div>
          {!apiStatus.electronAPIExists && (
            <div className="mt-2 text-yellow-400">
              ⚠️ preload 脚本未正确加载，请完全重启应用
            </div>
          )}
        </div>

        {/* 各个 API 状态 */}
        {apiStatus.electronAPIExists && (
          <>
            {/* Chat API */}
            <div className="border border-gray-700 rounded p-4">
              <div className={`font-bold ${getStatusColor(apiStatus.chat.exists)}`}>
                {getStatusIcon(apiStatus.chat.exists)} electronAPI.chat
              </div>
              {apiStatus.chat.exists && (
                <div className="mt-2 text-gray-400">
                  方法: {apiStatus.chat.methods.join(', ')}
                </div>
              )}
            </div>

            {/* Events API */}
            <div className="border border-gray-700 rounded p-4">
              <div className={`font-bold ${getStatusColor(apiStatus.events.exists)}`}>
                {getStatusIcon(apiStatus.events.exists)} electronAPI.events
              </div>
              {apiStatus.events.exists && (
                <div className="mt-2 text-gray-400">
                  方法: {apiStatus.events.methods.join(', ')}
                </div>
              )}
            </div>

            {/* Memory API */}
            <div className="border border-gray-700 rounded p-4">
              <div className={`font-bold ${getStatusColor(apiStatus.memory.exists)}`}>
                {getStatusIcon(apiStatus.memory.exists)} electronAPI.memory
              </div>
              {apiStatus.memory.exists && (
                <div className="mt-2 text-gray-400 text-xs">
                  方法: {apiStatus.memory.methods.slice(0, 5).join(', ')}
                  {apiStatus.memory.methods.length > 5 && ` ... (+${apiStatus.memory.methods.length - 5})`}
                </div>
              )}
            </div>

            {/* Pet API */}
            <div className="border border-gray-700 rounded p-4">
              <div className={`font-bold ${getStatusColor(apiStatus.pet.exists)}`}>
                {getStatusIcon(apiStatus.pet.exists)} electronAPI.pet
              </div>
              {apiStatus.pet.exists && (
                <div className="mt-2 text-gray-400">
                  方法: {apiStatus.pet.methods.join(', ')}
                </div>
              )}
            </div>

            {/* System API */}
            <div className="border border-gray-700 rounded p-4">
              <div className={`font-bold ${getStatusColor(apiStatus.system.exists)}`}>
                {getStatusIcon(apiStatus.system.exists)} electronAPI.system
              </div>
              {apiStatus.system.exists && (
                <div className="mt-2 text-gray-400">
                  方法: {apiStatus.system.methods.join(', ')}
                </div>
              )}
            </div>
          </>
        )}
      </div>

      {/* 修复建议 */}
      {!apiStatus.electronAPIExists && (
        <div className="mt-6 border border-yellow-600 rounded p-4 bg-yellow-900/20">
          <h3 className="font-bold text-yellow-400 mb-2">修复步骤：</h3>
          <ol className="list-decimal list-inside space-y-1 text-gray-300">
            <li>停止当前运行的应用 (Ctrl+C)</li>
            <li>
              清理缓存：
              <code className="ml-2 bg-gray-800 px-2 py-1 rounded">
                Remove-Item -Recurse -Force dist-electron, node_modules\.vite
              </code>
            </li>
            <li>
              重新启动：
              <code className="ml-2 bg-gray-800 px-2 py-1 rounded">npm run dev</code>
            </li>
            <li>或者运行快速重启脚本：
              <code className="ml-2 bg-gray-800 px-2 py-1 rounded">.\restart-dev.ps1</code>
            </li>
          </ol>
        </div>
      )}

      {/* 成功提示 */}
      {apiStatus.electronAPIExists &&
        apiStatus.chat.exists &&
        apiStatus.events.exists && (
          <div className="mt-6 border border-green-600 rounded p-4 bg-green-900/20">
            <div className="font-bold text-green-400">✓ 所有 API 正常加载</div>
            <div className="mt-2 text-gray-300">
              可以正常使用对话、记忆、系统监控等功能
            </div>
          </div>
        )}
    </div>
  )
}
