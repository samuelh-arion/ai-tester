"use client"

import { useState } from "react"
import { useStore } from "@/lib/store"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { TestContext } from "@/lib/cucumberRunner"
import type { TestResult, StepResult } from "@/lib/store"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import { ChevronDown, ChevronRight } from "lucide-react"
import chai from "chai"
import axios from "axios"

async function runCucumberTests(
  features: Record<string, string>,
  tests: Record<string, string>, 
  envContent: string
): Promise<TestResult[]> {
  // Parse environment variables
  const env = Object.fromEntries(
    envContent.split('\n')
      .map(line => line.split('='))
      .filter(parts => parts.length === 2)
      .map(([key, value]) => [key.trim(), value.trim()])
  );
  
  const context = new TestContext(env);
  const results: TestResult[] = [];

  // Initialize step definitions array
  const stepDefinitions: Array<{
    type: string;
    pattern: string;
    implementation: Function;
  }> = [];

  // Create step registration functions
  const registerStep = (type: string, pattern: string, implementation: Function) => {
    stepDefinitions.push({ type, pattern, implementation });
  };

  // Helper function to parse feature file content
  function parseFeature(content: string) {
    const lines = content.split('\n');
    let currentScenario: any = null;
    const scenarios = [];
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
      else if (line.startsWith('When ') || line.startsWith('Then ') || line.startsWith('And ')) {
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
          currentScenario.steps[currentScenario.steps.length - 1].docString = docString;
          inDocString = false;
          docString = '';
        } else {
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
  }

  // Helper function to find matching step definition
  function findStepDefinition(stepText: string, stepType: string) {
    // Convert step type to lowercase for matching
    const type = stepType.toLowerCase();
    
    for (const stepDef of stepDefinitions) {
      // Skip if step type doesn't match
      if (stepDef.type.toLowerCase() !== type) continue;
      
      let pattern = stepDef.pattern;
      const paramTypes: string[] = [];
      
      // Convert Cucumber expression to regex
      pattern = pattern.replace(/\{string\}/g, () => {
        paramTypes.push('string');
        return '"([^"]*)"';
      });
      
      pattern = pattern.replace(/\{int\}/g, () => {
        paramTypes.push('int');
        return '(\\d+)';
      });
      
      const regex = new RegExp('^' + pattern + '$');
      const match = stepText.match(regex);
      
      if (match) {
        const strParams = match.slice(1);
        const params = strParams.map((param, index) => {
          if (paramTypes[index] === 'int') {
            return parseInt(param, 10);
          }
          return param;
        });
        
        return { 
          implementation: stepDef.implementation,
          params
        };
      }
    }
    return null;
  }

  // Helper function to convert data table to hash
  function dataTableToHash(dataTable: string[][]) {
    const result: Record<string, string> = {};
    if (dataTable.length >= 1) {
      for (let i = 0; i < dataTable.length; i++) {
        if (dataTable[i].length >= 2) {
          result[dataTable[i][0]] = dataTable[i][1];
        }
      }
    }
    return result;
  }

  // Process each feature file
  for (const [featureName, featureContent] of Object.entries(features)) {
    const scenarios = parseFeature(featureContent);
    
    // Process each scenario in the feature
    for (const scenario of scenarios) {
      const testResult: TestResult = {
        id: `${featureName}-${scenario.name}`.replace(/[^a-zA-Z0-9]/g, '-'),
        feature: featureName,
        scenario: scenario.name,
        status: 'skipped',
        steps: [],
        duration: 0,
        timestamp: new Date()
      };

      const startTime = Date.now();
      let scenarioPassed = true;

      // Create a world object to store state between steps
      const world = { response: null };

      // Execute each step in the scenario
      for (const step of scenario.steps) {
        const stepStartTime = Date.now();
        const stepResult: StepResult = {
          id: `${testResult.id}-${step.text}`.replace(/[^a-zA-Z0-9]/g, '-'),
          keyword: step.type,
          text: step.text,
          status: 'skipped',
          duration: 0
        };

        try {
          // Find matching step definition
          const match = findStepDefinition(step.text, step.type);
          
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
            const tableData = dataTableToHash(step.dataTable);
            params.push(JSON.stringify(tableData));
          }
          
          // Execute step
          await match.implementation.apply(world, params);
          stepResult.status = 'passed';
        } catch (error) {
          stepResult.status = 'failed';
          stepResult.error = error instanceof Error ? error.message : String(error);
          scenarioPassed = false;
        }

        stepResult.duration = Date.now() - stepStartTime;
        testResult.steps.push(stepResult);

        if (!scenarioPassed) break;
      }

      testResult.status = scenarioPassed ? 'passed' : 'failed';
      testResult.duration = Date.now() - startTime;
      results.push(testResult);
    }
  }

  return results;
}

