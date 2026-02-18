import { FolderOpen } from 'lucide-react'

interface DataSettingsProps {
  config: any
  setConfig: (config: any) => void
}

export default function DataSettings({ config, setConfig }: DataSettingsProps) {
  const updateData = (key: string, value: any) => {
    setConfig({
      ...config,
      data: { ...config.data, [key]: value }
    })
  }

  const handleSelectFolder = async () => {
    const result = await window.electronAPI.settings.selectFolder('选择存储目录')
    if (result.success && result.path) {
      updateData('storagePath', result.path)
    }
  }

  return (
    <div className="space-y-6">
      <div className="settings-section">
        <label className="settings-label">存储路径</label>
        <div className="flex gap-2">
          <input
            type="text"
            value={config.data.storagePath}
            readOnly
            className="settings-input flex-1 bg-slate-50"
          />
          <button
            onClick={handleSelectFolder}
            className="px-4 py-2 text-sm font-medium text-slate-700 hover:bg-white/80 rounded-lg transition-all border border-slate-200 flex items-center gap-2"
          >
            <FolderOpen size={16} />
            选择
          </button>
        </div>
      </div>

      <div className="settings-section">
        <label className="flex items-center gap-3 cursor-pointer group">
          <input
            type="checkbox"
            checked={config.data.autoBackup}
            onChange={(e) => updateData('autoBackup', e.target.checked)}
            className="settings-checkbox"
          />
          <div>
            <div className="text-sm font-medium text-slate-800 group-hover:text-blue-600 transition-colors">
              自动备份
            </div>
            <div className="text-xs text-slate-500">
              定期自动备份数据
            </div>
          </div>
        </label>
      </div>

      {config.data.autoBackup && (
        <div className="ml-9 space-y-4 p-4 bg-slate-50 rounded-lg border border-slate-200">
          <div className="settings-section">
            <label className="settings-label">
              备份间隔 <span className="text-blue-600 font-medium">{Math.floor(config.data.backupInterval / 3600)}小时</span>
            </label>
            <input
              type="range"
              min="3600"
              max="604800"
              step="3600"
              value={config.data.backupInterval}
              onChange={(e) => updateData('backupInterval', parseInt(e.target.value))}
              className="settings-slider"
            />
            <div className="flex justify-between text-xs text-slate-500 mt-1">
              <span>1小时</span>
              <span>7天</span>
            </div>
          </div>

          <div className="settings-section">
            <label className="settings-label">保留备份数</label>
            <input
              type="number"
              value={config.data.maxBackups}
              onChange={(e) => updateData('maxBackups', parseInt(e.target.value))}
              className="settings-input"
              min="1"
              max="30"
            />
          </div>
        </div>
      )}
    </div>
  )
}
