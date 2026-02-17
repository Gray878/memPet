import { useState, useCallback } from 'react'

// memU 服务 Hook
export const useMemU = () => {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // 记忆化
  const memorize = useCallback(async (data: any) => {
    setIsLoading(true)
    setError(null)
    try {
      const result = await window.electron.memorize(data)
      return result
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '记忆存储失败'
      setError(errorMessage)
      throw err
    } finally {
      setIsLoading(false)
    }
  }, [])

  // 检索
  const retrieve = useCallback(async (query: string) => {
    setIsLoading(true)
    setError(null)
    try {
      const result = await window.electron.retrieve(query)
      return result
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '记忆检索失败'
      setError(errorMessage)
      throw err
    } finally {
      setIsLoading(false)
    }
  }, [])

  // 获取分类
  const getCategories = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    try {
      const result = await window.electron.getCategories()
      return result
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '获取分类失败'
      setError(errorMessage)
      throw err
    } finally {
      setIsLoading(false)
    }
  }, [])

  return {
    memorize,
    retrieve,
    getCategories,
    isLoading,
    error,
  }
}
