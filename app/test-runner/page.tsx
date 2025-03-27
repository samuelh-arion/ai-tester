'use client';

import { useState, useEffect, useRef } from 'react';
import { BrowserTestRunner, EnvironmentVariables } from '@/components/browser-test-runner';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Download } from 'lucide-react';
import { useStore } from '@/lib/store';

export default function TestRunnerPage() {
  const { openApiSpec, parsedOpenApiSpec } = useStore();
  const [featureContent, setFeatureContent] = useState<string>('');
  const [stepDefinitions, setStepDefinitions] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [exporting, setExporting] = useState<boolean>(false);
  const testRunnerRef = useRef<{ getEnvironment: () => EnvironmentVariables }>(null);

  // Access to the BrowserTestRunner's current environment
  const getEnvironment = (): EnvironmentVariables => {
    if (testRunnerRef.current?.getEnvironment) {
      return testRunnerRef.current.getEnvironment();
    }
    return { name: 'local', variables: {} };
  };

  useEffect(() => {
    async function fetchTestFiles() {
      try {
        setLoading(true);
        
        if (!parsedOpenApiSpec) {
          throw new Error('No OpenAPI specification loaded. Please upload a spec first.');
        }
        
        // Generate tests from the API
        const response = await fetch('/api/generate-features', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ 
            spec: parsedOpenApiSpec
          })
        });
        
        if (!response.ok) {
          throw new Error(`API request failed with status ${response.status}`);
        }
        
        const data = await response.json();
        
        if (!data.success) {
          throw new Error(data.error || 'Failed to generate tests');
        }
        
        // Set the feature file and step definitions
        setFeatureContent(data.features['api.feature']);
        setStepDefinitions(data.tests['api_steps.js']);
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An error occurred');
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    
    fetchTestFiles();
  }, []);

  // Generate the package.json file
  const generatePackageJson = (): string => {
    return JSON.stringify({
      "name": "api-tests",
      "version": "1.0.0",
      "description": "Generated API tests using Cucumber.js and Chai",
      "scripts": {
        "test": "cucumber-js",
        "test:local": "cross-env NODE_ENV=local cucumber-js",
        "test:dev": "cross-env NODE_ENV=dev cucumber-js",
        "test:prod": "cross-env NODE_ENV=prod cucumber-js"
      },
      "dependencies": {
        "@cucumber/cucumber": "^9.5.1",
        "axios": "^1.4.0",
        "chai": "^4.3.7",
        "cross-env": "^7.0.3",
        "dotenv": "^16.3.1"
      }
    }, null, 2);
  };

  // Generate the cucumber.js config file
  const generateCucumberConfig = (): string => {
    return `module.exports = {
  default: {
    paths: ['features/*.feature'],
    require: ['features/step_definitions/*.js', 'features/support/*.js'],
    format: ['progress', 'html:cucumber-report.html'],
    parallel: 1
  }
};`;
  };

  // Generate environment files
  const generateEnvFiles = (environments: Record<string, Record<string, string>>): Record<string, string> => {
    const envFiles: Record<string, string> = {};
    
    Object.entries(environments).forEach(([name, variables]) => {
      const content = Object.entries(variables)
        .map(([key, value]) => `${key}=${value}`)
        .join('\n');
      
      envFiles[`.env-${name}`] = content;
    });
    
    return envFiles;
  };

  // Generate README file
  const generateReadme = (): string => {
    return `# API Tests

Generated API test suite using Cucumber.js and Chai.

## Setup

1. Install dependencies:
   \`\`\`
   npm install
   \`\`\`

2. Environment variables are already configured:
   - \`.env-local\` - Local development environment
   - \`.env-dev\` - Development environment
   - \`.env-prod\` - Production environment

3. Run tests:
   \`\`\`
   npm test                 # Uses default environment
   npm run test:local       # Uses .env-local
   npm run test:dev         # Uses .env-dev
   npm run test:prod        # Uses .env-prod
   \`\`\`

## File Structure

- \`features/*.feature\` - Gherkin feature files
- \`features/step_definitions/*.js\` - Step implementations
- \`cucumber.js\` - Cucumber configuration
`;
  };

  const exportTests = async () => {
    try {
      setExporting(true);
      
      // Get test content
      const features = { 'api.feature': featureContent };
      const tests = { 'api_steps.js': stepDefinitions };
      
      // Get the current environment from the test runner
      const currentEnv = getEnvironment();
      
      // Prepare default environments
      const environments: Record<string, Record<string, string>> = {
        'local': {
          'API_URL': 'http://localhost:3000',
          'API_KEY': 'local-dev-key',
        },
        'dev': {
          'API_URL': 'https://dev-api.example.com',
          'API_KEY': 'dev-api-key-123',
        },
        'prod': {
          'API_URL': 'https://api.example.com',
          'API_KEY': 'prod-api-key-789',
        }
      };
      
      // Update with current environment variables if available
      if (currentEnv.name && currentEnv.variables) {
        environments[currentEnv.name] = currentEnv.variables;
      }
      
      // Prepare all the files for the zip
      const files: Record<string, string> = {
        'package.json': generatePackageJson(),
        'cucumber.js': generateCucumberConfig(),
        'README.md': generateReadme()
      };
      
      // Add feature files
      Object.entries(features).forEach(([name, content]) => {
        files[`features/${name}`] = content as string;
      });
      
      // Add step definitions
      Object.entries(tests).forEach(([name, content]) => {
        files[`features/step_definitions/${name}`] = content as string;
      });
      
      // Add environment files
      const envFiles = generateEnvFiles(environments);
      Object.entries(envFiles).forEach(([path, content]) => {
        files[path] = content;
      });
      
      // Create zip file
      const JSZip = (await import('jszip')).default;
      const zip = new JSZip();
      
      // Add files to zip
      Object.entries(files).forEach(([path, content]) => {
        zip.file(path, content);
      });
      
      // Generate and download the zip file
      const zipBlob = await zip.generateAsync({ type: 'blob' });
      const url = URL.createObjectURL(zipBlob);
      
      const a = document.createElement('a');
      a.href = url;
      a.download = 'api-tests.zip';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Export error:', err);
      alert(`Export failed: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="container mx-auto p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">API Test Runner</h1>
        
        <Button 
          onClick={exportTests} 
          disabled={loading || exporting}
          variant="outline"
          className="flex items-center gap-2"
        >
          <Download size={16} />
          {exporting ? 'Exporting...' : 'Export for Node.js'}
        </Button>
      </div>
      
      {loading ? (
        <div className="text-center">
          <p>Loading test files...</p>
        </div>
      ) : error ? (
        <div className="bg-red-50 border border-red-300 text-red-700 p-4 rounded-md">
          <p>Error: {error}</p>
          <Button 
            onClick={() => window.location.reload()} 
            className="mt-4"
            variant="outline"
          >
            Retry
          </Button>
        </div>
      ) : (
        <div className="space-y-6">
          <Tabs defaultValue="feature">
            <TabsList>
              <TabsTrigger value="feature">Feature File</TabsTrigger>
              <TabsTrigger value="steps">Step Definitions</TabsTrigger>
              <TabsTrigger value="runner">Test Runner</TabsTrigger>
            </TabsList>
            
            <TabsContent value="feature">
              <Card>
                <CardHeader>
                  <CardTitle>Feature File</CardTitle>
                  <CardDescription>
                    The Gherkin feature file that defines test scenarios
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <pre className="bg-gray-100 p-4 rounded-md overflow-auto max-h-96 text-sm">
                    {featureContent}
                  </pre>
                </CardContent>
              </Card>
            </TabsContent>
            
            <TabsContent value="steps">
              <Card>
                <CardHeader>
                  <CardTitle>Step Definitions</CardTitle>
                  <CardDescription>
                    JavaScript code that implements the steps in the feature file
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <pre className="bg-gray-100 p-4 rounded-md overflow-auto max-h-96 text-sm">
                    {stepDefinitions}
                  </pre>
                </CardContent>
              </Card>
            </TabsContent>
            
            <TabsContent value="runner">
              <Card>
                <CardHeader>
                  <CardTitle>Test Runner</CardTitle>
                  <CardDescription>
                    Run the tests in your browser and see the results
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <BrowserTestRunner 
                    ref={testRunnerRef}
                    featureContent={featureContent} 
                    stepDefinitions={stepDefinitions} 
                  />
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      )}
    </div>
  );
} 