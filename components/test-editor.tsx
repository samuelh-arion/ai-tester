"use client"

import React, { useState, useEffect, useCallback, useMemo, useRef } from "react"
import { useStore, TestResult, StepResult } from "@/lib/store"
import Editor from "@monaco-editor/react"
import { Button } from "@/components/ui/button"
import { 
  ChevronRight, 
  Loader2, 
  Code2, 
  TestTube, 
  FolderTree,
  Play,
  Save,
  FileCode2,
  Plus,
  Trash2,
  FileText,
  Settings,
  ChevronLeft
} from "lucide-react"
import { cn } from "@/lib/utils"
import { ScrollArea } from "@/components/ui/scroll-area"
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from "../components/ui/resizable"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
} from "@/components/ui/context-menu"
import { TestReport } from "@/components/test-report"
import { exportTestSuite, importTestSuite } from "@/lib/export-import"
import { debounce } from "lodash"
import JSZip from 'jszip'
import { makeAuthenticatedRequest } from '@/lib/api'
import { runTests } from '@/lib/browser-test-runner'
import { useSearchParams } from 'next/navigation'
import axios from 'axios'
import * as chai from 'chai'

interface EditorProps {
  value: string
  onChange: (value: string | undefined) => void
  height?: string
  language?: string
}

interface FileTreeItemProps {
  name: string
  isFeature: boolean
  isSelected: boolean
  onSelect: () => void
}

interface SelectedFile {
  type: 'feature' | 'test' | 'env' | ''
  id: string
}

interface RenameDialogProps {
  isOpen: boolean
  onClose: () => void
  initialName: string
  onRename: (newName: string) => void
}

interface EnvFile {
  name: string
  content: string
}

interface TestFeature {
  name: string;
  content: string;
}

const RenameDialog = ({ isOpen, onClose, initialName, onRename }: RenameDialogProps) => {
  const [newName, setNewName] = useState(initialName)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onRename(newName)
    onClose()
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Rename File</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="Enter new name"
          />
          <div className="flex justify-end">
            <Button type="submit">Rename</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}

const FileTreeItem = ({ name, isFeature, isSelected, onSelect }: FileTreeItemProps) => {
  return (
    <div
      className={`flex items-center px-2 py-1 cursor-pointer ${
        isSelected ? "bg-accent" : "hover:bg-accent/50"
      }`}
      onClick={onSelect}
    >
      <FileCode2 className="w-4 h-4 mr-2" />
      <span>{name}</span>
    </div>
  )
}

