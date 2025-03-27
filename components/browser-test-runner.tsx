'use client';

import { useState, useRef, forwardRef, useImperativeHandle } from 'react';
import { Button } from './ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Label } from './ui/label';

interface TestResult {
  name: string;
  passed: boolean;
  steps: {
    text: string;
    passed: boolean;
    error?: string;
  }[];
}

interface BrowserTestRunnerProps {
  featureContent: string;
  stepDefinitions: string;
}

type Environment = 'local' | 'dev' | 'prod';

// Environment variable structure
export interface EnvironmentVariables {
  name: Environment;
  variables: Record<string, string>;
}

const BrowserTestRunner = forwardRef<
  { getEnvironment: () => EnvironmentVariables },
  BrowserTestRunnerProps
>(({ featureContent, stepDefinitions }, ref) => {
  const [results, setResults] = useState<string>('Test results will appear here...');
  const [running, setRunning] = useState(false);
  const [testResults, setTestResults] = useState<TestResult[]>([]);
  const [environment, setEnvironment] = useState<Environment>('local');
  const worldRef = useRef<{ response: any; envVars: Record<string, string> }>({ 
    response: null,
    envVars: {}
  });

  // Expose the environment to the parent component via ref
  useImperativeHandle(ref, () => ({
    getEnvironment: () => ({
      name: environment,
      variables: worldRef.current.envVars || {}
    })
  }));

  // Load environment variables based on selected environment
  async function loadEnvironmentVariables(env: Environment) {
    try {
      // In a real application, these would be loaded from IndexedDB
      // where the user has previously stored their environment configurations
      // This is a browser-only simulation of .env files
      const envVars = {
        'local': {
          'API_URL': 'http://localhost:3000',
          'API_KEY': 'local-dev-key',
          'TIMEOUT': '10000'
        },
        'dev': {
          'API_URL': 'https://dev-api.example.com',
          'API_KEY': 'dev-api-key-123',
          'TIMEOUT': '5000'
        },
        'prod': {
          'API_URL': 'https://api.example.com',
          'API_KEY': 'prod-api-key-789',
          'TIMEOUT': '2000'
        }
      }[env] || {};
      
      worldRef.current.envVars = envVars;
      return envVars;
    } catch (error) {
      console.error('Error loading environment variables:', error);
      return {};
    }
  }

  // Parse feature file into scenarios and steps
  const parseFeature = (content: string) => {
    const lines = content.split('\n');
    let currentScenario: any = null;
    const scenarios: any[] = [];
    let inDocString = false;
    let docString = '';
    let inDataTable = false;
    let dataTable: string[][] = [];
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      
      if (line.startsWith('Scenario:')) {
        if (currentScenario) scenarios.push(currentScenario);
        currentScenario = {
          name: line.substring('Scenario:'.length).trim(),
          steps: []
        };
        inDocString = false;
        inDataTable = false;
      } 
      else if (line.startsWith('When ') || line.startsWith('Then ') || line.startsWith('And ') || line.startsWith('Given ')) {
        if (currentScenario) {
          const stepType = line.split(' ')[0];
          const stepText = line.substring(stepType.length).trim();
          currentScenario.steps.push({
            type: stepType === 'And' ? currentScenario.steps[currentScenario.steps.length - 1].type : stepType,
            text: stepText,
            hasDocString: false,
            docString: '',
            hasDataTable: false,
            dataTable: []
          });
          inDocString = false;
          inDataTable = false;
        }
      }
      else if (line === '"""' && currentScenario) {
        if (inDocString) {
          // End of doc string
          currentScenario.steps[currentScenario.steps.length - 1].docString = docString;
          inDocString = false;
          docString = '';
        } else {
          // Start of doc string
          inDocString = true;
          currentScenario.steps[currentScenario.steps.length - 1].hasDocString = true;
          docString = '';
        }
      }
      else if (inDocString && currentScenario) {
        docString += line + '\n';
      }
      else if (line.startsWith('|') && currentScenario) {
        inDataTable = true;
        const cells = line.split('|')
          .filter(cell => cell.trim() !== '')
          .map(cell => cell.trim());
        dataTable.push(cells);
        
        // Store data table in the last step
        currentScenario.steps[currentScenario.steps.length - 1].hasDataTable = true;
        currentScenario.steps[currentScenario.steps.length - 1].dataTable = dataTable;
      }
      else if (!line.startsWith('|') && inDataTable) {
        inDataTable = false;
        dataTable = [];
      }
    }
    
    if (currentScenario) scenarios.push(currentScenario);
    return scenarios;
  };

  // Convert data table to hash object
  const dataTableToHash = (dataTable: string[][]) => {
    const result: Record<string, string> = {};
    if (dataTable.length >= 1) {
      for (let i = 0; i < dataTable.length; i++) {
        if (dataTable[i].length >= 2) {
          result[dataTable[i][0]] = dataTable[i][1];
        }
      }
    }
    return result;
  };

  // Find matching step definition for a step
  const findStepDefinition = (stepText: string, stepType: string, stepDefinitions: any[]) => {
    for (const stepDef of stepDefinitions) {
      if (stepDef.type !== stepType) continue;
      
      // Convert Cucumber expression to regex
      let pattern = stepDef.pattern;
      // Pattern types to track for type conversion
      const paramTypes: string[] = [];
      
      // Handle {string} parameter
      pattern = pattern.replace(/\{string\}/g, () => {
        paramTypes.push('string');
        return '"([^"]*)"';
      });
      
      // Handle {int} parameter
      pattern = pattern.replace(/\{int\}/g, () => {
        paramTypes.push('int');
        return '(\\d+)';
      });
      
      const regex = new RegExp('^' + pattern + '$');
      const match = stepText.match(regex);
      
      if (match) {
        // Extract parameters from the match
        const strParams = match.slice(1);
        
        // Convert parameters to their appropriate types
        const params = strParams.map((param, index) => {
          if (paramTypes[index] === 'int') {
            return parseInt(param, 10);
          }
          return param;
        });
        
        return { 
          definition: stepDef, 
          params
        };
      }
    }
    return null;
  };

  // Execute the tests
  const runTests = async () => {
    setRunning(true);
    setResults('Running tests...\n');
    
    try {
      // Load environment variables
      await loadEnvironmentVariables(environment);
      
      // Parse the feature file
      const scenarios = parseFeature(featureContent);
      
      // Parse and execute step definitions
      const stepFunctions = {
        When: (pattern: string, implementation: Function) => ({ type: 'When', pattern, implementation }),
        Then: (pattern: string, implementation: Function) => ({ type: 'Then', pattern, implementation }),
        Given: (pattern: string, implementation: Function) => ({ type: 'Given', pattern, implementation })
      };
      
      // Set up axios and chai for the browser environment
      const axiosMock = {
        get: async (url: string) => {
          const response = await fetch(url);
          return {
            status: response.status,
            data: await response.json(),
            headers: Object.fromEntries([...response.headers.entries()])
          };
        },
        post: async (url: string, data: any) => {
          const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
          });
          return {
            status: response.status,
            data: await response.json(),
            headers: Object.fromEntries([...response.headers.entries()])
          };
        }
      };
      
      const chaiMock = {
        expect: (actual: any) => ({
          to: {
            equal: (expected: any) => {
              if (actual !== expected) {
                throw new Error(`Expected ${expected} but got ${actual}`);
              }
              return true;
            },
            have: {
              property: (prop: string) => {
                if (!(prop in actual)) {
                  throw new Error(`Expected object to have property ${prop}`);
                }
                return true;
              }
            }
          }
        })
      };
      
      // Create a function that executes the step definitions
      const runStepDefs = new Function('When', 'Then', 'Given', 'axios', 'chai', 
        stepDefinitions
          .replace("const { When, Then, Given } = require('@cucumber/cucumber');", '')
          .replace("const axios = require('axios');", '')
          .replace("const { expect } = require('chai');", 'const expect = chai.expect;')
          .replace("const env = process.env;", '')
      );
      
      // Execute the step definitions to register them
      const stepDefs: any[] = [];
      runStepDefs(
        (pattern: string, impl: Function) => stepDefs.push(stepFunctions.When(pattern, impl)),
        (pattern: string, impl: Function) => stepDefs.push(stepFunctions.Then(pattern, impl)),
        (pattern: string, impl: Function) => stepDefs.push(stepFunctions.Given(pattern, impl)),
        axiosMock,
        chaiMock
      );
      
      let newResults = '';
      const newTestResults: TestResult[] = [];
      
      // Display environment information
      newResults += `Environment: ${environment.toUpperCase()}\n`;
      newResults += `Variables: ${JSON.stringify(worldRef.current.envVars, null, 2)}\n\n`;
      
      // Run each scenario
      for (const scenario of scenarios) {
        newResults += `\nScenario: ${scenario.name}\n`;
        const scenarioResult: TestResult = {
          name: scenario.name,
          passed: true,
          steps: []
        };
        
        // Run each step
        for (const step of scenario.steps) {
          try {
            // Find matching step definition
            const match = findStepDefinition(step.text, step.type, stepDefs);
            
            if (!match) {
              throw new Error(`No matching step definition found for: ${step.type} ${step.text}`);
            }
            
            // Prepare parameters
            let params = [...match.params];
            
            // Add doc string if present
            if (step.hasDocString) {
              params.push(step.docString.trim());
            }
            
            // Add data table if present
            if (step.hasDataTable && step.dataTable.length > 0) {
              // We need to handle the dataTable differently to avoid type issues
              // Create a custom object that the step implementation can handle
              const tableObj = {
                rowsHash: () => dataTableToHash(step.dataTable)
              };
              
              // Store the table as a special property on the params array
              (params as any).dataTable = tableObj;
            }
            
            // Execute step with environment context
            await match.definition.implementation.apply(worldRef.current, params);
            newResults += `  ✓ ${step.type} ${step.text}\n`;
            scenarioResult.steps.push({
              text: `${step.type} ${step.text}`,
              passed: true
            });
          } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            newResults += `  ✗ ${step.type} ${step.text} - ${errorMessage}\n`;
            scenarioResult.steps.push({
              text: `${step.type} ${step.text}`,
              passed: false,
              error: errorMessage
            });
            scenarioResult.passed = false;
            break;
          }
        }
        
        newTestResults.push(scenarioResult);
      }
      
      // Display summary
      newResults += '\n--- Test Summary ---\n';
      let passedCount = 0;
      newTestResults.forEach(result => {
        if (result.passed) passedCount++;
        newResults += `${result.passed ? '✓' : '✗'} ${result.name}\n`;
      });
      
      newResults += `\nResults: ${passedCount}/${newTestResults.length} scenarios passed\n`;
      
      setResults(newResults);
      setTestResults(newTestResults);
    } catch (error) {
      setResults(`Error running tests: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      setRunning(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-4">
        <div className="space-y-2">
          <Label htmlFor="environment">Environment</Label>
          <Select
            value={environment}
            onValueChange={(value) => setEnvironment(value as Environment)}
          >
            <SelectTrigger id="environment" className="w-[180px]">
              <SelectValue placeholder="Select environment" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="local">Local (.env-local)</SelectItem>
              <SelectItem value="dev">Development (.env-dev)</SelectItem>
              <SelectItem value="prod">Production (.env-prod)</SelectItem>
            </SelectContent>
          </Select>
        </div>
        
        <Button disabled={running} onClick={runTests} className="mt-auto">
          {running ? 'Running...' : 'Run Tests'}
        </Button>
      </div>
      
      <div className="rounded-md bg-gray-100 p-4 overflow-auto max-h-96">
        <pre className="whitespace-pre-wrap">{results}</pre>
      </div>
      
      {testResults.length > 0 && (
        <div className="mt-4">
          <h3 className="text-lg font-semibold">Detailed Results</h3>
          <div className="space-y-4 mt-2">
            {testResults.map((result, index) => (
              <div 
                key={index}
                className={`p-4 rounded-md ${result.passed ? 'bg-green-50 border-green-300' : 'bg-red-50 border-red-300'} border`}
              >
                <h4 className="font-medium">{result.passed ? '✅' : '❌'} {result.name}</h4>
                <ul className="mt-2 space-y-1">
                  {result.steps.map((step, stepIndex) => (
                    <li key={stepIndex} className="text-sm">
                      {step.passed ? '✓' : '✗'} {step.text}
                      {step.error && <div className="text-red-600 text-xs ml-4">{step.error}</div>}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
});

BrowserTestRunner.displayName = 'BrowserTestRunner';

export { BrowserTestRunner }; 