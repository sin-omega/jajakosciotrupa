'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'

interface Submission {
  id: string
  tiktok_url: string
  submitter_nickname: string
  short_code: string
  status: string
  submitted_at: string
  reviewed_at: string | null
  reviewed_by: string | null
}

export default function HistoryPage() {
  const [submissions, setSubmissions] = useState<Submission[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [filterStatus, setFilterStatus] = useState<string | null>(null)
  const [downloading, setDownloading] = useState<string | null>(null)
  const router = useRouter()

  useEffect(() => {
    fetchHistory()
  }, [filterStatus])

  const fetchHistory = async () => {
    try {
      setLoading(true)
      const query = filterStatus ? `?status=${filterStatus}` : ''
      const response = await fetch(`/api/admin/queue${query}&limit=100`)
      if (!response.ok) {
        if (response.status === 401) {
          router.push('/admin/login')
          return
        }
        throw new Error('Błąd pobierania historii')
      }
      const data = await response.json()
      setSubmissions(data.filter((s: Submission) => s.status !== 'pending'))
      setError(null)
    } catch (err) {
      setError('Błąd przy ładowaniu historii')
    } finally {
      setLoading(false)
    }
  }

  const handleDownload = async (submissionId: string, shortCode: string) => {
    try {
      setDownloading(submissionId)
      const response = await fetch('/api/admin/download', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ submission_id: submissionId }),
      })

      if (!response.ok) {
        throw new Error('Błąd pobierania')
      }

      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${shortCode}.mp4`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
    } catch (err) {
      setError('Błąd pobierania pliku')
    } finally {
      setDownloading(null)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-dark flex items-center justify-center">
        <div className="text-white text-xl">Ładowanie historii...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-dark p-4">
      <div className="max-w-6xl mx-auto">
        <div className="mb-6 flex justify-between items-center">
          <h1 className="text-3xl font-bold text-white">Historia</h1>
          <button
            onClick={() => router.push('/admin/queue')}
            className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded"
          >
            Wróć do kolejki
          </button>
        </div>

        {error && (
          <div className="mb-4 p-4 bg-red-900 text-red-200 rounded">
            {error}
          </div>
        )}

        <div className="mb-6 flex gap-2 flex-wrap">
          <button
            onClick={() => setFilterStatus(null)}
            className={`px-4 py-2 rounded ${
              filterStatus === null
                ? 'bg-blue-600 text-white'
                : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
            }`}
          >
            Wszystkie
          </button>
          <button
            onClick={() => setFilterStatus('approved')}
            className={`px-4 py-2 rounded ${
              filterStatus === 'approved'
                ? 'bg-green-600 text-white'
                : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
            }`}
          >
            Śmieszne
          </button>
          <button
            onClick={() => setFilterStatus('rejected')}
            className={`px-4 py-2 rounded ${
              filterStatus === 'rejected'
                ? 'bg-red-600 text-white'
                : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
            }`}
          >
            Nieśmieszne
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm text-gray-300">
            <thead className="bg-gray-900 border-b border-gray-700">
              <tr>
                <th className="px-4 py-3 text-left">Data</th>
                <th className="px-4 py-3 text-left">Autor</th>
                <th className="px-4 py-3 text-left">Link</th>
                <th className="px-4 py-3 text-left">Ocena</th>
                <th className="px-4 py-3 text-left">Admin</th>
                <th className="px-4 py-3 text-left">Akcja</th>
              </tr>
            </thead>
            <tbody>
              {submissions.map((submission) => (
                <tr key={submission.id} className="border-b border-gray-800 hover:bg-gray-900">
                  <td className="px-4 py-3">
                    {new Date(submission.submitted_at).toLocaleDateString('pl-PL')}
                  </td>
                  <td className="px-4 py-3">{submission.submitter_nickname}</td>
                  <td className="px-4 py-3">
                    <a
                      href={`/admin/history?code=${submission.short_code}`}
                      className="text-blue-400 hover:text-blue-300 text-xs font-mono"
                    >
                      {submission.short_code}
                    </a>
                  </td>
                  <td className="px-4 py-3">
                    {submission.status === 'approved' ? (
                      <span className="text-green-400">✓ Śmieszne</span>
                    ) : (
                      <span className="text-red-400">✗ Nieśmieszne</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-500">
                    {submission.reviewed_at
                      ? new Date(submission.reviewed_at).toLocaleString('pl-PL')
                      : '-'}
                  </td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => handleDownload(submission.id, submission.short_code)}
                      disabled={downloading === submission.id}
                      className="px-3 py-1 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 text-white rounded text-xs"
                    >
                      {downloading === submission.id ? '⏳' : '⬇'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {submissions.length === 0 && (
          <div className="text-center text-gray-500 py-8">
            Brak zmaterializowanych filmów
          </div>
        )}
      </div>
    </div>
  )
}
