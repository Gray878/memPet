import { useState } from 'react'

function App() {
  const [message, setMessage] = useState('欢迎使用 memPet!')

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 flex items-center justify-center">
      <div className="text-center">
        <h1 className="text-4xl font-bold text-gray-800 mb-4">memPet</h1>
        <p className="text-lg text-gray-600 mb-8">{message}</p>
        <button
          onClick={() => setMessage('正在初始化...')}
          className="px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
        >
          开始使用
        </button>
      </div>
    </div>
  )
}

export default App
