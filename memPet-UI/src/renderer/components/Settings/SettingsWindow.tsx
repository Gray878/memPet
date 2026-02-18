import { useState, useEffect } from 'react'
import { 
  X, Save, RotateCcw, Download, Upload,
  Settings, Cpu, Smile, Activity, Server, Database, Info
} from 'lucide-react'
import GeneralSettings from './tabs/GeneralSettings'
import AISettings from './tabs/AISettings'
import PersonalitySettings from './tabs/PersonalitySettings'
import BehaviorSettings from './tabs/BehaviorSettings'
import BackendSettings from './tabs/BackendSettings'
import DataSettings from './tabs/DataSettings'
import AboutSettings from './tabs/AboutSettings'

interface SettingsWindowProps {
  onClose: () => void
}

type SettingsTab = 'general' | 'ai' | 'personality' | 'behavior' | 'backend' | 'data' | 'about'

const TabIcon = ({ icon: Icon, active }: { icon: any; active: boolean }) => (
  <Icon size={18} className={active ? 'text-white' : 'text-slate-600'} />
)

export default function SettingsWindow({ onClose }: SettingsWindowProps) {
  const [activeTab, setActiveTab] = useState<SettingsTab>('general')
  const [config, setConfig] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  const tabs: { id: SettingsTab; label: string; icon: any }[] = [
    { id: 'general', label: '通用', icon: Settings },
    { id: 'ai', label: 'AI 模型', icon: Cpu },
    { id: 'personality', label: '性格', icon: Smile },
    { id: 'behavior', label: '行为', icon: Activity },
    { id: 'backend', label: '后台服务', icon: Server },
    { id: 'data', label: '数据', icon: Database },
    { id: 'about', label: '关于', icon: Info },
  ]

  useEffect(() => {
    loadConfig()
  }, [])

  const loadConfig = async () => {
    setLoading(true)
    const result = await window.electronAPI.settings.getConfig()
    if (result.success) {
      setConfig(result.data)
    }
    setLoading(false)
  }

  const handleSave = async () => {
    setSaving(true)
    const result = await window.electronAPI.settings.updateConfig(config)
    if (result.success) {
      alert('设置已保存')
    } else {
      alert(`保存失败: ${result.error}`)
    }
    setSaving(false)
  }

  const handleReset = async () => {
    if (!confirm('确定要重置所有设置吗?')) return
    const result = await window.electronAPI.settings.resetConfig()
    if (result.success) {
      await loadConfig()
      alert('设置已重置')
    }
  }

  const handleExport = async () => {
    const result = await window.electronAPI.settings.exportConfig()
    if (result.success) {
      alert(`配置已导出到: ${result.path}`)
    }
  }

  const handleImport = async () => {
    const result = await window.electronAPI.settings.importConfig()
    if (result.success) {
      await loadConfig()
      alert('配置已导入')
    }
  }

  if (loading) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30">
        <div className="text-white">加载中...</div>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm animate-fade-in">
      <div className="w-[900px] h-[650px] bg-gradient-to-br from-slate-50 to-blue-50/30 rounded-2xl shadow-2xl flex overflow-hidden border border-white/50">
        {/* 左侧导航 */}
        <div className="w-[200px] bg-white/60 backdrop-blur-md border-r border-slate-200/50 p-4">
          <div className="mb-6">
            <h2 className="text-lg font-semibold bg-gradient-to-r from-blue-600 to-cyan-600 bg-clip-text text-transparent">
              memPet 设置
            </h2>
          </div>
          
          <div className="space-y-1">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`
                  w-full text-left px-4 py-2.5 rounded-xl text-sm font-medium
                  transition-all duration-200 flex items-center gap-3
                  ${
                    activeTab === tab.id
                      ? 'bg-gradient-to-r from-blue-500 to-cyan-500 text-white shadow-lg shadow-blue-500/30'
                      : 'text-slate-700 hover:bg-white/80 hover:shadow-sm'
                  }
                `}
              >
                <TabIcon icon={tab.icon} active={activeTab === tab.id} />
                <span>{tab.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* 右侧内容 */}
        <div className="flex-1 flex flex-col">
          {/* 标题栏 */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200/50 bg-white/40 backdrop-blur-sm">
            <div className="flex items-center gap-3">
              {(() => {
                const currentTab = tabs.find(t => t.id === activeTab)
                const Icon = currentTab?.icon
                return Icon ? <Icon size={20} className="text-slate-700" /> : null
              })()}
              <h3 className="text-base font-semibold text-slate-800">
                {tabs.find(t => t.id === activeTab)?.label}
              </h3>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-slate-200/50 rounded-lg transition-colors"
            >
              <X size={18} className="text-slate-600" />
            </button>
          </div>

          {/* 内容区域 */}
          <div className="flex-1 overflow-y-auto p-6 settings-content">
            {config && (
              <>
                {activeTab === 'general' && <GeneralSettings config={config} setConfig={setConfig} />}
                {activeTab === 'ai' && <AISettings config={config} setConfig={setConfig} />}
                {activeTab === 'personality' && <PersonalitySettings config={config} setConfig={setConfig} />}
                {activeTab === 'behavior' && <BehaviorSettings config={config} setConfig={setConfig} />}
                {activeTab === 'backend' && <BackendSettings />}
                {activeTab === 'data' && <DataSettings config={config} setConfig={setConfig} />}
                {activeTab === 'about' && <AboutSettings />}
              </>
            )}
          </div>

          {/* 底部按钮 */}
          <div className="border-t border-slate-200/50 px-6 py-4 flex justify-between bg-white/40 backdrop-blur-sm">
            <div className="flex gap-2">
              <button
                onClick={handleExport}
                className="px-4 py-2 text-sm font-medium text-slate-700 hover:bg-white/80 rounded-lg transition-all flex items-center gap-2 border border-slate-200"
              >
                <Download size={16} />
                导出
              </button>
              <button
                onClick={handleImport}
                className="px-4 py-2 text-sm font-medium text-slate-700 hover:bg-white/80 rounded-lg transition-all flex items-center gap-2 border border-slate-200"
              >
                <Upload size={16} />
                导入
              </button>
              <button
                onClick={handleReset}
                className="px-4 py-2 text-sm font-medium text-orange-600 hover:bg-orange-50 rounded-lg transition-all flex items-center gap-2 border border-orange-200"
              >
                <RotateCcw size={16} />
                重置
              </button>
            </div>
            <div className="flex gap-2">
              <button
                onClick={onClose}
                className="px-4 py-2 text-sm font-medium text-slate-700 hover:bg-white/80 rounded-lg transition-all border border-slate-200"
              >
                取消
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="px-4 py-2 text-sm font-medium text-white bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600 rounded-lg transition-all flex items-center gap-2 shadow-lg shadow-blue-500/30 disabled:opacity-50"
              >
                <Save size={16} />
                {saving ? '保存中...' : '保存设置'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
