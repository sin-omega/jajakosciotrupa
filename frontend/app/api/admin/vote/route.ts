import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { jwtVerify } from 'jose'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_KEY || ''
)

const JWT_SECRET = new TextEncoder().encode(process.env.JWT_SECRET || 'dev-secret')

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
    const { submission_id, vote } = body

    if (!submission_id || !['approved', 'rejected'].includes(vote)) {
      return NextResponse.json(
        { error: 'Nieprawidłowe parametry' },
        { status: 400 }
      )
    }

    // Aktualizuj submission
    const { error } = await supabase
      .from('submissions')
      .update({
        status: vote,
        reviewed_at: new Date().toISOString(),
        reviewed_by: auth.admin_id,
      })
      .eq('id', submission_id)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Vote error:', error)
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    )
  }
}
