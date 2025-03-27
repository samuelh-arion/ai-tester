import { TestResult, StepResult } from './store';
import axios from 'axios';
import * as chai from 'chai';
const expect = chai.expect;

// Define step definition interface
interface StepDefinition {
  type: string;
  pattern: string;
  implementation: (...args: any[]) => Promise<any> | any;
}

// World object to maintain context between steps
class World {
  response: any = null;
  headers: Record<string, string> = {};
  baseUrl: string = '';
  envVars: Record<string, string> = {};

  constructor(environment: string) {
    // Parse environment string into variables
    if (environment) {
      const lines = environment.split('\n');
      lines.forEach(line => {
        const parts = line.split('=');
        if (parts.length === 2) {
          const key = parts[0].trim();
          const value = parts[1].trim();
          this.envVars[key] = value;
          
          // Set base URL if found
          if (key === 'API_URL' || key === 'BASE_URL') {
            this.baseUrl = value;
          }
        }
      });
    }
  }

  async sendRequest(method: string, path: string, body?: any): Promise<void> {
    try {
      const url = path.startsWith('http') ? path : `${this.baseUrl}${path}`;
      this.response = await axios({
        method,
        url,
        data: body,
        headers: this.headers
      });
    } catch (error: unknown) {
      if (axios.isAxiosError(error) && error.response) {
        this.response = error.response;
      } else {
        throw error;
      }
    }
  }

  setHeader(key: string, value: string): void {
    this.headers[key] = value;
  }
}

