import { Smile, Zap, Briefcase, Heart } from 'lucide-react'

interface PersonalitySettingsProps {
  config: any
  setConfig: (config: any) => void
}

export default function PersonalitySettings({ config, setConfig }: PersonalitySettingsProps) {
  const personalities = [
    { 
      id: 'friendly', 
      label: '友好型', 
      icon: Smile, 
      description: '温和友善,总是关心你',
      color: 'from-green-500 to-emerald-500'
    },
    { 
      id: 'energetic', 
      label: '活力型', 
      icon: Zap, 
      description: '充满活力和热情',
      color: 'from-orange-500 to-amber-500'
    },
    { 
      id: 'professional', 
      label: '专业型', 
      icon: Briefcase, 
      description: '专业简洁,重视效率',
      color: 'from-blue-500 to-cyan-500'
    },
    { 
      id: 'tsundere', 
      label: '傲娇型', 
      icon: Heart, 
      description: '表面高冷,内心温柔',
      color: 'from-pink-500 to-rose-500'
    },
  ]

  const updatePersonality = (key: string, value: any) => {
    setConfig({
      ...config,
      personality: { ...config.personality, [key]: value }
    })
  }

  return (
    <div className="space-y-6">
      <div className="settings-section">
        <label className="settings-label">选择预设性格</label>
        <div className="grid grid-cols-2 gap-3">
          {personalities.map((p) => {
            const Icon = p.icon
            const isActive = config.personality.type === p.id
            return (
              <button
                key={p.id}
                onClick={() => updatePersonality('type', p.id)}
                className={`p-4 rounded-xl text-left transition-all border-2 ${
                  isActive
                    ? 'border-blue-500 bg-blue-50 shadow-lg shadow-blue-500/20'
                    : 'border-slate-200 bg-white hover:border-blue-300 hover:shadow-md'
                }`}
              >
                <div className="flex items-center gap-3 mb-2">
                  <div className={`p-2 rounded-lg bg-gradient-to-br ${p.color} ${
                    isActive ? 'shadow-lg' : 'opacity-70'
                  }`}>
                    <Icon size={20} className="text-white" />
                  </div>
                  <span className="font-semibold text-slate-800">{p.label}</span>
                </div>
                <div className="text-xs text-slate-600">{p.description}</div>
              </button>
            )
          })}
        </div>
      </div>

      <div className="settings-section">
        <label className="settings-label">
          Emoji 使用频率 <span className="text-blue-600 font-medium">{config.personality.emojiFrequency}%</span>
        </label>
        <input
          type="range"
          min="0"
          max="100"
          value={config.personality.emojiFrequency}
          onChange={(e) => updatePersonality('emojiFrequency', parseInt(e.target.value))}
          className="settings-slider"
        />
      </div>

      <div className="settings-section">
        <label className="settings-label">
          主动性级别 <span className="text-blue-600 font-medium">{config.personality.proactiveness}%</span>
        </label>
        <input
          type="range"
          min="0"
          max="100"
          value={config.personality.proactiveness}
          onChange={(e) => updatePersonality('proactiveness', parseInt(e.target.value))}
          className="settings-slider"
        />
      </div>

      <div className="settings-section">
        <label className="settings-label">
          正式程度 <span className="text-blue-600 font-medium">{config.personality.formality}%</span>
        </label>
        <input
          type="range"
          min="0"
          max="100"
          value={config.personality.formality}
          onChange={(e) => updatePersonality('formality', parseInt(e.target.value))}
          className="settings-slider"
        />
      </div>
    </div>
  )
}
