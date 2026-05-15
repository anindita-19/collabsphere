import { useState, useEffect, useCallback } from 'react'
import toast from 'react-hot-toast'

// Generic async hook
export function useAsync(asyncFn, deps = [], immediate = true) {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(immediate)
  const [error, setError] = useState(null)

  const execute = useCallback(async (...args) => {
    setLoading(true)
    setError(null)
    try {
      const result = await asyncFn(...args)
      const responseData = result?.data !== undefined ? result.data : result
      setData(responseData)
      return responseData
    } catch (err) {
      const message = err?.response?.data?.detail || err?.message || 'Something went wrong'
      setError(message)
      throw err
    } finally {
      setLoading(false)
    }
  }, deps)

  useEffect(() => {
    if (immediate) execute()
  }, [execute])

  return { data, loading, error, execute, setData }
}

// Local state with optimistic updates
export function useOptimistic(initialValue) {
  const [value, setValue] = useState(initialValue)
  const [pending, setPending] = useState(false)

  const optimisticUpdate = useCallback(async (optimisticValue, asyncFn) => {
    const previous = value
    setValue(optimisticValue)
    setPending(true)
    try {
      const result = await asyncFn()
      return result
    } catch (err) {
      setValue(previous)
      throw err
    } finally {
      setPending(false)
    }
  }, [value])

  return [value, setValue, optimisticUpdate, pending]
}

// Debounce hook
export function useDebounce(value, delay = 300) {
  const [debouncedValue, setDebouncedValue] = useState(value)

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedValue(value), delay)
    return () => clearTimeout(timer)
  }, [value, delay])

  return debouncedValue
}

// Clipboard hook
export function useClipboard() {
  const copy = useCallback((text) => {
    navigator.clipboard.writeText(text).then(() => {
      toast.success('Copied to clipboard')
    })
  }, [])
  return copy
}

// Modal hook
export function useModal() {
  const [isOpen, setIsOpen] = useState(false)
  const [data, setData] = useState(null)

  const open = useCallback((d = null) => {
    setData(d)
    setIsOpen(true)
  }, [])

  const close = useCallback(() => {
    setIsOpen(false)
    setData(null)
  }, [])

  return { isOpen, data, open, close }
}

// Keyboard shortcut hook
export function useKeyboard(key, handler, deps = []) {
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === key && (e.metaKey || e.ctrlKey)) {
        e.preventDefault()
        handler(e)
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, deps)
}
