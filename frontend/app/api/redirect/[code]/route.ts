import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_KEY || ''
)

export async function GET(
  request: NextRequest,
  { params }: { params: { code: string } }
) {
  try {
    const { code } = params

    if (!code) {
      return NextResponse.json(
        { error: 'Brakuje kodu' },
        { status: 400 }
      )
    }

    const { data: submission, error } = await supabase
      .from('submissions')
      .select('tiktok_url')
      .eq('short_code', code)
      .single()

    if (error || !submission) {
      return NextResponse.json(
        { error: 'Link nie znaleziony' },
        { status: 404 }
      )
    }

    return NextResponse.redirect(submission.tiktok_url, { status: 301 })
  } catch (error) {
    console.error('Error in redirect:', error)
    return NextResponse.json(
      { error: 'Wewnętrzny błąd serwera' },
      { status: 500 }
    )
  }
}
