import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { SignJWT } from 'jose'
import bcrypt from 'bcryptjs'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_KEY || ''
)

const JWT_SECRET = new TextEncoder().encode(process.env.JWT_SECRET || 'dev-secret')

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { username, password } = body

    if (!username || !password) {
      return NextResponse.json(
        { error: 'Brakuje username lub password' },
        { status: 400 }
      )
    }

    // Pobierz admina z bazy
    const { data: admin, error } = await supabase
      .from('admins')
      .select('id, username, password_hash')
      .eq('username', username)
      .single()

    if (error || !admin) {
      return NextResponse.json(
        { error: 'Nieprawidłowe dane logowania' },
        { status: 401 }
      )
    }

    // Weryfikuj hasło
    const isValidPassword = await bcrypt.compare(password, admin.password_hash)
    if (!isValidPassword) {
      return NextResponse.json(
        { error: 'Nieprawidłowe dane logowania' },
        { status: 401 }
      )
    }

    // Generuj JWT token
    const token = await new SignJWT({
      admin_id: admin.id,
      username: admin.username,
    })
      .setProtectedHeader({ alg: 'HS256' })
      .setIssuedAt()
      .setExpirationTime('24h')
      .sign(JWT_SECRET)

    const response = NextResponse.json({ success: true })
    response.cookies.set({
      name: 'admin_session',
      value: token,
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 86400, // 24 godziny
    })

    return response
  } catch (error) {
    console.error('Login error:', error)
    return NextResponse.json(
      { error: 'Wewnętrzny błąd serwera' },
      { status: 500 }
    )
  }
}
