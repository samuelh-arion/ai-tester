import { useAuthStore } from './store'

export async function makeAuthenticatedRequest(path: string, options: RequestInit = {}) {
  const { password } = useAuthStore.getState()
  
  const headers = {
    'Content-Type': 'application/json',
    'x-auth-password': password || '',
    ...options.headers
  }

  const response = await fetch(path, {
    ...options,
    headers
  })

  if (response.status === 401) {
    // Handle authentication error
    useAuthStore.getState().logout()
    throw new Error('Authentication failed')
  }

  return response
} 