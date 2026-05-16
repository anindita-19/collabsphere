import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import toast from 'react-hot-toast'
import ReactMarkdown from 'react-markdown'
import {
  RiAddLine, RiFileTextLine, RiEditLine, RiDeleteBinLine,
  RiEyeLine, RiSaveLine, RiTimeLine, RiArrowLeftLine,
} from 'react-icons/ri'
import { documentsAPI } from '@/services/apiServices'
import useAuthStore from '@/store/authStore'
import EmptyState from '@/components/ui/EmptyState'
import { formatRelative } from '@/utils/helpers'

const STARTER_TEMPLATE = `# Document Title

## Overview
Write your project documentation here using **Markdown**.

## Features
- Feature one
- Feature two
- Feature three

## Getting Started
\`\`\`bash
npm install
npm run dev
\`\`\`

## Notes
> Add important notes here

---
*Last updated by the team*
`

export default function DocumentsPage() {
  const { workspaceId, projectId } = useParams()
  const navigate = useNavigate()
  const { user } = useAuthStore()
  const [documents, setDocuments] = useState([])
  const [selectedDoc, setSelectedDoc] = useState(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [editContent, setEditContent] = useState('')
  const [editTitle, setEditTitle] = useState('')
  const [creating, setCreating] = useState(false)

  useEffect(() => {
    documentsAPI.getAll(projectId)
      .then((r) => {
        setDocuments(r.data)
        if (r.data.length > 0) selectDoc(r.data[0])
      })
      .finally(() => setLoading(false))
  }, [projectId])

  const selectDoc = (doc) => {
    setSelectedDoc(doc)
    setEditContent(doc.content || '')
    setEditTitle(doc.title)
    setIsEditing(false)
  }

  const handleCreate = async () => {
    setCreating(true)
    try {
      const res = await documentsAPI.create(projectId, {
        title: 'Untitled Document',
        content: STARTER_TEMPLATE,
      })
      setDocuments((prev) => [res.data, ...prev])
      selectDoc(res.data)
      setIsEditing(true)
      toast.success('Document created')
    } catch {
      toast.error('Failed to create document')
    } finally {
      setCreating(false)
    }
  }

  const handleSave = async () => {
    if (!selectedDoc) return
    setSaving(true)
    try {
      const res = await documentsAPI.update(projectId, selectedDoc.id, {
        title: editTitle,
        content: editContent,
      })
      setSelectedDoc(res.data)
      setDocuments((prev) => prev.map((d) => d.id === res.data.id ? res.data : d))
      setIsEditing(false)
      toast.success('Document saved')
    } catch {
      toast.error('Failed to save document')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (doc) => {
    if (!confirm(`Delete "${doc.title}"?`)) return
    try {
      await documentsAPI.delete(projectId, doc.id)
      setDocuments((prev) => prev.filter((d) => d.id !== doc.id))
      if (selectedDoc?.id === doc.id) {
        const remaining = documents.filter((d) => d.id !== doc.id)
        if (remaining.length > 0) selectDoc(remaining[0])
        else setSelectedDoc(null)
      }
      toast.success('Document deleted')
    } catch {
      toast.error('Failed to delete document')
    }
  }

  return (
    <div className="max-w-7xl mx-auto flex flex-col gap-3 h-[calc(100vh-130px)] animate-fade-in">

      {/* ── Back link ───────────────────────────────────────────────────────── */}
      <button
        onClick={() => navigate(`/workspace/${workspaceId}/project/${projectId}`)}
        className="flex items-center gap-1.5 text-sm text-surface-500 hover:text-primary-600 dark:hover:text-primary-400 transition-colors w-fit"
      >
        <RiArrowLeftLine size={15} />
        Back to Project
      </button>

      {/* ── Main layout ─────────────────────────────────────────────────────── */}
      <div className="flex gap-5 flex-1 overflow-hidden">
        {/* Sidebar */}
        <div className="w-60 flex-shrink-0 flex flex-col gap-3">
          <button
            onClick={handleCreate}
            disabled={creating}
            className="btn-primary w-full justify-center"
          >
            <RiAddLine size={16} />
            New Document
          </button>

          <div className="flex-1 overflow-y-auto space-y-1">
            {loading ? (
              <div className="space-y-2">
                {[1,2,3].map(i => (
                  <div key={i} className="h-12 rounded-lg bg-surface-200 dark:bg-surface-700 animate-pulse" />
                ))}
              </div>
            ) : documents.length === 0 ? (
              <p className="text-xs text-surface-400 text-center py-4">No documents yet</p>
            ) : (
              documents.map((doc) => (
                <button
                  key={doc.id}
                  onClick={() => selectDoc(doc)}
                  className={`w-full text-left px-3 py-2.5 rounded-xl transition-all group relative ${
                    selectedDoc?.id === doc.id
                      ? 'bg-primary-50 dark:bg-primary-950 border border-primary-200/50 dark:border-primary-800/50'
                      : 'hover:bg-surface-100 dark:hover:bg-surface-800'
                  }`}
                >
                  <div className="flex items-start gap-2">
                    <RiFileTextLine
                      size={14}
                      className={`mt-0.5 flex-shrink-0 ${selectedDoc?.id === doc.id ? 'text-primary-600 dark:text-primary-400' : 'text-surface-400'}`}
                    />
                    <div className="flex-1 min-w-0">
                      <p className={`text-xs font-medium truncate ${selectedDoc?.id === doc.id ? 'text-primary-700 dark:text-primary-300' : 'text-surface-700 dark:text-surface-300'}`}>
                        {doc.title}
                      </p>
                      <p className="text-[10px] text-surface-400 mt-0.5">{formatRelative(doc.updated_at)}</p>
                    </div>
                  </div>
                  {doc.created_by === user?.id && (
                    <button
                      onClick={(e) => { e.stopPropagation(); handleDelete(doc) }}
                      className="absolute right-2 top-2 p-0.5 rounded text-surface-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all"
                    >
                      <RiDeleteBinLine size={12} />
                    </button>
                  )}
                </button>
              ))
            )}
          </div>
        </div>

        {/* Editor/Viewer */}
        <div className="flex-1 card flex flex-col overflow-hidden">
          {!selectedDoc ? (
            <EmptyState
              icon="📄"
              title="No document selected"
              description="Create a new document or select one from the list"
              action={
                <button onClick={handleCreate} className="btn-primary">
                  <RiAddLine size={16} /> Create Document
                </button>
              }
            />
          ) : (
            <>
              <div className="flex items-center justify-between px-6 py-4 border-b border-surface-200 dark:border-surface-700">
                {isEditing ? (
                  <input
                    className="flex-1 font-display font-semibold text-xl text-surface-900 dark:text-surface-100 bg-transparent outline-none border-b-2 border-primary-400 mr-4 pb-0.5"
                    value={editTitle}
                    onChange={(e) => setEditTitle(e.target.value)}
                    placeholder="Document title..."
                  />
                ) : (
                  <h2 className="font-display font-semibold text-xl text-surface-900 dark:text-surface-100">
                    {selectedDoc.title}
                  </h2>
                )}
                <div className="flex items-center gap-2">
                  <span className="text-xs text-surface-400 flex items-center gap-1">
                    <RiTimeLine size={12} />
                    {selectedDoc.last_editor_name
                      ? `Edited by ${selectedDoc.last_editor_name} ${formatRelative(selectedDoc.updated_at)}`
                      : `By ${selectedDoc.author_name}`}
                  </span>
                  {isEditing ? (
                    <>
                      <button onClick={() => setIsEditing(false)} className="btn-secondary">
                        <RiEyeLine size={15} />
                        Preview
                      </button>
                      <button onClick={handleSave} disabled={saving} className="btn-primary">
                        <RiSaveLine size={15} />
                        {saving ? 'Saving...' : 'Save'}
                      </button>
                    </>
                  ) : (
                    <button onClick={() => setIsEditing(true)} className="btn-secondary">
                      <RiEditLine size={15} />
                      Edit
                    </button>
                  )}
                </div>
              </div>

              <div className="flex-1 overflow-hidden">
                {isEditing ? (
                  <div className="h-full flex gap-0">
                    <div className="flex-1 flex flex-col border-r border-surface-200 dark:border-surface-700">
                      <div className="px-4 py-2 bg-surface-50 dark:bg-surface-900 border-b border-surface-200 dark:border-surface-700">
                        <span className="text-xs font-medium text-surface-400">Markdown</span>
                      </div>
                      <textarea
                        className="flex-1 p-6 bg-transparent text-sm text-surface-900 dark:text-surface-100 font-mono resize-none outline-none leading-relaxed"
                        value={editContent}
                        onChange={(e) => setEditContent(e.target.value)}
                        placeholder="Write markdown here..."
                        spellCheck={false}
                      />
                    </div>
                    <div className="flex-1 flex flex-col overflow-hidden">
                      <div className="px-4 py-2 bg-surface-50 dark:bg-surface-900 border-b border-surface-200 dark:border-surface-700">
                        <span className="text-xs font-medium text-surface-400">Preview</span>
                      </div>
                      <div className="flex-1 overflow-y-auto p-6">
                        <MarkdownRenderer content={editContent} />
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="h-full overflow-y-auto p-8">
                    <MarkdownRenderer content={selectedDoc.content} />
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

function MarkdownRenderer({ content }) {
  if (!content) return <p className="text-surface-400 text-sm italic">Empty document</p>

  return (
    <div className="prose prose-sm dark:prose-invert max-w-none
      prose-headings:font-display prose-headings:font-semibold
      prose-h1:text-2xl prose-h1:text-surface-900 dark:prose-h1:text-surface-100
      prose-h2:text-xl prose-h2:text-surface-800 dark:prose-h2:text-surface-200
      prose-h3:text-lg prose-h3:text-surface-700 dark:prose-h3:text-surface-300
      prose-p:text-surface-700 dark:prose-p:text-surface-300 prose-p:leading-relaxed
      prose-a:text-primary-600 dark:prose-a:text-primary-400 prose-a:no-underline hover:prose-a:underline
      prose-strong:text-surface-900 dark:prose-strong:text-surface-100
      prose-code:text-primary-600 dark:prose-code:text-primary-400 prose-code:bg-primary-50 dark:prose-code:bg-primary-950 prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded prose-code:text-xs
      prose-pre:bg-surface-900 dark:prose-pre:bg-surface-950 prose-pre:border prose-pre:border-surface-700 prose-pre:rounded-xl
      prose-blockquote:border-l-primary-400 prose-blockquote:text-surface-500
      prose-li:text-surface-700 dark:prose-li:text-surface-300
      prose-hr:border-surface-200 dark:prose-hr:border-surface-700"
    >
      <ReactMarkdown>{content}</ReactMarkdown>
    </div>
  )
}