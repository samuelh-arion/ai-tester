"use client"

import { useState, useCallback, useEffect } from "react"
import { useDropzone } from "react-dropzone"
import { Button } from "@/components/ui/button"
import { useStore } from "@/lib/store"
import { Loader2, Upload } from "lucide-react"
import { importTestSuite } from "@/lib/export-import"
import JSZip from 'jszip'
import { makeAuthenticatedRequest } from '@/lib/api'
import { useRouter } from "next/navigation"

export default function OpenAPIUploader() {
  const router = useRouter()
  const { setFeatures, setTests, setEnvFiles, setCurrentEnv, resetStore, setOpenApiSpec, setParsedOpenApiSpec } = useStore()
  const [isLoading, setIsLoading] = useState(false)
  const [loadingMessage, setLoadingMessage] = useState("")
  const [error, setError] = useState<string | null>(null)

  const initializeDefaultEnvironments = () => {
    setEnvFiles({
      'local.env': 'API_URL=http://localhost:3000\nAPI_KEY=local-dev-key',
      'dev.env': 'API_URL=https://dev-api.example.com\nAPI_KEY=dev-api-key-123',
      'prod.env': 'API_URL=https://api.example.com\nAPI_KEY=prod-api-key-789'
    })
    setCurrentEnv('local.env')
  }

  useEffect(() => {
    initializeDefaultEnvironments()
  }, [])

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    const file = acceptedFiles[0]
    if (!file) return

    setIsLoading(true)
    setError(null)

    try {
      if (file.name.endsWith('.zip')) {
        setLoadingMessage("Importing test suite...")
        // Handle test suite import
        resetStore() // Reset store before importing
        
        const zip = await JSZip.loadAsync(file)
        const features: Record<string, string> = {}
        const tests: Record<string, string> = {}
        const envFiles: Record<string, string> = {}
        let openApiSpec: string | null = null

        for (const [filename, zipEntry] of Object.entries(zip.files)) {
          if (zipEntry.dir) continue
          
          const content = await zipEntry.async('string')
          
          if (filename.startsWith('features/')) {
            if (filename.startsWith('features/step_definitions/')) {
              // Extract test files from step_definitions folder
              const testName = filename.replace('features/step_definitions/', '')
              tests[testName] = content
            } else {
              // Extract feature files from features folder
              const featureName = filename.replace('features/', '')
              features[featureName] = content
            }
          } else if (filename.endsWith('.env')) {
            // Extract environment files (local.env, dev.env, prod.env)
            envFiles[filename] = content
          } else if (filename === 'openapi.json' || filename === 'openapi.yaml') {
            openApiSpec = content
          }
        }

        // Set the OpenAPI spec first
        setOpenApiSpec(openApiSpec || 'placeholder')

        // Then set other state
        await setFeatures(features)
        await setTests(tests)
        if (Object.keys(envFiles).length > 0) {
          await setEnvFiles(envFiles)
          await setCurrentEnv(Object.keys(envFiles)[0])
        } else {
          await initializeDefaultEnvironments()
        }
      } else {
        // Handle OpenAPI spec
        setLoadingMessage("Processing OpenAPI specification...")
        await resetStore()
        await initializeDefaultEnvironments()
        
        const fileContent = await file.text()
        const spec = JSON.parse(fileContent)
        await setOpenApiSpec(fileContent)
        await setParsedOpenApiSpec(spec)
        
        setLoadingMessage("Generating feature files from specification...")
        
        // Wait for the API response
        const featuresResponse = await makeAuthenticatedRequest('/api/generate-features', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ spec })
        })
        
        if (!featuresResponse.ok) {
          throw new Error('Failed to generate features')
        }
        
        const { features } = await featuresResponse.json()
        if (!features) {
          throw new Error('No features generated')
        }
        
        // Set features and wait for it to complete
        await setFeatures(features)
        setLoadingMessage("Feature generation complete!")
        
        // Only navigate after everything is complete
        router.push('/')
      }
    } catch (error) {
      console.error('Error processing file:', error)
      if (error instanceof Error && error.message === 'Authentication failed') {
        setError('Authentication failed. Please ensure you have entered the correct password.')
      } else {
        setError('Error processing file. Please ensure it is a valid OpenAPI specification or test suite export.')
      }
    } finally {
      setIsLoading(false)
      setLoadingMessage("")
    }
  }, [router])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/json': ['.json'],
      'application/zip': ['.zip']
    },
    multiple: false
  })

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-4">
      <div className="w-full max-w-md space-y-4">
        <div className="text-center space-y-2">
          <h1 className="text-2xl font-bold">API Test Generator</h1>
          <p className="text-sm text-muted-foreground">
            Upload your OpenAPI specification or a previously exported test suite
          </p>
        </div>

        <div
          {...getRootProps()}
          className={`
            border-2 border-dashed rounded-lg p-8 text-center cursor-pointer
            transition-colors duration-200 space-y-4
            ${isDragActive ? "border-primary bg-primary/10" : "border-muted"}
            ${isLoading ? "pointer-events-none opacity-50" : ""}
          `}
        >
          <input {...getInputProps()} />
          <div className="flex flex-col items-center space-y-4">
            {!isLoading && <Upload className="h-8 w-8 text-muted-foreground" />}
            {isLoading ? (
              <>
                <Loader2 className="h-8 w-8 animate-spin" />
                <p className="text-sm text-muted-foreground">
                  {loadingMessage || "Processing..."}
                </p>
                <p className="text-xs text-muted-foreground">
                  Please wait while we generate your features...
                </p>
              </>
            ) : (
              <>
                <div className="space-y-2">
                  <p>Drag and drop your file here, or click to select</p>
                  <p className="text-sm text-muted-foreground">
                    Accepts OpenAPI specification (.json) or test suite (.zip)
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm">
                    Upload OpenAPI Spec
                  </Button>
                  <Button variant="outline" size="sm">
                    Import Test Suite
                  </Button>
                </div>
              </>
            )}
          </div>
        </div>

        {error && (
          <div className="p-4 text-sm text-red-500 bg-red-50 rounded-md border border-red-200">
            {error}
          </div>
        )}
      </div>
    </div>
  )
} 