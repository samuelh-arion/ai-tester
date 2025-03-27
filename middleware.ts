import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

import { VALID_PASSWORD } from '@/lib/constants'

export function middleware(request: NextRequest) {
  // Only apply to /api routes
  if (!request.nextUrl.pathname.startsWith('/api')) {
    return NextResponse.next()
  }

  // Skip auth for the validate-password endpoint
  if (request.nextUrl.pathname === '/api/validate-password') {
    return NextResponse.next()
  }

  const password = request.headers.get('x-auth-password')
  if (!password || password !== VALID_PASSWORD) {
    return NextResponse.json(
      { success: false, error: 'Unauthorized' },
      { status: 401 }
    )
  }

  return NextResponse.next()
}

export const config = {
  matcher: '/api/:path*'
} 