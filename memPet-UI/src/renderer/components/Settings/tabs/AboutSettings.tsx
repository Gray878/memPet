import { Heart, Github, Mail, Package } from 'lucide-react'

export default function AboutSettings() {
  return (
    <div className="flex flex-col items-center justify-center h-full space-y-6 py-8">
      <div className="w-20 h-20 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-2xl flex items-center justify-center shadow-2xl shadow-blue-500/30">
        <Package size={40} className="text-white" strokeWidth={1.5} />
      </div>

      <div className="text-center space-y-2">
        <h2 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-cyan-600 bg-clip-text text-transparent">
          memPet
        </h2>
        <p className="text-sm text-slate-600">版本 0.1.0</p>
        <p className="text-xs text-slate-500 max-w-md">
          智能桌面宠物应用 · 基于 memU 记忆系统
        </p>
      </div>

      <div className="flex gap-4 pt-4">
        <a
          href="https://github.com/yourusername/mempet"
          target="_blank"
          rel="noopener noreferrer"
          className="p-3 rounded-lg bg-slate-100 hover:bg-slate-200 transition-colors group"
        >
          <Github size={20} className="text-slate-700 group-hover:text-slate-900 transition-colors" />
        </a>
        <a
          href="mailto:support@mempet.com"
          className="p-3 rounded-lg bg-slate-100 hover:bg-slate-200 transition-colors group"
        >
          <Mail size={20} className="text-slate-700 group-hover:text-slate-900 transition-colors" />
        </a>
      </div>

      <div className="pt-8 text-center">
        <p className="text-xs text-slate-500 flex items-center gap-1 justify-center">
          Made with <Heart size={12} className="text-red-500 fill-red-500" /> by memPet Team
        </p>
      </div>

      <div className="pt-4 text-center space-y-1">
        <p className="text-xs text-slate-400">© 2026 memPet. All rights reserved.</p>
      </div>
    </div>
  )
}
