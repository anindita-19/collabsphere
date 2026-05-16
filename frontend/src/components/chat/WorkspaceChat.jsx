import { useState, useEffect, useRef } from 'react'
import { motion } from 'framer-motion'
import { RiCloseLine, RiSendPlaneLine, RiAttachmentLine, RiDownloadLine, RiFileTextLine, RiImageLine } from 'react-icons/ri'
import { chatAPI } from '@/services/apiServices'
import { useWebSocket } from '@/hooks/useWebSocket'
import useAuthStore from '@/store/authStore'
import Avatar from '@/components/ui/Avatar'
import { formatRelative } from '@/utils/helpers'
import toast from 'react-hot-toast'

const API_BASE = import.meta.env.VITE_API_BASE_URL?.replace('/api/v1', '') || ''

function FileAttachment({ file }) {
  const isImage = file.content_type?.startsWith('image/')
  const fileUrl = `${API_BASE}/uploads/${file.filename}`

  return (
    <a
      href={fileUrl}
      target="_blank"
      rel="noopener noreferrer"
      className="flex items-center gap-2 mt-1 px-2 py-1.5 rounded-lg bg-black/10 dark:bg-white/10 hover:bg-black/20 dark:hover:bg-white/20 transition-colors text-[10px] max-w-[180px]"
      title={file.original_name}
    >
      {isImage ? <RiImageLine size={12} /> : <RiFileTextLine size={12} />}
      <span className="truncate flex-1">{file.original_name}</span>
      <RiDownloadLine size={10} className="flex-shrink-0 opacity-70" />
    </a>
  )
}

export default function WorkspaceChat({ workspaceId, onClose }) {
  const { user } = useAuthStore()
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const bottomRef = useRef(null)
  const fileInputRef = useRef(null)

  // ── Initial load via REST ─────────────────────────────────────────────────
  useEffect(() => {
    chatAPI.getMessages(workspaceId)
      .then((res) => setMessages(res.data))
      .catch(() => toast.error('Failed to load messages'))
      .finally(() => setLoading(false))
  }, [workspaceId])

  // ── Real-time: append incoming chat_message events ────────────────────────
  useWebSocket(workspaceId, (msg) => {
    if (msg.type === 'chat_message' && msg.message) {
      setMessages((prev) => {
        if (prev.some((m) => m.id === msg.message.id)) return prev
        return [...prev, msg.message]
      })
    }
  })

  // ── Auto-scroll on new messages ───────────────────────────────────────────
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const handleSend = async (e) => {
    e.preventDefault()
    if (!input.trim() || sending) return
    setSending(true)
    try {
      const res = await chatAPI.sendMessage(workspaceId, { content: input.trim() })
      setMessages((prev) => {
        if (prev.some((m) => m.id === res.data.id)) return prev
        return [...prev, res.data]
      })
      setInput('')
    } catch {
      toast.error('Failed to send message')
    } finally {
      setSending(false)
    }
  }

  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Warn user about ephemeral storage
    toast('Files are stored temporarily and may be lost on server restart', {
      icon: '⚠️',
      duration: 4000,
    })

    setSending(true)
    try {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('content', `📎 Shared a file: ${file.name}`)

      const res = await chatAPI.sendMessage(workspaceId, {
        content: `📎 Shared a file: ${file.name}`,
      })
      setMessages((prev) => {
        if (prev.some((m) => m.id === res.data.id)) return prev
        return [...prev, res.data]
      })
      toast.success('File message sent')
    } catch {
      toast.error('Failed to share file')
    } finally {
      setSending(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
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
                  {/* Show file attachments if message has them */}
                  {msg.files?.map((f) => (
                    <FileAttachment key={f.id || f.filename} file={f} />
                  ))}
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
          ref={fileInputRef}
          type="file"
          className="hidden"
          onChange={handleFileUpload}
          accept="image/*,.pdf,.doc,.docx,.txt,.csv,.xlsx"
        />
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className="p-2 rounded-lg text-surface-400 hover:text-primary-600 hover:bg-surface-100 dark:hover:bg-surface-700 transition-colors flex-shrink-0"
          title="Attach file (stored temporarily)"
        >
          <RiAttachmentLine size={14} />
        </button>
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