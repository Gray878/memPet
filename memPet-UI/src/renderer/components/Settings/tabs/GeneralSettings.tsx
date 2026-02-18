interface GeneralSettingsProps {
  config: any
  setConfig: (config: any) => void
}

export default function GeneralSettings({ config, setConfig }: GeneralSettingsProps) {
  const updateGeneral = (key: string, value: any) => {
    setConfig({
      ...config,
      general: { ...config.general, [key]: value }
    })
  }

  return (
    <div className="space-y-6">
      <div className="settings-section">
        <label className="settings-label">宠物名称</label>
        <input
          type="text"
          value={config.general.petName}
          onChange={(e) => updateGeneral('petName', e.target.value)}
          className="settings-input"
          placeholder="给你的宠物起个名字"
        />
      </div>

      <div className="settings-section">
        <label className="settings-label">语言</label>
        <select
          value={config.general.language}
          onChange={(e) => updateGeneral('language', e.target.value)}
          className="settings-input"
        >
          <option value="zh-CN">简体中文</option>
          <option value="en-US">English</option>
        </select>
      </div>

      <div className="settings-section">
        <label className="flex items-center gap-3 cursor-pointer group">
          <input
            type="checkbox"
            checked={config.general.autoStart}
            onChange={(e) => updateGeneral('autoStart', e.target.checked)}
            className="settings-checkbox"
          />
          <div>
            <div className="text-sm font-medium text-slate-800 group-hover:text-blue-600 transition-colors">
              开机自启动
            </div>
            <div className="text-xs text-slate-500">
              系统启动时自动运行 memPet
            </div>
          </div>
        </label>
      </div>

      <div className="settings-section">
        <label className="flex items-center gap-3 cursor-pointer group">
          <input
            type="checkbox"
            checked={config.general.alwaysOnTop}
            onChange={(e) => updateGeneral('alwaysOnTop', e.target.checked)}
            className="settings-checkbox"
          />
          <div>
            <div className="text-sm font-medium text-slate-800 group-hover:text-blue-600 transition-colors">
              窗口置顶
            </div>
            <div className="text-xs text-slate-500">
              保持宠物窗口在最前面
            </div>
          </div>
        </label>
      </div>

      <div className="settings-section">
        <label className="settings-label">
          透明度 <span className="text-blue-600 font-medium">{config.general.opacity}%</span>
        </label>
        <input
          type="range"
          min="50"
          max="100"
          value={config.general.opacity}
          onChange={(e) => updateGeneral('opacity', parseInt(e.target.value))}
          className="settings-slider"
        />
        <div className="flex justify-between text-xs text-slate-500 mt-1">
          <span>半透明</span>
          <span>完全不透明</span>
        </div>
      </div>
    </div>
  )
}
