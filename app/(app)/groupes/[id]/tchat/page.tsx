'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useSession } from 'next-auth/react'
import Link from 'next/link'

// ─── Types ────────────────────────────────────────────────────────────────────

interface MsgUser { id: number; name: string; avatarUrl: string | null }
interface Message {
  id: number
  content: string
  createdAt: string
  editedAt: string | null
  userId: number
  user: MsgUser
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
}

function formatDayLabel(iso: string) {
  const d = new Date(iso)
  const today = new Date()
  const yesterday = new Date(today); yesterday.setDate(today.getDate() - 1)
  if (d.toDateString() === today.toDateString()) return 'Aujourd\'hui'
  if (d.toDateString() === yesterday.toDateString()) return 'Hier'
  return d.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })
}

function sameDay(a: string, b: string) {
  return new Date(a).toDateString() === new Date(b).toDateString()
}

function fmtBytes(b: number): string {
  if (b < 1024) return `${b} o`
  if (b < 1024 * 1024) return `${(b / 1024).toFixed(0)} Ko`
  if (b < 1024 * 1024 * 1024) return `${(b / 1024 / 1024).toFixed(1)} Mo`
  return `${(b / 1024 / 1024 / 1024).toFixed(2)} Go`
}

// Palette d'emojis fréquents pour le tchat
const EMOJIS = [
  '😀','😁','😂','🤣','😊','😍','😎','🤩','😉','😜','🤔','🙄','😬','😢','😭','😤','😡','🥳','😴','🤗',
  '👍','👎','👏','🙌','🙏','💪','🤝','✌️','🤘','👌','👋','🔥','✨','⭐','🎉','🎊','❤️','🧡','💚','💙',
  '🎵','🎶','🎸','🎹','🥁','🎤','🎺','🎷','🎻','🎼','🎧','🔊','📅','✅','❌','⚠️','💡','👀','🚀','💯',
]

// Transforme les URLs en liens cliquables (échappe le HTML au passage)
function renderContent(text: string): React.ReactNode {
  const parts = text.split(/(https?:\/\/[^\s]+)/g)
  return parts.map((part, i) =>
    /^https?:\/\//.test(part)
      ? <a key={i} href={part} target="_blank" rel="noreferrer" className="underline break-all hover:opacity-80">{part}</a>
      : <span key={i}>{part}</span>
  )
}

function Avatar({ user, size = 8 }: { user: MsgUser; size?: number }) {
  const s = `w-${size} h-${size}`
  if (user.avatarUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img src={user.avatarUrl.split('?')[0]} alt={user.name}
        className={`${s} rounded-full object-cover flex-shrink-0 bg-gray-100`} />
    )
  }
  return (
    <div className={`${s} rounded-full bg-indigo-100 flex items-center justify-center flex-shrink-0 text-indigo-700 font-bold text-xs`}>
      {user.name.charAt(0).toUpperCase()}
    </div>
  )
}

