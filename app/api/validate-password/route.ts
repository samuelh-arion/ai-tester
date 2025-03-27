import { NextResponse } from 'next/server'
import { VALID_PASSWORD } from '@/lib/constants'

// This password should be set as an environment variable in production
const VALID_PASSWORD_ENV = 'your-secure-password'

export const runtime = 'edge'

export async function POST(request: Request) {
  try {
    const { password } = await request.json()

    if (!password || password !== VALID_PASSWORD) {
      return NextResponse.json(
        { success: false, error: 'Invalid password' },
        { status: 401 }
      )
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    return NextResponse.json(
      { success: false, error: 'Invalid request' },
      { status: 400 }
    )
  }
} 