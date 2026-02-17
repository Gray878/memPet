import { useState } from 'react'
import { X } from 'lucide-react'

interface SettingsWindowProps {
  onClose: () => void
}

type SettingsTab =
  | 'general'
  | 'ai'
  | 'personality'
  | 'behavior'
  | 'skills'
  | 'backend'
  | 'mcp'
  | 'data'
  | 'about'

/**
 * 设置窗口 - Layer 5 模态窗口
 * 特点: 固定尺寸,左侧导航+右侧内容
 */
export default function SettingsWindow({ onClose }: SettingsWindowProps) {
  const [activeTab, setActiveTab] = useState<SettingsTab>('general')

  const tabs: { id: SettingsTab; label: string }[] = [
    { id: 'general', label: '通用' },
    { id: 'ai', label: 'AI 模型' },
    { id: 'personality', label: '性格' },
    { id: 'behavior', label: '行为' },
    { id: 'skills', label: 'Skills' },
    { id: 'backend', label: '后台服务' },
    { id: 'mcp', label: 'MCP' },
    { id: 'data', label: '数据' },
    { id: 'about', label: '关于' },
  ]

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 animate-fade-in">
      <div className="w-[800px] h-[600px] bg-white rounded-card shadow-modal flex overflow-hidden">
        {/* 左侧导航 */}
        <div className="w-[180px] bg-background-secondary border-r border-border p-md">
          <div className="space-y-xs">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`
                  w-full text-left px-md py-sm rounded-button text-sm
                  transition-colors duration-micro
                  ${
                    activeTab === tab.id
                      ? 'bg-primary text-white'
                      : 'text-text hover:bg-white'
                  }
                `}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* 右侧内容 */}
        <div className="flex-1 flex flex-col">
          {/* 标题栏 */}
          <div className="flex items-center justify-between px-lg py-md border-b border-border">
            <h2 className="text-base font-medium text-text">memPet 设置</h2>
            <button
              onClick={onClose}
              className="p-1 hover:bg-background-secondary rounded transition-colors duration-micro"
            >
              <X size={18} className="text-text-secondary" />
            </button>
          </div>

          {/* 内容区域 */}
          <div className="flex-1 overflow-y-auto p-lg">
            {activeTab === 'general' && <GeneralSettings />}
            {activeTab === 'ai' && <AISettings />}
            {activeTab === 'personality' && <PersonalitySettings />}
            {activeTab === 'behavior' && <BehaviorSettings />}
            {activeTab === 'skills' && <SkillsSettings />}
            {activeTab === 'backend' && <BackendSettings />}
            {activeTab === 'mcp' && <MCPSettings />}
            {activeTab === 'data' && <DataSettings />}
            {activeTab === 'about' && <AboutSettings />}
          </div>

          {/* 底部按钮 */}
          <div className="border-t border-border px-lg py-md flex justify-end gap-sm">
            <button onClick={onClose} className="btn btn-secondary">
              取消
            </button>
            <button className="btn btn-primary">保存设置</button>
          </div>
        </div>
      </div>
    </div>
  )
}

/**
 * 通用设置
 */
function GeneralSettings() {
  return (
    <div className="space-y-xl">
      <div>
        <h3 className="text-sm font-medium text-text mb-md">通用设置</h3>
        
        <div className="space-y-lg">
          <div>
            <label className="block text-sm text-text-secondary mb-xs">宠物名称</label>
            <input type="text" defaultValue="小U" className="input" />
          </div>

          <div>
            <label className="block text-sm text-text-secondary mb-xs">语言</label>
            <select className="input">
              <option>简体中文</option>
              <option>English</option>
            </select>
          </div>

          <div className="space-y-sm">
            <label className="flex items-center gap-sm cursor-pointer">
              <input type="checkbox" className="w-4 h-4" />
              <span className="text-sm text-text">开机自启动</span>
            </label>
            <label className="flex items-center gap-sm cursor-pointer">
              <input type="checkbox" defaultChecked className="w-4 h-4" />
              <span className="text-sm text-text">窗口置顶</span>
            </label>
          </div>

          <div>
            <label className="block text-sm text-text-secondary mb-xs">透明度</label>
            <input type="range" min="50" max="100" defaultValue="90" className="w-full" />
            <div className="text-xs text-text-tertiary mt-xs">90%</div>
          </div>
        </div>
      </div>
    </div>
  )
}

/**
 * AI 模型设置
 */