// Parse feature file into scenarios and steps
function parseFeature(content: string): Array<{
  name: string;
  steps: Array<{
    type: string;
    text: string;
    hasDocString: boolean;
    docString: string;
    hasDataTable: boolean;
    dataTable: string[][];
  }>;
}> {
  const lines = content.split('\n');
  let currentScenario: {
    name: string;
    steps: Array<{
      type: string;
      text: string;
      hasDocString: boolean;
      docString: string;
      hasDataTable: boolean;
      dataTable: string[][];
    }>;
  } | null = null;
  
  const scenarios: Array<{
    name: string;
    steps: Array<{
      type: string;
      text: string;
      hasDocString: boolean;
      docString: string;
      hasDataTable: boolean;
      dataTable: string[][];
    }>;
  }> = [];
  
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
    else if (line.startsWith('Given ') || line.startsWith('When ') || line.startsWith('Then ') || line.startsWith('And ') || line.startsWith('But ')) {
      if (currentScenario) {
        const stepType = line.split(' ')[0];
        const stepText = line.substring(stepType.length).trim();
        currentScenario.steps.push({
          type: stepType === 'And' || stepType === 'But' 
            ? currentScenario.steps.length > 0 
              ? currentScenario.steps[currentScenario.steps.length - 1].type 
              : 'Given'
            : stepType,
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
    else if (line === '"""' && currentScenario && currentScenario.steps.length > 0) {
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
    else if (inDocString && currentScenario && currentScenario.steps.length > 0) {
      docString += line + '\n';
    }
    else if (line.startsWith('|') && currentScenario && currentScenario.steps.length > 0) {
      const cells = line.split('|')
        .filter(cell => cell.trim() !== '')
        .map(cell => cell.trim());
      
      if (!inDataTable) {
        inDataTable = true;
        dataTable = [];
        currentScenario.steps[currentScenario.steps.length - 1].hasDataTable = true;
      }
      
      dataTable.push(cells);
      currentScenario.steps[currentScenario.steps.length - 1].dataTable = dataTable;
    }
    else if (!line.startsWith('|') && inDataTable) {
      inDataTable = false;
    }
  }
  
  if (currentScenario) scenarios.push(currentScenario);
  return scenarios;
}

// Convert regex pattern to a real RegExp
function patternToRegex(pattern: string): { regex: RegExp, paramTypes: string[] } {
  const paramTypes: string[] = [];
  
  // Handle {string} parameter - allow both quoted and unquoted strings
  let regexPattern = pattern.replace(/\{string\}/g, () => {
    paramTypes.push('string');
    return '(?:"([^"]*)"|\\"([^\\"]*)\\"|(\\S+))';  // Matches "text" or text
  });
  
  // Handle {int} parameter
  regexPattern = regexPattern.replace(/\{int\}/g, () => {
    paramTypes.push('int');
    return '(\\d+)';
  });
  
  // Handle {word} parameter
  regexPattern = regexPattern.replace(/\{word\}/g, () => {
    paramTypes.push('word');
    return '([^\\s]+)';
  });
  
  return { regex: new RegExp('^' + regexPattern + '$'), paramTypes };
}

// Find step definition matching step text
function findStepDefinition(stepText: string, stepType: string, definitions: StepDefinition[]): { 
  definition: StepDefinition, 
  params: any[] 
} | null {
  for (const stepDef of definitions) {
    if (stepDef.type !== stepType) continue;
    
    const { regex, paramTypes } = patternToRegex(stepDef.pattern);
    const match = stepText.match(regex);
    
    if (match) {
      // Extract parameters from the match, handling multiple capture groups for quoted strings
      const strParams = match.slice(1).map(param => {
        // If we have multiple capture groups for a string parameter, use the first non-undefined one
        if (Array.isArray(param)) {
          return param.find(p => p !== undefined);
        }
        return param;
      }).filter(param => param !== undefined);
      
      // Convert parameters to their appropriate types
      const params = strParams.map((param, index) => {
        if (paramTypes[index] === 'int') {
          return parseInt(param, 10);
        }
        // Remove quotes if present
        if (paramTypes[index] === 'string' && typeof param === 'string') {
          return param.replace(/^"|"$/g, '');
        }
        return param;
      });
      
      return { definition: stepDef, params };
    }
  }
  return null;
}

// Convert data table to hash
function dataTableToHash(dataTable: string[][]): Record<string, string> {
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

// Default step definitions
function getDefaultStepDefinitions(world: World): StepDefinition[] {
  return [
    {
      type: 'Given',
      pattern: 'I set header {string} to {string}',
      implementation: (key: string, value: string) => {
        world.setHeader(key, value);
      }
    },
    {
      type: 'When',
      pattern: 'I send a GET request to {string}',
      implementation: async (url: string) => {
        await world.sendRequest('GET', url);
      }
    },
    {
      type: 'When',
      pattern: 'I send a POST request to {string} with:',
      implementation: async (url: string, body: string) => {
        const data = JSON.parse(body);
        await world.sendRequest('POST', url, data);
      }
    },
    {
      type: 'When',
      pattern: 'I send a PUT request to {string} with:',
      implementation: async (url: string, body: string) => {
        const data = JSON.parse(body);
        await world.sendRequest('PUT', url, data);
      }
    },
    {
      type: 'When',
      pattern: 'I send a DELETE request to {string}',
      implementation: async (url: string) => {
        await world.sendRequest('DELETE', url);
      }
    },
    {
      type: 'Then',
      pattern: 'the response status code should be {int}',
      implementation: (statusCode: number) => {
        if (!world.response) {
          throw new Error('No response received');
        }
        if (world.response.status !== statusCode) {
          throw new Error(`Expected status code ${statusCode} but got ${world.response.status}`);
        }
      }
    },
    {
      type: 'Then',
      pattern: 'the response should have the following data:',
      implementation: (dataTable: { rowsHash: () => Record<string, string> }) => {
        if (!world.response) {
          throw new Error('No response received');
        }
        
        const expectedData = dataTable.rowsHash();
        Object.keys(expectedData).forEach(key => {
          const actualValue = world.response.data[key];
          const expectedValue = expectedData[key];
          
          if (actualValue !== expectedValue) {
            throw new Error(`Expected ${key} to be ${expectedValue} but got ${actualValue}`);
          }
        });
      }
    },
    {
      type: 'Then',
      pattern: 'the response should contain {string} with value {string}',
      implementation: (field: string, value: string) => {
        if (!world.response) {
          throw new Error('No response received');
        }
        
        const actualValue = world.response.data[field];
        if (actualValue !== value) {
          throw new Error(`Expected ${field} to be ${value} but got ${actualValue}`);
        }
      }
    }
  ];
}

// Main test execution function
export async function runTests(
  features: Record<string, string>,
  environment: string,
  testData: Record<string, unknown>
): Promise<TestResult[]> {
  const testResults: TestResult[] = [];
  const world = new World(environment);
  
  // Get step definitions: use custom ones from testData if provided, otherwise default
  let stepDefinitions;
  if (testData.stepDefinitions && typeof testData.stepDefinitions === 'string' && testData.stepDefinitions.trim().length > 0) {
    try {
      const stepDefsArray: { type: string; pattern: string; implementation: (...args: any[]) => any; params: any[] }[] = [];
      // Define register functions for Given, When, Then to include the step type
      const registerGiven = (pattern: string, impl: (...args: any[]) => any) => {
        stepDefsArray.push({ type: 'Given', pattern, implementation: impl, params: [] });
      };
      const registerWhen = (pattern: string, impl: (...args: any[]) => any) => {
        stepDefsArray.push({ type: 'When', pattern, implementation: impl, params: [] });
      };
      const registerThen = (pattern: string, impl: (...args: any[]) => any) => {
        stepDefsArray.push({ type: 'Then', pattern, implementation: impl, params: [] });
      };
      // Execute the step definitions code passing the respective register functions
      const fn = new Function(
        'Given', 
        'When', 
        'Then', 
        'axios',
        'expect',
        'world',
        testData.stepDefinitions
      );
      fn(
        registerGiven, 
        registerWhen, 
        registerThen,
        axios,
        expect,
        world
      );
      stepDefinitions = stepDefsArray;
    } catch (e) {
      console.error('Error parsing custom step definitions, using default. Error:', e);
      stepDefinitions = getDefaultStepDefinitions(world);
    }
  } else {
    stepDefinitions = getDefaultStepDefinitions(world);
  }
  
  // Process each feature file
  for (const [fileName, content] of Object.entries(features)) {
    // Parse feature
    const scenarios = parseFeature(content);
    
    // Execute each scenario
    for (const scenario of scenarios) {
      const startTime = Date.now();
      let scenarioStatus: 'passed' | 'failed' | 'skipped' = 'passed';
      let errorMessage = '';
      
      const steps: StepResult[] = [];
      
      // Execute each step in the scenario
      for (const step of scenario.steps) {
        const stepStartTime = Date.now();
        let stepStatus: 'passed' | 'failed' | 'skipped' = 'skipped';
        let stepError = '';
        
        // Only execute step if scenario is still passing
        if (scenarioStatus === 'passed') {
          try {
            // Find matching step definition
            const match = findStepDefinition(step.text, step.type, stepDefinitions);
            
            if (!match) {
              throw new Error(`No matching step definition found for: ${step.type} ${step.text}`);
            }
            
            // Prepare parameters
            let params: any[] = [...match.params];
            
            // Add doc string if present
            if (step.hasDocString) {
              params.push(step.docString.trim());
            }
            
            // Add data table if present
            if (step.hasDataTable && step.dataTable.length > 0) {
              const tableObj = {
                rowsHash: () => dataTableToHash(step.dataTable)
              };
              params.push(tableObj);
            }
            
            // Execute step
            await match.definition.implementation.apply(world, params);
            stepStatus = 'passed';
          } catch (error) {
            stepStatus = 'failed';
            scenarioStatus = 'failed';
            stepError = error instanceof Error ? error.message : String(error);
            errorMessage = stepError;
          }
        }
        
        const stepEndTime = Date.now();
        steps.push({
          id: `${fileName}-${scenario.name}-${steps.length + 1}`,
          text: step.text,
          keyword: step.type,
          status: stepStatus,
          duration: stepEndTime - stepStartTime,
          error: stepError || undefined
        });
      }
      
      const endTime = Date.now();
      
      testResults.push({
        id: `${fileName}-${scenario.name}`,
        timestamp: new Date(),
        feature: fileName,
        scenario: scenario.name,
        status: scenarioStatus,
        duration: endTime - startTime,
        steps,
        error: errorMessage || undefined
      });
    }
  }
  
  return testResults;
}

export async function exportTestSuite(
  spec: string,
  features: Record<string, string>,
  environments: unknown[],
  testData: Record<string, unknown>
): Promise<Blob> {
  const testSuite = {
    spec,
    features,
    environments,
    testData
  };
  
  return new Blob([JSON.stringify(testSuite, null, 2)], {
    type: 'application/json'
  });
}

export async function importTestSuite(file: File): Promise<{
  spec: string;
  features: Record<string, string>;
  environments: unknown[];
  testData: Record<string, unknown>;
}> {
  const content = await file.text();
  return JSON.parse(content);
} 