import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { jwtVerify } from 'jose'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_KEY || ''
)

const JWT_SECRET = new TextEncoder().encode(process.env.JWT_SECRET || 'dev-secret')
const FLASK_URL = process.env.FLASK_URL || 'http://localhost:5001'
const VERCEL_SECRET = process.env.VERCEL_SECRET || 'dev-secret'

async function verifyAuth(request: NextRequest) {
  const token = request.cookies.get('admin_session')?.value
  if (!token) throw new Error('Unauthorized')
  const payload = await jwtVerify(token, JWT_SECRET)
  return payload.payload as { admin_id: string; username: string }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await verifyAuth(request)
    const body = await request.json()
    const { submission_id } = body

    if (!submission_id) {
      return NextResponse.json(
        { error: 'Brakuje submission_id' },
        { status: 400 }
      )
    }

    // Pobierz submission z bazy
    const { data: submission, error } = await supabase
      .from('submissions')
      .select('*')
      .eq('id', submission_id)
      .single()

    if (error || !submission) {
      return NextResponse.json(
        { error: 'Submission nie znaleziony' },
        { status: 404 }
      )
    }

    // Wyślij request do Flask
    const flaskResponse = await fetch(`${FLASK_URL}/process`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Internal-Secret': VERCEL_SECRET,
      },
      body: JSON.stringify({
        tiktok_url: submission.tiktok_url,
        short_code: submission.short_code,
        submitter_nickname: submission.submitter_nickname,
        admin_username: auth.username,
        platform: 'TikTok',
      }),
      signal: AbortSignal.timeout(120000), // 120 sekund timeout
    })

    if (!flaskResponse.ok) {
      const errorData = await flaskResponse.json()
      return NextResponse.json(
        { error: errorData.error || 'Flask error' },
        { status: flaskResponse.status }
      )
    }

    // Pobierz wideo z Flaska
    const videoBuffer = await flaskResponse.arrayBuffer()

    return new NextResponse(videoBuffer, {
      headers: {
        'Content-Type': 'video/mp4',
        'Content-Disposition': `attachment; filename="${submission.short_code}.mp4"`,
      },
    })
  } catch (error) {
    console.error('Download error:', error)
    return NextResponse.json(
      { error: 'Wewnętrzny błąd serwera' },
      { status: 500 }
    )
  }
}
