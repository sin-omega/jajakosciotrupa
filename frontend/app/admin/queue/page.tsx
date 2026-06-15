'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'

interface Submission {
  id: string
  tiktok_url: string
  submitter_nickname: string
  short_code: string
  status: string
  submitted_at: string
}

export default function QueuePage() {
  const [submissions, setSubmissions] = useState<Submission[]>([])
  const [currentIndex, setCurrentIndex] = useState(0)
  const [loading, setLoading] = useState(true)
  const [downloading, setDownloading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()

  const fetchQueue = useCallback(async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/admin/queue?status=pending&limit=10')
      if (!response.ok) {
        if (response.status === 401) {
          router.push('/admin/login')
          return
        }
        throw new Error('Błąd pobierania kolejki')
      }
      const data = await response.json()
      setSubmissions(data)
      setError(null)
    } catch (err) {
      setError('Błąd przy ładowaniu kolejki')
    } finally {
      setLoading(false)
    }
  }, [router])

  useEffect(() => {
    fetchQueue()
  }, [fetchQueue])

  const handleVote = async (vote: 'approved' | 'rejected') => {
    if (!submissions[currentIndex]) return

    try {
      const response = await fetch('/api/admin/vote', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          submission_id: submissions[currentIndex].id,
          vote,
        }),
      })

      if (!response.ok) {
        throw new Error('Błąd głosowania')
      }

      // Usuń obecny film i załaduj następny
      const newSubmissions = submissions.filter((_, i) => i !== currentIndex)
      setSubmissions(newSubmissions)
      setCurrentIndex(Math.max(0, currentIndex - 1))

      // Jeśli koniec kolejki, załaduj więcej
      if (newSubmissions.length < 3) {
        await fetchQueue()
      }
    } catch (err) {
      setError('Błąd przy głosowaniu')
    }
  }

  const handleDownload = async () => {
    if (!submissions[currentIndex]) return

    try {
      setDownloading(true)
      const response = await fetch('/api/admin/download', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          submission_id: submissions[currentIndex].id,
        }),
      })

      if (!response.ok) {
        throw new Error('Błąd pobierania')
      }

      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${submissions[currentIndex].short_code}.mp4`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
    } catch (err) {
      setError('Błąd pobierania pliku')
    } finally {
      setDownloading(false)
    }
  }

  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') {
      e.preventDefault()
      handleVote('approved')
    } else if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') {
      e.preventDefault()
      handleVote('rejected')
    } else if (e.key === 'p' || e.key === 'P') {
      e.preventDefault()
      handleDownload()
    }
  }

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [submissions, currentIndex])

  if (loading) {
    return (
      <div className="min-h-screen bg-dark flex items-center justify-center">
        <div className="text-white text-xl">Ładowanie kolejki...</div>
      </div>
    )
  }

  if (submissions.length === 0) {
    return (
      <div className="min-h-screen bg-dark flex flex-col items-center justify-center p-4">
        <div className="text-white text-2xl mb-4">Brak filmów do oceny</div>
        <button
          onClick={() => fetchQueue()}
          className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded"
        >
          Odśwież
        </button>
      </div>
    )
  }

  const current = submissions[currentIndex]

  return (
    <div className="min-h-screen bg-dark p-4">
      <div className="max-w-2xl mx-auto">
        <div className="mb-6 flex justify-between items-center">
          <h1 className="text-3xl font-bold text-white">Kolejka filmów</h1>
          <button
            onClick={() => router.push('/admin/history')}
            className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded"
          >
            Historia
          </button>
        </div>

        {error && (
          <div className="mb-4 p-4 bg-red-900 text-red-200 rounded">
            {error}
          </div>
        )}

        <div className="bg-gray-900 rounded-lg overflow-hidden">
          {/* Film */}
          <div className="aspect-video bg-black relative flex flex-col items-center justify-center p-6">
            <p className="text-gray-400 text-sm mb-4 text-center">
              Otwórz film w TikTok'u aby go ocenić:
            </p>
            <a
              href={current.tiktok_url}
              target="_blank"
              rel="noopener noreferrer"
              className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded mb-4"
            >
              🔗 Otwórz w TikTok'u
            </a>
            <p className="text-xs text-gray-500 mt-4 max-w-xs text-center">
              Link do filmu: <br />
              <code className="text-gray-400 break-all">{current.tiktok_url}</code>
            </p>
          </div>

          {/* Informacje */}
          <div className="p-6 space-y-4">
            <div>
              <p className="text-gray-400 text-sm">Ksywa autora:</p>
              <p className="text-white text-lg font-semibold">{current.submitter_nickname}</p>
            </div>

            <div>
              <p className="text-gray-400 text-sm">Data przesłania:</p>
              <p className="text-white text-sm">
                {new Date(current.submitted_at).toLocaleDateString('pl-PL')}
              </p>
            </div>

            <div>
              <p className="text-gray-400 text-sm">Skrócony link:</p>
              <p className="text-blue-400 text-sm font-mono">
                link.jajakosciotrupa.pl/{current.short_code}
              </p>
            </div>

            <div className="text-gray-500 text-xs">
              Film {currentIndex + 1} z {submissions.length}
            </div>
          </div>

          {/* Przyciski */}
          <div className="p-6 flex flex-col sm:flex-row gap-3 border-t border-gray-700">
            <button
              onClick={() => handleVote('approved')}
              className="flex-1 py-3 bg-green-600 hover:bg-green-700 text-white font-bold rounded transition"
              title="Klawisz: D lub →"
            >
              ✓ ŚMIESZNE
            </button>

            <button
              onClick={() => handleVote('rejected')}
              className="flex-1 py-3 bg-red-600 hover:bg-red-700 text-white font-bold rounded transition"
              title="Klawisz: A lub ←"
            >
              ✗ NIEŚMIESZNE
            </button>

            <button
              onClick={handleDownload}
              disabled={downloading}
              className="flex-1 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 text-white font-bold rounded transition"
              title="Klawisz: P"
            >
              {downloading ? '⏳ POBIERANIE...' : '⬇ POBIERZ'}
            </button>
          </div>
        </div>

        {/* Skróty klawiszowe */}
        <div className="mt-8 bg-gray-900 p-4 rounded text-gray-400 text-sm">
          <p className="font-semibold text-white mb-2">Skróty klawiszowe:</p>
          <ul className="space-y-1">
            <li>• <strong>D</strong> lub <strong>→</strong> = ŚMIESZNE</li>
            <li>• <strong>A</strong> lub <strong>←</strong> = NIEŚMIESZNE</li>
            <li>• <strong>P</strong> = POBIERZ</li>
          </ul>
        </div>
      </div>
    </div>
  )
}
