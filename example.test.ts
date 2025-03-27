// Example test implementation
type ApiClient = {
  get: (path: string, data?: any) => Promise<{ status: number; data: any }>
  post: (path: string, data?: any) => Promise<{ status: number; data: any }>
}

type Environment = Record<string, string>

module.exports = {
  // Function name should match the scenario title (converted to snake_case)
  get_user_profile: async function(api: ApiClient, env: Environment) {
    const steps = []
    try {
      // Given
      steps.push({
        id: Math.random().toString(36).substr(2, 9),
        text: 'I have a valid user ID',
        keyword: 'given',
        status: 'passed',
        duration: 0
      })

      // When
      const response = await api.get('/api/users/123')
      steps.push({
        id: Math.random().toString(36).substr(2, 9),
        text: 'I send a GET request to "/api/users/123"',
        keyword: 'when',
        status: 'passed',
        duration: 0
      })

      // Then
      if (response.status === 200) {
        steps.push({
          id: Math.random().toString(36).substr(2, 9),
          text: 'I should receive a 200 status code',
          keyword: 'then',
          status: 'passed',
          duration: 0
        })
      } else {
        steps.push({
          id: Math.random().toString(36).substr(2, 9),
          text: 'I should receive a 200 status code',
          keyword: 'then',
          status: 'failed',
          duration: 0,
          error: `Expected status 200 but got ${response.status}`
        })
      }

      return steps
    } catch (error) {
      steps.push({
        id: Math.random().toString(36).substr(2, 9),
        text: 'Test execution failed',
        keyword: 'then',
        status: 'failed',
        duration: 0,
        error: error instanceof Error ? error.message : 'Unknown error'
      })
      return steps
    }
  }
} 