export function TestRunner() {
  const { environments, currentEnv, setCurrentEnv, testCode, scenarioCode, features, envFiles } = useStore()
  const [results, setResults] = useState<TestResult[]>([])
  const [isRunning, setIsRunning] = useState(false)
  const [expandedTests, setExpandedTests] = useState<Set<string>>(new Set())

  const runTests = async () => {
    if (!features || Object.keys(features).length === 0) {
      console.error('No features to test')
      return
    }

    if (!testCode) {
      console.error('No test code defined')
      return
    }

    setIsRunning(true)
    setResults([])
    setExpandedTests(new Set())

    try {
      console.warn('This component is deprecated. Please use the BrowserTestRunner component instead.');
      
      const currentEnvContent = envFiles[currentEnv] || ''
      const formattedFeatures: Record<string, string> = {}
      Object.entries(features).forEach(([name, content]) => {
        formattedFeatures[name] = content
      })

      const formattedTests: Record<string, string> = {
        'test.ts': testCode
      }

      const testResults = await runCucumberTests(formattedFeatures, formattedTests, currentEnvContent)
      setResults(testResults)

    } catch (error) {
      console.error('Error running tests:', error)
    } finally {
      setIsRunning(false)
    }
  }

  const toggleTest = (testId: string) => {
    setExpandedTests(prev => {
      const next = new Set(prev)
      if (next.has(testId)) {
        next.delete(testId)
      } else {
        next.add(testId)
      }
      return next
    })
  }

  const groupedResults = results.reduce((acc, test) => {
    if (!acc[test.feature]) {
      acc[test.feature] = []
    }
    acc[test.feature].push(test)
    return acc
  }, {} as Record<string, TestResult[]>)

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-lg font-semibold">Test Runner</h2>
        <div className="flex items-center space-x-4">
          <Select value={currentEnv} onValueChange={setCurrentEnv}>
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="Select environment" />
            </SelectTrigger>
            <SelectContent>
              {environments.map((env) => (
                <SelectItem key={env.name} value={env.name}>
                  {env.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button onClick={runTests} disabled={isRunning}>
            {isRunning ? "Running Tests..." : "Run Tests"}
          </Button>
        </div>
      </div>

      <div className="space-y-4">
        {Object.entries(groupedResults).map(([featureName, featureResults]) => (
          <Card key={featureName}>
            <CardHeader>
              <CardTitle className="text-base">
                <div className="flex items-center justify-between">
                  <span>{featureName}</span>
                  <div className="flex items-center space-x-2">
                    <span className="text-sm font-normal text-muted-foreground">
                      {featureResults.filter(r => r.status === 'passed').length} passed
                    </span>
                    <span className="text-sm font-normal text-muted-foreground">
                      {featureResults.filter(r => r.status === 'failed').length} failed
                    </span>
                  </div>
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="border rounded-lg divide-y">
                {featureResults.map((test) => (
                  <Collapsible
                    key={test.id}
                    open={expandedTests.has(test.id)}
                    onOpenChange={() => toggleTest(test.id)}
                  >
                    <CollapsibleTrigger className="w-full">
                      <div className="p-4 flex items-center justify-between hover:bg-muted/50">
                        <div className="flex items-center space-x-2">
                          {expandedTests.has(test.id) ? (
                            <ChevronDown className="h-4 w-4" />
                          ) : (
                            <ChevronRight className="h-4 w-4" />
                          )}
                          <div>
                            <p className="font-medium text-left">{test.scenario}</p>
                            {test.error && (
                              <p className="text-sm text-red-500 text-left">{test.error}</p>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center space-x-4">
                          {test.duration && (
                            <span className="text-sm text-muted-foreground">
                              {test.duration}ms
                            </span>
                          )}
                          <span
                            className={
                              test.status === "passed"
                                ? "text-green-500"
                                : test.status === "failed"
                                ? "text-red-500"
                                : test.status === "skipped"
                                ? "text-yellow-500"
                                : "text-muted-foreground"
                            }
                          >
                            {test.status.charAt(0).toUpperCase() + test.status.slice(1)}
                          </span>
                        </div>
                      </div>
                    </CollapsibleTrigger>
                    <CollapsibleContent>
                      <div className="p-4 bg-muted/50 border-t">
                        <div className="space-y-2">
                          {test.steps.map((step) => (
                            <div 
                              key={step.id}
                              className="flex items-center justify-between font-mono text-sm"
                            >
                              <div className="flex items-center space-x-2">
                                <span
                                  className={
                                    step.status === "passed"
                                      ? "text-green-500"
                                      : step.status === "failed"
                                      ? "text-red-500"
                                      : "text-yellow-500"
                                  }
                                >
                                  ●
                                </span>
                                <span>{step.keyword} {step.text}</span>
                              </div>
                              <div className="flex items-center space-x-4 text-muted-foreground">
                                <span>{step.duration}ms</span>
                                <span>{step.status}</span>
                              </div>
                            </div>
                          ))}
                          {test.steps.some(step => step.error) && (
                            <div className="mt-4 p-4 bg-red-500/10 rounded-lg">
                              {test.steps
                                .filter(step => step.error)
                                .map(step => (
                                  <div key={step.id} className="text-sm text-red-500">
                                    <strong>{step.keyword} {step.text}:</strong> {step.error}
                                  </div>
                                ))
                              }
                            </div>
                          )}
                        </div>
                      </div>
                    </CollapsibleContent>
                  </Collapsible>
                ))}
                {featureResults.length === 0 && (
                  <div className="p-8 text-center text-muted-foreground">
                    No tests have been run yet
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
        {results.length === 0 && (
          <Card>
            <CardContent>
              <div className="p-8 text-center text-muted-foreground">
                No tests have been run yet
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
} 