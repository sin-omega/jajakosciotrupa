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
  return jwtVerify(token, JWT_SECRET)
}

export async function GET(request: NextRequest) {
  try {
    await verifyAuth(request)

    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status') || 'pending'
    const limit = parseInt(searchParams.get('limit') || '1')
    const offset = parseInt(searchParams.get('offset') || '0')

    const { data, error } = await supabase
      .from('submissions')
      .select('*')
      .eq('status', status)
      .order('submitted_at', { ascending: true })
      .range(offset, offset + limit - 1)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json(data)
  } catch (error) {
    console.error('Queue error:', error)
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    )
  }
}