// Reusable Monaco Editor component
function CodeEditor({ value, onChange, height = "100%", language = "javascript" }: EditorProps) {
  // Add debounce to prevent too frequent saves
  const debouncedOnChange = React.useMemo(
    () => debounce((value: string | undefined) => {
      if (value !== undefined) {
        onChange(value);
      }
    }, 500),
    [onChange]
  );

  // Cleanup debounce on unmount
  React.useEffect(() => {
    return () => {
      debouncedOnChange.cancel();
    };
  }, [debouncedOnChange]);

  return (
    <div className="h-full w-full">
      <Editor
        height="100%"
        defaultLanguage={language}
        language={language}
        value={value}
        onChange={debouncedOnChange}
        theme="vs-dark"
        options={{
          minimap: { enabled: false },
          fontSize: 14,
          lineNumbers: "on",
          scrollBeyondLastLine: false,
          wordWrap: "on",
          wrappingIndent: "indent",
          automaticLayout: true
        }}
        beforeMount={(monaco) => {
          // Register the Gherkin language if it doesn't exist
          if (!monaco.languages.getLanguages().some(({ id }: { id: string }) => id === 'gherkin')) {
            monaco.languages.register({ id: 'gherkin' });
            monaco.languages.setMonarchTokensProvider('gherkin', {
              tokenizer: {
                root: [
                  [/^\s*Feature:.*$/, "keyword"],
                  [/^\s*Scenario:.*$/, "keyword"],
                  [/^\s*Given\s/, "keyword"],
                  [/^\s*When\s/, "keyword"],
                  [/^\s*Then\s/, "keyword"],
                  [/^\s*And\s/, "keyword"],
                  [/^\s*But\s/, "keyword"],
                  [/#.*$/, "comment"],
                ]
              }
            });
          }

          // Configure JavaScript language settings
          monaco.languages.typescript.javascriptDefaults.setDiagnosticsOptions({
            noSemanticValidation: true,
            noSyntaxValidation: false,
            noSuggestionDiagnostics: false
          });

          monaco.languages.typescript.javascriptDefaults.setCompilerOptions({
            target: monaco.languages.typescript.ScriptTarget.ES2020,
            allowNonTsExtensions: true,
            allowJs: true,
            checkJs: true,
            strict: false,
            moduleResolution: monaco.languages.typescript.ModuleResolutionKind.NodeJs,
            module: monaco.languages.typescript.ModuleKind.CommonJS
          });

          // Add type definitions for Cucumber and Chai
          monaco.languages.typescript.javascriptDefaults.addExtraLib(`
            declare const Given: (pattern: string, implementation: Function) => void;
            declare const When: (pattern: string, implementation: Function) => void;
            declare const Then: (pattern: string, implementation: Function) => void;
            declare const expect: any;
            declare function require(module: string): any;
          `, 'cucumber-types.d.ts');
        }}
      />
    </div>
  )
}

// Feature creation dialog
function CreateFeatureDialog({ onCreateFeature }: { onCreateFeature: (name: string) => void }) {
  const [isOpen, setIsOpen] = useState(false)
  const [featureName, setFeatureName] = useState("")

  const handleCreate = () => {
    if (featureName.trim()) {
      onCreateFeature(featureName.trim())
      setFeatureName("")
      setIsOpen(false)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button 
          size="icon" 
          variant="ghost" 
          className="h-6 w-6" 
          title="New Feature"
        >
          <Plus className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create New Feature</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="name">Feature Name</Label>
            <Input
              id="name"
              placeholder="Enter feature name"
              value={featureName}
              onChange={(e) => setFeatureName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  handleCreate()
                }
              }}
            />
          </div>
          <Button onClick={handleCreate} disabled={!featureName.trim()}>
            Create Feature
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

// Editor toolbar component
function EditorToolbar({ 
  onRun, 
  onGenerateTests, 
  onExport,
  onStartFresh,
  isFeatureFile, 
  isGenerating,
  currentEnv,
  onEnvChange,
  environments,
  isRunningTests
}: { 
  onRun: () => void
  onGenerateTests: () => void
  onExport: () => void
  onStartFresh: () => void
  isFeatureFile: boolean
  isGenerating: boolean
  currentEnv: string
  onEnvChange: (env: string) => void
  environments: string[]
  isRunningTests: boolean
}) {
  const [isConfirmDialogOpen, setIsConfirmDialogOpen] = useState(false);

  return (
    <>
      <div className="flex items-center justify-between border-b p-2">
        <div className="flex items-center space-x-2">
          {isFeatureFile ? (
            <Button size="sm" onClick={onGenerateTests} disabled={isGenerating}>
              {isGenerating ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Generating Tests...
                </>
              ) : (
                <>
                  <Code2 className="h-4 w-4 mr-2" />
                  Generate Tests
                </>
              )}
            </Button>
          ) : (
            <Button size="sm" onClick={onRun} disabled={isRunningTests}>
              {isRunningTests ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Running Tests...
                </>
              ) : (
                <>
                  <Play className="h-4 w-4 mr-2" />
                  Run Tests
                </>
              )}
            </Button>
          )}
          <Select value={currentEnv} onValueChange={onEnvChange}>
            <SelectTrigger className="w-[180px]">
              <Settings className="w-4 h-4 mr-2" />
              <SelectValue placeholder="Select environment" />
            </SelectTrigger>
            <SelectContent>
              {environments.map((env) => (
                <SelectItem key={env} value={env}>
                  {env}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button size="sm" variant="outline" onClick={onExport}>
            <FileCode2 className="h-4 w-4 mr-2" />
            Export
          </Button>
          <Button
            size="sm"
            variant="secondary"
            onClick={() => setIsConfirmDialogOpen(true)}
          >
            <Plus className="h-4 w-4 mr-2" />
            Start Fresh
          </Button>
        </div>
        <div className="flex items-center space-x-2">
          <span className="text-sm text-muted-foreground">
            {isFeatureFile ? "Gherkin" : "JavaScript"}
          </span>
        </div>
      </div>

      <Dialog open={isConfirmDialogOpen} onOpenChange={setIsConfirmDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Start Fresh?</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <p className="text-sm text-muted-foreground">
              This will clear all current features, tests, and load a new API specification. Are you sure you want to continue?
            </p>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsConfirmDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button
              variant="default"
              onClick={() => {
                onStartFresh();
                setIsConfirmDialogOpen(false);
              }}
            >
              Continue
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}

// File explorer component
const FileExplorer = ({ onSelect, selectedFile }: { 
  onSelect: (type: SelectedFile['type'], id: string) => void
  selectedFile: SelectedFile
}) => {
  const { features, tests, envFiles } = useStore()
  const [openFolders, setOpenFolders] = useState<Set<string>>(new Set(["features", "tests", "environments"]))

  const toggleFolder = (folder: string) => {
    const newOpenFolders = new Set(openFolders)
    if (newOpenFolders.has(folder)) {
      newOpenFolders.delete(folder)
    } else {
      newOpenFolders.add(folder)
    }
    setOpenFolders(newOpenFolders)
  }

  return (
    <ScrollArea className="h-full">
      <div className="p-2 space-y-2">
        <div className="flex items-center justify-between mb-2">
          <FileTreeItem
            name="Features"
            isFeature={true}
            isSelected={selectedFile.type === "feature"}
            onSelect={() => onSelect("feature", selectedFile.id)}
          />
        </div>
        {openFolders.has("features") && (
          <div className="ml-4 space-y-1">
            {Object.keys(features).map((feature) => (
              <FileTreeItem
                key={feature}
                name={feature}
                isFeature={true}
                isSelected={selectedFile.id === feature}
                onSelect={() => onSelect("feature", feature)}
              />
            ))}
          </div>
        )}

        <FileTreeItem
          name="Tests"
          isFeature={false}
          isSelected={selectedFile.type === "test"}
          onSelect={() => onSelect("test", selectedFile.id)}
        />
        {openFolders.has("tests") && (
          <div className="ml-4 space-y-1">
            {Object.keys(tests).map((test) => (
              <FileTreeItem
                key={test}
                name={test}
                isFeature={false}
                isSelected={selectedFile.id === test}
                onSelect={() => onSelect("test", test)}
              />
            ))}
          </div>
        )}

        <FileTreeItem
          name="Environments"
          isFeature={false}
          isSelected={selectedFile.type === "env"}
          onSelect={() => onSelect("env", selectedFile.id)}
        />
        {openFolders.has("environments") && (
          <div className="ml-4 space-y-1">
            {Object.keys(envFiles).map((env) => (
              <FileTreeItem
                key={env}
                name={env}
                isFeature={false}
                isSelected={selectedFile.id === env}
                onSelect={() => onSelect("env", env)}
              />
            ))}
          </div>
        )}
      </div>
    </ScrollArea>
  )
}

export function TestEditor() {
  const { 
    features, 
    tests, 
    envFiles,
    setTests, 
    isGeneratingFeatures, 
    setIsGeneratingFeatures, 
    setFeature, 
    setEnvFile,
    currentEnv,
    setCurrentEnv,
    resetStore,
    setTestResults: setStoreTestResults,
    parsedOpenApiSpec
  } = useStore()

  const [selectedFile, setSelectedFile] = useState<SelectedFile>({
    type: "feature",
    id: Object.keys(features)[0] || ""
  })
  const [testResults, setTestResults] = useState<TestResult[]>([])
  const [isRunningTests, setIsRunningTests] = useState(false)
  const [isExplorerOpen, setIsExplorerOpen] = useState(true)
  const [isTestResultsOpen, setIsTestResultsOpen] = useState(true)
  const [editorContent, setEditorContent] = useState('')
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (Object.keys(features).length > 0 && !selectedFile.id) {
      setSelectedFile({
        type: "feature",
        id: Object.keys(features)[0]
      })
    }
  }, [features, selectedFile.id])

  useEffect(() => {
    if (selectedFile.id) {
      if (selectedFile.type === "feature") {
        setEditorContent(features[selectedFile.id] || '')
      } else if (selectedFile.type === "test") {
        setEditorContent(tests[selectedFile.id] || '')
      } else if (selectedFile.type === "env") {
        setEditorContent(envFiles[selectedFile.id] || '')
      }
    }
  }, [selectedFile.id, selectedFile.type, features, tests, envFiles])

  const handleFileSelect = (type: SelectedFile['type'], id: string) => {
    setSelectedFile({ type, id })
  }

  const handleEditorChange = (value: string | undefined) => {
    if (!value) return

    if (selectedFile.type === "feature") {
      setFeature(selectedFile.id, value)
    } else if (selectedFile.type === "test") {
      setTests({ ...tests, [selectedFile.id]: value })
    } else if (selectedFile.type === "env") {
      setEnvFile(selectedFile.id, value)
      
      // If the current environment file is being edited, update the environment variables
      if (selectedFile.id === currentEnv) {
        // Parse environment variables from the updated content
        const envVars: Record<string, string> = {};
        value.split('\n').forEach(line => {
          const match = line.match(/^([^=]+)=(.*)$/);
          if (match) {
            const [, key, value] = match;
            envVars[key.trim()] = value.trim();
          }
        });

        // Update the environment variables in the test runner
        if (Object.keys(envVars).length > 0) {
          // Set up environment variables for test execution
          const envSetup = `
            // Set up environment variables
            const env = ${JSON.stringify(envVars, null, 2)};
          `;
          
          // Update the step definitions with new environment variables
          const stepDefContent = tests['api_steps.js'] || '';
          const updatedStepDefs = stepDefContent
            .replace(/\/\/ Set up environment variables[\s\S]*?const env = \{[\s\S]*?\};/, envSetup);
          
          setTests({ ...tests, 'api_steps.js': updatedStepDefs });
        }
      }
    }
  }

  const handleGenerateTests = async () => {
    if (!selectedFile?.id) return;
    if (!parsedOpenApiSpec) {
      setError('No OpenAPI specification loaded. Please upload a spec first.');
      return;
    }

    setIsGeneratingFeatures(true);
    try {
      const response = await makeAuthenticatedRequest('/api/generate-tests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          feature: features[selectedFile.id],
          spec: parsedOpenApiSpec
        })
      });

      if (!response.ok) {
        throw new Error('Failed to generate tests');
      }

      const json = await response.json();
      // Use API provided stepDefinitionContent directly
      const stepDefinitionContent = json.stepDefinitionContent;

      // Determine fixed filename for step definitions
      const stepFileName = 'api_steps.js';

      // Update tests state with the generated step definitions under a fixed key
      setTests({ ...tests, [stepFileName]: stepDefinitionContent });

      setIsGeneratingFeatures(false);
    } catch (error) {
      console.error('Error generating tests:', error);
      setError(error instanceof Error ? error.message : 'Failed to generate tests');
      setIsGeneratingFeatures(false);
    }
  };

  const handleRunTests = async () => {
    if (!selectedFile) return;

    setIsRunningTests(true);
    setError(null);

    try {
      // Get the feature content
      const featureMap = Object.entries(features).reduce((acc, [name, content]) => {
        acc[name] = content;
        return acc;
      }, {} as Record<string, string>);

      // Get the step definitions and prepare for browser
      const stepDefContent = tests['api_steps.js'] || '';
      const browserStepContent = stepDefContent
        .replace(/const \{ When, Then \} = require\(['"]@cucumber\/cucumber['"]\);?/, '')
        .replace(/const axios = require\(['"]axios['"]\);?/, '')
        .replace(/const \{ expect \} = require\(['"]chai['"]\);?/, '')
        .replace(/const expect = chai\.expect;?/g, '')
        .replace(/const env = process\.env;?/g, '');

      // Parse environment variables from the current env file
      const envContent = envFiles[currentEnv] || '';
      const envVars: Record<string, string> = {};
      envContent.split('\n').forEach(line => {
        const match = line.match(/^([^=]+)=(.*)$/);
        if (match) {
          const [, key, value] = match;
          envVars[key.trim()] = value.trim();
        }
      });

      // Run tests using the runTests function with environment variables
      const results = await runTests(
        featureMap,
        envContent,
        { 
          stepDefinitions: `
            // Set up environment variables
            const env = ${JSON.stringify(envVars)};
            
            // Register step definitions
            ${browserStepContent}
          `
        }
      );

      // Update test results
      setTestResults(results);
      setStoreTestResults(results);
    } catch (error) {
      console.error('Error running tests:', error);
      setError(error instanceof Error ? error.message : 'Failed to run tests');
    } finally {
      setIsRunningTests(false);
    }
  };

  const getCurrentFile = () => {
    if (!selectedFile) return null

    const { type, id } = selectedFile
    switch (type) {
      case 'feature':
        return {
          content: features[id] || '',
          language: 'gherkin'
        }
      case 'test':
        return {
          content: tests[id] || '',
          language: 'javascript'
        }
      case 'env':
        return {
          content: envFiles[id] || '',
          language: 'plaintext'
        }
      default:
        return null
    }
  }

  const handleExport = async () => {
    const zip = new JSZip()

    // Add package.json
    const packageJson = {
      "name": "api-test-suite",
      "version": "1.0.0",
      "description": "API testing using Cucumber.js and Chai",
      "main": "index.js",
      "scripts": {
        "test": "cucumber-js",
        "test:local": "npx dotenv -e env-local -- cucumber-js",
        "test:dev": "npx dotenv -e env-dev -- cucumber-js",
        "test:prod": "npx dotenv -e env-prod -- cucumber-js",
        "start": "http-server -o"
      },
      "dependencies": {
        "@cucumber/cucumber": "^9.5.1",
        "chai": "^4.3.7",
        "axios": "^1.4.0",
        "dotenv-cli": "^7.4.1"
      },
      "devDependencies": {
        "http-server": "^14.1.1"
      }
    }
    zip.file('package.json', JSON.stringify(packageJson, null, 2))

    // Add .gitignore
    const gitignore = `env-*
node_modules/
cucumber-report.html`
    zip.file('.gitignore', gitignore)

    // Create folders
    const featuresFolder = zip.folder('features')
    const stepDefinitionsFolder = zip.folder('features/step_definitions')

    // Add features to features folder
    Object.entries(features).forEach(([name, content]) => {
      featuresFolder?.file(name, content)
    })

    // Add tests to step_definitions folder
    Object.entries(tests).forEach(([name, content]) => {
      stepDefinitionsFolder?.file(name, content)
    })

    // Add environment files with exact same names as in editor
    Object.entries(envFiles).forEach(([name, content]) => {
      zip.file(name, content)
    })

    // Add README.md with instructions
    const readme = `# Test Suite

This test suite was generated from an OpenAPI specification. Follow these steps to run the tests:

1. Install dependencies:
   \`\`\`bash
   npm install
   \`\`\`

2. Set up your environment:
   - The test suite includes environment files for different contexts
   - Environment files: env-local, env-dev, env-prod
   - Choose the appropriate environment for your testing needs

3. Run the tests:
   \`\`\`bash
   # Run all tests with default environment
   npm test

   # Run tests with specific environments
   npm run test:local  # Run tests with local environment
   npm run test:dev    # Run tests with development environment
   npm run test:prod   # Run tests with production environment
   \`\`\`

## Project Structure

\`\`\`
.
├── features/
│   ├── *.feature         # Feature files
│   └── step_definitions/ # Step definition files
├── env-*                # Environment files (gitignored)
├── cucumber.js          # Cucumber configuration
├── package.json         # Project dependencies
└── README.md           # This file
\`\`\`

## Environment Files

Standard environment files:
- env-local  # Local development environment
- env-dev    # Development environment
- env-prod   # Production environment

## Features

The following feature files are included:
${Object.keys(features).map(name => `- ${name}`).join('\n')}

## Test Implementations

The following test implementation files are included:
${Object.keys(tests).map(name => `- ${name}`).join('\n')}
`
    zip.file('README.md', readme)

    // Generate and download the zip file
    const blob = await zip.generateAsync({ type: 'blob' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'test-suite.zip'
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    window.URL.revokeObjectURL(url)
  }

  const handleStartFresh = () => {
    resetStore()
    window.location.reload()
  }

  if (isGeneratingFeatures) {
    return (
      <div className="flex flex-col items-center justify-center h-[80vh] space-y-4">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="text-lg font-medium">Generating Tests...</p>
        <p className="text-sm text-muted-foreground">
          Analyzing features and creating test definitions...
        </p>
      </div>
    )
  }

  const currentFile = getCurrentFile()

  return (
    <div className="h-full w-full flex overflow-hidden">
      <div className={cn(
        "h-full flex-none transition-all duration-300 ease-in-out border-r",
        isExplorerOpen ? "w-[250px]" : "w-[40px]"
      )}>
        <div className="h-full flex flex-col">
          <div className="p-2 border-b flex items-center justify-between">
            {isExplorerOpen && (
              <h2 className="text-sm font-medium">Explorer</h2>
            )}
            <Button
              variant="ghost"
              size="icon"
              className={cn(
                "h-6 w-6 flex-none",
                isExplorerOpen ? "ml-auto" : "mx-auto"
              )}
              onClick={() => setIsExplorerOpen(!isExplorerOpen)}
              title={isExplorerOpen ? "Collapse Explorer" : "Expand Explorer"}
            >
              {isExplorerOpen ? <ChevronLeft className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
            </Button>
          </div>
          <div className={cn(
            "flex-1 overflow-hidden transition-all duration-300",
            isExplorerOpen ? "opacity-100 w-[250px]" : "opacity-0 w-0"
          )}>
            {isExplorerOpen && (
              <ScrollArea className="h-full">
                <FileExplorer onSelect={handleFileSelect} selectedFile={selectedFile} />
              </ScrollArea>
            )}
          </div>
        </div>
      </div>

      <div className="flex-1 min-w-0 flex flex-col h-full overflow-hidden">
        <EditorToolbar 
          onRun={handleRunTests}
          onGenerateTests={handleGenerateTests}
          onExport={handleExport}
          onStartFresh={handleStartFresh}
          isFeatureFile={currentFile?.language === 'gherkin'}
          isGenerating={isGeneratingFeatures}
          currentEnv={currentEnv}
          onEnvChange={setCurrentEnv}
          environments={Object.keys(envFiles)}
          isRunningTests={isRunningTests}
        />
        <div className="flex-1 min-h-0 overflow-hidden">
          <CodeEditor
            value={editorContent}
            onChange={handleEditorChange}
            language={currentFile?.language}
          />
        </div>
      </div>

      <div className={cn(
        "h-full flex-none transition-all duration-300 ease-in-out border-l",
        isTestResultsOpen ? "w-[450px]" : "w-[40px]"
      )}>
        <div className="h-full flex flex-col">
          <div className="p-2 border-b flex items-center justify-between">
            <Button
              variant="ghost"
              size="icon"
              className={cn(
                "h-6 w-6 flex-none",
                isTestResultsOpen ? "mr-auto" : "mx-auto"
              )}
              onClick={() => setIsTestResultsOpen(!isTestResultsOpen)}
              title={isTestResultsOpen ? "Collapse Results" : "Expand Results"}
            >
              {isTestResultsOpen ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
            </Button>
            {isTestResultsOpen && (
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-medium">Test Results</h2>
                <div className="flex items-center gap-1">
                  <span className="px-2 py-0.5 text-xs rounded-full bg-green-500/20 text-green-500">{testResults.filter(r => r.status === 'passed').length} Passed</span>
                  <span className="px-2 py-0.5 text-xs rounded-full bg-red-500/20 text-red-500">{testResults.filter(r => r.status === 'failed').length} Failed</span>
                  <span className="px-2 py-0.5 text-xs rounded-full bg-yellow-500/20 text-yellow-500">{testResults.filter(r => r.status === 'skipped').length} Skipped</span>
                </div>
              </div>
            )}
          </div>
          <div className={cn(
            "flex-1 overflow-hidden transition-all duration-300",
            isTestResultsOpen ? "opacity-100 w-[450px]" : "opacity-0 w-0"
          )}>
            {isTestResultsOpen && (
              <ScrollArea className="h-full">
                <div className="p-4">
                  <TestReport results={testResults} />
                </div>
              </ScrollArea>
            )}
          </div>
        </div>
      </div>
    </div>
  )
} 