import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_KEY || ''
)

function generateShortCode(length: number = 5): string {
  const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
  let code = ''
  for (let i = 0; i < length; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return code
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { tiktok_url, submitter_nickname } = body

    // Walidacja
    if (!tiktok_url || !submitter_nickname) {
      return NextResponse.json(
        { error: 'Brakuje wymaganych pól' },
        { status: 400 }
      )
    }

    if (!tiktok_url.includes('tiktok.com')) {
      return NextResponse.json(
        { error: 'Nieprawidłowy link TikToka' },
        { status: 400 }
      )
    }

    if (submitter_nickname.length > 32) {
      return NextResponse.json(
        { error: 'Ksywa za długa' },
        { status: 400 }
      )
    }

    // Generowanie unique short_code
    let short_code = generateShortCode()
    let attempts = 0
    while (attempts < 10) {
      const { data: existing } = await supabase
        .from('submissions')
        .select('id')
        .eq('short_code', short_code)
        .single()

      if (!existing) break
      short_code = generateShortCode()
      attempts++
    }

    // Wstawienie do bazy
    const { data, error } = await supabase
      .from('submissions')
      .insert({
        tiktok_url,
        submitter_nickname,
        short_code,
        status: 'pending',
      })
      .select()
      .single()

    if (error) {
      console.error('Supabase error:', error)
      return NextResponse.json(
        { error: 'Błąd bazy danych' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      short_code,
      message: `Dziękujemy! Twój link: link.jajakosciotrupa.pl/${short_code}`,
    })
  } catch (error) {
    console.error('Error in /api/submit:', error)
    return NextResponse.json(
      { error: 'Wewnętrzny błąd serwera' },
      { status: 500 }
    )
  }
}
