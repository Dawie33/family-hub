'use client'

import { useEffect, useState } from 'react'
import { createSupabaseBrowserClient } from '@/lib/supabase-browser'

interface EmailTask {
  id: string
  type: 'task' | 'note'
  title: string
  content: string | null
  source_subject: string | null
  source_from: string | null
  done: boolean
  created_at: string
}

export default function EmailsPage() {
  const [items, setItems] = useState<EmailTask[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'all' | 'task' | 'note'>('all')
  const [analyzing, setAnalyzing] = useState(false)
  const [analyzeResult, setAnalyzeResult] = useState<{ ok: boolean; text: string } | null>(null)

  useEffect(() => {
    loadItems()
  }, [])

  async function loadItems() {
    const supabase = createSupabaseBrowserClient()
    const { data } = await supabase
      .from('email_tasks')
      .select('*')
      .order('created_at', { ascending: false })
    setItems((data as EmailTask[]) ?? [])
    setLoading(false)
  }

  async function toggleDone(item: EmailTask) {
    if (item.type !== 'task') return
    const supabase = createSupabaseBrowserClient()
    await supabase.from('email_tasks').update({ done: !item.done }).eq('id', item.id)
    setItems(prev => prev.map(i => i.id === item.id ? { ...i, done: !i.done } : i))
  }

  async function triggerAnalysis() {
    setAnalyzing(true)
    setAnalyzeResult(null)
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3003/api'
      const res = await fetch(`${apiUrl}/gmail/analyze`, { method: 'POST' })
      if (!res.ok) {
        const err = await res.json().catch(() => ({})) as { message?: string }
        setAnalyzeResult({ ok: false, text: `Erreur : ${err.message ?? res.statusText}` })
        return
      }
      const stats = await res.json() as { emails: number; saved: number; archived: number }
      await loadItems()

      if (stats.emails === 0) {
        setAnalyzeResult({ ok: true, text: 'Boîte à jour — aucun nouvel email' })
      } else {
        const parts: string[] = []
        if (stats.saved > 0) parts.push(`${stats.saved} tâche${stats.saved > 1 ? 's' : ''} créée${stats.saved > 1 ? 's' : ''}`)
        if (stats.archived > 0) parts.push(`${stats.archived} email${stats.archived > 1 ? 's' : ''} classé${stats.archived > 1 ? 's' : ''}`)
        const summary = parts.length > 0
          ? `✓ ${parts.join(' · ')} sur ${stats.emails} email${stats.emails > 1 ? 's' : ''} analysé${stats.emails > 1 ? 's' : ''}`
          : `${stats.emails} email${stats.emails > 1 ? 's' : ''} analysé${stats.emails > 1 ? 's' : ''} — aucun contenu important`
        setAnalyzeResult({ ok: true, text: summary })
      }
    } catch (e) {
      setAnalyzeResult({ ok: false, text: `Erreur réseau : ${e instanceof Error ? e.message : 'inconnue'}` })
    } finally {
      setAnalyzing(false)
    }
  }

  async function deleteItem(id: string) {
    const supabase = createSupabaseBrowserClient()
    await supabase.from('email_tasks').delete().eq('id', id)
    setItems(prev => prev.filter(i => i.id !== id))
  }

  const filtered = items.filter(i => filter === 'all' || i.type === filter)
  const taskCount = items.filter(i => i.type === 'task' && !i.done).length

  return (
    <div className="max-w-2xl mx-auto px-4 py-8 space-y-6">

      {/* En-tête */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: '#11253E', fontFamily: 'Nunito, sans-serif' }}>
            Emails
          </h1>
          <p className="text-sm mt-1" style={{ color: '#999' }}>
            Tâches et notes générées par l&apos;IA depuis tes emails
            {taskCount > 0 && (
              <span className="ml-2 inline-flex items-center justify-center w-5 h-5 rounded-full text-xs font-bold text-white" style={{ backgroundColor: '#DC2626' }}>
                {taskCount}
              </span>
            )}
          </p>
        </div>
        <button
          onClick={triggerAnalysis}
          disabled={analyzing}
          className="flex-shrink-0 flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-opacity disabled:opacity-50"
          style={{ backgroundColor: '#4784EC', color: 'white' }}
        >
          {analyzing ? (
            <>
              <span className="animate-spin inline-block w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full" />
              Analyse...
            </>
          ) : (
            <>↻ Analyser</>
          )}
        </button>
      </div>

      {/* Résultat analyse */}
      {analyzeResult && (
        <div
          className="text-sm px-4 py-2.5 rounded-xl"
          style={{
            backgroundColor: analyzeResult.ok ? '#F0F4FF' : '#FFF0F0',
            color: analyzeResult.ok ? '#4784EC' : '#DC2626',
          }}
        >
          {analyzeResult.text}
        </div>
      )}

      {/* Filtres */}
      <div className="flex gap-2">
        {(['all', 'task', 'note'] as const).map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className="px-4 py-1.5 rounded-full text-sm font-semibold transition-colors"
            style={filter === f
              ? { backgroundColor: '#4784EC', color: 'white' }
              : { backgroundColor: '#F3F4F6', color: '#585858' }
            }
          >
            {f === 'all' ? 'Tout' : f === 'task' ? 'Tâches' : 'Notes'}
          </button>
        ))}
      </div>

      {/* Liste */}
      {loading ? (
        <div className="text-center py-12 text-sm" style={{ color: '#999' }}>Chargement...</div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-12 space-y-2">
          <p className="text-4xl">📭</p>
          <p className="text-sm font-medium" style={{ color: '#585858' }}>Aucun élément pour l&apos;instant</p>
          <p className="text-xs" style={{ color: '#999' }}>
            L&apos;IA analysera tes emails tous les jours à 7h
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map(item => (
            <div
              key={item.id}
              className="bg-white rounded-2xl border shadow-sm p-4 flex gap-3"
              style={{ borderColor: '#F0F0F0', opacity: item.done ? 0.6 : 1 }}
            >
              {/* Icône type */}
              <div className="flex-shrink-0 mt-0.5">
                {item.type === 'task' ? (
                  <button
                    onClick={() => toggleDone(item)}
                    className="w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors"
                    style={item.done
                      ? { backgroundColor: '#16A34A', borderColor: '#16A34A' }
                      : { borderColor: '#D1D5DB' }
                    }
                  >
                    {item.done && <span className="text-white text-xs">✓</span>}
                  </button>
                ) : (
                  <span className="text-lg">📝</span>
                )}
              </div>

              {/* Contenu */}
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2">
                  <p
                    className="text-sm font-semibold leading-snug"
                    style={{
                      color: '#32325D',
                      textDecoration: item.done ? 'line-through' : 'none',
                    }}
                  >
                    {item.title}
                  </p>
                  <button
                    onClick={() => deleteItem(item.id)}
                    className="flex-shrink-0 text-gray-300 hover:text-red-400 transition-colors text-sm"
                  >
                    ✕
                  </button>
                </div>

                {item.content && (
                  <p className="text-xs mt-1" style={{ color: '#585858' }}>{item.content}</p>
                )}

                {/* Source email */}
                <div className="flex items-center gap-1.5 mt-2">
                  <span className="text-xs" style={{ color: '#999' }}>✉</span>
                  <p className="text-xs truncate" style={{ color: '#999' }}>
                    {item.source_from?.replace(/<.*>/, '').trim() || item.source_from}
                    {item.source_subject && ` · ${item.source_subject}`}
                  </p>
                </div>

                <p className="text-xs mt-1" style={{ color: '#C4C4C4' }}>
                  {new Date(item.created_at).toLocaleDateString('fr-FR', {
                    day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit',
                  })}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
