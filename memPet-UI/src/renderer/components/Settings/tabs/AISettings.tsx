import { useState } from 'react'
import { Check, X, Loader2 } from 'lucide-react'

interface AISettingsProps {
  config: any
  setConfig: (config: any) => void
}

export default function AISettings({ config, setConfig }: AISettingsProps) {
  const [testing, setTesting] = useState(false)
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null)
  const [showKey, setShowKey] = useState(false)

  const updateAI = (key: string, value: any) => {
    setConfig({
      ...config,
      ai: { ...config.ai, [key]: value }
    })
  }

  const handleTestAPI = async () => {
    setTesting(true)
    setTestResult(null)
    const result = await window.electronAPI.settings.testAPI(config.ai)
    setTestResult({
      success: result.success,
      message: result.success ? result.message! : result.error!
    })
    setTesting(false)
  }

  return (
    <div className="space-y-6">
      <div className="settings-section">
        <label className="settings-label">LLM 提供商</label>
        <select
          value={config.ai.provider}
          onChange={(e) => updateAI('provider', e.target.value)}
          className="settings-input"
        >
          <option value="openai">OpenAI</option>
          <option value="anthropic">Anthropic (Claude)</option>
          <option value="minimax">MiniMax</option>
          <option value="custom">自定义 API</option>
        </select>
      </div>

      <div className="settings-section">
        <label className="settings-label">API 密钥</label>
        <div className="flex gap-2">
          <input
            type={showKey ? 'text' : 'password'}
            value={config.ai.apiKey}
            onChange={(e) => updateAI('apiKey', e.target.value)}
            className="settings-input flex-1"
            placeholder="sk-..."
          />
          <button
            onClick={() => setShowKey(!showKey)}
            className="px-4 py-2 text-sm font-medium text-slate-700 hover:bg-white/80 rounded-lg transition-all border border-slate-200"
          >
            {showKey ? '隐藏' : '显示'}
          </button>
        </div>
      </div>

      <div className="settings-section">
        <label className="settings-label">API 地址</label>
        <input
          type="text"
          value={config.ai.baseURL}
          onChange={(e) => updateAI('baseURL', e.target.value)}
          className="settings-input"
          placeholder="https://api.openai.com/v1"
        />
      </div>

      <div className="settings-section">
        <label className="settings-label">模型名称</label>
        <input
          type="text"
          value={config.ai.model}
          onChange={(e) => updateAI('model', e.target.value)}
          className="settings-input"
          placeholder="gpt-4o-mini"
        />
      </div>

      <div className="settings-section">
        <label className="settings-label">
          温度 (Temperature) <span className="text-blue-600 font-medium">{config.ai.temperature}</span>
        </label>
        <input
          type="range"
          min="0"
          max="2"
          step="0.1"
          value={config.ai.temperature}
          onChange={(e) => updateAI('temperature', parseFloat(e.target.value))}
          className="settings-slider"
        />
        <div className="flex justify-between text-xs text-slate-500 mt-1">
          <span>保守</span>
          <span>创造性</span>
        </div>
      </div>

      <div className="settings-section">
        <label className="settings-label">最大 Token 数</label>
        <input
          type="number"
          value={config.ai.maxTokens}
          onChange={(e) => updateAI('maxTokens', parseInt(e.target.value))}
          className="settings-input"
          min="100"
          max="8000"
        />
      </div>

      <div className="settings-section">
        <button
          onClick={handleTestAPI}
          disabled={testing}
          className="px-4 py-2 text-sm font-medium text-white bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600 rounded-lg transition-all flex items-center gap-2 shadow-lg shadow-blue-500/30 disabled:opacity-50"
        >
          {testing ? (
            <>
              <Loader2 size={16} className="animate-spin" />
              测试中...
            </>
          ) : (
            '测试连接'
          )}
        </button>
        
        {testResult && (
          <div className={`mt-3 p-3 rounded-lg flex items-center gap-2 ${
            testResult.success ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
          }`}>
            {testResult.success ? <Check size={16} /> : <X size={16} />}
            <span className="text-sm">{testResult.message}</span>
          </div>
        )}
      </div>
    </div>
  )
}
