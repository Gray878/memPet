import { useState, useCallback } from 'react'
import type { SystemContext, SystemObservation, Suggestion } from '../types/electron'

/**
 * memU 服务 Hook
 * 
 * 提供记忆存储、检索和主动推理功能
 */
export function useMemU() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // 存储对话记忆
  const memorizeConversation = useCallback(async (content: any[]) => {
    setLoading(true)
    setError(null)
    
    try {
      const result = await window.electronAPI.memory.memorizeConversation(content)
      
      if (!result.success) {
        throw new Error(result.error || '存储对话失败')
      }
      
      return result.data
    } catch (err: any) {
      setError(err.message)
      throw err
    } finally {
      setLoading(false)
    }
  }, [])

  // 存储系统观察
  const memorizeObservation = useCallback(async (observation: SystemObservation) => {
    setLoading(true)
    setError(null)
    
    try {
      const result = await window.electronAPI.memory.memorizeObservation(observation)
      
      if (!result.success) {
        throw new Error(result.error || '存储观察失败')
      }
      
      return result.data
    } catch (err: any) {
      setError(err.message)
      throw err
    } finally {
      setLoading(false)
    }
  }, [])

  // 检索对话上下文
  const retrieveConversation = useCallback(async (query: string, limit?: number) => {
    setLoading(true)
    setError(null)
    
    try {
      const result = await window.electronAPI.memory.retrieveConversation(query, limit)
      
      if (!result.success) {
        throw new Error(result.error || '检索对话失败')
      }
      
      return result.data
    } catch (err: any) {
      setError(err.message)
      throw err
    } finally {
      setLoading(false)
    }
  }, [])

  // 检索主动推理上下文
  const retrieveProactive = useCallback(async (context: SystemContext, limit?: number) => {
    setLoading(true)
    setError(null)
    
    try {
      const result = await window.electronAPI.memory.retrieveProactive(context, limit)
      
      if (!result.success) {
        throw new Error(result.error || '检索主动推理上下文失败')
      }
      
      return result.data
    } catch (err: any) {
      setError(err.message)
      throw err
    } finally {
      setLoading(false)
    }
  }, [])

  // 主动推理分析
  const proactiveAnalyze = useCallback(async (context: SystemContext) => {
    setLoading(true)
    setError(null)
    
    try {
      const result = await window.electronAPI.pet.proactiveAnalyze(context)
      
      if (!result.success) {
        throw new Error(result.error || '主动推理分析失败')
      }
      
      return result.data
    } catch (err: any) {
      setError(err.message)
      throw err
    } finally {
      setLoading(false)
    }
  }, [])

  // 生成主动推理消息
  const proactiveGenerate = useCallback(async (
    suggestion: Suggestion,
    context: SystemContext,
    personality: string = 'friendly',
    limit: number = 3
  ) => {
    setLoading(true)
    setError(null)
    
    try {
      const result = await window.electronAPI.pet.proactiveGenerate(
        suggestion,
        context,
        personality,
        limit
      )
      
      if (!result.success) {
        throw new Error(result.error || '生成主动推理消息失败')
      }
      
      return result.data
    } catch (err: any) {
      setError(err.message)
      throw err
    } finally {
      setLoading(false)
    }
  }, [])

  // 获取系统上下文
  const getSystemContext = useCallback(async () => {
    setLoading(true)
    setError(null)
    
    try {
      const result = await window.electronAPI.system.getContext()
      
      if (!result.success) {
        throw new Error(result.error || '获取系统上下文失败')
      }
      
      return result.data
    } catch (err: any) {
      setError(err.message)
      throw err
    } finally {
      setLoading(false)
    }
  }, [])

  // 检查服务状态
  const checkService = useCallback(async () => {
    try {
      const result = await window.electronAPI.pet.checkService()
      return result.success && result.data?.isReady
    } catch (err) {
      return false
    }
  }, [])

  return {
    loading,
    error,
    memorizeConversation,
    memorizeObservation,
    retrieveConversation,
    retrieveProactive,
    proactiveAnalyze,
    proactiveGenerate,
    getSystemContext,
    checkService,
  }
}


/**
 * 自动记忆 Hook
 * 
 * 提供自动记录对话、活动和搜索记忆的功能
 */
export function useAutoMemory() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // 自动记录对话
  const recordConversation = useCallback(async (userMessage: string, aiResponse: string) => {
    try {
      const result = await window.electronAPI.memory.autoRecordConversation(userMessage, aiResponse)
      
      if (!result.success) {
        throw new Error(result.error || '自动记录对话失败')
      }
      
      return true
    } catch (err: any) {
      console.error('自动记录对话失败:', err)
      setError(err.message)
      return false
    }
  }, [])

  // 自动记录活动
  const recordActivity = useCallback(async (activity: string, metadata?: any) => {
    try {
      const result = await window.electronAPI.memory.autoRecordActivity(activity, metadata)
      
      if (!result.success) {
        throw new Error(result.error || '自动记录活动失败')
      }
      
      return true
    } catch (err: any) {
      console.error('自动记录活动失败:', err)
      setError(err.message)
      return false
    }
  }, [])

  // 获取最近记忆
  const getRecentMemories = useCallback(async (limit: number = 10) => {
    setLoading(true)
    setError(null)
    
    try {
      const result = await window.electronAPI.memory.getRecent(limit)
      
      if (!result.success) {
        throw new Error(result.error || '获取最近记忆失败')
      }
      
      return result.data || []
    } catch (err: any) {
      setError(err.message)
      return []
    } finally {
      setLoading(false)
    }
  }, [])

  // 搜索记忆
  const searchMemories = useCallback(async (query: string, options?: { limit?: number; type?: string }) => {
    setLoading(true)
    setError(null)
    
    try {
      const result = await window.electronAPI.memory.search(query, options)
      
      if (!result.success) {
        throw new Error(result.error || '搜索记忆失败')
      }
      
      return result.data || []
    } catch (err: any) {
      setError(err.message)
      return []
    } finally {
      setLoading(false)
    }
  }, [])

  // 获取统计信息
  const getStats = useCallback(async () => {
    try {
      const result = await window.electronAPI.memory.getStats()
      
      if (!result.success) {
        throw new Error(result.error || '获取统计信息失败')
      }
      
      return result.data
    } catch (err: any) {
      console.error('获取统计信息失败:', err)
      return null
    }
  }, [])

  return {
    loading,
    error,
    recordConversation,
    recordActivity,
    getRecentMemories,
    searchMemories,
    getStats,
  }
}
