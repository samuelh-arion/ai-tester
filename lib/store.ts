import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export type Environment = {
  name: string
  baseUrl: string
  auth: {
    type: 'none' | 'apiKey' | 'oauth2' | 'bearer' | 'basic'
    credentials: Record<string, string>
  }
  headers: Record<string, string>
  timeout: number
  testData: Record<string, any>
}

export type StepResult = {
  id: string
  text: string
  keyword: string
  status: "passed" | "failed" | "skipped"
  duration: number
  error?: string
}

export type TestResult = {
  id: string
  timestamp: Date
  feature: string
  scenario: string
  steps: StepResult[]
  status: "passed" | "failed" | "skipped"
  duration: number
  error?: string
}

interface AppState {
  // Auth state
  isAuthenticated: boolean
  password: string | null
  setPassword: (password: string) => void
  logout: () => void

  openApiSpec: string | null
  parsedOpenApiSpec: any | null
  features: Record<string, string>
  tests: Record<string, string>
  envFiles: Record<string, string>
  currentEnv: string
  isGeneratingFeatures: boolean
  environments: Environment[]
  testCode: string | null
  scenarioCode: string | null
  currentTab: string
  testData: Record<string, any>
  testResults: TestResult[]
  addEnvironment: (env: Environment) => void
  updateEnvironment: (name: string, env: Environment) => void
  removeEnvironment: (name: string) => void
  duplicateEnvironment: (name: string) => void
  setOpenApiSpec: (spec: string | null) => void
  setParsedOpenApiSpec: (spec: any | null) => void
  setFeatures: (features: Record<string, string>) => void
  setFeature: (name: string, content: string) => void
  setTests: (tests: Record<string, string>) => void
  setEnvFiles: (envFiles: Record<string, string>) => void
  setEnvFile: (name: string, content: string) => void
  setCurrentEnv: (currentEnv: string) => void
  setIsGeneratingFeatures: (isGenerating: boolean) => void
  setTestCode: (code: string | null) => void
  setScenarioCode: (code: string | null) => void
  setCurrentTab: (tab: string) => void
  setTestData: (key: string, value: any) => void
  setTestResults: (results: TestResult[]) => void
  resetStore: () => void
}

// Create a separate store for authentication to persist it independently
export const useAuthStore = create(
  persist<Pick<AppState, 'isAuthenticated' | 'password' | 'setPassword' | 'logout'>>(
    (set) => ({
      isAuthenticated: false,
      password: null,
      setPassword: (password: string) => set({ password, isAuthenticated: true }),
      logout: () => set({ password: null, isAuthenticated: false }),
    }),
    {
      name: 'auth-storage',
    }
  )
)

export const useStore = create<AppState>()(
  persist(
    (set) => ({
      // Use the auth store for authentication state
      ...useAuthStore.getState(),
      setPassword: useAuthStore.getState().setPassword,
      logout: useAuthStore.getState().logout,

      // Existing state
      openApiSpec: null,
      parsedOpenApiSpec: null,
      features: {},
      tests: {},
      envFiles: {},
      currentEnv: ".env-dev",
      isGeneratingFeatures: false,
      environments: [],
      testCode: null,
      scenarioCode: null,
      currentTab: 'features',
      testData: {},
      testResults: [],

      // Environment management functions
      addEnvironment: (env: Environment) =>
        set((state) => ({
          environments: [...state.environments, env]
        })),
      updateEnvironment: (name: string, env: Environment) =>
        set((state) => ({
          environments: state.environments.map((e) =>
            e.name === name ? env : e
          )
        })),
      removeEnvironment: (name: string) =>
        set((state) => ({
          environments: state.environments.filter((e) => e.name !== name)
        })),
      duplicateEnvironment: (name: string) =>
        set((state) => {
          const envToDuplicate = state.environments.find((e) => e.name === name)
          if (!envToDuplicate) return state
          const newEnv = {
            ...envToDuplicate,
            name: `${envToDuplicate.name} (Copy)`
          }
          return {
            environments: [...state.environments, newEnv]
          }
        }),

      // Existing functions
      setOpenApiSpec: (spec: string | null) => set({ openApiSpec: spec }),
      setParsedOpenApiSpec: (spec: any | null) => set({ parsedOpenApiSpec: spec }),
      setFeatures: (features: Record<string, string>) => set({ features }),
      setFeature: (name: string, content: string) =>
        set((state) => ({
          features: { ...state.features, [name]: content }
        })),
      setTests: (tests: Record<string, string>) => set({ tests }),
      setEnvFiles: (envFiles: Record<string, string>) => set({ envFiles }),
      setEnvFile: (name: string, content: string) =>
        set((state) => ({
          envFiles: { ...state.envFiles, [name]: content }
        })),
      setCurrentEnv: (currentEnv: string) => set({ currentEnv }),
      setIsGeneratingFeatures: (isGenerating: boolean) =>
        set({ isGeneratingFeatures: isGenerating }),
      setTestCode: (code: string | null) => set({ testCode: code }),
      setScenarioCode: (code: string | null) => set({ scenarioCode: code }),
      setCurrentTab: (tab: string) => set({ currentTab: tab }),
      setTestData: (key: string, value: any) =>
        set((state) => ({
          testData: { ...state.testData, [key]: value }
        })),
      setTestResults: (results: TestResult[]) => set({ testResults: results }),
      resetStore: () => {
        // Don't reset auth state when resetting the store
        const { isAuthenticated, password } = useAuthStore.getState()
        set({
          isAuthenticated,
          password,
          
          // Reset other state
          openApiSpec: null,
          parsedOpenApiSpec: null,
          features: {},
          tests: {},
          envFiles: {},
          currentEnv: '.env-dev',
          isGeneratingFeatures: false,
          environments: [],
          testCode: null,
          scenarioCode: null,
          currentTab: 'features',
          testData: {},
          testResults: []
        })
      }
    }),
    {
      name: 'api-tester-storage',
      // Don't persist auth state in the main store since it's handled by useAuthStore
      partialize: (state) => {
        const { isAuthenticated, password, ...rest } = state
        return rest
      },
    }
  )
) 