function AISettings() {
  return (
    <div className="space-y-xl">
      <div>
        <h3 className="text-sm font-medium text-text mb-md">AI 模型配置</h3>
        
        <div className="space-y-lg">
          <div>
            <label className="block text-sm text-text-secondary mb-xs">
              LLM 提供商
            </label>
            <select className="input">
              <option>Claude (Anthropic)</option>
              <option>OpenAI</option>
              <option>MiniMax</option>
              <option>自定义 API</option>
            </select>
          </div>

          <div>
            <label className="block text-sm text-text-secondary mb-xs">API 密钥</label>
            <input type="password" placeholder="sk-ant-..." className="input" />
            <div className="flex gap-sm mt-sm">
              <button className="btn btn-secondary text-xs">显示</button>
              <button className="btn btn-secondary text-xs">测试连接</button>
            </div>
          </div>

          <div>
            <label className="block text-sm text-text-secondary mb-xs">模型名称</label>
            <input type="text" defaultValue="claude-sonnet-4-5" className="input" />
          </div>

          <div>
            <label className="block text-sm text-text-secondary mb-xs">
              温度 (Temperature)
            </label>
            <input type="range" min="0" max="100" defaultValue="70" className="w-full" />
            <div className="text-xs text-text-tertiary mt-xs">0.7</div>
          </div>

          <div>
            <label className="block text-sm text-text-secondary mb-xs">最大 Token 数</label>
            <input type="number" defaultValue="4096" className="input" />
          </div>
        </div>
      </div>
    </div>
  )
}

/**
 * 性格设置
 */
function PersonalitySettings() {
  const personalities = [
    { id: 'friendly', label: '友好型', description: '温和友善,总是关心你' },
    { id: 'energetic', label: '活力型', description: '充满活力和热情' },
    { id: 'professional', label: '专业型', description: '专业简洁,重视效率' },
    { id: 'tsundere', label: '傲娇型', description: '表面高冷,内心温柔' },
  ]

  return (
    <div className="space-y-xl">
      <div>
        <h3 className="text-sm font-medium text-text mb-md">性格配置</h3>
        
        <div className="space-y-lg">
          <div>
            <label className="block text-sm text-text-secondary mb-sm">选择预设性格</label>
            <div className="grid grid-cols-2 gap-sm">
              {personalities.map((p) => (
                <button
                  key={p.id}
                  className="card card-hover text-left"
                >
                  <div className="font-medium text-sm text-text mb-xs">{p.label}</div>
                  <div className="text-xs text-text-secondary">{p.description}</div>
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm text-text-secondary mb-xs">
              Emoji 使用频率
            </label>
            <input type="range" min="0" max="100" defaultValue="50" className="w-full" />
            <div className="text-xs text-text-tertiary mt-xs">50%</div>
          </div>

          <div>
            <label className="block text-sm text-text-secondary mb-xs">主动性级别</label>
            <input type="range" min="0" max="100" defaultValue="70" className="w-full" />
            <div className="text-xs text-text-tertiary mt-xs">70%</div>
          </div>

          <div>
            <label className="block text-sm text-text-secondary mb-xs">正式程度</label>
            <input type="range" min="0" max="100" defaultValue="30" className="w-full" />
            <div className="text-xs text-text-tertiary mt-xs">30%</div>
          </div>

          <div>
            <label className="block text-sm text-text-secondary mb-xs">
              自定义特质 (用逗号分隔)
            </label>
            <input type="text" placeholder="幽默, 耐心, 专业" className="input" />
          </div>
        </div>
      </div>
    </div>
  )
}

// 其他设置面板的占位组件
function BehaviorSettings() {
  return <div className="text-text-secondary">行为设置 - 开发中</div>
}

function SkillsSettings() {
  return <div className="text-text-secondary">Skills 管理 - 开发中</div>
}

function BackendSettings() {
  return <div className="text-text-secondary">后台服务配置 - 开发中</div>
}

function MCPSettings() {
  return <div className="text-text-secondary">MCP 配置 - 开发中</div>
}

function DataSettings() {
  return <div className="text-text-secondary">数据管理 - 开发中</div>
}

function AboutSettings() {
  return (
    <div className="text-center space-y-md">
      <h3 className="text-lg font-medium text-text">memPet</h3>
      <p className="text-sm text-text-secondary">版本 0.1.0</p>
      <p className="text-xs text-text-tertiary">智能桌面宠物应用</p>
    </div>
  )
}
