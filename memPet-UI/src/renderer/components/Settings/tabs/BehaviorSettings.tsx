interface BehaviorSettingsProps {
  config: any
  setConfig: (config: any) => void
}

export default function BehaviorSettings({ config, setConfig }: BehaviorSettingsProps) {
  const updateBehavior = (key: string, value: any) => {
    setConfig({
      ...config,
      behavior: { ...config.behavior, [key]: value }
    })
  }

  return (
    <div className="space-y-6">
      <div className="settings-section">
        <label className="flex items-center gap-3 cursor-pointer group">
          <input
            type="checkbox"
            checked={config.behavior.proactiveEnabled}
            onChange={(e) => updateBehavior('proactiveEnabled', e.target.checked)}
            className="settings-checkbox"
          />
          <div>
            <div className="text-sm font-medium text-slate-800 group-hover:text-blue-600 transition-colors">
              启用主动推理
            </div>
            <div className="text-xs text-slate-500">
              宠物会主动分析你的工作状态并提供建议
            </div>
          </div>
        </label>
      </div>

      <div className="settings-section">
        <label className="settings-label">
          推理间隔 <span className="text-blue-600 font-medium">{config.behavior.proactiveInterval}秒</span>
        </label>
        <input
          type="range"
          min="60"
          max="600"
          step="30"
          value={config.behavior.proactiveInterval}
          onChange={(e) => updateBehavior('proactiveInterval', parseInt(e.target.value))}
          className="settings-slider"
          disabled={!config.behavior.proactiveEnabled}
        />
        <div className="flex justify-between text-xs text-slate-500 mt-1">
          <span>1分钟</span>
          <span>10分钟</span>
        </div>
      </div>

      <div className="settings-section">
        <label className="flex items-center gap-3 cursor-pointer group">
          <input
            type="checkbox"
            checked={config.behavior.notificationsEnabled}
            onChange={(e) => updateBehavior('notificationsEnabled', e.target.checked)}
            className="settings-checkbox"
          />
          <div>
            <div className="text-sm font-medium text-slate-800 group-hover:text-blue-600 transition-colors">
              启用通知
            </div>
            <div className="text-xs text-slate-500">
              接收系统通知和提醒
            </div>
          </div>
        </label>
      </div>

      <div className="settings-section">
        <label className="flex items-center gap-3 cursor-pointer group">
          <input
            type="checkbox"
            checked={config.behavior.quietHoursEnabled}
            onChange={(e) => updateBehavior('quietHoursEnabled', e.target.checked)}
            className="settings-checkbox"
          />
          <div>
            <div className="text-sm font-medium text-slate-800 group-hover:text-blue-600 transition-colors">
              免打扰时段
            </div>
            <div className="text-xs text-slate-500">
              在指定时间段内不发送通知
            </div>
          </div>
        </label>
      </div>

      {config.behavior.quietHoursEnabled && (
        <div className="ml-9 space-y-4 p-4 bg-slate-50 rounded-lg border border-slate-200">
          <div className="settings-section">
            <label className="settings-label">开始时间</label>
            <input
              type="time"
              value={config.behavior.quietHoursStart}
              onChange={(e) => updateBehavior('quietHoursStart', e.target.value)}
              className="settings-input"
            />
          </div>
          <div className="settings-section">
            <label className="settings-label">结束时间</label>
            <input
              type="time"
              value={config.behavior.quietHoursEnd}
              onChange={(e) => updateBehavior('quietHoursEnd', e.target.value)}
              className="settings-input"
            />
          </div>
        </div>
      )}
    </div>
  )
}
