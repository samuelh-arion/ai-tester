// Browser-compatible test runner
// This file avoids importing @cucumber/cucumber package directly in the browser

export type StepResult = {
  id: string
  text: string
  keyword: string
  status: 'passed' | 'failed' | 'skipped'
  duration: number
  error?: string
}

export type TestResult = {
  id: string
  timestamp: Date
  feature: string
  scenario: string
  steps: StepResult[]
  status: 'passed' | 'failed' | 'skipped'
  duration: number
  error?: string
}

// Browser-compatible test context
export class TestContext {
  response?: any
  variables: Record<string, any> = {}
  envVars: Record<string, string> = {}

  constructor(env: Record<string, string> = {}) {
    this.envVars = env
  }

  async sendRequest(method: string, path: string, body?: any) {
    try {
      const url = new URL(path, this.envVars.API_URL || 'http://localhost:3000')
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        ...(this.envVars.API_KEY ? { 'X-API-Key': this.envVars.API_KEY } : {})
      }

      const options: RequestInit = {
        method: method.toUpperCase(),
        headers,
        ...(body ? { body: JSON.stringify(body) } : {})
      }

      const response = await fetch(url.toString(), options)
      
      this.response = {
        status: response.status,
        data: await response.json(),
        headers: Object.fromEntries([...response.headers.entries()])
      }
    } catch (error) {
      throw new Error(`Request failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  setVariable(name: string, value: any) {
    this.variables[name] = value
  }

  getVariable(name: string) {
    return this.variables[name]
  }
}

// Main test runner function - browser compatible version
export async function runTest(featureContent: string, envVars: Record<string, string> = {}): Promise<TestResult[]> {
  // This function is just a placeholder - the actual test execution is done in BrowserTestRunner
  // This avoids direct imports of @cucumber/cucumber in the browser environment
  
  throw new Error('This function is deprecated. Please use BrowserTestRunner component instead.')
}

// Example usage:
/*
const featureContent = `
Given I set "Content-Type" header to "application/json"
When I send a GET request to "/users"
Then the response status should be 200
And the response should contain "users"
`

const results = await runTest(featureContent, 'API_URL=http://api.example.com')
*/ 