const STORAGE_KEY = (gid: string) => `tchat_last_read_${gid}`
const POLL_INTERVAL = 3000

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function TchatPage({ params }: { params: { id: string } }) {
  const { data: session } = useSession()
  const groupId = params.id

  const [groupName, setGroupName] = useState('')
  const [isChef, setIsChef]       = useState(false)
  const [messages, setMessages]   = useState<Message[]>([])
  const [loading, setLoading]     = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [hasMore, setHasMore]     = useState(true)

  const [input, setInput]         = useState('')
  const [sending, setSending]     = useState(false)
  const [emojiOpen, setEmojiOpen] = useState(false)

  const [editId, setEditId]       = useState<number | null>(null)
  const [editContent, setEditContent] = useState('')

  const [deleteId, setDeleteId]   = useState<number | null>(null)

  // Stockage (informatif) — les messages texte ne consomment PAS ce quota
  const [storage, setStorage] = useState<{ used: number; limit: number } | null>(null)

  const bottomRef  = useRef<HTMLDivElement>(null)
  const inputRef   = useRef<HTMLTextAreaElement>(null)
  const messagesRef = useRef<HTMLDivElement>(null)
  const lastIdRef  = useRef<number>(0)
  const pollerRef  = useRef<NodeJS.Timeout | null>(null)
  const isAtBottomRef = useRef(true)

  const userId  = Number(session?.user?.id)
  const isAdmin = session?.user?.siteRole === 'ADMIN'

  // ── Scroll helpers ──────────────────────────────────────────────────────────

  const scrollToBottom = (smooth = false) => {
    bottomRef.current?.scrollIntoView({ behavior: smooth ? 'smooth' : 'instant' })
  }

  const onScroll = () => {
    const el = messagesRef.current
    if (!el) return
    isAtBottomRef.current = el.scrollHeight - el.scrollTop - el.clientHeight < 80
  }

  // ── Load messages ───────────────────────────────────────────────────────────

  const loadInitial = useCallback(async () => {
    const [msgRes, grpRes] = await Promise.all([
      fetch(`/api/groupes/${groupId}/messages?limit=50`),
      fetch(`/api/groupes/${groupId}`),
    ])
    if (msgRes.ok) {
      const data: Message[] = await msgRes.json()
      setMessages(data)
      setHasMore(data.length === 50)
      if (data.length) lastIdRef.current = data[data.length - 1].id
      // Marquer comme lu
      localStorage.setItem(STORAGE_KEY(groupId), String(Date.now()))
    }
    if (grpRes.ok) {
      const g = await grpRes.json()
      setGroupName(g.name ?? '')
      const me = g.members?.find((m: any) => m.userId === userId)
      setIsChef(isAdmin || me?.groupRole === 'CHEF')
      if (typeof g.storageLimitBytes === 'number' && g.storageLimitBytes > 0) {
        setStorage({ used: g.storageUsedTotalBytes ?? 0, limit: g.storageLimitBytes })
      }
    }
    setLoading(false)
    setTimeout(() => scrollToBottom(), 50)
  }, [groupId, userId, isAdmin])

  // Polling — uniquement les nouveaux messages (after=lastId)
  const poll = useCallback(async () => {
    if (!lastIdRef.current) return
    const res = await fetch(`/api/groupes/${groupId}/messages?after=${lastIdRef.current}`)
    if (!res.ok) return
    const data: Message[] = await res.json()
    if (!data.length) return
    lastIdRef.current = data[data.length - 1].id
    setMessages(prev => {
      const existingIds = new Set(prev.map(m => m.id))
      const news = data.filter(m => !existingIds.has(m.id))
      return news.length ? [...prev, ...news] : prev
    })
    // Marquer comme lu + scroll si on était en bas
    localStorage.setItem(STORAGE_KEY(groupId), String(Date.now()))
    if (isAtBottomRef.current) setTimeout(() => scrollToBottom(true), 30)
  }, [groupId])

  // Charger plus (pagination vers le haut)
  const loadMore = async () => {
    if (!messages.length || loadingMore) return
    setLoadingMore(true)
    const oldestId = messages[0].id
    const el = messagesRef.current
    const prevScrollHeight = el?.scrollHeight ?? 0
    const res = await fetch(`/api/groupes/${groupId}/messages?before=${oldestId}&limit=50`)
    if (res.ok) {
      const data: Message[] = await res.json()
      setHasMore(data.length === 50)
      setMessages(prev => [...data, ...prev])
      // Maintenir la position de scroll
      requestAnimationFrame(() => {
        if (el) el.scrollTop = el.scrollHeight - prevScrollHeight
      })
    }
    setLoadingMore(false)
  }

  // ── Lifecycle ───────────────────────────────────────────────────────────────

  useEffect(() => {
    if (!session) return
    loadInitial()
  }, [session, loadInitial])

  useEffect(() => {
    if (loading) return
    const startPoll = () => {
      pollerRef.current = setInterval(() => {
        if (!document.hidden) poll()
      }, POLL_INTERVAL)
    }
    startPoll()
    const onVisibility = () => {
      if (!document.hidden) poll() // refresh immédiat au retour sur l'onglet
    }
    document.addEventListener('visibilitychange', onVisibility)
    return () => {
      if (pollerRef.current) clearInterval(pollerRef.current)
      document.removeEventListener('visibilitychange', onVisibility)
    }
  }, [loading, poll])

  // ── Send ────────────────────────────────────────────────────────────────────

  const handleSend = async () => {
    const text = input.trim()
    if (!text || sending) return
    setSending(true)
    setInput('')
    const res = await fetch(`/api/groupes/${groupId}/messages`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content: text }),
    })
    if (res.ok) {
      const msg: Message = await res.json()
      setMessages(prev => [...prev, msg])
      lastIdRef.current = msg.id
      localStorage.setItem(STORAGE_KEY(groupId), String(Date.now()))
      setTimeout(() => scrollToBottom(true), 30)
    }
    setSending(false)
    inputRef.current?.focus()
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  const insertEmoji = (emoji: string) => {
    setInput(prev => (prev + emoji).slice(0, 2000))
    inputRef.current?.focus()
  }

  // ── Edit ────────────────────────────────────────────────────────────────────

  const startEdit = (msg: Message) => {
    setEditId(msg.id)
    setEditContent(msg.content)
  }

  const saveEdit = async () => {
    if (!editId) return
    const text = editContent.trim()
    if (!text) return
    const res = await fetch(`/api/groupes/${groupId}/messages/${editId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content: text }),
    })
    if (res.ok) {
      const updated: Message = await res.json()
      setMessages(prev => prev.map(m => m.id === editId ? updated : m))
    }
    setEditId(null)
    setEditContent('')
  }

  // ── Delete ──────────────────────────────────────────────────────────────────

  const confirmDelete = async () => {
    if (!deleteId) return
    const res = await fetch(`/api/groupes/${groupId}/messages/${deleteId}`, { method: 'DELETE' })
    if (res.ok) setMessages(prev => prev.filter(m => m.id !== deleteId))
    setDeleteId(null)
  }

  // ── Render ──────────────────────────────────────────────────────────────────

  if (loading) return <div className="text-gray-500">Chargement…</div>

  return (
    <div className="flex flex-col h-[calc(100vh-120px)] min-h-[500px]">

      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-gray-500 mb-3 flex-shrink-0">
        <Link href="/groupes" className="hover:text-indigo-600">Mes groupes</Link>
        <span>/</span>
        <Link href={`/groupes/${groupId}`} className="hover:text-indigo-600">{groupName}</Link>
        <span>/</span>
        <span className="text-gray-900">Tchat</span>
      </div>

      {/* Header */}
      <div className="flex items-center gap-3 mb-3 flex-shrink-0 flex-wrap">
        <h1 className="text-xl font-bold text-gray-900">💬 Tchat du groupe</h1>
        <span className="text-xs text-gray-400">Messages privés — visibles uniquement par les membres</span>
      </div>

      {/* Barre de quota de stockage (informatif) */}
      {storage && (() => {
        const pct = Math.min(100, (storage.used / storage.limit) * 100)
        return (
          <div className="mb-3 flex-shrink-0 rounded-xl border border-gray-200 bg-gray-50 px-3 py-2">
            <div className="flex items-center justify-between text-[11px] text-gray-500 mb-1">
              <span>💾 Stockage du groupe (fichiers) — {fmtBytes(storage.used)} / {fmtBytes(storage.limit)}</span>
              <span>{pct.toFixed(0)} %</span>
            </div>
            <div className="h-1.5 bg-gray-200 rounded-full overflow-hidden">
              <div className={`h-full rounded-full transition-all ${pct > 90 ? 'bg-red-500' : pct > 70 ? 'bg-amber-400' : 'bg-indigo-500'}`} style={{ width: `${pct}%` }} />
            </div>
            <p className="text-[10px] text-gray-400 mt-1">
              ℹ️ Les messages du tchat sont du texte et ne consomment pas ce quota — il ne concerne que les fichiers du répertoire.
            </p>
          </div>
        )
      })()}

      {/* Messages area */}
      <div
        ref={messagesRef}
        onScroll={onScroll}
        className="flex-1 overflow-y-auto rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 space-y-1"
      >
        {/* Charger plus */}
        {hasMore && (
          <div className="text-center py-2">
            <button
              onClick={loadMore}
              disabled={loadingMore}
              className="text-xs text-indigo-600 hover:text-indigo-500 font-medium disabled:opacity-50"
            >
              {loadingMore ? 'Chargement…' : '↑ Charger les messages précédents'}
            </button>
          </div>
        )}

        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-center py-16">
            <span className="text-5xl mb-3">💬</span>
            <p className="text-gray-500 text-sm font-medium">Aucun message pour l&apos;instant.</p>
            <p className="text-gray-400 text-xs mt-1">Soyez le premier à écrire !</p>
          </div>
        )}

        {messages.map((msg, i) => {
          const prev  = i > 0 ? messages[i - 1] : null
          const next  = i < messages.length - 1 ? messages[i + 1] : null
          const isOwn = msg.userId === userId

          // Séparateur de date
          const showDate = !prev || !sameDay(prev.createdAt, msg.createdAt)

          // Regrouper les messages consécutifs du même auteur (< 5 min)
          const isContinuation = !!prev && prev.userId === msg.userId &&
            new Date(msg.createdAt).getTime() - new Date(prev.createdAt).getTime() < 5 * 60 * 1000 &&
            sameDay(prev.createdAt, msg.createdAt)
          const isLastInBlock = !next || next.userId !== msg.userId ||
            new Date(next.createdAt).getTime() - new Date(msg.createdAt).getTime() >= 5 * 60 * 1000

          return (
            <div key={msg.id}>
              {/* Séparateur de date */}
              {showDate && (
                <div className="flex items-center gap-3 my-4">
                  <div className="flex-1 h-px bg-gray-200" />
                  <span className="text-xs text-gray-400 font-medium px-2">{formatDayLabel(msg.createdAt)}</span>
                  <div className="flex-1 h-px bg-gray-200" />
                </div>
              )}

              {/* Message */}
              <div className={`flex items-end gap-2 group ${isOwn ? 'flex-row-reverse' : ''} ${isContinuation ? 'mt-0.5' : 'mt-3'}`}>
                {/* Avatar (seulement le dernier de chaque bloc) */}
                <div className="w-8 flex-shrink-0">
                  {!isContinuation || isLastInBlock ? (
                    isLastInBlock && <Avatar user={msg.user} size={8} />
                  ) : null}
                </div>

                <div className={`max-w-[75%] ${isOwn ? 'items-end' : 'items-start'} flex flex-col gap-0.5`}>
                  {/* Nom + heure (premier du bloc) */}
                  {!isContinuation && (
                    <div className={`flex items-baseline gap-1.5 text-xs mb-0.5 ${isOwn ? 'flex-row-reverse' : ''}`}>
                      <span className="font-semibold text-gray-700">{isOwn ? 'Vous' : msg.user.name}</span>
                      <span className="text-gray-400">{formatTime(msg.createdAt)}</span>
                    </div>
                  )}

                  {/* Bulle */}
                  {editId === msg.id ? (
                    <div className="w-full">
                      <textarea
                        value={editContent}
                        onChange={e => setEditContent(e.target.value)}
                        onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); saveEdit() } if (e.key === 'Escape') setEditId(null) }}
                        className="w-full rounded-xl border border-indigo-400 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 resize-none"
                        rows={2}
                        autoFocus
                      />
                      <div className="flex gap-2 mt-1 justify-end">
                        <button onClick={() => setEditId(null)} className="text-xs text-gray-400 hover:text-gray-600">Annuler</button>
                        <button onClick={saveEdit} className="text-xs font-semibold text-indigo-600 hover:text-indigo-500">Enregistrer</button>
                      </div>
                    </div>
                  ) : (
                    <div className={`relative px-3 py-2 rounded-2xl text-sm leading-relaxed break-words whitespace-pre-wrap ${
                      isOwn
                        ? 'bg-indigo-600 text-white rounded-br-sm'
                        : 'bg-white border border-gray-200 text-gray-800 rounded-bl-sm shadow-sm'
                    }`}>
                      {renderContent(msg.content)}
                      {msg.editedAt && (
                        <span className={`text-[10px] ml-1.5 ${isOwn ? 'text-indigo-200' : 'text-gray-400'}`}>(modifié)</span>
                      )}
                    </div>
                  )}
                </div>

                {/* Actions (visible au hover) */}
                {editId !== msg.id && (
                  <div className={`opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1 self-center ${isOwn ? 'flex-row-reverse' : ''}`}>
                    {isOwn && (
                      <button onClick={() => startEdit(msg)}
                        className="p-1 rounded-lg text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 transition-colors"
                        title="Modifier">
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                      </button>
                    )}
                    {(isOwn || isChef || isAdmin) && (
                      <button onClick={() => setDeleteId(msg.id)}
                        className="p-1 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors"
                        title="Supprimer">
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>
          )
        })}

        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="flex-shrink-0 mt-3 relative">
        {/* Sélecteur d'emojis */}
        {emojiOpen && (
          <>
            <div className="fixed inset-0 z-10" onClick={() => setEmojiOpen(false)} />
            <div className="absolute bottom-full mb-2 left-0 z-20 w-72 max-h-48 overflow-y-auto rounded-2xl border border-gray-200 bg-white shadow-xl p-2 grid grid-cols-8 gap-0.5">
              {EMOJIS.map(em => (
                <button key={em} type="button"
                  onClick={() => { insertEmoji(em); }}
                  className="text-xl rounded-lg hover:bg-gray-100 p-1 transition-colors">
                  {em}
                </button>
              ))}
            </div>
          </>
        )}

        <div className="flex items-end gap-2 rounded-2xl border border-gray-300 bg-white px-3 py-3 focus-within:border-indigo-400 focus-within:ring-1 focus-within:ring-indigo-400 transition-colors">
          <button
            type="button"
            onClick={() => setEmojiOpen(v => !v)}
            className={`flex-shrink-0 rounded-lg p-1.5 text-xl leading-none transition-colors ${emojiOpen ? 'bg-indigo-50' : 'hover:bg-gray-100'}`}
            title="Insérer un emoji"
          >
            😊
          </button>
          <textarea
            ref={inputRef}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Écrivez un message…"
            className="flex-1 resize-none text-sm text-gray-800 placeholder-gray-400 focus:outline-none bg-transparent max-h-32"
            rows={1}
            style={{ height: 'auto', minHeight: '24px' }}
            onInput={e => {
              const t = e.currentTarget
              t.style.height = 'auto'
              t.style.height = Math.min(t.scrollHeight, 128) + 'px'
            }}
          />
          <button
            onClick={handleSend}
            disabled={!input.trim() || sending}
            className="flex-shrink-0 rounded-xl bg-indigo-600 p-2 text-white hover:bg-indigo-500 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            title="Envoyer (Entrée)"
          >
            <svg className="w-4 h-4 rotate-90" fill="currentColor" viewBox="0 0 24 24">
              <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" />
            </svg>
          </button>
        </div>
        <p className="text-[10px] text-gray-400 mt-1 text-right">
          {input.length}/2000 · Entrée pour envoyer · Maj+Entrée pour un saut de ligne
        </p>
      </div>

      {/* Confirm delete */}
      {deleteId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40" onClick={() => setDeleteId(null)}>
          <div className="w-full max-w-sm bg-white rounded-2xl shadow-xl p-6" onClick={e => e.stopPropagation()}>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-red-100 flex items-center justify-center flex-shrink-0">
                <svg className="w-5 h-5 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </div>
              <div>
                <h3 className="text-base font-semibold text-gray-900">Supprimer ce message ?</h3>
                <p className="text-sm text-gray-500 mt-0.5">Cette action est irréversible.</p>
              </div>
            </div>
            <div className="flex gap-3">
              <button onClick={confirmDelete}
                className="flex-1 rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-500">
                Supprimer
              </button>
              <button onClick={() => setDeleteId(null)}
                className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100">
                Annuler
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
