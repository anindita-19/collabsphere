import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { RiCloseLine, RiSendPlaneLine } from 'react-icons/ri'
import { chatAPI } from '@/services/apiServices'
import useAuthStore from '@/store/authStore'
import Avatar from '@/components/ui/Avatar'
import { formatRelative } from '@/utils/helpers'
import toast from 'react-hot-toast'

export default function WorkspaceChat({ workspaceId, onClose }) {
  const { user } = useAuthStore()
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const bottomRef = useRef(null)

  useEffect(() => {
    chatAPI.getMessages(workspaceId)
      .then((res) => setMessages(res.data))
      .finally(() => setLoading(false))
  }, [workspaceId])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const handleSend = async (e) => {
    e.preventDefault()
    if (!input.trim() || sending) return
    setSending(true)
    try {
      const res = await chatAPI.sendMessage(workspaceId, { content: input.trim() })
      setMessages((prev) => [...prev, res.data])
      setInput('')
    } catch {
      toast.error('Failed to send message')
    } finally {
      setSending(false)
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 20 }}
      className="fixed bottom-6 right-6 w-80 h-96 card-elevated flex flex-col z-40 overflow-hidden"
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-surface-200 dark:border-surface-700 bg-white dark:bg-surface-800">
        <h3 className="font-semibold text-sm text-surface-900 dark:text-surface-100">Team Chat</h3>
        <button onClick={onClose} className="text-surface-400 hover:text-surface-600 dark:hover:text-surface-300">
          <RiCloseLine size={18} />
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-3 space-y-3 bg-surface-50 dark:bg-surface-900">
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <div className="w-5 h-5 border-2 border-primary-500/30 border-t-primary-500 rounded-full animate-spin" />
          </div>
        ) : messages.length === 0 ? (
          <p className="text-center text-surface-400 text-xs py-8">No messages yet. Say hello! 👋</p>
        ) : (
          messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex gap-2 ${msg.user_id === user?.id ? 'flex-row-reverse' : ''}`}
            >
              <Avatar name={msg.author_name} color={msg.avatar_color} size="xs" />
              <div className={`max-w-[75%] ${msg.user_id === user?.id ? 'items-end' : 'items-start'} flex flex-col`}>
                <div
                  className={`px-3 py-2 rounded-xl text-xs leading-relaxed ${
                    msg.user_id === user?.id
                      ? 'bg-primary-600 text-white rounded-tr-sm'
                      : 'bg-white dark:bg-surface-800 text-surface-800 dark:text-surface-200 border border-surface-200 dark:border-surface-700 rounded-tl-sm'
                  }`}
                >
                  {msg.content}
                </div>
                <span className="text-[10px] text-surface-400 mt-0.5 px-1">{formatRelative(msg.created_at)}</span>
              </div>
            </div>
          ))
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <form onSubmit={handleSend} className="flex items-center gap-2 px-3 py-3 border-t border-surface-200 dark:border-surface-700 bg-white dark:bg-surface-800">
        <input
          className="flex-1 bg-surface-100 dark:bg-surface-700 rounded-lg px-3 py-2 text-xs text-surface-900 dark:text-surface-100 placeholder:text-surface-400 outline-none focus:ring-2 focus:ring-primary-500/30"
          placeholder="Type a message..."
          value={input}
          onChange={(e) => setInput(e.target.value)}
          maxLength={2000}
        />
        <button
          type="submit"
          disabled={!input.trim() || sending}
          className="p-2 rounded-lg bg-primary-600 hover:bg-primary-700 text-white disabled:opacity-50 transition-colors"
        >
          <RiSendPlaneLine size={14} />
        </button>
      </form>
    </motion.div>
  )
}
