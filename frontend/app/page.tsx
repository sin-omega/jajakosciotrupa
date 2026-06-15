'use client'

import { useState } from 'react'
import { config } from '@/lib/config'

export default function Home() {
  const [step, setStep] = useState(0) // 0: link, 1: nickname, 2: success
  const [url, setUrl] = useState('')
  const [nickname, setNickname] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [successData, setSuccessData] = useState<{ short_code: string } | null>(null)

  const isValidUrl = (url: string) => {
    return url.includes('tiktok.com') || url.includes('youtube.com/shorts') || url.includes('youtu.be')
  }

  const handleUrlSubmit = () => {
    if (!isValidUrl(url)) {
      setError('Link musi być z TikTok lub YouTube Shorts')
      return
    }
    setError(null)
    setStep(1)
  }

  const handleNicknameSubmit = async () => {
    if (nickname.length === 0 || nickname.length > 32) {
      setError('Ksywa musi mieć 1-32 znaki')
      return
    }

    setLoading(true)
    setError(null)

    try {
      const response = await fetch('/api/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tiktok_url: url,
          submitter_nickname: nickname,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        setError(data.error || 'Błąd podczas wysyłania')
        setLoading(false)
        return
      }

      setSuccessData(data)
      setStep(2)
    } catch (err) {
      setError('Błąd sieci')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-white flex flex-col justify-between p-2">
      {/* Header corners */}
      <div className="flex justify-between items-start mb-2">
        <h1 className="text-lg font-black text-black">Jaja Kościotrupa</h1>
        <a
          href={config.whatsappChannel}
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs font-bold text-black underline hover:text-gray-600"
        >
          WhatsApp
        </a>
      </div>

      {/* Progress bar */}
      <div className="w-full h-1 bg-gray-200 mb-3 flex gap-1">
        <div className={`flex-1 h-full ${step >= 0 ? 'bg-black' : 'bg-gray-200'}`}></div>
        <div className={`flex-1 h-full ${step >= 1 ? 'bg-black' : 'bg-gray-200'}`}></div>
        <div className={`flex-1 h-full ${step >= 2 ? 'bg-black' : 'bg-gray-200'}`}></div>
      </div>

      {/* Main content - centered */}
      <div className="flex-1 flex items-center justify-center">
        <div className="w-full max-w-sm">
          {/* Step 0: Link */}
          {step === 0 && (
            <div className="space-y-2">
              <p className="text-xs text-gray-600 mb-3">Krok 1: Link do filmu</p>
              <input
                type="url"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="Wklej link z TikTok lub YouTube Shorts"
                className="w-full px-3 py-2 text-sm bg-white text-black border border-gray-300 focus:outline-none focus:border-black"
                autoFocus
                onKeyDown={(e) => e.key === 'Enter' && handleUrlSubmit()}
              />
              {error && <p className="text-xs text-red-600 mt-1">{error}</p>}
              <button
                onClick={handleUrlSubmit}
                className="w-full py-2 bg-black text-white text-sm font-bold hover:bg-gray-800 mt-2"
              >
                Dalej
              </button>
            </div>
          )}

          {/* Step 1: Nickname */}
          {step === 1 && (
            <div className="space-y-2">
              <p className="text-xs text-gray-600 mb-3">Krok 2: Twoja ksywa</p>
              <input
                type="text"
                value={nickname}
                onChange={(e) => setNickname(e.target.value.slice(0, 32))}
                placeholder="Maksymalnie 32 znaki"
                className="w-full px-3 py-2 text-sm bg-white text-black border border-gray-300 focus:outline-none focus:border-black"
                autoFocus
                onKeyDown={(e) => e.key === 'Enter' && handleNicknameSubmit()}
                maxLength={32}
              />
              {error && <p className="text-xs text-red-600 mt-1">{error}</p>}
              <div className="flex gap-2 mt-2">
                <button
                  onClick={() => setStep(0)}
                  className="flex-1 py-2 bg-gray-300 text-black text-sm font-bold hover:bg-gray-400"
                >
                  Wstecz
                </button>
                <button
                  onClick={handleNicknameSubmit}
                  disabled={loading}
                  className="flex-1 py-2 bg-black text-white text-sm font-bold hover:bg-gray-800 disabled:bg-gray-500"
                >
                  {loading ? 'Wysyłanie...' : 'Wyślij'}
                </button>
              </div>
            </div>
          )}

          {/* Step 2: Success */}
          {step === 2 && (
            <div className="text-center space-y-3">
              <p className="text-xs text-gray-600">Krok 3: Gotowe!</p>
              <div className="bg-green-50 border border-green-300 p-3">
                <p className="text-sm font-bold text-green-800">Film przesłany</p>
                <p className="text-xs text-green-700 mt-1">Twój link:</p>
                <p className="text-xs font-mono text-black mt-1 break-all">
                  {config.shortDomain}/{successData?.short_code}
                </p>
              </div>
              <button
                onClick={() => {
                  setStep(0)
                  setUrl('')
                  setNickname('')
                  setSuccessData(null)
                  setError(null)
                }}
                className="w-full py-2 bg-black text-white text-sm font-bold hover:bg-gray-800"
              >
                Wyślij kolejny film
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Footer spacer */}
      <div className="h-2"></div>
    </div>
  )
}
