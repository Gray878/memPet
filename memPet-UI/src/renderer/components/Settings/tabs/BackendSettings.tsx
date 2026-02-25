import { useState, useEffect } from 'react'
import { RefreshCw, Terminal, Trash2 } from 'lucide-react'

export default function BackendSettings() {
  const [status, setStatus] = useState<{ running: boolean } | null>(null)
  const [logs, setLogs] = useState<string[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    loadStatus()
    loadLogs()
  }, [])

  const loadStatus = async () => {
    const result = await window.electronAPI.settings.getServerStatus()
    if (result.success) {
      setStatus(result.data!)
    }
  }

  const loadLogs = async () => {
    const result = await window.electronAPI.settings.getLogs(50)
    if (result.success) {
      setLogs(result.data!)
    }
  }

  const handleRestart = async () => {
    setLoading(true)
    const result = await window.electronAPI.settings.restartServer()
    if (result.success) {
      alert('服务重启成功')
      await loadStatus()
    } else {
      alert(`重启失败: ${result.error}`)
    }
    setLoading(false)
  }

  const handleClearLogs = async () => {
    const result = await window.electronAPI.settings.clearLogs()
    if (result.success) {
      setLogs([])
    }
  }

  return (
    <div className="space-y-6">
      <div className="settings-section">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-sm font-semibold text-slate-800">memPet-server 状态</h3>
            <p className="text-xs text-slate-500 mt-1">后台记忆服务</p>
          </div>
          <div className={`px-3 py-1 rounded-full text-xs font-medium ${
            status?.running 
              ? 'bg-green-100 text-green-700' 
              : 'bg-red-100 text-red-700'
          }`}>
            {status?.running ? '运行中' : '已停止'}
          </div>
        </div>

        <button
          onClick={handleRestart}
          disabled={loading}
          className="px-4 py-2 text-sm font-medium text-white bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600 rounded-lg transition-all flex items-center gap-2 shadow-lg shadow-blue-500/30 disabled:opacity-50"
        >
          <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
          {loading ? '重启中...' : '重启服务'}
        </button>
      </div>

      <div className="settings-section">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Terminal size={16} className="text-slate-600" />
            <h3 className="text-sm font-semibold text-slate-800">服务日志</h3>
          </div>
          <button
            onClick={handleClearLogs}
            className="px-3 py-1 text-xs font-medium text-slate-600 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all flex items-center gap-1"
          >
            <Trash2 size={14} />
            清空
          </button>
        </div>
        
        <div className="bg-slate-900 rounded-lg p-4 h-64 overflow-y-auto font-mono text-xs">
          {logs.length === 0 ? (
            <div className="text-slate-500 text-center py-8">暂无日志</div>
          ) : (
            logs.map((log, i) => (
              <div key={i} className="text-slate-300 mb-1 hover:bg-slate-800 px-2 py-0.5 rounded">
                {log}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  )
}
