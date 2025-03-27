"use client"

import { useState, useEffect } from "react"
import Editor from "@monaco-editor/react"
import { Button } from "@/components/ui/button"
import { useStore } from "@/lib/store"
import { Loader2 } from "lucide-react"

export function FeatureEditor() {
  const { isGeneratingFeatures, setIsGeneratingFeatures, setFeature, setCurrentTab } = useStore()
  const [code, setCode] = useState<string>(`Feature: Example API Test
  As a user
  I want to test the API endpoints
  So that I can ensure they work correctly

  Scenario: Get user profile
    Given I have a valid user ID
    When I send a GET request to "/api/users/{id}"
    Then I should receive a 200 status code
    And the response should contain user details`)

  useEffect(() => {
    // Mock feature generation completion after 3 seconds
    if (isGeneratingFeatures) {
      const timer = setTimeout(() => {
        setIsGeneratingFeatures(false)
      }, 3000)
      return () => clearTimeout(timer)
    }
  }, [isGeneratingFeatures])

  const handleEditorChange = (value: string | undefined) => {
    if (value !== undefined) {
      setCode(value)
    }
  }

  const handleSave = async () => {
    setIsGeneratingFeatures(true)
    setCurrentTab('tests') // Switch to tests tab immediately
    
    // Mock API delay and test generation
    setTimeout(() => {
      // Mock generating some test scenarios based on the feature
      const featureName = "API Tests"
      const generatedTests = `Feature: API Tests
  As a user
  I want to test the API endpoints
  So that I can ensure they work correctly

  Scenario: Get user profile
    Given I have a valid user ID "123"
    When I send a GET request to "/api/users/123"
    Then I should receive a 200 status code
    And the response should contain user details

  Scenario: Create new user
    Given I have valid user data
    When I send a POST request to "/api/users"
    Then I should receive a 201 status code
    And the response should contain the created user ID`

      // Update the store with the generated tests
      setFeature(featureName, generatedTests)
      setIsGeneratingFeatures(false)
    }, 2000) // 2 second delay to simulate API call
  }

  if (isGeneratingFeatures) {
    return (
      <div className="flex flex-col items-center justify-center h-[400px] space-y-4">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="text-lg font-medium">Generating Features...</p>
        <p className="text-sm text-muted-foreground">
          This may take a few moments
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="border rounded-lg overflow-hidden">
        <Editor
          height="60vh"
          defaultLanguage="gherkin"
          value={code}
          onChange={handleEditorChange}
          theme="vs-dark"
          options={{
            minimap: { enabled: false },
            fontSize: 14,
            lineNumbers: "on",
            scrollBeyondLastLine: false,
            wordWrap: "on",
            wrappingIndent: "indent",
          }}
        />
      </div>
      <div className="flex justify-end space-x-2">
        <Button onClick={handleSave} disabled={isGeneratingFeatures}>
          {isGeneratingFeatures ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Generating...
            </>
          ) : (
            "Generate Tests"
          )}
        </Button>
      </div>
    </div>
  )
} 